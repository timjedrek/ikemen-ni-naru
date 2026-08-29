"""ORM models.

Importing every model here guarantees they are registered on Base.metadata
by the time Alembic (or anything else) imports this package, so autogenerate
sees the full schema.
"""

from app.models.food_entry import FoodEntry
from app.models.session import Session
from app.models.user import User

__all__ = ["FoodEntry", "Session", "User"]
