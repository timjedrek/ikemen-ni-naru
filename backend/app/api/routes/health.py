from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    # The app can't function without the database, so a health check that
    # ignores DB connectivity is misleading. Probe with a trivial query and
    # fail the whole check (503) if it doesn't come back, so the homepage
    # surfaces the outage instead of reporting a false "ok".
    try:
        db.scalar(select(1))
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed",
        )

    return {"status": "ok", "database": "connected"}
