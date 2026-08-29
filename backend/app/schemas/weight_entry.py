"""Pydantic schemas for the weight-tracking slice (buildplan Step 36).

Kept separate from the SQLAlchemy model for the same reasons as food entries:
the ORM describes storage, these describe the API contract, and DB-owned columns
(user_id, timestamps) are never client-settable.

Field ownership:
- Client-supplied: measured_at, weight, unit, notes.
- Server-generated: id, user_id, created_at, updated_at.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class WeightUnit(str, Enum):
    """Supported weight units. Only pounds are offered initially, but the unit is
    part of the contract so kilograms can be added later without a data change."""

    lb = "lb"
    kg = "kg"


# ge/gt mirror the DB CHECK so bad input is rejected at the edge with a clean 422.
_WEIGHT = Field(gt=0, max_digits=6, decimal_places=2)


class WeightEntryCreate(BaseModel):
    measured_at: datetime
    weight: Decimal = _WEIGHT
    unit: WeightUnit = WeightUnit.lb
    notes: str | None = None


class WeightEntryUpdate(BaseModel):
    """PATCH input: every field optional so a client sends only what changes."""

    measured_at: datetime | None = None
    weight: Decimal | None = Field(default=None, gt=0, max_digits=6, decimal_places=2)
    unit: WeightUnit | None = None
    notes: str | None = None


class WeightEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    measured_at: datetime
    weight: Decimal
    unit: WeightUnit
    notes: str | None
    created_at: datetime
    updated_at: datetime


class WeightEntryList(BaseModel):
    """List response wrapped with pagination metadata so the envelope can grow
    (filters, cursors) without breaking clients."""

    items: list[WeightEntryResponse]
    total: int
    limit: int
    offset: int
