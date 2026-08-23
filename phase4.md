We're building ikemen-ni-naru, a health-tracker app for learning FastAPI + Qwik. Phases 1–3 are done. Now doing Phase 4 (database foundation) from buildplan.md. Read buildplan.md Steps 15–20 for the details, and log.md for the record of what's been built so far.

Current state:
- Database: PostgreSQL 17 runs in Docker via docker-compose.yml (single postgres service, named volume pgdata, port 5432). Start it with docker compose up -d from the repo root — the backend needs it running. On this Arch machine the local systemd Postgres was disabled so Docker owns 5432.
- Backend (backend/app/): modular layout — main.py (app factory + CORS + lifespan startup logging + mounts router), core/config.py (pydantic-settings Settings reading from backend/.env: database_url and secret_key are required, plus environment, debug, log_level, cors_origins, etc.), api/router.py (v1 aggregator), api/routes/health.py (GET /api/v1/health). Deps in pyproject.toml: fastapi, sqlalchemy 2.x, alembic, psycopg[binary], pydantic-settings. Managed with uv (run commands from backend/). DATABASE_URL=postgresql+psycopg://health:health@localhost:5432/health.
- Frontend (frontend/src/): Qwik City. services/api.ts reads import.meta.env.PUBLIC_API_BASE_URL. Not touched in Phase 4.
- Conventions locked: /api/v1 prefix, snake_case JSON, ISO-8601/UTC dates, ownership from authenticated user only, Pattern A (browser → FastAPI direct).

Phase 4 goals (Steps 15–20):
- SQLAlchemy engine + session factory + declarative Base + per-request session dependency (FastAPI Depends), with correct transaction/commit/rollback/close lifecycle. Likely a new database/ module (session.py, base.py) per the Phase 2 layout sketch in buildplan Step 8.
- Alembic init, wired to the model metadata and reading DATABASE_URL from settings (not a hard-coded URL in alembic.ini).
- First schema — users and food_entries tables (see buildplan Step 18 for fields, Step 19 for the data rules: unique normalized email, non-negative calories/macros, FK to user, timestamps, etc.).
- Create and verify the first migration (build a fresh DB from migrations, check rollback, FK + unique constraints work).

Working preferences (important):
- I'm on Omarchy (Arch) Linux, alsDokku/Linode) — keep everythingenv-driven and cross-machine.
- I have limited Docker/SQLAlchemy concepts as you go.
- Show me a plan before writing code, and ask me about any real decisions (e.g. whether
weight/mood/sleep allow multiple ee vs anonymize, sync vs asyncSQLAlchemy).
- I make my own git commits — don' ready and suggest a commitmessage.
- Keep log.md updated (newest-firsDon't turn buildplan.md into astatus log.                                                                                      
Please start by reading buildplan.md Steps 15–20 and the current backend files, then show me the Phase 4 plan.
