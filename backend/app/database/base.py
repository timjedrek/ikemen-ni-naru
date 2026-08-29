from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all ORM models.

    Every model subclasses this, so `Base.metadata` is the single source of
    truth that Alembic points at for autogenerating migrations.
    """


class TimestampMixin:
    """Adds server-managed created_at / updated_at columns.

    Timestamps are timezone-aware and default to the database's now() (UTC),
    so the values are authoritative and set by Postgres, not the app process.
    updated_at is refreshed on every UPDATE via onupdate.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
