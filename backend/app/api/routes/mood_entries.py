"""Mood-entry HTTP endpoints (buildplan Step 37).

Owner-scoped exactly like the other resources (see weight_entries for the full
rationale): every route passes the authenticated user's id into the CRUD layer,
which queries by id AND owner together.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.crud import mood_entry as crud
from app.database.session import get_db
from app.models.user import User
from app.schemas.mood_entry import (
    MoodEntryCreate,
    MoodEntryList,
    MoodEntryResponse,
    MoodEntryUpdate,
)

router = APIRouter(prefix="/mood-entries", tags=["mood-entries"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=MoodEntryResponse)
def create_entry(
    data: MoodEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MoodEntryResponse:
    return crud.create_mood_entry(db, current_user.id, data)


@router.get("", response_model=MoodEntryList)
def list_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    day: date | None = Query(
        default=None,
        alias="date",
        description="Return only entries recorded on this local day (ISO 8601).",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> MoodEntryList:
    items, total = crud.list_mood_entries(
        db,
        current_user.id,
        day=day,
        tz_name=current_user.timezone,
        limit=limit,
        offset=offset,
    )
    return MoodEntryList(items=items, total=total, limit=limit, offset=offset)


@router.get("/{entry_id}", response_model=MoodEntryResponse)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MoodEntryResponse:
    entry = crud.get_mood_entry(db, current_user.id, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mood entry not found")
    return entry


@router.patch("/{entry_id}", response_model=MoodEntryResponse)
def update_entry(
    entry_id: int,
    data: MoodEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MoodEntryResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide at least one field to update.",
        )
    entry = crud.update_mood_entry(db, current_user.id, entry_id, data)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mood entry not found")
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if not crud.delete_mood_entry(db, current_user.id, entry_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mood entry not found")
