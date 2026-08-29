from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Session(Base, TimestampMixin):
    """A logged-in session (opaque-token auth, Phase 6).

    We store the SHA-256 of the session token, never the raw token, so a leaked
    table can't be used to impersonate users. Logout deletes the row, which
    revokes access immediately — the property that makes opaque sessions simpler
    than JWTs for this app.
    """

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Deleting a user removes their sessions (ON DELETE CASCADE at the DB level).
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # SHA-256 hex digest of the token (64 chars). Unique so a token maps to at
    # most one session; indexed because every authenticated request looks up by it.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # Absolute expiry. A session is valid only while now() < expires_at.
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="sessions")
