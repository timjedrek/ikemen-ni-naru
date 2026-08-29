"""Shared route dependencies (buildplan Step 31).

`get_current_user` is the single gate every protected route uses. It reads the
session cookie, validates the session, loads the user, and rejects anything
inactive or invalid — so no route re-implements auth.
"""

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud import session as session_crud
from app.crud import user as user_crud
from app.database.session import get_db
from app.models.user import User

# Reused for both "no cookie" and "bad/expired cookie": we don't distinguish, to
# avoid leaking whether a token was ever valid.
_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
)


def get_current_user(
    db: Session = Depends(get_db),
    # FastAPI reads the cookie named by settings.session_cookie_name. The alias
    # is set at import time from config; default name is "session".
    session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> User:
    if not session_token:
        raise _UNAUTHENTICATED

    session = session_crud.get_valid_session(db, session_token)
    if session is None:
        raise _UNAUTHENTICATED

    user = user_crud.get_user_by_id(db, session.user_id)
    if user is None or not user.is_active:
        raise _UNAUTHENTICATED

    return user
