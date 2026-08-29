"""Sleep-entry HTTP endpoints (buildplan Step 38).

Owner-scoped exactly like the other resources (see weight_entries for the full
rationale). Duration isn't accepted or stored — it's derived from started_at /
ended_at and returned in the response.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.crud import sleep_entry as crud
from app.database.session import get_db
from app.models.user import User
from app.schemas.sleep_entry import (
    SleepEntryCreate,
    SleepEntryList,
    SleepEntryResponse,
    SleepEntryUpdate,
)

router = APIRouter(prefix="/sleep-entries", tags=["sleep-entries"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SleepEntryResponse)
def create_entry(
    data: SleepEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SleepEntryResponse:
    return crud.create_sleep_entry(db, current_user.id, data)


@router.get("", response_model=SleepEntryList)
def list_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> SleepEntryList:
    items, total = crud.list_sleep_entries(
        db, current_user.id, limit=limit, offset=offset
    )
    return SleepEntryList(items=items, total=total, limit=limit, offset=offset)


@router.get("/{entry_id}", response_model=SleepEntryResponse)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SleepEntryResponse:
    entry = crud.get_sleep_entry(db, current_user.id, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sleep entry not found")
    return entry


@router.patch("/{entry_id}", response_model=SleepEntryResponse)
def update_entry(
    entry_id: int,
    data: SleepEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SleepEntryResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide at least one field to update.",
        )

    # The start-before-end rule spans two fields; on a partial update we validate
    # it against the merged result (patched values over the stored ones) so a
    # one-sided edit can't create an impossible range. The DB CHECK is the final
    # backstop.
    existing = crud.get_sleep_entry(db, current_user.id, entry_id)
    if existing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sleep entry not found")
    new_start = data.started_at or existing.started_at
    new_end = data.ended_at or existing.ended_at
    if new_end <= new_start:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="ended_at must be after started_at",
        )

    entry = crud.update_sleep_entry(db, current_user.id, entry_id, data)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sleep entry not found")
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if not crud.delete_sleep_entry(db, current_user.id, entry_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Sleep entry not found")
