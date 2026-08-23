# Dev log

A running record of what's been built, key decisions, and gotchas.
Newest entries first. For the overall plan see `buildplan.md`.

---

## 2026-08-23 — Phase 3: environment config + Dockerized Postgres

**Goal:** stop hard-coding settings; get a real database running locally.

**Built**
- `docker-compose.yml`: single `postgres:17` service, named volume `pgdata`
  (data persists across restarts), published on port `5432`, with a healthcheck.
- `backend/.env` + committed `backend/.env.example`: `ENVIRONMENT`, `DEBUG`,
  `LOG_LEVEL`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `DATABASE_URL`,
  `FRONTEND_URL`, `CORS_ORIGINS`.
- `frontend/.env` + committed `frontend/.env.example`: `PUBLIC_API_BASE_URL`.
- `backend/app/core/config.py`: reads all settings from env; `secret_key` and
  `database_url` are required (app fails loudly at startup if missing).
- `backend/app/main.py`: FastAPI `lifespan` handler configures logging and logs
  startup/shutdown (never logs secrets).
- `frontend/src/services/api.ts`: `API_BASE_URL` now reads
  `import.meta.env.PUBLIC_API_BASE_URL` instead of a hard-coded string.

**Decisions**
- DB runs in Docker (only the DB for now; app-in-Docker is deferred to Phase 18).
- Keep Postgres on the canonical port `5432` so `docker-compose.yml` +
  `DATABASE_URL` are identical on Arch and Mac.
- `CORS_ORIGINS` is a comma-separated string in `.env` (friendlier than JSON).

**Gotchas learned**
- The Arch box had a local systemd Postgres already on `5432`, blocking the
  container. Fixed with `sudo systemctl disable --now postgresql`.
- pydantic-settings tries to JSON-decode `list` fields from env before
  validators run — annotate with `NoDecode` so a plain comma-separated string
  works.
- After a failed port-bind, `docker compose up` reused the container *without*
  publishing the port. `docker compose up -d --force-recreate` fixed it.

**Verified:** DB connects (PostgreSQL 17.11), settings load from `.env`, startup
log fires, `/api/v1/health` returns `{"status":"ok"}`, frontend `tsc` clean.

---

## Earlier (pre-log)

- **Phase 1 — tooling:** FastAPI backend (`uv`), Qwik frontend, health endpoint
  wired end to end with CORS.
- **Phase 2 — architecture:** split the backend into modules (`main`, `core`,
  `api/router`, `api/routes`); locked conventions (`/api/v1`, snake_case JSON,
  ISO-8601/UTC, ownership from the authenticated user, Pattern A).
