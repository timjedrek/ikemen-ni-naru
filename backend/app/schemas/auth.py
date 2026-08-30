"""Auth request/response schemas (buildplan Phase 6)."""

from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.security import MIN_PASSWORD_LENGTH


class UserRegister(BaseModel):
    """Registration input. EmailStr validates shape; the service normalizes it.
    Password floor enforced here so a too-short password fails with a clean 422
    before we ever hash it."""

    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)
    display_name: str | None = Field(default=None, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdate(BaseModel):
    """Edit the signed-in user's own profile. Every field optional so the client
    sends only what changes; the route rejects an empty payload. `current_password`
    is not a profile field — it re-confirms identity when the email changes."""

    display_name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    # The client sends the browser's IANA zone (e.g. "America/Chicago") so the
    # dashboard can bucket UTC-stored instants into the right local day. Rejected
    # if it isn't a real zone — better a clean 422 than silently storing garbage
    # the read side would just fall back to UTC on.
    timezone: str | None = Field(default=None, max_length=64)
    current_password: str | None = Field(default=None, max_length=128)

    @field_validator("timezone")
    @classmethod
    def _known_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Unknown timezone") from exc
        return v


class PasswordChange(BaseModel):
    """Change password: prove the current one, then set a new one held to the
    same minimum length as registration."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)


class UserResponse(BaseModel):
    """The safe public view of a user — never includes the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str | None
    timezone: str
    is_active: bool
    created_at: datetime
