from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.food_entry import FoodEntry
    from app.models.session import Session


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Email is stored already-normalized (lowercased/trimmed by the service
    # layer). The unique constraint enforces "one account per email"; because
    # the value is normalized before insert, uniqueness is case-insensitive
    # in practice. 320 = max RFC-legal email length.
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)

    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(100))
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", server_default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    # Deleting a user removes their owned records (ON DELETE CASCADE at the DB
    # level via the FK; passive_deletes lets Postgres do the work).
    food_entries: Mapped[list["FoodEntry"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Active/expired login sessions; removed with the user (ON DELETE CASCADE).
    sessions: Mapped[list["Session"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
