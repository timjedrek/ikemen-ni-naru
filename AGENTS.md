# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Agent guide

Conventions for AI/agents working in this repo.

## Project overview

A health-tracker app (food, weight, mood, sleep) built with FastAPI + Qwik. Live at health.timjedrek.com.

## Dev commands

### Backend (from `backend/`)
```bash
uv run fastapi dev          # starts API at http://127.0.0.1:8000
uv run alembic upgrade head # apply DB migrations
uv run alembic revision --autogenerate -m "description"  # new migration
```

### Frontend (from `frontend/`)
```bash
npm run dev        # starts at http://localhost:5173
npm run lint       # eslint
npm run fmt        # prettier
npm run build      # production build
```

### Database (from repo root)
```bash
docker compose up -d   # start Postgres (required for backend)
docker compose down    # stop (data kept)
docker compose down -v # stop and delete data
```

## Architecture

**Backend:** FastAPI (Python 3.14+), managed with `uv`. SQLAlchemy ORM + Alembic migrations. PostgreSQL in Docker.

Layer structure:
- `backend/app/api/routes/` — route handlers (one file per resource)
- `backend/app/crud/` — DB queries (one file per model)
- `backend/app/models/` — SQLAlchemy ORM models
- `backend/app/schemas/` — Pydantic request/response schemas
- `backend/app/core/config.py` — Settings via pydantic-settings (reads `backend/.env`)
- `backend/app/api/deps.py` — `get_current_user` dependency used by all protected routes
- `backend/alembic/versions/` — migration history

Auth uses opaque session tokens stored in an HttpOnly cookie named `session` (14-day TTL). The `get_current_user` dependency in `deps.py` is the single auth gate — no route re-implements it.

**Frontend:** Qwik + QwikCity (file-based routing), TypeScript, Tailwind CSS v4, ECharts for charts.

Key files:
- `frontend/src/routes/` — pages (food, weight, mood, sleep, dashboard, day/[date])
- `frontend/src/services/api.ts` — all backend calls; API_BASE_URL from `PUBLIC_API_BASE_URL` env var
- `frontend/src/hooks/use-tracker-log.ts` — shared hook used by all four tracker pages (auth gate, Day/Feed modes, infinite scroll, CRUD wiring)
- `frontend/src/components/tracker/` — shared tracker UI components (TrackerShell, FormCard, EntryRow, StatCard, etc.)
- `frontend/src/types/` — TypeScript types matching backend schemas

The browser calls FastAPI directly (no server proxy). All API routes are prefixed `/api/v1`. JSON uses `snake_case`, dates are ISO 8601, timestamps stored in UTC.

## Conventions

- New resource: add model, schema, crud, route, include in `api/router.py`, create migration.
- Ownership always comes from the authenticated session user — never from a client-supplied `user_id`.
- `frontend/.env` var `PUBLIC_API_BASE_URL` must be `PUBLIC_`-prefixed to be exposed to browser code by Vite.
- Do not commit `backend/.env` (gitignored). Generate `SECRET_KEY` with `openssl rand -hex 32`.

## Dev log (`log.md`)

`log.md` is a running record of changes, decisions, and gotchas — newest entries
first, append-only (never edit or delete existing entries).

**The log tracks changes made by AI/agents.** When you (an agent) finish a piece
of work, add a new entry.

**The human (Tim) does not update the log for his own edits.** So the log is not
a complete history of the repo. If the log and the actual code disagree, the code
is right — Tim made a change by hand.

**Before relying on the log for context, cross-check `git history`.** If recent
commits aren't reflected in the log, that's expected: those are Tim's own edits.
Use `git log`, `git show`, and `git diff` to see what actually changed rather than
assuming the log is exhaustive.

## Commits

Tim does his own git commits — don't commit on his behalf unless asked.
