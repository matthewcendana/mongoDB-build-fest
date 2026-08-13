"""LangGraph enrollment state machine checkpointed to MongoDB."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, TypedDict

from langgraph.checkpoint.mongodb import MongoDBSaver
from langgraph.graph import END, START, StateGraph
from pymongo import MongoClient

from app.config import settings
from app.form import CONSENT_CLAUSE_ID, FORM_CLAUSES, clause_by_id, clause_title

EventType = Literal["identify", "comprehension", "upsert_field", "consent", "handoff"]


class EnrollmentState(TypedDict, total=False):
    caller_phone: str
    known_fields: dict[str, str]
    current_clause: int
    confirmed_clauses: list[dict[str, Any]]
    consent_at: str | None
    status: str
    incoming: dict[str, Any]
    last_explained: dict[str, Any]


_graph = None


def thread_config(phone: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": phone}}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def identify_node(state: EnrollmentState) -> dict[str, Any]:
    return {
        "caller_phone": state.get("caller_phone", ""),
        "known_fields": state.get("known_fields") or {},
        "current_clause": state.get("current_clause") or 0,
        "confirmed_clauses": state.get("confirmed_clauses") or [],
        "consent_at": state.get("consent_at"),
        "status": state.get("status") or "in_progress",
        "incoming": {},
    }


def explain_clause_node(state: EnrollmentState) -> dict[str, Any]:
    idx = int(state.get("current_clause") or 0)
    clause = clause_by_id(idx)
    return {
        "last_explained": {
            "clause_id": clause["id"],
            "title": clause["title"],
            "script": clause["script"],
        },
        "incoming": {},
    }


def confirm_clause_node(state: EnrollmentState) -> dict[str, Any]:
    incoming = state.get("incoming") or {}
    clause_id = int(incoming.get("clause_id", state.get("current_clause") or 0))
    summary = str(incoming.get("summary") or "")
    confirmed = list(state.get("confirmed_clauses") or [])
    if not any(item.get("clause_id") == clause_id for item in confirmed):
        confirmed.append(
            {
                "clause_id": clause_id,
                "title": clause_title(clause_id),
                "summary": summary,
                "confirmed_at": _now_iso(),
            }
        )
    next_clause = min(max(clause_id + 1, int(state.get("current_clause") or 0)), CONSENT_CLAUSE_ID)
    return {
        "confirmed_clauses": confirmed,
        "current_clause": next_clause,
        "status": "in_progress",
        "incoming": {},
    }


def upsert_field_node(state: EnrollmentState) -> dict[str, Any]:
    incoming = state.get("incoming") or {}
    fields = dict(state.get("known_fields") or {})
    field = str(incoming.get("field") or "").strip()
    value = str(incoming.get("value") or "").strip()
    if field:
        fields[field] = value
    return {"known_fields": fields, "incoming": {}}


def consent_node(state: EnrollmentState) -> dict[str, Any]:
    return {
        "consent_at": _now_iso(),
        "status": "consented",
        "current_clause": CONSENT_CLAUSE_ID,
        "incoming": {},
    }


def handoff_node(state: EnrollmentState) -> dict[str, Any]:
    return {"status": "handed_off", "incoming": {}}


def route_event(state: EnrollmentState) -> str:
    incoming = state.get("incoming") or {}
    event = str(incoming.get("type") or "identify")
    if event not in {"identify", "comprehension", "upsert_field", "consent", "handoff"}:
        return "identify"
    return event


def compile_graph(client: MongoClient):
    builder = StateGraph(EnrollmentState)
    builder.add_node("identify", identify_node)
    builder.add_node("explain_clause", explain_clause_node)
    builder.add_node("confirm_clause", confirm_clause_node)
    builder.add_node("upsert_field", upsert_field_node)
    builder.add_node("consent", consent_node)
    builder.add_node("handoff", handoff_node)
    builder.add_conditional_edges(
        START,
        route_event,
        {
            "identify": "identify",
            "comprehension": "confirm_clause",
            "upsert_field": "upsert_field",
            "consent": "consent",
            "handoff": "handoff",
        },
    )
    builder.add_edge("identify", "explain_clause")
    builder.add_edge("confirm_clause", "explain_clause")
    builder.add_edge("explain_clause", END)
    builder.add_edge("upsert_field", END)
    builder.add_edge("consent", "handoff")
    builder.add_edge("handoff", END)
    checkpointer = MongoDBSaver(client, db_name=settings.db_name)
    return builder.compile(checkpointer=checkpointer)


def init_graph(client: MongoClient):
    global _graph
    _graph = compile_graph(client)
    return _graph


def get_graph():
    if _graph is None:
        raise RuntimeError("Enrollment graph is not initialized")
    return _graph


def get_snapshot(phone: str):
    return get_graph().get_state(thread_config(phone))


def invoke_event(phone: str, event_type: EventType, **payload: Any) -> EnrollmentState:
    graph = get_graph()
    config = thread_config(phone)
    incoming = {"type": event_type, **payload}
    graph.invoke(
        {"caller_phone": phone, "incoming": incoming},
        config,
    )
    snapshot = graph.get_state(config)
    return dict(snapshot.values or {})


def ensure_thread(phone: str, known_fields: dict[str, str] | None = None) -> EnrollmentState:
    snapshot = get_snapshot(phone)
    if snapshot.values:
        return dict(snapshot.values)
    extras: dict[str, Any] = {"caller_phone": phone, "incoming": {"type": "identify"}}
    if known_fields:
        extras["known_fields"] = known_fields
    get_graph().invoke(extras, thread_config(phone))
    return dict(get_snapshot(phone).values or {})


def snapshot_to_dict(phone: str) -> dict[str, Any]:
    snapshot = get_snapshot(phone)
    values = dict(snapshot.values or {})
    clause = clause_by_id(int(values.get("current_clause") or 0))
    return {
        "thread_id": phone,
        "values": values,
        "next": list(snapshot.next or []),
        "current_clause_title": clause["title"],
        "form_clauses": [{"id": c["id"], "title": c["title"]} for c in FORM_CLAUSES],
    }
