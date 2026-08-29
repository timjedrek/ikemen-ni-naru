"""Session persistence for opaque-token auth (buildplan Phase 6).

The raw token lives only in the client's cookie; here we store and match on its
SHA-256. `create_session` returns the raw token exactly once (to set the cookie);
it is never recoverable from the DB afterward.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.security import generate_session_token, hash_session_token
from app.models.session import Session


def create_session(db: DbSession, user_id: int, *, ttl_days: int) -> str:
    """Create a session for `user_id` and return the raw token for the cookie."""
    token = generate_session_token()
    session = Session(
        user_id=user_id,
        token_hash=hash_session_token(token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=ttl_days),
    )
    db.add(session)
    db.commit()  # durable before the response/cookie is sent (see get_db docstring)
    return token


def get_valid_session(db: DbSession, token: str) -> Session | None:
    """Return the session for `token` iff it exists and hasn't expired."""
    session = db.scalar(
        select(Session).where(Session.token_hash == hash_session_token(token))
    )
    if session is None:
        return None
    # Compare tz-aware; expires_at comes back tz-aware from Postgres.
    if session.expires_at <= datetime.now(timezone.utc):
        return None
    return session


def delete_session(db: DbSession, token: str) -> bool:
    """Delete the session for `token` (logout). True if one was removed."""
    session = db.scalar(
        select(Session).where(Session.token_hash == hash_session_token(token))
    )
    if session is None:
        return False
    db.delete(session)
    db.commit()
    return True
