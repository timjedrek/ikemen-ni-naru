from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class SleepEntry(Base, TimestampMixin):
    __tablename__ = "sleep_entries"

    # Data rules (buildplan Step 19): quality is 1-10, and a sleep must end after
    # it starts (which also guarantees a non-negative duration). Both enforced in
    # the database so bad rows are rejected regardless of code path.
    __table_args__ = (
        CheckConstraint(
            "quality_score >= 1 AND quality_score <= 10",
            name="ck_sleep_entries_quality_range",
        ),
        CheckConstraint(
            "ended_at > started_at", name="ck_sleep_entries_ends_after_start"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # ON DELETE CASCADE: removing a user removes their sleep entries.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # A sleep is defined by its actual start/end instants rather than a single
    # "sleep date" + duration. Duration is *derived* from these (see
    # duration_minutes) so the two can never disagree. This also makes naps just
    # a short time range — no special case. Stored timezone-aware/UTC.
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    # 1 = worst, 10 = best.
    quality_score: Mapped[int] = mapped_column(Integer)

    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="sleep_entries")

    @property
    def duration_minutes(self) -> int:
        """Sleep length in whole minutes, computed from the start/end instants.

        Exposed as a read-only attribute so the response schema (from_attributes)
        can serialize it without storing a redundant column that could drift.
        """
        return round((self.ended_at - self.started_at).total_seconds() / 60)
