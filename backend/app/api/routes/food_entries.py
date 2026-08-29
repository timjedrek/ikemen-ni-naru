"""Food-entry HTTP endpoints (buildplan Step 23).

This is the layer that knows *who the owner is*. Right now it always uses the
seeded dev user (TEMP_DEV_USER_ID) because authentication does not exist yet;
Phase 6 replaces that single import + the `owner_id` values below with the
authenticated request user. The CRUD layer already takes the owner as a
parameter, so no persistence code changes then — only this file.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.temp_owner import TEMP_DEV_USER_ID  # TEMPORARY: replace in Phase 6
from app.crud import food_entry as crud
from app.database.session import get_db
from app.schemas.food_entry import (
    DailyTotals,
    FoodEntryCreate,
    FoodEntryList,
    FoodEntryResponse,
    FoodEntryUpdate,
)

router = APIRouter(prefix="/food-entries", tags=["food-entries"])

# TEMPORARY (Phase 5): ownership is hard-coded to the seeded dev user. In
# Phase 6 this becomes the authenticated user supplied by an auth dependency.
owner_id = TEMP_DEV_USER_ID


@router.post("", status_code=status.HTTP_201_CREATED, response_model=FoodEntryResponse)
def create_entry(data: FoodEntryCreate, db: Session = Depends(get_db)) -> FoodEntryResponse:
    return crud.create_food_entry(db, owner_id, data)


@router.get("", response_model=FoodEntryList)
def list_entries(
    db: Session = Depends(get_db),
    entry_date: date | None = Query(
        default=None,
        alias="date",
        description="Return only entries logged on this date (ISO 8601).",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> FoodEntryList:
    items, total = crud.list_food_entries(
        db, owner_id, entry_date=entry_date, limit=limit, offset=offset
    )
    totals = crud.sum_food_entries(db, owner_id, entry_date=entry_date)
    return FoodEntryList(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        totals=DailyTotals(**totals),
    )


@router.get("/{entry_id}", response_model=FoodEntryResponse)
def get_entry(entry_id: int, db: Session = Depends(get_db)) -> FoodEntryResponse:
    entry = crud.get_food_entry(db, owner_id, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Food entry not found")
    return entry


@router.patch("/{entry_id}", response_model=FoodEntryResponse)
def update_entry(
    entry_id: int, data: FoodEntryUpdate, db: Session = Depends(get_db)
) -> FoodEntryResponse:
    # Reject an empty PATCH: sending no fields is a client mistake, not a no-op
    # we should silently accept.
    if not data.model_fields_set:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide at least one field to update.",
        )
    entry = crud.update_food_entry(db, owner_id, entry_id, data)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Food entry not found")
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, db: Session = Depends(get_db)) -> None:
    if not crud.delete_food_entry(db, owner_id, entry_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Food entry not found")
