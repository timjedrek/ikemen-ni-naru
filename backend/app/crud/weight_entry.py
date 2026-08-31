"""Persistence operations for weight entries (buildplan Step 36).

Every operation is scoped to a single owner (`user_id`, supplied by the routes
from the authenticated user). An entry owned by a different user is treated as if
it does not exist (returns None), which enforces per-user isolation.
"""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud.analytics import day_bounds_utc
from app.models.weight_entry import WeightEntry
from app.schemas.weight_entry import WeightEntryCreate, WeightEntryUpdate


def create_weight_entry(
    db: Session, user_id: int, data: WeightEntryCreate
) -> WeightEntry:
    entry = WeightEntry(user_id=user_id, **data.model_dump())
    db.add(entry)
    db.commit()  # durable before the response is built (see get_db docstring)
    db.refresh(entry)
    return entry


def get_weight_entry(
    db: Session, user_id: int, entry_id: int
) -> WeightEntry | None:
    stmt = select(WeightEntry).where(
        WeightEntry.id == entry_id, WeightEntry.user_id == user_id
    )
    return db.scalar(stmt)


def list_weight_entries(
    db: Session,
    user_id: int,
    *,
    day: date | None = None,
    tz_name: str = "UTC",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[WeightEntry], int]:
    """Return a page of the owner's entries (newest first) plus the total count.

    When `day` is given, restrict to weigh-ins whose `measured_at` falls on that
    local calendar day in the user's timezone (same windowing as analytics).
    """
    filters = [WeightEntry.user_id == user_id]
    if day is not None:
        start_utc, end_utc = day_bounds_utc(day, tz_name)
        filters += [
            WeightEntry.measured_at >= start_utc,
            WeightEntry.measured_at < end_utc,
        ]

    total = db.scalar(select(func.count()).select_from(WeightEntry).where(*filters)) or 0

    stmt = (
        select(WeightEntry)
        .where(*filters)
        # Most recent measurement first; id tiebreak keeps ordering stable.
        .order_by(WeightEntry.measured_at.desc(), WeightEntry.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt)), total


def update_weight_entry(
    db: Session, user_id: int, entry_id: int, data: WeightEntryUpdate
) -> WeightEntry | None:
    entry = get_weight_entry(db, user_id, entry_id)
    if entry is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_weight_entry(db: Session, user_id: int, entry_id: int) -> bool:
    entry = get_weight_entry(db, user_id, entry_id)
    if entry is None:
        return False
    db.delete(entry)
    db.commit()
    return True
