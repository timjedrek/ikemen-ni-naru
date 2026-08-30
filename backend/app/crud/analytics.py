"""Read-model queries for the charts dashboard (Phase A1).

All queries are owner-scoped (a `user_id` is passed in from the authenticated
route) and bounded to a `[start, end]` *inclusive* date range.

Timezone handling: weight/mood/sleep are stored as UTC instants, but "which day"
an instant belongs to depends on the user's timezone. So the date range is
translated into a half-open UTC window `[start 00:00, (end+1) 00:00)` computed in
the user's zone, and instants are filtered against that. Food already carries a
calendar `entry_date`, so it is filtered/grouped on that column directly with no
timezone math.

Missing days stay missing — we never backfill zero rows (no weigh-in is not a
weight of zero). The client draws gaps where there is no data.
"""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.food_entry import FoodEntry
from app.models.mood_entry import MoodEntry
from app.models.sleep_entry import SleepEntry
from app.models.weight_entry import WeightEntry

_UTC = ZoneInfo("UTC")


def _zone(tz_name: str) -> ZoneInfo:
    """Resolve a user's stored timezone name, falling back to UTC if it is
    unknown (bad/legacy data should degrade, not 500)."""
    try:
        return ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, ValueError):
        return _UTC


def day_bounds_utc(day: date, tz_name: str) -> tuple[datetime, datetime]:
    """The half-open UTC window `[day 00:00, next-day 00:00)` for a calendar day
    as it falls in the user's timezone. Used for the day drill-down."""
    tz = _zone(tz_name)
    start_local = datetime.combine(day, time.min, tzinfo=tz)
    end_local = datetime.combine(day + timedelta(days=1), time.min, tzinfo=tz)
    return start_local.astimezone(_UTC), end_local.astimezone(_UTC)


def _range_bounds_utc(start: date, end: date, tz_name: str) -> tuple[datetime, datetime]:
    """The half-open UTC window covering the inclusive date range `[start, end]`
    in the user's timezone: `[start 00:00, (end+1) 00:00)`."""
    start_utc, _ = day_bounds_utc(start, tz_name)
    _, end_utc = day_bounds_utc(end, tz_name)
    return start_utc, end_utc


def food_series(
    db: Session, user_id: int, *, start: date, end: date
) -> list[dict[str, object]]:
    """Per-day calorie + macro totals over the range, aggregated in SQL.

    Only days that actually have entries are returned — the grouping produces no
    row for an empty day, so gaps are preserved for the chart.
    """
    stmt = (
        select(
            FoodEntry.entry_date,
            func.coalesce(func.sum(FoodEntry.calories), 0),
            func.coalesce(func.sum(FoodEntry.protein_g), 0),
            func.coalesce(func.sum(FoodEntry.carb_g), 0),
            func.coalesce(func.sum(FoodEntry.fat_g), 0),
        )
        .where(
            FoodEntry.user_id == user_id,
            FoodEntry.entry_date >= start,
            FoodEntry.entry_date <= end,
        )
        .group_by(FoodEntry.entry_date)
        .order_by(FoodEntry.entry_date.asc())
    )
    return [
        {
            "date": row[0],
            "calories": row[1],
            "protein_g": row[2],
            "carb_g": row[3],
            "fat_g": row[4],
        }
        for row in db.execute(stmt).all()
    ]


def weight_series(
    db: Session, user_id: int, *, start: date, end: date, tz_name: str
) -> list[WeightEntry]:
    """Every weigh-in in the range, oldest-first — one point per entry."""
    start_utc, end_utc = _range_bounds_utc(start, end, tz_name)
    stmt = (
        select(WeightEntry)
        .where(
            WeightEntry.user_id == user_id,
            WeightEntry.measured_at >= start_utc,
            WeightEntry.measured_at < end_utc,
        )
        .order_by(WeightEntry.measured_at.asc())
    )
    return list(db.scalars(stmt))


def mood_series(
    db: Session, user_id: int, *, start: date, end: date, tz_name: str
) -> list[MoodEntry]:
    """Every mood reading in the range, oldest-first — one point per entry."""
    start_utc, end_utc = _range_bounds_utc(start, end, tz_name)
    stmt = (
        select(MoodEntry)
        .where(
            MoodEntry.user_id == user_id,
            MoodEntry.recorded_at >= start_utc,
            MoodEntry.recorded_at < end_utc,
        )
        .order_by(MoodEntry.recorded_at.asc())
    )
    return list(db.scalars(stmt))


def sleep_series(
    db: Session, user_id: int, *, start: date, end: date, tz_name: str
) -> list[SleepEntry]:
    """Every sleep whose *end* falls in the range, oldest-first.

    Keyed on `ended_at` so a sleep is attributed to the morning you woke — the
    same "which day did I sleep" intuition the day drill-down uses.
    """
    start_utc, end_utc = _range_bounds_utc(start, end, tz_name)
    stmt = (
        select(SleepEntry)
        .where(
            SleepEntry.user_id == user_id,
            SleepEntry.ended_at >= start_utc,
            SleepEntry.ended_at < end_utc,
        )
        .order_by(SleepEntry.ended_at.asc())
    )
    return list(db.scalars(stmt))


# --- Day drill-down (Phase A3) ---------------------------------------------


def food_for_day(db: Session, user_id: int, day: date) -> list[FoodEntry]:
    stmt = (
        select(FoodEntry)
        .where(FoodEntry.user_id == user_id, FoodEntry.entry_date == day)
        .order_by(FoodEntry.id.asc())
    )
    return list(db.scalars(stmt))


def weight_for_day(db: Session, user_id: int, day: date, tz_name: str) -> list[WeightEntry]:
    start_utc, end_utc = day_bounds_utc(day, tz_name)
    stmt = (
        select(WeightEntry)
        .where(
            WeightEntry.user_id == user_id,
            WeightEntry.measured_at >= start_utc,
            WeightEntry.measured_at < end_utc,
        )
        .order_by(WeightEntry.measured_at.asc())
    )
    return list(db.scalars(stmt))


def mood_for_day(db: Session, user_id: int, day: date, tz_name: str) -> list[MoodEntry]:
    start_utc, end_utc = day_bounds_utc(day, tz_name)
    stmt = (
        select(MoodEntry)
        .where(
            MoodEntry.user_id == user_id,
            MoodEntry.recorded_at >= start_utc,
            MoodEntry.recorded_at < end_utc,
        )
        .order_by(MoodEntry.recorded_at.asc())
    )
    return list(db.scalars(stmt))


def sleep_for_day(db: Session, user_id: int, day: date, tz_name: str) -> list[SleepEntry]:
    """Sleeps attributed to `day` by their wake time (`ended_at`)."""
    start_utc, end_utc = day_bounds_utc(day, tz_name)
    stmt = (
        select(SleepEntry)
        .where(
            SleepEntry.user_id == user_id,
            SleepEntry.ended_at >= start_utc,
            SleepEntry.ended_at < end_utc,
        )
        .order_by(SleepEntry.ended_at.asc())
    )
    return list(db.scalars(stmt))
