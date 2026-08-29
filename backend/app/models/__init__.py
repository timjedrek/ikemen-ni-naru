"""ORM models.

Importing every model here guarantees they are registered on Base.metadata
by the time Alembic (or anything else) imports this package, so autogenerate
sees the full schema.
"""

from app.models.food_entry import FoodEntry
from app.models.mood_entry import MoodEntry
from app.models.session import Session
from app.models.sleep_entry import SleepEntry
from app.models.user import User
from app.models.weight_entry import WeightEntry

__all__ = [
    "FoodEntry",
    "MoodEntry",
    "Session",
    "SleepEntry",
    "User",
    "WeightEntry",
]
