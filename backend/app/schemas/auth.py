"""Auth request/response schemas (buildplan Phase 6)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

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


class UserResponse(BaseModel):
    """The safe public view of a user — never includes the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str | None
    timezone: str
    is_active: bool
    created_at: datetime
