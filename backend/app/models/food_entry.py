from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class FoodEntry(Base, TimestampMixin):
    __tablename__ = "food_entries"

    # Data rules (buildplan Step 19): calories and macros cannot be negative.
    # Enforced in the database with CHECK constraints so bad rows are rejected
    # regardless of which code path writes them.
    __table_args__ = (
        CheckConstraint("calories >= 0", name="ck_food_entries_calories_non_negative"),
        CheckConstraint("protein_g >= 0", name="ck_food_entries_protein_non_negative"),
        CheckConstraint("carb_g >= 0", name="ck_food_entries_carb_non_negative"),
        CheckConstraint("fat_g >= 0", name="ck_food_entries_fat_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # ON DELETE CASCADE: removing a user removes their food entries.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # A user may log multiple food entries per day, so entry_date is not unique.
    entry_date: Mapped[date] = mapped_column(Date, index=True)
    meal_category: Mapped[str] = mapped_column(String(20))
    food_name: Mapped[str] = mapped_column(String(200))
    serving_description: Mapped[str | None] = mapped_column(String(200))

    calories: Mapped[int] = mapped_column(Integer)
    protein_g: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    carb_g: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    fat_g: Mapped[Decimal] = mapped_column(Numeric(6, 2))

    notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="food_entries")
