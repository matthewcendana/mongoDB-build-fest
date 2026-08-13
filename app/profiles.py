"""Caller long-term memory: upsert + phone-filtered vector retrieve."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings
from app.db import normalize_phone, profiles_col, serialize_doc
from app.form import FORM_NAME, clause_title

logger = logging.getLogger(__name__)

KNOWN_FIELD_KEYS = ("name", "email", "dob")


def embed_text(text: str) -> list[float] | None:
    api_key = settings.resolved_embedding_key
    if not api_key or not text.strip():
        return None
    try:
        response = httpx.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": settings.embedding_model, "input": text},
            timeout=15.0,
        )
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]
    except Exception as exc:
        logger.warning("Embedding failed: %s", exc)
        return None


def _memory_text(profile: dict[str, Any], state: dict[str, Any] | None = None) -> str:
    name = profile.get("name") or (state or {}).get("known_fields", {}).get("name") or "Caller"
    email = profile.get("email") or (state or {}).get("known_fields", {}).get("email") or ""
    confirmed = (state or {}).get("confirmed_clauses") or []
    titles = [item.get("title") or clause_title(item.get("clause_id", 0)) for item in confirmed]
    last_clause = profile.get("last_clause")
    if last_clause is None and state:
        last_clause = state.get("current_clause")
    parts = [
        f"{name} is enrolled in the {FORM_NAME}.",
    ]
    if email:
        parts.append(f"Email on file: {email}.")
    if titles:
        parts.append("Confirmed understanding of: " + "; ".join(titles) + ".")
    if last_clause is not None:
        parts.append(f"Last reached {clause_title(int(last_clause))}.")
    parts.append("Prefers slow pacing.")
    return " ".join(parts)


def upsert_from_state(phone: str, state: dict[str, Any]) -> dict[str, Any]:
    phone = normalize_phone(phone)
    known = dict(state.get("known_fields") or {})
    now = datetime.now(timezone.utc)
    existing = profiles_col().find_one({"phone": phone}) or {}
    profile = {
        "phone": phone,
        "name": known.get("name", existing.get("name", "")),
        "email": known.get("email", existing.get("email", "")),
        "dob": known.get("dob", existing.get("dob", "")),
        "pacing": existing.get("pacing", "slow"),
        "last_clause": int(state.get("current_clause") or 0),
        "last_call_at": now,
        "status": state.get("status") or existing.get("status") or "in_progress",
    }
    profile["memory_text"] = _memory_text(profile, state)
    embedding = embed_text(profile["memory_text"])
    update = dict(profile)
    if embedding:
        update["embedding"] = embedding
    profiles_col().update_one({"phone": phone}, {"$set": update}, upsert=True)
    stored = profiles_col().find_one({"phone": phone}) or profile
    return serialize_doc(stored) or profile


def upsert_field(phone: str, field: str, value: str) -> dict[str, Any]:
    phone = normalize_phone(phone)
    existing = profiles_col().find_one({"phone": phone}) or {"phone": phone}
    if field in KNOWN_FIELD_KEYS or field:
        existing[field] = value
    existing["last_call_at"] = datetime.now(timezone.utc)
    existing["memory_text"] = _memory_text(existing)
    embedding = embed_text(existing["memory_text"])
    update = {
        "phone": phone,
        field: value,
        "memory_text": existing["memory_text"],
        "last_call_at": existing["last_call_at"],
        "pacing": existing.get("pacing", "slow"),
    }
    if embedding:
        update["embedding"] = embedding
    profiles_col().update_one({"phone": phone}, {"$set": update}, upsert=True)
    stored = profiles_col().find_one({"phone": phone}) or existing
    return serialize_doc(stored) or existing


def _vector_search(phone: str, query: str) -> dict[str, Any] | None:
    vector = embed_text(query)
    if not vector:
        return None
    pipeline = [
        {
            "$vectorSearch": {
                "index": settings.memory_index_name,
                "path": "embedding",
                "queryVector": vector,
                "numCandidates": 20,
                "limit": 1,
                "filter": {"phone": {"$eq": phone}},
            }
        },
        {
            "$project": {
                "phone": 1,
                "name": 1,
                "email": 1,
                "dob": 1,
                "pacing": 1,
                "memory_text": 1,
                "last_clause": 1,
                "last_call_at": 1,
                "status": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    try:
        hits = list(profiles_col().aggregate(pipeline))
        return hits[0] if hits else None
    except Exception as exc:
        logger.warning("Vector search failed, falling back to phone lookup: %s", exc)
        return None


def retrieve_profile(phone: str) -> dict[str, Any] | None:
    phone = normalize_phone(phone)
    query = f"enrollment history and confirmed clauses for caller {phone} {FORM_NAME}"
    hit = _vector_search(phone, query)
    if not hit:
        hit = profiles_col().find_one({"phone": phone})
    if not hit:
        return None
    doc = serialize_doc(hit) or {}
    doc["last_note"] = doc.get("memory_text") or ""
    doc["retrieved_via"] = "vector_search" if hit.get("score") is not None else "phone_lookup"
    return doc
