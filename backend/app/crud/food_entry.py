"""Persistence operations for food entries (buildplan Step 22).

Every operation is scoped to a single owner, passed in as `user_id` (the routes
supply the authenticated user's id). Ownership scoping is applied on every
read/update/delete: an entry that belongs to a different user is treated as if
it does not exist (returns None), which enforces per-user isolation.
"""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.food_entry import FoodEntry
from app.schemas.food_entry import FoodEntryCreate, FoodEntryUpdate


def create_food_entry(db: Session, user_id: int, data: FoodEntryCreate) -> FoodEntry:
    """Insert a new entry owned by `user_id` and return the persisted row."""
    entry = FoodEntry(user_id=user_id, **data.model_dump())
    db.add(entry)
    db.flush()  # assign id / server defaults without ending the request's transaction
    db.refresh(entry)
    return entry


def get_food_entry(db: Session, user_id: int, entry_id: int) -> FoodEntry | None:
    """Return the owned entry, or None if it doesn't exist or isn't owned."""
    stmt = select(FoodEntry).where(
        FoodEntry.id == entry_id, FoodEntry.user_id == user_id
    )
    return db.scalar(stmt)


def list_food_entries(
    db: Session,
    user_id: int,
    *,
    entry_date: date | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[FoodEntry], int]:
    """Return a page of the owner's entries plus the total count of matches.

    Filtering starts with a single optional date + pagination (buildplan Step 23
    says begin here; meal-category and date-range filters come later). The count
    reflects all matches, not just the returned page, so callers can paginate.
    """
    filters = [FoodEntry.user_id == user_id]
    if entry_date is not None:
        filters.append(FoodEntry.entry_date == entry_date)

    total = db.scalar(select(func.count()).select_from(FoodEntry).where(*filters)) or 0

    stmt = (
        select(FoodEntry)
        .where(*filters)
        # Newest day first; within a day, insertion order via id keeps it stable.
        .order_by(FoodEntry.entry_date.desc(), FoodEntry.id.asc())
        .limit(limit)
        .offset(offset)
    )
    entries = list(db.scalars(stmt))
    return entries, total


def sum_food_entries(
    db: Session, user_id: int, *, entry_date: date | None = None
) -> dict[str, object]:
    """Sum calories and macros over all matching entries (buildplan Step 27).

    Computed in SQL over the whole filtered set — not the returned page — so the
    totals a client renders are correct regardless of pagination. COALESCE gives
    zeros for an empty set instead of NULLs.
    """
    filters = [FoodEntry.user_id == user_id]
    if entry_date is not None:
        filters.append(FoodEntry.entry_date == entry_date)

    row = db.execute(
        select(
            func.coalesce(func.sum(FoodEntry.calories), 0),
            func.coalesce(func.sum(FoodEntry.protein_g), 0),
            func.coalesce(func.sum(FoodEntry.carb_g), 0),
            func.coalesce(func.sum(FoodEntry.fat_g), 0),
        ).where(*filters)
    ).one()
    return {
        "calories": row[0],
        "protein_g": row[1],
        "carb_g": row[2],
        "fat_g": row[3],
    }


def update_food_entry(
    db: Session, user_id: int, entry_id: int, data: FoodEntryUpdate
) -> FoodEntry | None:
    """Apply a partial update to an owned entry. Returns None if not found.

    Only fields the client actually sent are applied (exclude_unset), so an
    omitted field is left unchanged rather than overwritten with a default.
    """
    entry = get_food_entry(db, user_id, entry_id)
    if entry is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.flush()
    db.refresh(entry)
    return entry


def delete_food_entry(db: Session, user_id: int, entry_id: int) -> bool:
    """Delete an owned entry. Returns True if a row was removed, else False."""
    entry = get_food_entry(db, user_id, entry_id)
    if entry is None:
        return False
    db.delete(entry)
    db.flush()
    return True
