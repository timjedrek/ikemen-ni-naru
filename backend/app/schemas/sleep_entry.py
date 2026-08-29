"""Pydantic schemas for the sleep-tracking slice (buildplan Step 38).

A sleep is defined by its start/end instants; duration is derived, never stored
or client-supplied, so it can't disagree with the clock times. Naps need no
special handling — they're just a short time range.

Field ownership:
- Client-supplied: started_at, ended_at, quality_score, notes.
- Server-generated: id, user_id, duration_minutes, created_at, updated_at.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

# 1 = worst, 10 = best. Bounds mirror the DB CHECK constraint.
_SCORE = Field(ge=1, le=10)


class SleepEntryCreate(BaseModel):
    started_at: datetime
    ended_at: datetime
    quality_score: int = _SCORE
    notes: str | None = None

    @model_validator(mode="after")
    def _ends_after_start(self) -> "SleepEntryCreate":
        # Mirror the DB CHECK at the edge for a clean 422 instead of a DB error.
        if self.ended_at <= self.started_at:
            raise ValueError("ended_at must be after started_at")
        return self


class SleepEntryUpdate(BaseModel):
    """PATCH input: every field optional so a client sends only what changes.

    The start-before-end rule spans two fields, so a partial update can't fully
    validate it here (the unspecified side lives in the DB). The route re-checks
    the merged result, and the DB CHECK is the final backstop.
    """

    started_at: datetime | None = None
    ended_at: datetime | None = None
    quality_score: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = None


class SleepEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    started_at: datetime
    ended_at: datetime
    duration_minutes: int  # derived on the model from started_at/ended_at
    quality_score: int
    notes: str | None
    created_at: datetime
    updated_at: datetime


class SleepEntryList(BaseModel):
    items: list[SleepEntryResponse]
    total: int
    limit: int
    offset: int
