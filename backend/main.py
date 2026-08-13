"""CareLoop persistence API — FastAPI contract for the ElevenLabs agent."""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import unquote

from fastapi import FastAPI, Query, Request

from backend import db, graph, profiles
from backend.db import normalize_phone
from backend.form import FORM_NAME, clause_by_id, clause_title
from backend.models import (
    CallerContextPayload,
    ComprehensionPayload,
    ConsentPayload,
    InitPayload,
    PostCallPayload,
    UpsertFieldPayload,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = db.get_client()
    db.ensure_indexes()
    graph.init_graph(client)
    logger.info("CareLoop persistence ready")
    yield
    db.close_client()


app = FastAPI(
    title="CareLoop persistence",
    version="0.1.0",
    lifespan=lifespan,
)


def _extract_phone(payload: dict[str, Any]) -> str | None:
    for key in ("phone", "caller_id", "callerId", "from"):
        if payload.get(key):
            return normalize_phone(str(payload[key]))
    data = payload.get("data") or {}
    if isinstance(data, dict):
        nested = data.get("conversation_initiation_client_data") or {}
        dyn = nested.get("dynamic_variables") or {}
        if dyn.get("caller_phone"):
            return normalize_phone(str(dyn["caller_phone"]))
        metadata = data.get("metadata") or {}
        if metadata.get("phone"):
            return normalize_phone(str(metadata["phone"]))
        if metadata.get("caller_id"):
            return normalize_phone(str(metadata["caller_id"]))
    return None


def _build_init_response(phone: str, call_sid: str | None) -> dict[str, Any]:
    profile = profiles.retrieve_profile(phone)
    known: dict[str, str] = {}
    last_note = ""
    if profile:
        for key in ("name", "email", "dob"):
            if profile.get(key):
                known[key] = str(profile[key])
        last_note = str(profile.get("last_note") or profile.get("memory_text") or "")

    state = graph.ensure_thread(phone, known_fields=known or None)
    db.ensure_session(phone, call_sid)

    status = str(state.get("status") or "in_progress")
    current = int(state.get("current_clause") or 0)
    known_fields = dict(state.get("known_fields") or known)

    if status == "in_progress" and current > 0:
        clause = clause_by_id(current)
        first_message = (
            f"Welcome back. Last time we left off at {clause['title']}. "
            "Shall we continue from there?"
        )
        skip_fields = known_fields
    elif profile and (known_fields.get("name") or known_fields.get("email")):
        name = known_fields.get("name") or "there"
        email = known_fields.get("email") or "the email we have on file"
        first_message = (
            f"Hi {name}, good to hear from you again. "
            f"I still have your email as {email}. "
            "We'll skip what we already have."
        )
        skip_fields = known_fields
    else:
        first_message = (
            "Hello, I'll walk you through the Medicare Annual Wellness Visit "
            "enrollment form, one section at a time."
        )
        skip_fields = known_fields

    return {
        "type": "conversation_initiation_client_data",
        "conversation_config_override": {
            "agent": {
                "first_message": first_message,
                "language": "en",
            }
        },
        "dynamic_variables": {
            "caller_name": skip_fields.get("name", ""),
            "caller_email": skip_fields.get("email", ""),
            "caller_dob": skip_fields.get("dob", ""),
            "resume_clause": str(current),
            "known_fields_json": json.dumps(skip_fields),
            "last_session_note": last_note,
            "form_name": FORM_NAME,
            "current_clause_title": clause_title(current),
            "caller_phone": phone,
        },
        "user_id": phone,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/webhooks/elevenlabs/init")
async def init_call(request: Request) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    content_type = request.headers.get("content-type", "")
    if "json" in content_type:
        body = await request.json()
        if isinstance(body, dict):
            payload.update(body)
    elif "form" in content_type:
        form = await request.form()
        payload.update(dict(form))
    payload.update(dict(request.query_params))
    parsed = InitPayload.model_validate(payload)
    raw_phone = parsed.caller_id or payload.get("phone")
    if not raw_phone:
        return {
            "type": "conversation_initiation_client_data",
            "conversation_config_override": {
                "agent": {
                    "first_message": (
                        "Hello, I'll walk you through the Medicare Annual "
                        "Wellness Visit enrollment form, one section at a time."
                    )
                }
            },
            "dynamic_variables": {
                "caller_name": "",
                "caller_email": "",
                "caller_dob": "",
                "resume_clause": "0",
                "known_fields_json": "{}",
                "last_session_note": "",
                "form_name": FORM_NAME,
                "current_clause_title": clause_title(0),
                "caller_phone": "",
            },
        }
    phone = normalize_phone(str(raw_phone))
    return _build_init_response(phone, parsed.call_sid)


@app.post("/tools/get_caller_context")
def get_caller_context(payload: CallerContextPayload) -> dict[str, Any]:
    phone = normalize_phone(payload.phone)
    profile = profiles.retrieve_profile(phone)
    raw = graph.get_snapshot(phone).values or {}
    values = dict(raw)
    return {
        "phone": phone,
        "profile": profile,
        "current_clause": values.get("current_clause", 0),
        "current_clause_title": clause_title(int(values.get("current_clause") or 0)),
        "known_fields": values.get("known_fields") or (profile or {}),
        "status": values.get("status") or "new",
        "confirmed_clauses": values.get("confirmed_clauses") or [],
        "retrieved_via": (profile or {}).get("retrieved_via"),
    }


@app.post("/tools/record_comprehension")
def record_comprehension(payload: ComprehensionPayload) -> dict[str, Any]:
    phone = normalize_phone(payload.phone)
    graph.ensure_thread(phone)
    state = graph.invoke_event(
        phone,
        "comprehension",
        clause_id=payload.clause_id,
        summary=payload.summary,
    )
    db.record_confirmation(phone, payload.clause_id, payload.summary, payload.call_sid)
    profiles.upsert_from_state(phone, state)
    return {
        "ok": True,
        "phone": phone,
        "current_clause": state.get("current_clause"),
        "current_clause_title": clause_title(int(state.get("current_clause") or 0)),
        "confirmed_clauses": state.get("confirmed_clauses"),
        "status": state.get("status"),
    }


@app.post("/tools/upsert_field")
def upsert_field(payload: UpsertFieldPayload) -> dict[str, Any]:
    phone = normalize_phone(payload.phone)
    graph.ensure_thread(phone)
    state = graph.invoke_event(
        phone,
        "upsert_field",
        field=payload.field,
        value=payload.value,
    )
    db.ensure_session(phone, payload.call_sid)
    profiles.upsert_field(phone, payload.field, payload.value)
    profiles.upsert_from_state(phone, state)
    return {
        "ok": True,
        "phone": phone,
        "known_fields": state.get("known_fields"),
        "status": state.get("status"),
    }


@app.post("/tools/record_consent")
def record_consent(payload: ConsentPayload) -> dict[str, Any]:
    phone = normalize_phone(payload.phone)
    graph.ensure_thread(phone)
    state = graph.invoke_event(phone, "consent")
    consent_at = str(state.get("consent_at") or "")
    db.record_consent(phone, consent_at, payload.call_sid)
    profiles.upsert_from_state(phone, state)
    return {
        "ok": True,
        "phone": phone,
        "consent_at": consent_at,
        "status": state.get("status"),
    }


@app.post("/webhooks/elevenlabs/post-call")
async def post_call(request: Request) -> dict[str, Any]:
    body: dict[str, Any] = {}
    try:
        parsed_json = await request.json()
        if isinstance(parsed_json, dict):
            body = parsed_json
    except Exception:
        body = {}
    payload = PostCallPayload.model_validate(body)
    phone = _extract_phone(body) or (
        normalize_phone(payload.phone) if payload.phone else None
    )
    if not phone and payload.caller_id:
        phone = normalize_phone(payload.caller_id)
    if not phone:
        return {"ok": False, "reason": "missing_phone"}

    transcript: Any = payload.transcript
    if transcript is None and isinstance(body.get("data"), dict):
        transcript = body["data"].get("transcript")
    if transcript is None:
        transcript = body.get("transcript") or []
    call_sid = payload.call_sid
    if not call_sid and isinstance(body.get("data"), dict):
        metadata = body["data"].get("metadata") or {}
        call_sid = metadata.get("call_sid") or metadata.get("phone_call", {}).get("call_sid")
    db.record_transcript(phone, transcript or [], call_sid)
    return {"ok": True, "phone": phone}


@app.get("/debug/state/{phone:path}")
def debug_state(phone: str) -> dict[str, Any]:
    normalized = normalize_phone(unquote(phone))
    snapshot = graph.snapshot_to_dict(normalized)
    snapshot["profile"] = profiles.retrieve_profile(normalized)
    return snapshot


@app.get("/dashboard/sessions")
def dashboard_sessions(
    phone: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    sessions = db.list_sessions(phone=phone, limit=limit)
    return {"sessions": sessions, "count": len(sessions)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
