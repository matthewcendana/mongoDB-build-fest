from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class InitPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    caller_id: str | None = None
    agent_id: str | None = None
    called_number: str | None = None
    call_sid: str | None = None


class CallerContextPayload(BaseModel):
    phone: str
    call_sid: str | None = None


class ComprehensionPayload(BaseModel):
    phone: str
    clause_id: int
    summary: str
    call_sid: str | None = None


class UpsertFieldPayload(BaseModel):
    phone: str
    field: str
    value: str
    call_sid: str | None = None


class ConsentPayload(BaseModel):
    phone: str
    call_sid: str | None = None


class PostCallPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    phone: str | None = None
    caller_id: str | None = None
    call_sid: str | None = None
    transcript: list[Any] | str | None = None
    data: dict[str, Any] | None = None


class ConfirmationRecord(BaseModel):
    clause_id: int
    title: str
    summary: str
    confirmed_at: str


class SessionRecord(BaseModel):
    phone: str
    call_sid: str | None = None
    form_id: str
    started_at: datetime
    clauses_explained: list[dict[str, Any]] = Field(default_factory=list)
    confirmations: list[dict[str, Any]] = Field(default_factory=list)
    consent_at: str | None = None
    transcript: list[Any] = Field(default_factory=list)
    status: str = "in_progress"
