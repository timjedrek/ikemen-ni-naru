"""Pydantic schemas for the mood-tracking slice (buildplan Step 37).

Field ownership:
- Client-supplied: recorded_at, mood_score, notes.
- Server-generated: id, user_id, created_at, updated_at.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# 1 = worst, 10 = best. Bounds mirror the DB CHECK constraint.
_SCORE = Field(ge=1, le=10)


class MoodEntryCreate(BaseModel):
    recorded_at: datetime
    mood_score: int = _SCORE
    notes: str | None = None


class MoodEntryUpdate(BaseModel):
    """PATCH input: every field optional so a client sends only what changes."""

    recorded_at: datetime | None = None
    mood_score: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = None


class MoodEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recorded_at: datetime
    mood_score: int
    notes: str | None
    created_at: datetime
    updated_at: datetime


class MoodEntryList(BaseModel):
    items: list[MoodEntryResponse]
    total: int
    limit: int
    offset: int
