"""PyMongo client, collections, and session audit helpers."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import unquote

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.operations import SearchIndexModel

from backend.config import settings
from backend.form import FORM_ID, clause_title

logger = logging.getLogger(__name__)

_client: MongoClient | None = None


def normalize_phone(phone: str) -> str:
    raw = unquote(phone or "").strip()
    if raw.startswith("+"):
        digits = re.sub(r"\D", "", raw)
        return f"+{digits}"
    digits = re.sub(r"\D", "", raw)
    return f"+{digits}" if digits else raw


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_uri)
    return _client


def get_db() -> Database:
    return get_client()[settings.db_name]


def profiles_col() -> Collection:
    return get_db()["caller_profiles"]


def sessions_col() -> Collection:
    return get_db()["sessions"]


def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def ensure_indexes() -> None:
    profiles_col().create_index("phone", unique=True)
    sessions_col().create_index([("phone", ASCENDING), ("started_at", DESCENDING)])
    sessions_col().create_index("call_sid")
    _ensure_vector_index()


def _index_fields(index: dict[str, Any]) -> list[dict[str, Any]]:
    definition = (
        index.get("latestDefinition")
        or index.get("latestDefinitionNoArrays")
        or index.get("definition")
        or {}
    )
    return list(definition.get("fields") or [])


def _is_autoembed_index(index: dict[str, Any]) -> bool:
    return any(field.get("type") == "autoEmbed" for field in _index_fields(index))


def _ensure_vector_index() -> None:
    name = settings.memory_index_name
    try:
        existing = list(profiles_col().list_search_indexes())
        for index in existing:
            if index.get("name") != name:
                continue
            if _is_autoembed_index(index):
                return
            logger.warning(
                "Search index %s exists but is not autoEmbed on memory_text. "
                "Drop it in Atlas (Search & Vector Search) and restart the app.",
                name,
            )
            return
        model = SearchIndexModel(
            definition={
                "fields": [
                    {
                        "type": "autoEmbed",
                        "modality": "text",
                        "path": "memory_text",
                        "model": settings.autoembed_model,
                    },
                    {"type": "filter", "path": "phone"},
                ]
            },
            name=name,
            type="vectorSearch",
        )
        profiles_col().create_search_index(model)
        logger.info(
            "Created Automated Embedding index %s on memory_text (%s)",
            name,
            settings.autoembed_model,
        )
    except Exception as exc:
        logger.warning("Could not ensure vector index %s: %s", name, exc)


def json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items() if k != "embedding"}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if hasattr(value, "__str__") and type(value).__name__ == "ObjectId":
        return str(value)
    return value


def serialize_doc(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if not doc:
        return None
    out = json_safe(doc)
    if "_id" in out:
        out["_id"] = str(out["_id"])
    out.pop("embedding", None)
    return out


def _now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_session(phone: str, call_sid: str | None = None) -> dict[str, Any]:
    phone = normalize_phone(phone)
    query: dict[str, Any] = {"phone": phone, "status": "in_progress"}
    existing = sessions_col().find_one(query, sort=[("started_at", DESCENDING)])
    if existing:
        if call_sid and not existing.get("call_sid"):
            sessions_col().update_one(
                {"_id": existing["_id"]}, {"$set": {"call_sid": call_sid}}
            )
            existing["call_sid"] = call_sid
        return existing

    doc = {
        "phone": phone,
        "call_sid": call_sid,
        "form_id": FORM_ID,
        "started_at": _now(),
        "clauses_explained": [],
        "confirmations": [],
        "consent_at": None,
        "transcript": [],
        "status": "in_progress",
    }
    result = sessions_col().insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def record_confirmation(
    phone: str,
    clause_id: int,
    summary: str,
    call_sid: str | None = None,
) -> None:
    phone = normalize_phone(phone)
    session = ensure_session(phone, call_sid)
    confirmed_at = _now().isoformat()
    title = clause_title(clause_id)
    sessions_col().update_one(
        {"_id": session["_id"]},
        {
            "$push": {
                "clauses_explained": {
                    "clause_id": clause_id,
                    "title": title,
                    "explained_at": confirmed_at,
                },
                "confirmations": {
                    "clause_id": clause_id,
                    "title": title,
                    "summary": summary,
                    "confirmed_at": confirmed_at,
                },
            }
        },
    )


def record_consent(phone: str, consent_at: str, call_sid: str | None = None) -> None:
    phone = normalize_phone(phone)
    session = ensure_session(phone, call_sid)
    sessions_col().update_one(
        {"_id": session["_id"]},
        {"$set": {"consent_at": consent_at, "status": "consented"}},
    )


def record_transcript(
    phone: str,
    transcript: list[Any] | str,
    call_sid: str | None = None,
) -> None:
    phone = normalize_phone(phone)
    turns = transcript if isinstance(transcript, list) else [{"text": transcript}]
    query: dict[str, Any] = {"phone": phone}
    if call_sid:
        query = {"phone": phone, "call_sid": call_sid}
    session = sessions_col().find_one(query, sort=[("started_at", DESCENDING)])
    if not session:
        session = ensure_session(phone, call_sid)
    sessions_col().update_one(
        {"_id": session["_id"]},
        {"$set": {"transcript": turns}},
    )


def list_sessions(phone: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    query: dict[str, Any] = {}
    if phone:
        query["phone"] = normalize_phone(phone)
    cursor = sessions_col().find(query).sort("started_at", DESCENDING).limit(limit)
    return [serialize_doc(doc) or {} for doc in cursor]
