"""seed temporary dev user

Revision ID: 1fe11a2c1211
Revises: 9ac5c800f158
Create Date: 2026-08-29 15:09:07.496781

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1fe11a2c1211'
down_revision: Union[str, Sequence[str], None] = '9ac5c800f158'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# TEMPORARY (buildplan Phase 5) — REMOVE IN PHASE 6 (authentication).
# Seeds the single hard-coded owner that the food vertical slice attributes all
# entries to while real login does not exist yet. Kept in sync with
# app.core.temp_owner.TEMP_DEV_USER_ID.
TEMP_DEV_USER_ID = 1

# Unusable password hash: not a valid hash of any password, so this account can
# never be logged into even after auth lands — it exists only as an FK target.
_UNUSABLE_PASSWORD_HASH = "!"


def upgrade() -> None:
    """Insert the temporary dev user."""
    users = sa.table(
        "users",
        sa.column("id", sa.Integer),
        sa.column("email", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("display_name", sa.String),
    )
    op.bulk_insert(
        users,
        [
            {
                "id": TEMP_DEV_USER_ID,
                "email": "dev@example.com",
                "password_hash": _UNUSABLE_PASSWORD_HASH,
                "display_name": "Dev User",
            }
        ],
    )
    # We inserted an explicit id, which does not advance the identity sequence.
    # Bump it past the seeded row so any real INSERT (Phase 6) won't collide.
    op.execute(
        "SELECT setval("
        "pg_get_serial_sequence('users', 'id'), "
        "(SELECT MAX(id) FROM users))"
    )


def downgrade() -> None:
    """Remove the temporary dev user (cascades to its food entries)."""
    op.execute(sa.text("DELETE FROM users WHERE id = :id").bindparams(id=TEMP_DEV_USER_ID))
