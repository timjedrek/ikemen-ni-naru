from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class MoodEntry(Base, TimestampMixin):
    __tablename__ = "mood_entries"

    # Data rules (buildplan Step 19): mood is restricted to 1-10. Enforced in the
    # database with a CHECK so out-of-range scores can never be stored.
    __table_args__ = (
        CheckConstraint(
            "mood_score >= 1 AND mood_score <= 10",
            name="ck_mood_entries_score_range",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # ON DELETE CASCADE: removing a user removes their mood entries.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Mood is a journal: keyed off *when* it was felt, so several entries a day
    # are natural (rough morning, better afternoon). Stored timezone-aware/UTC.
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    # 1 = worst, 10 = best. Direction is documented for the UI to surface.
    mood_score: Mapped[int] = mapped_column(Integer)

    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="mood_entries")
