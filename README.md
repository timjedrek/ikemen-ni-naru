# ikemen ni naru

A health-tracker app for learning FastAPI and Qwik. It tracks food intake, weight,
mood, and sleep.

**Live at [health.timjedrek.com](https://health.timjedrek.com).**

**Backend:** FastAPI (Python), managed with `uv`.
**Frontend:** Qwik (JavaScript/TypeScript).
**Database:** PostgreSQL, run locally in Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (with Compose) — for the database
- [uv](https://github.com/astral-sh/uv) — for the Python backend
- Node.js + npm — for the frontend

## First-time setup

1. **Create your local env files** from the committed templates:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   The defaults work for local development. `backend/.env` holds secrets and is
   gitignored — never commit it. Generate a real `SECRET_KEY` with
   `openssl rand -hex 32`.

2. **Install frontend dependencies:**

   ```bash
   cd frontend && npm install
   ```

## Running locally

Start the pieces in three terminals (or background the first two).

1. **Database** (from the repo root):

   ```bash
   docker compose up -d      # start Postgres in the background
   ```

   The backend expects this running. Stop it with `docker compose down`
   (data is kept) or `docker compose down -v` (data is deleted).

2. **Backend** (from `backend/`):

   ```bash
   uv run fastapi dev
   ```

   Serves the API at http://127.0.0.1:8000 (health check:
   http://127.0.0.1:8000/api/v1/health).

3. **Frontend** (from `frontend/`):

   ```bash
   npm run dev
   ```

   Serves the app at http://localhost:5173.

## Database

PostgreSQL runs in a single Docker container defined in `docker-compose.yml`
(named volume for persistence, exposed on the standard port `5432`). The backend
connects via the `DATABASE_URL` in `backend/.env`, so the same setup works
identically across machines.

> **Note (Linux):** if `docker compose up` fails with "port 5432 already in use",
> a local PostgreSQL service is likely holding the port. Disable it with
> `sudo systemctl disable --now postgresql`, or change the published port in
> `docker-compose.yml` and `DATABASE_URL` to match.

## Conventions

- API routes are prefixed with `/api/v1`.
- JSON uses `snake_case`; dates are ISO 8601; timestamps are stored in UTC.
- The browser calls FastAPI directly (see `buildplan.md`, Phase 2).

## What does "ikemen ni naru" mean?

*Ikemen* (イケメン) is Japanese slang for a handsome, cool, or attractive man.
*Ni naru* (になる) means "to become" / "to turn into" — a change from one state
to another.

So the idea: if you use the app to track your diet, sleep, and mood, you'll
*become a chill guy*.

## Roadmap

See `buildplan.md` for the full phased plan, and `log.md` for a running record
of what's been built and why.
