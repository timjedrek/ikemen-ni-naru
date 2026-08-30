# Dev log

A running record of what's been built, key decisions, and gotchas.
Newest entries first. For the overall plan see `buildplan.md`.

---

## 2026-08-29 — Fix: dashboard food chart ignored the date-range selector

**Bug:** flipping the 7d/14d/30d (or custom) range redrew the weight/mood/sleep
charts but left the **food** chart looking identical every time.

**Cause:** `foodOption` built its x-axis straight from the API rows
(`series.items.map((p) => p.date)`), so it only ever showed *days that had food
logged*. Those days don't change when you widen the window, so the chart never
appeared to move. The other three charts lay their data over the full `days`
window via the shared `dayCategoryAxis(days, …)`, which is why they responded.

**Fix (`frontend/src/routes/dashboard/index.tsx`):** `foodOption` now takes the
same `days` array and spans the full selected window. Data is indexed by date
into a `Map`, then mapped over `days`; unlogged days render as a 0 column
instead of being dropped. x-axis switched to `dayCategoryAxis` for the same
weekday labelling as the others; each point keeps its `date` so click-to-drill
still works. Typecheck + eslint clean.

---

## 2026-08-29 — Phase C: production packaging (Docker images, both apps)

**Goal:** get both apps production-shaped and building/running from prod configs
locally, before touching the Linode/Dokku server (Phase D).

**Topology decided (C3):** single-origin — the app lives on its own subdomain
`health.timjedrek.com`, frontend at `/`, backend at `/api/*`. Same origin →
**zero CORS**, session cookie is plain `SameSite=Lax; Secure` on one host. Kept
the `/api/v1` prefix (room for a future `/api/v2`; also makes the eventual Dokku
nginx rule trivial — everything the backend serves already lives under `/api/`,
so `location /api/ → backend` needs no rewrite). No app-code changes needed for
topology; the config was already fully env-driven. Confirmed **all** frontend
API calls run in `useVisibleTask$` (client only — no `routeLoader$`/`server$`
anywhere), so a **relative `/api/v1`** base URL works in prod with no
server-side internal URL.

**Backend (C1) — `backend/Dockerfile` + `.dockerignore` + `app.json`:**
- Two-stage image: builder installs from the **locked** `uv.lock`
  (`uv sync --frozen --no-dev`, `ghcr.io/astral-sh/uv:python3.14-...` base) into
  a self-contained venv; runtime is `python:3.14-slim` carrying just the venv +
  code, running as a **non-root** `app` user. ASGI server is env-driven:
  `uvicorn app.main:app --port ${PORT:-8000} --workers ${WEB_CONCURRENCY:-2}`,
  exec'd so uvicorn is PID 1 (clean shutdown signals).
- Migrations are an **explicit** deploy step, never on startup: `app.json`
  `scripts.dokku.predeploy: "alembic upgrade head"` (fallback:
  `dokku run backend alembic upgrade head`).
- **Health path decision:** kept existing `/api/v1/health` — no new endpoint.
  Dokku's `CHECKS` hits the container directly on its own port (bypasses the
  public `/api` nginx routing), so it just needs a path the app serves.
- Verified: image builds (355 MB); boots against local Postgres with 2 workers;
  `/api/v1/health` → 200; `alembic upgrade head` runs inside the image and
  `alembic current` → `dd1361b0bad5 (head)`.

**Frontend (C2) — Qwik Node server adapter + `frontend/Dockerfile`:**
- `npm run qwik add node-server` → `adapters/node-server/vite.config.ts`,
  `src/entry.node-server.tsx` (reads `process.env.PORT`, default 3004),
  `build.server` + `serve` scripts.
- `PUBLIC_API_BASE_URL` is **baked at build time** (Vite inlines `PUBLIC_*`), so
  prod passes it as a Docker **build ARG** (default `/api/v1`), not a runtime
  var. Dev keeps `.env` (`http://localhost:8000/api/v1`); documented both in
  `.env.example`.
- `frontend/Dockerfile`: `node:22-slim` build stage (`npm ci` + `npm run build`
  with the ARG) → slim runtime carrying only `dist/` + `server/` + one external
  runtime dep. **Gotcha:** the qwik node bundle imports **`undici`** at runtime
  (a `devDependencies` entry, zero-dep itself) — first runtime crashed with
  `ERR_MODULE_NOT_FOUND: undici`; fixed by copying just
  `node_modules/undici` into the runtime image. Runs as the base image's `node`
  user.
- Verified: full `qwik build` clean (only pre-existing warnings); `build.types`
  (tsc) clean; image builds (330 MB), boots, serves SSR HTML on `/` (200, real
  markup + wordmark), static `/build/*` assets 200, and every route
  (`/login /dashboard /settings /food /weight /mood /sleep`) resolves 200 (via
  Qwik's canonical trailing-slash 301 → 200).

**Gotcha (environment, not code):** backgrounded shell processes get SIGTERM'd
in this sandbox, so a bare `node server/…` couldn't be kept alive to test —
detached Docker containers survive, so both apps were verified as containers
(which is also the Phase D artifact). Also noted: startup log shows `debug=True`
under `ENVIRONMENT=production` because `config.py` defaults `debug=True` — set
`DEBUG=false` in the prod env vars in Phase D (no code change).

**Done when (met):** both apps build and run from their production configs
locally, driven entirely by environment/build variables. Next: Phase D
(Linode + Dokku) — needs server IP, domain, and Dokku access.

---

## 2026-08-29 — AppHeader: one fixed width (follow-up to Phase B)

Follow-up to the header refactor below. The settings page's nav looked squished:
the first cut gave `AppHeader` a per-page `width` prop matching each page's body
width, and settings' body is the narrowest (`max-w-3xl`), which didn't leave room
for the nav (5 links + date picker + account link + toggle + logout).

Fix: the header now uses **one fixed content width (`max-w-6xl`) on every page**,
independent of the body below it, and the `width` prop is gone. This lines the
bar up identically site-wide and kills the whole "narrow page = cramped nav"
class of bug. Body widths stay per-page (dashboard 6xl, logs 5xl, day 4xl,
settings 3xl); only the top bar is unified. All six call sites now render
`<AppHeader user={authUser.value} />`. `tsc --noEmit` clean.

---

## 2026-08-29 — Phase B: account settings + shared header refactor

**Goal:** let a signed-in user edit their own account (name / email / password),
the last feature before deploy. Goals were originally Phase B but got **deferred
to `future-features.md`** — nice-to-have, not a blocker. Plan docs updated to
match (`build-plan-updated-for-deployment.md`, `future-features.md`).

**Backend (reuses the auth slice — no new tables/migration):**
- `PATCH /api/v1/auth/me` — update `display_name` and/or `email`. Empty payload →
  422. An email change is gated: requires the **current password** and re-checks
  uniqueness (friendly 409; DB constraint still the authority). A no-op change to
  the same address is allowed without a password prompt.
- `POST /api/v1/auth/password` — verify current password, set the new one (same
  8-char floor as registration), then **revoke all other sessions** for the user
  while keeping the caller's current cookie (`delete_user_sessions_except`).
- New: `schemas.auth.ProfileUpdate` / `PasswordChange`,
  `crud.user.update_user_profile` / `change_user_password`, and the session
  bulk-revoke. Wrong current password returns **403** (distinct from the login /
  not-authenticated 401 — the session is valid, the re-auth just failed).

**Frontend:**
- New `/settings` page: Profile (name + email; the current-password field only
  appears once the email is actually changed) and Password (current / new /
  confirm, with client-side length + match checks). Green success / red error
  alerts; on save the header's "Signed in as" reflects the new name immediately.
- `services/api.ts`: `updateProfile`, `changePassword`.

**Shared header refactor (DRY).** The top bar was copy-pasted across all six
authed pages. Extracted it into one `components/app-header/app-header.tsx` that
owns the logo, `LogNav`, the account link, theme toggle, and logout. Every page
now renders `<AppHeader user={authUser.value} width="max-w-{4,5,6}xl" />` instead
of ~26 lines of duplicated markup, and dropped the now-dead imports + per-page
`doLogout`. The header now shows the **full `Logo` lockup** (the イケメンになる
wordmark, linked to /dashboard) in place of the old per-page title text, and the
**"Signed in as {name}" text is the link into `/settings`** (per request — no
separate nav item).

**Timezone (investigated, intentionally left alone).** Storage is UTC instants;
the log pages read/display in the *browser's* local zone. The only consumer of
`users.timezone` is the dashboard day-bucketing, and that column is hard-defaulted
to `"UTC"` and never written — so the dashboard buckets at UTC midnight while the
log pages read local. Latent day-boundary quirk, not yet biting; documented in
`future-features.md`. Settings deliberately omits timezone to avoid that
complexity pre-deploy.

**Verified:** `tsc --noEmit` clean; backend imports clean; user confirmed the
settings flows in the browser. Next: Phase C (production packaging) → deploy.

---

## 2026-08-29 — Phase A: dashboard chart refinements

**Goal:** make the weight/mood/sleep charts actually read correctly against a
hand-drawn reference (weight-over-time notebook chart). All in
`routes/dashboard/index.tsx` (+ `components/chart/chart.tsx`).

**Weight & mood — fan-out connections, spaced by date**
- Old line series threaded points sequentially, so on a day with two readings
  the previous day connected to only *one* of them. Now each day's points are
  fully connected to the next day-with-data's points (a bipartite join,
  `daySegments`): every dot on day N gets a line to every dot on day N+1 →
  the diamond/zigzag clusters from the reference.
- Rendered as a `lines` series (`silent`, the segments) + a `scatter` series
  (the clickable dots on top). `min-w-0` added so nothing forces overflow.
- **Spaced by date, not clock time.** Points sit on day-*column* indices
  (category x-axis), so days are evenly spaced and same-day readings stack on
  one column. The real timestamp rides along on each dot's data as `t` for the
  tooltip, which now shows date + time (e.g. "Fri 8/29, 7:14 AM" over the value).
  (Briefly tried a `type: "time"` axis — spaced by instant — but that spread
  same-day points and read as "by time"; reverted to category-by-date.)

**Sleep — fixed, inverted clock window**
- Y-axis is now a **fixed 24h window anchored at 8 PM, drawn top-down**
  (`inverse: true`, `min:-4 max:20 interval:4`): 8 PM at top → midnight →
  morning → 8 PM next day at bottom. Overnight sleep reads like a timeline
  (bedtime near top, wake below). A fixed frame keeps nights comparable and
  stops a stray daytime nap from stretching/squishing the overnight bars.
  Trade-off: sleeps outside 8 PM–8 PM clip at the edges.
- Labels switched to 12-hour AM/PM (`clockLabel`) so evening vs. morning is
  unambiguous. `renderItem` rewritten to be orientation-independent (span from
  `min` pixel-y by `abs` height) so the inverted axis draws correctly.

**Chart responsiveness.** `chart.tsx` now resizes via a `ResizeObserver` on the
container (not just `window` resize), so the canvas shrinks when the grid
collapses to one column — fixes horizontal-scroll overflow on mobile.

**Date range.** Default is now **last 7 days**; added quick presets
(7 / 14 / 30 / 60 / 90 d) alongside the custom From/To pickers (a custom pick
clears the preset highlight).

**Verified:** `tsc --noEmit` clean. User confirmed weight/mood fan-out and the
new sleep labels against a live screenshot.

---

## 2026-08-29 — Phase A: charts dashboard + day drill-down

**Goal:** the payoff screen — a charts-first dashboard over all four trackers,
with click-to-drill into a single day. See
`build-plan-updated-for-deployment.md` (Phase A).

**Built (backend)** — a dedicated read model, not raw rows to the browser:
- `schemas/analytics.py`, `crud/analytics.py`, `api/routes/analytics.py` (new
  `/api/v1/analytics/*` router), all owner-scoped and date-ranged
  (`?start=&end=`, inclusive; 422 if `start > end`).
  - **food** — per-day calorie + macro totals, aggregated in SQL (grouped on
    `entry_date`; only days with entries → gaps preserved, no zero-fill).
  - **weight / mood** — every entry (timestamp + value), *not* daily-averaged.
  - **sleep** — each sleep as a `{start, end, duration}` interval.
  - **`/analytics/day/{date}`** — every entry for one day across all four
    trackers (drill-down target); empty lists (not 404) for an empty day.
- **Timezone:** weight/mood/sleep are UTC instants, so "which day" is resolved
  in the user's `timezone` (zoneinfo, falls back to UTC on bad data). Date
  ranges become a half-open UTC window `[start 00:00, (end+1) 00:00)`. A sleep
  is attributed to the day it *ended* (the morning you woke). Food uses its
  plain `entry_date` column — no tz math.

**Built (frontend)**
- `components/chart/chart.tsx` — client-only ECharts wrapper. ECharts is
  `import()`-ed inside a `useVisibleTask$` (never SSR'd, lazy-loaded only where a
  chart is used) and the option object is `noSerialize`'d (it may hold functions
  like a custom `renderItem`, and being client-only it must never cross Qwik's
  serialization boundary). Swappable from this one file.
- `routes/dashboard/index.tsx` — post-login landing (login/register now redirect
  here). Date-range picker (default last 30 days). Four cards, order
  **Weight, Food, Sleep, Mood**; each has a "+ Add … entry" button linking to
  its log page. Click any point → `/day/YYYY-MM-DD`.
  - **Food** — stacked area of macro *calorie contributions* (Atwater 4/4/9) so
    the stack height reads as calories.
  - **Weight / Mood** — x = day columns, y = value, line-with-dots; multiple
    same-day entries = multiple dots on one x.
  - **Sleep** — vertical bars per day (custom `renderItem`), y = clock time;
    overnight sleeps start just below midnight (negative hour → e.g. 23:00).
- `routes/day/[date]/index.tsx` — lists all entries for a day; in-place delete +
  "open … log" links; reloads reactively when the URL date changes.
- `components/log-nav` — added a **Dashboard** link and a global **"jump to
  date"** picker (→ `/day/<date>` from any page). `types/analytics.ts` +
  `services/api.ts` analytics calls.

**Gotcha — ECharts + Vite dev (`tslib`).** Charts rendered blank in dev with
`Cannot destructure property '__extends' of 'import_tslib.default'`. ECharts'
nested tslib ESM entry default-imports the CJS `tslib.js`; esbuild's dev interop
leaves that default `undefined`. (Rollup handles it, so `qwik build` was fine —
dev only.) Fixed in `vite.config.ts`: alias `tslib` → `tslib/tslib.es6.js` (pure
ESM named exports) + `optimizeDeps.include: ["echarts","zrender"]`; added a
top-level `tslib` dep so the alias resolves. New dep: `echarts`.

**Verified**
- Backend over real HTTP: all four series return correct data; day attribution
  (a sleep ending next morning excluded from the prior day); `422` on inverted
  range; `401` unauthenticated.
- Frontend `build.types` + `qwik build` clean (only the pre-existing home-page
  `useVisibleTask$` warning). Drove a headless browser (mocked API): all four
  charts paint, clicking a point opens `/day/…` with that day's entries.

---

## 2026-08-29 — Phase 7: weight, mood & sleep tracking

**Goal:** complete the health-tracking features by repeating the food-entry
vertical slice for the three remaining record types.

**Design decisions (deliberate deviations from `buildplan.md`)**
- **Three separate pages/features, not one `/health` page.** `/weight`, `/mood`,
  `/sleep` each mirror the food page's layout (app bar, heading, `form | list`
  two-column, entry cards). The buildplan Step 2 route table listed a single
  `/health`; per discussion these are distinct features.
- **Timestamp-based, not date-based.** The buildplan assumed a single entry date
  (+ a stored sleep duration). Instead every record keys off a *timestamp*, so
  "multiple per day" and naps fall out naturally with no special cases:
  - weight → `measured_at` (log morning + post-run separately)
  - mood → `recorded_at` (a journal — rough morning, better afternoon)
  - sleep → `started_at` + `ended_at`
- **Sleep duration is derived, never stored.** `duration_minutes` is a computed
  property on the ORM model (from start/end), exposed via `from_attributes` — so
  the clock times and the duration can't drift. Naps = a short time range.
- **Weight stores its `unit` explicitly** (`lb` default; `kg` in the enum but not
  offered in the UI yet) so kilograms can be added later without a data change.

**Built (backend)** — mirrors the food slice end to end:
- `models/{weight,mood,sleep}_entry.py` (+ `User` relationships, all
  cascade-delete), `schemas/…`, `crud/…` (owner-scoped like food), and the 5
  REST endpoints per resource under `/weight-entries`, `/mood-entries`,
  `/sleep-entries`; wired into `api/router.py`.
- CHECK constraints enforce the data rules in the DB: `weight > 0`, mood/quality
  `1..10`, sleep `ended_at > started_at`. Schemas mirror them for clean 422s.
- Migration `dd1361b0bad5` (autogenerated, reviewed). Verified a
  downgrade→upgrade round-trip.

**Built (frontend)**
- `types/{weight,mood,sleep}-entry.ts`, `services/api.ts` calls, and
  `utils/datetime.ts` (local ↔ UTC-ISO conversion for `datetime-local` inputs,
  plus duration/date formatting).
- `routes/{weight,mood,sleep}/index.tsx`, each auth-gated and styled from the
  food page's building blocks (`StatCard` "latest" tile, sticky form, cards).
- `components/log-nav/log-nav.tsx`: shared cross-nav between the four log pages,
  added to every app bar (hidden on small screens). Home page links to all four.

**Verified**
- Backend over real HTTP: create/patch/delete happy paths; empty PATCH → 422;
  bad input (`weight=0`, `mood_score=11`, end-before-start) → 422; sleep
  `duration_minutes` computed correctly (7h45m → 465). **Two-user isolation**:
  B GET/PATCH/DELETE on A's rows → 404, B's list empty. Delete → 204 → 404.
- Frontend `build.types` (tsc) + `qwik build` clean (lint: only the pre-existing
  home-page `useVisibleTask$` warning).
- Cleaned up smoke-test accounts from the dev DB afterward.

**Gotcha**
- Qwik types `<option>` children as `string`, so `{n}` (a number) fails
  `build.types`. Use `{String(n)}`.

---

## 2026-08-29 — UI: auto-calculate calories from macros

**Change:** reordered the food-entry form so the macro inputs (protein / carbs
/ fat) come first, with calories after. Calories is now a **read-only, derived**
field computed from the macros using Atwater factors: 4 cal/g protein, 4 cal/g
carb, 9 cal/g fat. It updates live on every macro `onInput$` and stays blank
until at least one macro is entered (rather than showing 0).

**Files:** `frontend/src/routes/food/index.tsx` — added `caloriesFromMacros()`
helper; macro handlers recompute `form.calories`; calories `<input>` is
`readOnly` and labeled "(auto)".

**Notes / gotchas**
- The API still accepts `calories` as a client-supplied int, so no backend
  change was needed — the frontend just fills it deterministically.
- On edit (`startEdit`), the stored calories value loads as-is; it only
  recomputes once a macro field is touched.
- The `serving` field is display-only free text (e.g. "1 cup") — it does not
  scale macros or calories. Left as-is by design.

---

## 2026-08-29 — Fix: session cookie dropped in local dev (login loop)

**Symptom:** register/login appeared to fail — after submitting you landed back
on `/login`. The account *was* created (re-registering reported the email
already existed), so it was never a DB or auth-logic bug.

**Root cause:** host mismatch. The frontend was opened at
`http://localhost:5173` but `PUBLIC_API_BASE_URL` pointed the API at
`http://127.0.0.1:8000`. Browsers treat `localhost` and `127.0.0.1` as
different sites, so every `fetch` was **cross-site**. The session cookie is
`SameSite=Lax` (correct for prod), and Lax cookies aren't sent on cross-site
XHR/fetch — only on top-level navigations. So login set the cookie, but the
follow-up `/auth/me` call didn't send it → 401 → `/food` redirected back to
`/login`.

**Fix:** point the frontend at the same host it's served from.
- `frontend/.env` + `frontend/.env.example`: `PUBLIC_API_BASE_URL` now uses
  `http://localhost:8000/api/v1` (was `127.0.0.1`).

**Gotchas learned**
- `PUBLIC_*` vars are baked in at Vite startup — restart the dev server after
  editing `.env`.
- Keep the frontend host and API host identical in dev (both `localhost`, or
  both `127.0.0.1`). This is purely a dev artifact: in prod, same-origin +
  HTTPS makes the cookie `Secure` and the issue disappears.

**Verified:** login now lands on `/food` and the session persists across
requests.

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
- **Real logo vector-traced from source art** (superseded the first hand-drawn
  "blob" silhouette, which never matched): user supplied `image.jpg` (face +
  leaves on the emerald→violet tile). Pipeline: ImageMagick crop the icon →
  threshold to a b/w silhouette → mask off the icon's glossy rim/cream corners →
  **potrace** (npm) → single path in a 309×309 space, centered on the tile via a
  group transform. Gradient stops sampled from the art (`#0a7b5c` → `#3fa98c` →
  `#a064de`). Wordmark switched to a **serif (Mincho)** stack to match, pinned
  with `textLength`/`lengthAdjust` so lockup width is deterministic regardless of
  the viewer's installed JP font.

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
