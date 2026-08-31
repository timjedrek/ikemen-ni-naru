"""Weight-entry HTTP endpoints (buildplan Step 36).

Every route depends on `get_current_user` and passes `current_user.id` into the
CRUD layer, which queries with both entry id AND owner id together — so one user
can never read, update, or delete another user's entries (a wrong owner looks
like 404, not 403, so we don't confirm the row even exists).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.crud import weight_entry as crud
from app.database.session import get_db
from app.models.user import User
from app.schemas.weight_entry import (
    WeightEntryCreate,
    WeightEntryList,
    WeightEntryResponse,
    WeightEntryUpdate,
)

router = APIRouter(prefix="/weight-entries", tags=["weight-entries"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WeightEntryResponse)
def create_entry(
    data: WeightEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeightEntryResponse:
    return crud.create_weight_entry(db, current_user.id, data)


@router.get("", response_model=WeightEntryList)
def list_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    day: date | None = Query(
        default=None,
        alias="date",
        description="Return only weigh-ins measured on this local day (ISO 8601).",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> WeightEntryList:
    items, total = crud.list_weight_entries(
        db,
        current_user.id,
        day=day,
        tz_name=current_user.timezone,
        limit=limit,
        offset=offset,
    )
    return WeightEntryList(items=items, total=total, limit=limit, offset=offset)


@router.get("/{entry_id}", response_model=WeightEntryResponse)
def get_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeightEntryResponse:
    entry = crud.get_weight_entry(db, current_user.id, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Weight entry not found")
    return entry


@router.patch("/{entry_id}", response_model=WeightEntryResponse)
def update_entry(
    entry_id: int,
    data: WeightEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeightEntryResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide at least one field to update.",
        )
    entry = crud.update_weight_entry(db, current_user.id, entry_id, data)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Weight entry not found")
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if not crud.delete_weight_entry(db, current_user.id, entry_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Weight entry not found")
