# Build Plan — Updated for Deployment

**Goal:** ship the app. The core is done (auth + full CRUD for food, weight,
mood, sleep) and the payoff (a charts dashboard) is built. What's left before
deploy is letting a user edit their own account (name / email / password) and
getting it live on Linode via Dokku.

Goals were originally slated here as Phase B but have been **deferred to
[`future-features.md`](future-features.md)** — they're a nice feature, not a
blocker for a live, usable app.

Everything that isn't on the path to a live, usable app has moved to
[`future-features.md`](future-features.md). This file is the road to deploy.

For the running history of what's been built, see [`log.md`](log.md). The
original, full-scope plan is preserved in [`buildplan.md`](buildplan.md).

---

## Where we are now (done)

- FastAPI backend, modular (`models` / `schemas` / `crud` / `api/routes`),
  Postgres via SQLAlchemy + Alembic.
- Cookie-session auth (`/api/v1/auth/*`), owner-scoped queries, two-user
  isolation verified.
- Full CRUD, each on its own page, for **food, weight, mood, sleep**
  (timestamp-based model — multiple entries/day and naps fall out naturally).
- Qwik frontend: auth-gated log pages, shared nav, dark mode, styling done.
- Local Postgres in Docker (`docker-compose.yml`); app runs on the host.

## What changed from the original plan

- **Old Phase 8 (dashboard) + Phase 9 (history) were the same screen** — "show a
  day's entries," just for today vs. a past date. Collapsed into one
  **day-detail view** that you reach by drilling in from the charts.
- **The dashboard is now charts-first** (old Phase 11), not a text summary. The
  charts *are* the landing page; clicking a data point opens that day.
- **Phases 12–18 deferred** (templates, export, tests, security hardening,
  perf, design system). Real work, but none blocks a deploy → `future-features.md`.
- **Phases 14 (styling) already done.**

---

## Phase A — Charts dashboard + day drill-down

The main screen. Four charts, x-axis = date. Click a point → open that day.

**Charting:** ECharts, wrapped once in a reusable **client-only** `<Chart>` Qwik
component (Qwik resumes without re-running JS, so charts must skip SSR and
initialize in the browser). Wrapping it in one component means the library is
swappable from a single file. It lazy-loads only on the dashboard route, so its
size doesn't affect the rest of the app.

### A1. Analytics endpoints (backend)
A dedicated read model — do **not** ship raw rows to the browser to compute
trends. New router, e.g. `/api/v1/analytics/*`, all owner-scoped and
date-ranged (`?start=YYYY-MM-DD&end=YYYY-MM-DD`):

- **Food series** — per day: calorie total + protein/carb/fat totals (for the
  stacked shaded area). Aggregate in SQL.
- **Weight series** — every entry in range (timestamp + value), *not* daily
  averaged, so multiple same-day entries render as multiple dots on one x.
- **Mood series** — same: every entry with its timestamp.
- **Sleep series** — each sleep as a `{start, end, duration}` interval (for bars
  showing *when* sleep happened).

Missing days stay missing — do not backfill zeros (no weight ≠ weight of 0).

### A2. `<Chart>` component + dashboard route (frontend)
- Client-only ECharts wrapper: takes an options object, handles resize + cleanup.
- `/dashboard` route (make it the post-login landing page), date-range picker
  (default: last 30 days), one card per chart:
  - **Food** — stacked shaded area: fat / carb / protein, summing to calories.
  - **Sleep** — bars positioned to show when each sleep occurred.
  - **Mood** — line; multiple entries on a day = multiple dots on that x.
  - **Weight** — line; same multi-dot behavior for multiple same-day weigh-ins.

### A3. Click-to-drill day-detail view
- Clicking any data point navigates to that day (e.g. `/day/YYYY-MM-DD`, date in
  the URL so it's bookmarkable).
- Day view lists **all** entries for that date across all four trackers, with
  edit/delete links back to the existing log pages. This is the old
  "dashboard/history for a single day," now reached by drilling in.
- Empty state when a day has no entries.

**Done when:** you land on `/dashboard`, see four real charts of your data, and
clicking a point opens that day's full breakdown.

---

## Phase B — Account settings

Let a signed-in user edit their own account. No new tables — everything lives on
the existing `users` row. Reuses the auth slice (`/api/v1/auth/*`, the session
cookie, `get_current_user`) rather than a new resource.

Scope is deliberately just **name, email, password** — timezone is left out on
purpose (the app stores UTC instants and displays in the browser's local zone;
the `users.timezone` column stays `"UTC"`, so surfacing it would add complexity
with no payoff today). Account deletion and password reset stay in
`future-features.md`.

### B1. Backend
- `PATCH /api/v1/auth/me` — update `display_name` and/or `email`. Email is
  normalized and re-checked for uniqueness (friendly 409, DB constraint is the
  authority). Changing the email requires the **current password** for
  confirmation.
- `POST /api/v1/auth/password` — change password: verify current password, then
  set the new one (min-length enforced as at registration). On success,
  **revoke all other sessions** for the user (keep the current one) so a leaked
  old password can't hold a live session.
- No new migration — reuses the `users` table.

### B2. Frontend
- A `/settings` (account) page, auth-gated, matching the existing log-page
  chrome (top bar, `LogNav`, theme toggle). Two sections:
  - **Profile** — edit display name + email (email change asks for current
    password).
  - **Password** — current + new + confirm.
- Reflect a saved name/email in the "Signed in as" label. Add a link to reach
  the page (e.g. from the top bar).

**Done when:** a signed-in user can change their display name, email, and
password from the app, wrong-current-password is rejected, and changing the
password drops the app's other sessions.

---

## Phase C — Production packaging (pre-deploy)

Get both apps production-shaped before touching the server.

### C1. Backend for prod
- Production `Dockerfile` (or Dokku buildpack): locked deps, non-root, ASGI
  server (uvicorn/gunicorn) via env config, `/api/health` exposed.
- Migrations run as an explicit deploy step (`alembic upgrade head`), never
  auto-create.
- Confirm every setting comes from env vars (`DATABASE_URL`, session secret,
  allowed origins, frontend URL) — no hard-coded localhost.

### C2. Frontend for prod
- Add the Qwik **Node server adapter** (needed for a real server behind Dokku).
- API base URL comes from an env var for prod vs. dev.
- `qwik build` clean; verify SSR + navigation locally against the built server.

### C3. Topology decision (simplifies auth)
- Serve frontend publicly and FastAPI under the **same domain at `/api`** (or an
  `api.` subdomain). One public origin removes most production CORS/cookie pain.
- Postgres stays internal-only.

**Done when:** both apps build and run from their production configs locally,
driven entirely by environment variables.

---

## Phase D — Deploy to Linode + Dokku

### D1. Server
- Provision the Linode, OS updates, non-root sudo user, SSH keys, disable
  password SSH, firewall, install Dokku, point DNS.

### D2. Database
- Dokku Postgres plugin → create service → link to the backend app → confirm
  `DATABASE_URL` is injected. Restrict external access.

### D3. Deploy backend
- Create the Dokku app, set prod env vars, deploy, run `alembic upgrade head`,
  verify `/api/health`, check logs + DB connectivity.

### D4. Deploy frontend
- Create the Dokku app, set the API origin, deploy the Qwik Node server, verify
  SSR + browser nav + live API calls.

### D5. Domains, HTTPS, cookies
- DNS records → Let's Encrypt (Dokku letsencrypt plugin) → auto-renew → force
  HTTPS.
- Set **production** CORS + cookie values: exact origin (no wildcards with
  credentials), `Secure`, intentional `SameSite`, correct cookie domain.

**Done when (project complete):** you can register, log in, log entries, and see
your charts dashboard on the public HTTPS domain.

---

## Post-deploy, do-soon shortlist

Not blockers, but the first things to pull from `future-features.md` once it's
live: a basic **Postgres backup**, and a small **API test** for auth +
cross-user isolation (the highest-risk paths). Everything else waits.
