"""User persistence (buildplan Phase 6)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, normalize_email
from app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
    """Look up by normalized email (case-insensitive in practice)."""
    return db.scalar(select(User).where(User.email == normalize_email(email)))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def create_user(
    db: Session, *, email: str, password: str, display_name: str | None
) -> User:
    """Create a user with a hashed password. Email is normalized first; the DB
    unique constraint is the real guard against duplicates (the route checks
    first for a friendly error, but this is the authority)."""
    user = User(
        email=normalize_email(email),
        password_hash=hash_password(password),
        display_name=display_name,
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    return user
