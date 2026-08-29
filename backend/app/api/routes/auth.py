"""Authentication endpoints (buildplan Step 30).

Session flow (opaque token, Option 1):
- register/login create a session row and set an HttpOnly cookie holding the raw
  token; the DB stores only its hash.
- logout deletes the session row and clears the cookie (immediate revocation).
- me returns the authenticated user via the shared dependency.
"""

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import verify_password
from app.crud import session as session_crud
from app.crud import user as user_crud
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import UserLogin, UserRegister, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    """Attach the session cookie: HttpOnly (no JS access), SameSite=Lax (basic
    CSRF defense), Secure outside dev, scoped to the whole site."""
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
def register(data: UserRegister, response: Response, db: Session = Depends(get_db)) -> User:
    # Friendly duplicate check; the DB unique constraint is the real authority.
    if user_crud.get_user_by_email(db, data.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    user = user_crud.create_user(
        db, email=data.email, password=data.password, display_name=data.display_name
    )
    # Auto-login: issue a session so the client is authenticated immediately.
    token = session_crud.create_session(db, user.id, ttl_days=settings.session_expire_days)
    _set_session_cookie(response, token)
    return user


@router.post("/login", response_model=UserResponse)
def login(data: UserLogin, response: Response, db: Session = Depends(get_db)) -> User:
    user = user_crud.get_user_by_email(db, data.email)
    # One generic error whether the email is unknown or the password is wrong,
    # so we don't reveal which accounts exist (buildplan Step 29). Verify a hash
    # even when the user is missing would be ideal to equalize timing; kept
    # simple here, noting the trade-off.
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled."
        )
    token = session_crud.create_session(db, user.id, ttl_days=settings.session_expire_days)
    _set_session_cookie(response, token)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> None:
    # Idempotent: delete the session row if present, and always clear the cookie.
    # No auth dependency here so a stale/expired cookie can still be cleared.
    if session_token:
        session_crud.delete_session(db, session_token)
    _clear_session_cookie(response)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
