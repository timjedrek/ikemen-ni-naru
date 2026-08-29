"""TEMPORARY ownership stopgap — REMOVE IN PHASE 6 (authentication).

Food entries require an owning user (`food_entries.user_id`), but real
authentication does not exist yet (buildplan Phase 6). To build and test the
food vertical slice (Phase 5) end to end, every entry is attributed to a single
seeded development user with this fixed id.

This is deliberately NOT a real design:
- There is exactly one hard-coded owner; there is no login, no session, no way
  to act as anyone else.
- The user row is created by a data migration, not by any real signup flow.

Phase 6 replaces every use of `TEMP_DEV_USER_ID` with the id of the
authenticated request user, and drops the seeded row. Grep for
`TEMP_DEV_USER_ID` to find every call site that must change.
"""

# The seeded dev user's fixed primary key. Matches the row inserted by the
# "seed temporary dev user" Alembic migration.
TEMP_DEV_USER_ID = 1
