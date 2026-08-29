"""Pydantic schemas for the food-entry vertical slice (buildplan Step 21).

These are the API's request/response contracts and are intentionally kept
separate from the SQLAlchemy `FoodEntry` model. The ORM model describes how a
row is stored; these schemas describe what a client may send and what it
receives back. Keeping them apart means DB columns (`user_id`, timestamps) are
never silently settable by a client, and the two can evolve independently.

Field ownership:
- Client-supplied: entry_date, meal_category, food_name, serving_description,
  calories, protein_g, carb_g, fat_g, notes.
- Server-generated: id, user_id (the owner), created_at, updated_at.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class MealCategory(str, Enum):
    """Allowed meal buckets. A closed set so the API rejects typos/garbage
    rather than storing free-text that later breaks grouping and filtering."""

    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


# Shared field definitions so create and update stay consistent. Macros are
# Decimal to match the DB's Numeric(6,2); ge=0 mirrors the DB CHECK constraints
# so bad input is rejected at the edge with a clean 422 instead of a DB error.
_FOOD_NAME = Field(min_length=1, max_length=200)
_SERVING = Field(default=None, max_length=200)
_CALORIES = Field(ge=0, le=100_000)
_MACRO = Field(ge=0, max_digits=6, decimal_places=2)


class FoodEntryCreate(BaseModel):
    """Input for creating an entry. Everything here is client-supplied; the
    owner and timestamps are set by the server, not accepted from the request."""

    entry_date: date
    meal_category: MealCategory
    food_name: str = _FOOD_NAME
    serving_description: str | None = _SERVING
    calories: int = _CALORIES
    protein_g: Decimal = _MACRO
    carb_g: Decimal = _MACRO
    fat_g: Decimal = _MACRO
    notes: str | None = None


class FoodEntryUpdate(BaseModel):
    """Input for a PATCH. Every field is optional so a client can send only what
    it wants to change; `model_fields_set` distinguishes "omitted" from an
    explicit null. At least-one-field enforcement lives in the route/service."""

    entry_date: date | None = None
    meal_category: MealCategory | None = None
    food_name: str | None = Field(default=None, min_length=1, max_length=200)
    serving_description: str | None = _SERVING
    calories: int | None = Field(default=None, ge=0, le=100_000)
    protein_g: Decimal | None = Field(default=None, ge=0, max_digits=6, decimal_places=2)
    carb_g: Decimal | None = Field(default=None, ge=0, max_digits=6, decimal_places=2)
    fat_g: Decimal | None = Field(default=None, ge=0, max_digits=6, decimal_places=2)
    notes: str | None = None


class FoodEntryResponse(BaseModel):
    """A single entry as returned to clients. `from_attributes` lets FastAPI
    build this straight from a SQLAlchemy row."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    entry_date: date
    meal_category: MealCategory
    food_name: str
    serving_description: str | None
    calories: int
    protein_g: Decimal
    carb_g: Decimal
    fat_g: Decimal
    notes: str | None
    created_at: datetime
    updated_at: datetime


class DailyTotals(BaseModel):
    """Server-computed sums for a listing (buildplan Step 27: totals are
    calculated in the backend so every client renders identical numbers)."""

    calories: int
    protein_g: Decimal
    carb_g: Decimal
    fat_g: Decimal


class FoodEntryList(BaseModel):
    """List response. Wraps the items with pagination metadata and the
    server-computed totals rather than returning a bare array, so the envelope
    can grow (filters, cursors) without breaking clients."""

    items: list[FoodEntryResponse]
    total: int
    limit: int
    offset: int
    totals: DailyTotals
