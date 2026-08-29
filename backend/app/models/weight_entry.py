from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class WeightEntry(Base, TimestampMixin):
    __tablename__ = "weight_entries"

    # Data rules (buildplan Step 19): weight must be greater than zero. Enforced
    # in the database with a CHECK so bad rows are rejected regardless of code path.
    __table_args__ = (
        CheckConstraint("weight > 0", name="ck_weight_entries_weight_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # ON DELETE CASCADE: removing a user removes their weight entries.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # A weight is keyed off *when* it was measured, not a calendar date, so a
    # user can log several a day (e.g. morning vs. post-run) and each keeps its
    # own time. Stored timezone-aware/UTC; "which day" is derived per the user's
    # timezone at read time (dashboard, Phase 8).
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    weight: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    # Pounds only for now (buildplan Step 36), but the unit is stored explicitly
    # so kilograms can be added later without a data migration.
    unit: Mapped[str] = mapped_column(String(8), default="lb", server_default="lb")

    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="weight_entries")
