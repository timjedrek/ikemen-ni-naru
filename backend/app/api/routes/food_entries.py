"""Food-entry HTTP endpoints (buildplan Step 23; ownership wired in Step 32/35).

This is the layer that knows *who the owner is*. Every route depends on
`get_current_user` and passes `current_user.id` into the CRUD layer, which
queries with both entry id AND owner id together — so one user can never read,
update, or delete another user's entries (a wrong owner looks like 404, not 403,
so we don't even confirm the row exists).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.crud import food_entry as crud
from app.database.session import get_db
from app.models.user import User
from app.schemas.food_entry import (
    DailyTotals,
    FoodEntryCreate,
    FoodEntryList,
    FoodEntryResponse,
    FoodEntryUpdate,
)

router = APIRouter(prefix="/food-entries", tags=["food-entries"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=FoodEntryResponse)
def create_entry(
    data: FoodEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FoodEntryResponse:
    return crud.create_food_entry(db, current_user.id, data)


@router.get("", response_model=FoodEntryList)
def list_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    entry_date: date | None = Query(
        default=None,
        alias="date",
        description="Return only entries logged on this date (ISO 8601).",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> FoodEntryList:
    items, total = crud.list_food_entries(
        db, current_user.id, entry_date=entry_date, limit=limit, offset=offset
    )
    totals = crud.sum_food_entries(db, current_user.id, entry_date=entry_date)
    return FoodEntryList(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        totals=DailyTotals(**totals),
    )


@router.get("/{entry_id}", response_model=FoodEntryResponse)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FoodEntryResponse:
    entry = crud.get_food_entry(db, current_user.id, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Food entry not found")
    return entry


@router.patch("/{entry_id}", response_model=FoodEntryResponse)
def update_entry(
    entry_id: int,
    data: FoodEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FoodEntryResponse:
    # Reject an empty PATCH: sending no fields is a client mistake, not a no-op
    # we should silently accept.
    if not data.model_fields_set:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide at least one field to update.",
        )
    entry = crud.update_food_entry(db, current_user.id, entry_id, data)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Food entry not found")
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if not crud.delete_food_entry(db, current_user.id, entry_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Food entry not found")
