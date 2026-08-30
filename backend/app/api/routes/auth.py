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
from app.core.security import normalize_email, verify_password
from app.crud import session as session_crud
from app.crud import user as user_crud
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import (
    PasswordChange,
    ProfileUpdate,
    UserLogin,
    UserRegister,
    UserResponse,
)

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


# Wrong current password on a self-service change. Distinct from the login 401
# and the "not authenticated" 401 — the session is valid, the re-auth just failed.
_BAD_CURRENT_PASSWORD = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN, detail="Current password is incorrect."
)


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    # `current_password` is a confirmation input, not a profile field — the only
    # things actually updatable here are display_name and email.
    changes = data.model_dump(exclude_unset=True)
    changes.pop("current_password", None)
    if not changes:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide at least one field to update.",
        )

    # An email change is sensitive: require the current password, and enforce the
    # same one-account-per-email rule as registration (normalized compare; the DB
    # unique constraint is still the authority). A no-op "change" to the same
    # address is allowed through without a password prompt.
    if "email" in changes and normalize_email(changes["email"]) != current_user.email:
        if not data.current_password or not verify_password(
            data.current_password, current_user.password_hash
        ):
            raise _BAD_CURRENT_PASSWORD
        existing = user_crud.get_user_by_email(db, changes["email"])
        if existing is not None and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

    return user_crud.update_user_profile(db, current_user, changes)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> None:
    if not verify_password(data.current_password, current_user.password_hash):
        raise _BAD_CURRENT_PASSWORD
    user_crud.change_user_password(db, current_user, data.new_password)
    # Revoke every other session so an old, possibly-leaked password can't keep a
    # live session; the caller's current cookie stays valid.
    session_crud.delete_user_sessions_except(db, current_user.id, session_token)
