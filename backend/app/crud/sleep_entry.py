"""Persistence operations for sleep entries (buildplan Step 38).

Owner-scoped like every other resource: an entry owned by a different user is
treated as if it does not exist (returns None), enforcing per-user isolation.
"""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud.analytics import day_bounds_utc
from app.models.sleep_entry import SleepEntry
from app.schemas.sleep_entry import SleepEntryCreate, SleepEntryUpdate


def create_sleep_entry(
    db: Session, user_id: int, data: SleepEntryCreate
) -> SleepEntry:
    entry = SleepEntry(user_id=user_id, **data.model_dump())
    db.add(entry)
    db.commit()  # durable before the response is built (see get_db docstring)
    db.refresh(entry)
    return entry


def get_sleep_entry(db: Session, user_id: int, entry_id: int) -> SleepEntry | None:
    stmt = select(SleepEntry).where(
        SleepEntry.id == entry_id, SleepEntry.user_id == user_id
    )
    return db.scalar(stmt)


def list_sleep_entries(
    db: Session,
    user_id: int,
    *,
    day: date | None = None,
    tz_name: str = "UTC",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[SleepEntry], int]:
    """Return a page of the owner's entries (most recent wake first) plus count.

    When `day` is given, restrict to sleeps whose `ended_at` (wake time) falls on
    that local calendar day — a sleep is attributed to the morning you woke, the
    same convention analytics and the day drill-down use.
    """
    filters = [SleepEntry.user_id == user_id]
    if day is not None:
        start_utc, end_utc = day_bounds_utc(day, tz_name)
        filters += [SleepEntry.ended_at >= start_utc, SleepEntry.ended_at < end_utc]

    total = db.scalar(select(func.count()).select_from(SleepEntry).where(*filters)) or 0

    stmt = (
        select(SleepEntry)
        .where(*filters)
        .order_by(SleepEntry.ended_at.desc(), SleepEntry.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt)), total


def update_sleep_entry(
    db: Session, user_id: int, entry_id: int, data: SleepEntryUpdate
) -> SleepEntry | None:
    entry = get_sleep_entry(db, user_id, entry_id)
    if entry is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_sleep_entry(db: Session, user_id: int, entry_id: int) -> bool:
    entry = get_sleep_entry(db, user_id, entry_id)
    if entry is None:
        return False
    db.delete(entry)
    db.commit()
    return True
