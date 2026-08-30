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
    db.commit()  # durable before the response is built (see get_db docstring)
    db.refresh(user)
    return user


def update_user_profile(db: Session, user: User, fields: dict) -> User:
    """Apply profile changes to `user`. Only the editable columns are touched and
    only when present in `fields` (so "set to null" is distinct from "unchanged");
    email is normalized on the way in, matching create_user. Callers are
    responsible for any uniqueness/identity checks before calling this."""
    if "email" in fields:
        user.email = normalize_email(fields["email"])
    if "display_name" in fields:
        user.display_name = fields["display_name"]
    if "timezone" in fields:
        user.timezone = fields["timezone"]
    db.commit()
    db.refresh(user)
    return user


def change_user_password(db: Session, user: User, new_password: str) -> User:
    """Set a new password hash. The caller verifies the current password first."""
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user
