# Dev log

A running record of what's been built, key decisions, and gotchas.
Newest entries first. For the overall plan see `buildplan.md`.

---

## 2026-08-29 — UI: Tailwind styling, dark/light theme, and branding

**Goal:** make the app look modern (Refactoring UI principles) with a green +
purple palette, a proper light/dark toggle, and the new logo.

**Built (styling)**
- Tailwind v4 via `@tailwindcss/vite` (plugin in `vite.config.ts`; single
  `@import "tailwindcss"` in `global.css`). No config file — theme lives in CSS.
- Restyled all four pages (home, login, register, `/food`): centered auth cards,
  a food-log app bar + two-column grid (sticky form / entries), macro **totals**
  stat tiles, meal-category badges, empty state. Logic untouched — markup/classes
  only.

**Built (theming)**
- **Semantic color tokens** in `global.css` (`surface`, `surface-muted`,
  `foreground`, `muted`, `subtle`, `line`, `line-strong`). Light values in
  `@theme`; a `.dark {}` block re-points them. Utilities resolve through `var()`,
  so the whole UI flips by toggling one `.dark` class on `<html>` — no `dark:`
  needed for ordinary chrome. The vivid brand (emerald) / accent (violet) palette
  stays constant; only tinted bits (badges, error banners, delete btn) got
  explicit `dark:` variants via `@custom-variant dark`.
- `ThemeToggle` component: toggles `.dark`, persists to localStorage; sun/moon
  swap purely by CSS so there's no hydration mismatch.
- No-flash inline script in `root.tsx <head>` applies saved (or `prefers-color-
  scheme`) theme **before first paint**.

**Built (logo)**
- `components/logo/logo.tsx`: inline SVG `Logo` (icon + イケメンになる wordmark)
  and `LogoMark` (icon only). Chose inline over `<img>` so the wordmark can be
  theme-aware. Wired into home hero, auth pages, and food header; replaced the
  stock Qwik `favicon.svg` with the mark.

**Decisions / gotchas**
- Inline SVG (not `<img>`) so the neutral wordmark flips
  (`fill-slate-700 dark:fill-slate-100`); accent `る` keeps violet.
- Unique gradient id per logo instance via `useId()` to avoid `url(#id)`
  collisions when two logos share a page.
- Wordmark uses **system** Japanese fonts (Hiragino / Noto Sans JP / Yu Gothic) —
  renders per-OS. Embed a webfont / outline the paths later if pixel-identical
  rendering is needed.
- Home hero logo sizing/alignment tweaks: bumped to `h-32`; added `self-start`
  so the flex column doesn't stretch the SVG box and center its content; cropped
  the lockup `viewBox` left gutter (`0 0 820 280` → `48 0 772 280`) so the mark's
  left edge lines up with the "Health Tracker" heading below it.

**Verified:** `build.types` (tsc) + `qwik build` clean. Confirmed in the emitted
CSS: the `.dark` token override block, `var()`-based semantic utilities, and the
`dark:` + `fill-*` variants all generate.

---

## 2026-08-29 — Phase 6: authentication and user isolation

**Goal:** real users, per-user data isolation, and a browser-safe session.

**Decision:** opaque server-side sessions (not JWT). A random token in an
HttpOnly + SameSite=Lax cookie (Secure outside dev); the DB stores only the
token's SHA-256. Logout = delete the row (instant revocation). Password hashing
via argon2 (`argon2-cffi`). Chosen over JWT for simplicity + trivial revocation;
JWTs deferred as a possible later learning exercise.

**Built (backend)**
- `core/security.py`: argon2 hash/verify, email normalization, `secrets` token
  gen, SHA-256 token hashing (raw token never stored).
- `models/session.py` + migration `f62e5ff43d56`: `sessions` (token_hash unique,
  user_id CASCADE, expires_at).
- `crud/user.py`, `crud/session.py`; `api/deps.py` `get_current_user` (the one
  auth gate); `api/routes/auth.py` register/login/logout/me.
- Food routes now depend on `get_current_user`, scoped by `current_user.id`.
- **Temp ownership removed** (Step 35): deleted `core/temp_owner.py`, migration
  `29adbd57d6df` drops the seeded dev user.

**Built (frontend)**
- `services/api.ts`: `credentials: "include"` on every call (cross-origin cookie),
  auth calls + `getCurrentUser()` (401 → null).
- `routes/login`, `routes/register` (pending/error/redirect, bounce
  already-authed to /food); `/food` guarded (redirect to /login, no data flash)
  with a logout control; nav links on home.

**Gotcha (cost us real debugging time)**
- `get_db` committed *after* `yield`. FastAPI runs yield-dependency teardown
  **after the response is sent**, so register's session row committed only after
  the browser already had its cookie — an immediate `GET /auth/me` (or /food
  load) raced the commit and got 401. TestClient hid it (it drives the full
  request lifecycle synchronously). Fix: `get_db` no longer commits; the CRUD
  write functions commit explicitly, so writes are durable before the response
  is built. Confirmed: `/me` immediately after register now 200 (was 401; a 1s
  sleep also "fixed" it, which is what pinned it to commit timing).

**Verified:** two-account checkpoint over real HTTP (curl, cross-origin) AND
TestClient — isolation (B can't see/GET/PATCH/DELETE A's entries → 404), logout
revokes immediately, email normalized, dup → 409, wrong-pw/unknown-user both
generic 401, short pw → 422. Frontend `tsc` + `qwik build` clean.

---

## 2026-08-29 — Phase 5: first vertical slice (food entries, end to end)

**Goal:** prove the whole stack hangs together on one feature — Pydantic
schemas ↔ CRUD ↔ endpoints ↔ Qwik page ↔ Postgres — before adding auth.

**Built (backend)**
- `app/schemas/food_entry.py`: `FoodEntryCreate` / `Update` / `Response` /
  `FoodEntryList` (+ `DailyTotals`, `MealCategory` enum). Kept separate from the
  ORM model so clients can't set `user_id`/timestamps; validation mirrors the DB
  (macros `ge=0` + `Numeric(6,2)`, calories `ge=0`).
- `app/crud/food_entry.py`: create/get/list/update/delete + `sum_food_entries`.
  Owner is a **parameter**, not read from the temp constant — so Phase 6 changes
  only the routes. `get` scopes by owner (wrong owner → None).
- `app/api/routes/food_entries.py`: the 5 endpoints under `/api/v1/food-entries`.
  List starts with date + limit/offset only (other filters deferred). Empty
  PATCH → 422; missing id → 404; delete → 204.
- Alembic `1fe11a2c1211_seed_temporary_dev_user`: seeds the one hard-coded owner.

**Built (frontend)**
- `types/food-entry.ts`, `services/api.ts` (added `ApiError` that surfaces
  FastAPI `detail`, JSON-body handling, 204 → undefined, food-entry calls).
- `routes/food/index.tsx`: date picker, add/edit form (pending-disable, server
  error display, reset-on-success, accessible labels), daily list with
  edit/delete + empty state, and server-computed daily totals rendered as-is.

**Decisions**
- **Temporary ownership stopgap** (`app/core/temp_owner.py`, `TEMP_DEV_USER_ID`):
  auth is Phase 6, but entries need an owner now. One seeded dev user (fixed id
  1, unusable password hash `"!"`), attributed at the route layer only. Loud
  `# TEMPORARY: remove in Phase 6` markers; `grep TEMP_DEV_USER_ID` finds all 3
  touchpoints (constant, migration, route). Removed by downgrading the seed.
- Macros serialized as JSON strings (Decimal precision); UI keeps them as-is.
- Totals computed in SQL over the full filtered set (not the page) so every
  client renders identical numbers (Step 27).

**Verified:** all 5 endpoints via TestClient (create 201, bad meal/negative cal
422, list+totals, get 404, empty PATCH 422, delete 204/404) and over real HTTP
via curl incl. CORS header for `localhost:5173`. Seed migration round-trips
(downgrade removes user → None, re-upgrade restores). Frontend `tsc` + `qwik
build` clean. Test rows cleaned up.

---

## 2026-08-29 — Phase 4: database foundation (SQLAlchemy + Alembic + first schema)

**Goal:** stop having no persistence; wire the ORM, migrations, and the first
tables (`users`, `food_entries`) so Phase 5 can build the food vertical slice.

**Built**
- `backend/app/database/`: `base.py` (`Base(DeclarativeBase)` + `TimestampMixin`
  with server-side `now()` UTC `created_at`/`updated_at`), `session.py` (sync
  `engine` with `pool_pre_ping`, `SessionLocal` factory, `get_db()` request
  dependency: open → yield → commit/rollback → close).
- `backend/app/models/`: `User` and `FoodEntry`. `__init__.py` imports both so
  they register on `Base.metadata`.
- Alembic: `alembic init alembic`; `env.py` sets `sqlalchemy.url` from
  `settings.database_url` and points `target_metadata` at `Base.metadata`
  (imports `app.models` for the side effect). URL removed from `alembic.ini`.
- First migration `9ac5c800f158_create_users_and_food_entries`.

**Decisions**
- Sync SQLAlchemy (not async) — simpler to learn/debug, fine for this load.
- Only `users` + `food_entries` this phase; weight/mood/sleep deferred to Phase 7.
- User deletion → `ON DELETE CASCADE` (personal, per-user private data).
- Macros as `Numeric(6,2)`, calories `Integer`; non-negativity as DB `CHECK`
  constraints; unique index on (normalized) `email`.

**Verified:** `upgrade head` builds all tables; `downgrade base` drops them
cleanly; re-upgrade works. Constraints reject bad data (duplicate email, orphan
FK, negative calories) and accept valid rows. Cascade confirmed: deleting a user
removed their food entries. App + db modules import cleanly.

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
