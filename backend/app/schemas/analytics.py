"""Pydantic schemas for the analytics read model (Phase A1).

These describe the *read model* the charts dashboard consumes — deliberately
separate from the per-resource CRUD schemas. The dashboard must never receive
raw rows and compute trends in the browser, so these shapes are tailored to what
each chart draws:

- Food is pre-aggregated per day in SQL (a stacked area of macro totals).
- Weight and mood are returned as individual points (timestamp + value), *not*
  daily-averaged, so several same-day entries render as several dots on one x.
- Sleep is returned as intervals (start/end/duration) so a chart can show *when*
  each sleep happened, not just how long.

The day-detail response reuses the existing per-resource response schemas: the
drill-down shows the same entries the log pages do, with the same fields.
"""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.food_entry import FoodEntryResponse
from app.schemas.mood_entry import MoodEntryResponse
from app.schemas.sleep_entry import SleepEntryResponse
from app.schemas.weight_entry import WeightEntryResponse


class FoodDayPoint(BaseModel):
    """One day's macro/calorie totals — aggregated in SQL, one point per day."""

    date: date
    calories: int
    protein_g: Decimal
    carb_g: Decimal
    fat_g: Decimal


class WeightPoint(BaseModel):
    """A single weigh-in. Kept per-entry (not daily-averaged) so multiple
    same-day weigh-ins plot as multiple dots sharing one x."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    measured_at: datetime
    weight: Decimal
    unit: str


class MoodPoint(BaseModel):
    """A single mood reading, kept per-entry for the same reason as weight."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    recorded_at: datetime
    mood_score: int


class SleepInterval(BaseModel):
    """One sleep as an interval, so a chart can show *when* it happened."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    started_at: datetime
    ended_at: datetime
    duration_minutes: int
    quality_score: int


class FoodSeries(BaseModel):
    items: list[FoodDayPoint]


class WeightSeries(BaseModel):
    items: list[WeightPoint]


class MoodSeries(BaseModel):
    items: list[MoodPoint]


class SleepSeries(BaseModel):
    items: list[SleepInterval]


class DayDetail(BaseModel):
    """Every entry for a single day, across all four trackers (Phase A3).

    "Which day" a timestamped entry belongs to is resolved in the user's
    timezone server-side; food already carries a calendar `entry_date`.
    """

    date: date
    food: list[FoodEntryResponse]
    weight: list[WeightEntryResponse]
    mood: list[MoodEntryResponse]
    sleep: list[SleepEntryResponse]
