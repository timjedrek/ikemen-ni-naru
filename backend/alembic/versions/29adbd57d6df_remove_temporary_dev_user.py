"""remove temporary dev user

Revision ID: 29adbd57d6df
Revises: f62e5ff43d56
Create Date: 2026-08-29 15:40:01.747832

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '29adbd57d6df'
down_revision: Union[str, Sequence[str], None] = 'f62e5ff43d56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# buildplan Step 35: real authentication now exists, so the Phase 5 stopgap
# owner is retired. Deleting the row cascades to any entries/sessions it owned.
_TEMP_DEV_USER_ID = 1
_UNUSABLE_PASSWORD_HASH = "!"


def upgrade() -> None:
    """Remove the temporary seeded dev user."""
    op.execute(
        sa.text("DELETE FROM users WHERE id = :id").bindparams(id=_TEMP_DEV_USER_ID)
    )


def downgrade() -> None:
    """Re-insert the temporary dev user (mirrors the original seed migration)."""
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
                "id": _TEMP_DEV_USER_ID,
                "email": "dev@example.com",
                "password_hash": _UNUSABLE_PASSWORD_HASH,
                "display_name": "Dev User",
            }
        ],
    )
    op.execute(
        "SELECT setval("
        "pg_get_serial_sequence('users', 'id'), "
        "(SELECT MAX(id) FROM users))"
    )
