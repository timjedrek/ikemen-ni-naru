"""Persistence operations for mood entries (buildplan Step 37).

Owner-scoped like every other resource: an entry owned by a different user is
treated as if it does not exist (returns None), enforcing per-user isolation.
"""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud.analytics import day_bounds_utc
from app.models.mood_entry import MoodEntry
from app.schemas.mood_entry import MoodEntryCreate, MoodEntryUpdate


def create_mood_entry(db: Session, user_id: int, data: MoodEntryCreate) -> MoodEntry:
    entry = MoodEntry(user_id=user_id, **data.model_dump())
    db.add(entry)
    db.commit()  # durable before the response is built (see get_db docstring)
    db.refresh(entry)
    return entry


def get_mood_entry(db: Session, user_id: int, entry_id: int) -> MoodEntry | None:
    stmt = select(MoodEntry).where(
        MoodEntry.id == entry_id, MoodEntry.user_id == user_id
    )
    return db.scalar(stmt)


def list_mood_entries(
    db: Session,
    user_id: int,
    *,
    day: date | None = None,
    tz_name: str = "UTC",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[MoodEntry], int]:
    """Return a page of the owner's entries (newest first) plus the total count.

    When `day` is given, restrict to entries whose `recorded_at` falls on that
    local calendar day in the user's timezone (same windowing as analytics).
    """
    filters = [MoodEntry.user_id == user_id]
    if day is not None:
        start_utc, end_utc = day_bounds_utc(day, tz_name)
        filters += [MoodEntry.recorded_at >= start_utc, MoodEntry.recorded_at < end_utc]

    total = db.scalar(select(func.count()).select_from(MoodEntry).where(*filters)) or 0

    stmt = (
        select(MoodEntry)
        .where(*filters)
        .order_by(MoodEntry.recorded_at.desc(), MoodEntry.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt)), total


def update_mood_entry(
    db: Session, user_id: int, entry_id: int, data: MoodEntryUpdate
) -> MoodEntry | None:
    entry = get_mood_entry(db, user_id, entry_id)
    if entry is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_mood_entry(db: Session, user_id: int, entry_id: int) -> bool:
    entry = get_mood_entry(db, user_id, entry_id)
    if entry is None:
        return False
    db.delete(entry)
    db.commit()
    return True
