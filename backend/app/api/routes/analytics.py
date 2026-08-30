"""Analytics HTTP endpoints for the charts dashboard (Phase A1).

A dedicated read model: the browser asks for a date range and gets back
chart-ready series, never raw rows to aggregate client-side. Every route is
owner-scoped via `get_current_user` and bounded by a required `[start, end]`
date range. "Which day" a timestamped entry belongs to is resolved in the
authenticated user's own timezone (see crud.analytics).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.crud import analytics as crud
from app.database.session import get_db
from app.models.user import User
from app.schemas.analytics import (
    DayDetail,
    FoodDayPoint,
    FoodSeries,
    MoodSeries,
    SleepSeries,
    WeightSeries,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# The dashboard's date range. Both bounds are required — a chart is meaningless
# without a window — and shared as a dependency so every series validates them
# identically (start must not come after end).
_Start = Query(description="First day of the range, inclusive (ISO 8601).")
_End = Query(description="Last day of the range, inclusive (ISO 8601).")


def date_range(start: date = _Start, end: date = _End) -> tuple[date, date]:
    if start > end:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="start must be on or before end.",
        )
    return start, end


@router.get("/food", response_model=FoodSeries)
def food_analytics(
    range_: tuple[date, date] = Depends(date_range),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FoodSeries:
    start, end = range_
    rows = crud.food_series(db, current_user.id, start=start, end=end)
    return FoodSeries(items=[FoodDayPoint(**row) for row in rows])


@router.get("/weight", response_model=WeightSeries)
def weight_analytics(
    range_: tuple[date, date] = Depends(date_range),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeightSeries:
    start, end = range_
    items = crud.weight_series(
        db, current_user.id, start=start, end=end, tz_name=current_user.timezone
    )
    return WeightSeries(items=items)


@router.get("/mood", response_model=MoodSeries)
def mood_analytics(
    range_: tuple[date, date] = Depends(date_range),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MoodSeries:
    start, end = range_
    items = crud.mood_series(
        db, current_user.id, start=start, end=end, tz_name=current_user.timezone
    )
    return MoodSeries(items=items)


@router.get("/sleep", response_model=SleepSeries)
def sleep_analytics(
    range_: tuple[date, date] = Depends(date_range),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SleepSeries:
    start, end = range_
    items = crud.sleep_series(
        db, current_user.id, start=start, end=end, tz_name=current_user.timezone
    )
    return SleepSeries(items=items)


@router.get("/day/{day}", response_model=DayDetail)
def day_detail(
    day: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DayDetail:
    """Every entry for one calendar day, across all four trackers (Phase A3).

    Reached by drilling in from a chart. Empty lists (not a 404) when a day has
    no entries — the day exists, it's just empty, and the client renders that.
    """
    tz = current_user.timezone
    return DayDetail(
        date=day,
        food=crud.food_for_day(db, current_user.id, day),
        weight=crud.weight_for_day(db, current_user.id, day, tz),
        mood=crud.mood_for_day(db, current_user.id, day, tz),
        sleep=crud.sleep_for_day(db, current_user.id, day, tz),
    )
