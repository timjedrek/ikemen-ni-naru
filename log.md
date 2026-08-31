# Dev log

A running record of what's been built, key decisions, and gotchas.
Newest entries first. For the overall plan see `buildplan.md`.

---

## 2026-08-30 — Weight stats: drop "Latest", emphasize 7-day average

Trimmed the weight page header from 5 stat cards to 4 — removed the **Latest**
card since the newest weigh-in already shows at the top of the feed below.

**`routes/weight/index.tsx`:** deleted the `Latest` `StatCard` and moved the
`accent` (gradient emphasis) onto the **7-day avg** card so the trailing average
is now the visual focus. Left `latest` in place since it still derives the display
`unit`, and the summary still renders when `latest || avg7 !== null`.

---

## 2026-08-30 — README notes live deploy; queries moved to their own file

Added a "Live at health.timjedrek.com" line near the top of `README.md` — kept it
to just that, deliberately not surfacing infra names/topology in the public README.

Moved the registered-users query out of the README into a new root file
**`postgres-queries.md`** (connect via `sudo dokku postgres:connect ikemen-db`,
plus queries for all users / total count / last-7-days signups, and the dev-user
caveat). `deploy-notes-dokku.md` still has the same command inline in its Ops
section.

---

## 2026-08-30 — Record real Dokku names + how to list registered users

Captured the actual production names (the deploy notes had been using generic
placeholders): apps are **`ikemen-backend`** and **`ikemen-frontend`**, Postgres
service is **`ikemen-db`**.

**`deploy-notes-dokku.md`:** noted the real names next to the placeholders in
section 0, and added an **"Ops: who's registered?"** section — until there's an
admin UI, check users by querying Postgres directly
(`sudo dokku postgres:connect ikemen-db` → `SELECT … FROM users`). Also flags the
temporary dev user seeded by migration `1fe11a2c1211` so it isn't mistaken for a
real signup. Proper admin view stays on the future-features list.

---

## 2026-08-30 — Day feed defaults to "By time"

All day feeds now open in the time-ordered view instead of grouped-by-category.

**`components/day-feed/day-feed.tsx`:** flipped the initial `view` signal from
`"category"` to `"time"` (line ~83). The DayFeed component is shared by the
dashboard "Today" section and the `/day/[date]` pages, so both default to By time.
The **By category** toggle is unchanged and still available; view state stays
per-instance (switching on the dashboard doesn't carry to `/day/[date]`).

---

## 2026-08-30 — Health check now verifies DB connectivity

The homepage health card only pinged the API, so it reported green even when
Postgres was down — misleading, since the app can't function without the DB.

**Backend (`app/api/routes/health.py`):** `/health` now injects a `Session` and
runs `SELECT 1`. On success it returns `{"status": "ok", "database":
"connected"}`; on `SQLAlchemyError` it raises **503** with detail "Database
connection failed". Chose 503-on-failure (over returning 200 with a
`disconnected` field) so the check honestly reports the app as down.

**Frontend:** no change needed — the homepage just renders the JSON, and
`apiFetch` already throws `ApiError` on non-2xx, so the 503 flips the card to the
red "Backend connection failed" banner automatically.

**Testing DB-down locally:** `docker compose stop db` → reload homepage (red) →
`docker compose start db` (green). `stop`, not `down`, to keep the volume.

---

## 2026-08-30 — Tracker summary-card tweaks + mood day chart

Follow-up polish on the tracker pages after the unified-shell refactor.

**Shared hook (`use-tracker-log.ts`):** added an `allTotal` signal — the all-time
entry count, independent of the Day-mode `date` filter. Fetched via a `limit:1`
no-date list (we only read `total`) on auth and refreshed whenever the loaded set
changes, so create/delete keeps it current. Powers every "Total …" card.

**Weight:** day-mode cards are now Latest · 7-day avg · **Today's avg** (mean of the
day's weigh-ins) · **Today's weigh-ins** (renamed from "Weigh-ins") · **Total
weigh-ins** (`allTotal`). Feed mode drops the two day-scoped cards.

**Mood:** added a trailing **7-day avg** (via `getMoodAnalytics`, same pattern as
weight) and made it the accent card — dropped the "Latest" card since it's already
visible in the feed, keeping it to 4 cards (7-day avg · Average · Entries · Total
entries). New **`MoodChart`** component renders in the full-width summary slot in Day
mode: a 5 AM→midnight x-axis (same window as `DayTimeline`), 0–10 y-axis, one gently
curved line (Catmull-Rom→bezier, `TENSION` dialed down to 0.06 so corners just
soften). Each point is a clickable SVG target wired to `startEdit`.

**Sleep:** day-mode "Sleep" card became **Total sleep** — the sum of the day's loaded
durations. This is exact because the list buckets by `ended_at` local day, so the
day's entries are the overnight sleep that ended that morning plus any naps. Added a
**Total entries** card (`allTotal`).

**Food:** no card changes (already 4). Logged an **analytics** section in
`future-features.md` — trends over time, cross-tracker correlation — deferred until
real usage clarifies which views earn their place.

---

## 2026-08-30 — SHIPPED: unified tracker-log shell + Day/Feed modes

What actually shipped from the plan below.

**Edit-button bug (prereq, fixed first):** the day-report edit deep link never
worked because each page's `useVisibleTask$` referenced `startEdit`/`clearEditParam`
declared *below* it — Qwik's optimizer captures QRLs by lexical scope at
registration, so they resolved to `undefined` (`ReferenceError: startEdit is not
defined`). Fixed by declaring handlers above the task, adding a `getById` fallback,
and stripping `?edit` after opening. This constraint is now enforced once, centrally,
in the shared hook.

**Backend (`app/crud` + `app/api/routes` for mood/sleep/weight):** list endpoints
take an optional `?date=` (alias) day filter, reusing `day_bounds_utc(day, tz_name)`
with `current_user.timezone`, windowing on `recorded_at`/`ended_at`/`measured_at`
respectively. Food unchanged (real `entry_date` column); its list ordering flipped
to `entry_date desc, id desc` so the feed reads newest-first like the others.

**Shared frontend pieces:** `src/hooks/use-tracker-log.ts` (a generic hook owning
auth gate, Day/Feed mode, date-scoped load + infinite-scroll pagination, `?date`/
`?edit` deep link, and create/update/delete/edit — configured by per-tracker QRLs);
`src/components/tracker/{tracker-shell,form-card,stat-card,entry-row,list-states,
infinite-sentinel}.tsx`. `EntryRow` is the day feed's old `Row`, promoted and reused
(day-feed.tsx now imports it). `todayIso` + `formatDay` moved into `utils/datetime.ts`.

**All four pages** now: default to **Day mode** (date picker, today) and toggle to a
**Feed mode** (last 10, IntersectionObserver infinite scroll). Each page keeps only
its own form fields, row mapping, and summary. Summaries: food = day macro totals;
mood = latest/average(day)/count; sleep = duration/quality; weight = latest + 7-day
average (via `getWeightAnalytics`). Food rows show the day in Feed mode.

**DayFeed:** all four edit links now pass `?date=<report day>` so the date-scoped
page loads the right day; the `getById` fallback covers any edge case.

Verified: `tsc`/`eslint` clean; all routes SSR 200. Behavioral (Day/Feed toggle,
infinite scroll, edit round-trip, macro/manual-calorie logic) confirmed on food in
the browser; the other three follow the same shell.

---

## 2026-08-30 — PLANNED: unify the four tracker pages behind a shared shell

Approved plan (full detail in `~/.claude/plans/federated-popping-quokka.md`). Logged
before implementation; a follow-up entry will record what actually shipped.

**Why:** `food`, `sleep`, `mood`, `weight` are structurally identical but were built
separately and drifted — only food is date-scoped (date picker, today-by-default,
backend `entry_date` filter); the other three show a global recent feed. The
duplicated per-page logic is where the recent edit-button bug lived (a
`useVisibleTask$`/QRL declaration-order trap repeated four times — fixed today by
moving QRL handlers above the task in each file).

**Goal behavior:** all four default to a **Day view** (date picker, today's entries)
with a **"Show all"** button that switches to a **Feed view** (last 10, infinite
scroll). Editing from the day report lands on the right page **and date**.

**Architecture:** shared logic **hook** + shared presentational components; each page
keeps its own form JSX and entry→row mapping rendered inline. (A hook, not a slotted
shell, because Qwik can't serialize render-prop closures across resume — but a hook
runs in the page's own scope, so it also enforces the QRL-ordering fix once, centrally.)
- New: `src/hooks/use-tracker-log.ts` (all state + handlers + the two visible tasks,
  configured by a `TrackerConfig<E,F>` of QRLs); `src/components/tracker/`:
  `tracker-shell.tsx` (chrome + Day/Feed switch + named slots), `stat-card.tsx`,
  `entry-row.tsx` (promote DayFeed's generic `Row`), `list-states.tsx`,
  `infinite-sentinel.tsx` (IntersectionObserver, `rootMargin: 200px`).
- `todayIso()` moves into `src/utils/datetime.ts`.

**Backend (additive; food untouched):** add optional `?date=` day filter to the
mood/sleep/weight list endpoints + CRUD, reusing `day_bounds_utc(day, tz_name)`
(`app/crud/analytics.py`) with `current_user.timezone`, windowing on each tracker's
analytics column (mood→`recorded_at`, weight→`measured_at`, sleep→`ended_at`).

**DayFeed:** pass the report's date to all four edit links
(`/{tracker}?date=${date}&edit=${id}`); the hook keeps the `getById` fallback as
belt-and-suspenders. Params read via `window.location.search` (reactive `loc.url` is
stale right after an SPA nav).

**Order:** backend → `api.ts` list signatures → shared pieces → **food first (verify)**
→ sleep/mood/weight → DayFeed links → docs (move edit-button item out of
`future-features.md` Known bugs).

---

## 2026-08-30 — Landing page auth-aware CTAs

Tightened the logged-out landing page (`frontend/src/routes/index.tsx`).

**CTAs:** removed the Food/Weight/Mood/Sleep quick links, leaving two buttons —
**Open dashboard** (brand) and **Log in** (accent). "Create account" is no longer
a button; it's a text prompt below the nav: "Don't have an account? *Create an
account*" linking to `/register`.

**Auth-aware:** the page now fetches `getCurrentUser()` in a visible task. When
there's a session it hides the Log in button and the register prompt and instead
shows "You are logged in as *{display_name || email}*". Both auth-dependent bits
are gated on an `authChecked` signal so the logged-out prompt doesn't flash before
the session check resolves. The Open dashboard button shows either way.

---

## 2026-08-30 — Mobile responsiveness + "Today" feed on the home page

Post-deploy mobile pass plus a home-page feed.

**Home page overflow (`frontend/src/components/logo/logo.tsx`,
`frontend/src/routes/index.tsx`):** the horizontal logo lockup (icon + Japanese
wordmark, `viewBox 0 0 1400 309`) overflowed narrow screens, causing horizontal
scroll. Extracted the wordmark into a shared `Wordmark` and added a `LogoStacked`
export (icon on top, wordmark beneath, `viewBox 0 0 1000 540`). The landing page
renders `LogoStacked` below `sm` and the wide `Logo` from `sm` up.

**Mobile nav (`frontend/src/components/app-header/app-header.tsx`,
`frontend/src/components/log-nav/log-nav.tsx`):** the app header had no nav links
on mobile (`LogNav` is `hidden sm:flex`). Exported `LINKS` from `log-nav` and
added a hamburger toggle that replaces the logout button below `sm` (turns into
an X when open). It opens a dropdown with the nav links, Account settings, the
"Jump to date" day-report picker, and Log out. Desktop keeps the plain logout
button.

**Reusable `DayFeed` + "Today" on the dashboard
(`frontend/src/components/day-feed/day-feed.tsx`,
`frontend/src/routes/day/[date]/index.tsx`,
`frontend/src/routes/dashboard/index.tsx`):** extracted the entire day breakdown
(summary timeline, By category/By time switch, per-entry edit/delete cards, empty
state) out of the `/day/[date]` page into a `DayFeed` component keyed off a `date`
prop; it owns its own load/delete/view state and reloads when `date` changes. The
day page now just renders `<DayFeed date={loc.params.date} />`. Added a "Today"
section at the bottom of the dashboard rendering `<DayFeed date={today} />` with
an "Open full day →" link; `today` is stamped client-side (auth task) so it uses
the user's zone, not the server's.

**Copy + dark-mode polish:** renamed the "Dashboard" nav link to "Home" (drives
both desktop and mobile nav; the day page's back link now reads "← Back to home").
The native date picker's calendar icon was invisible in dark mode — added
`[color-scheme:light] dark:[color-scheme:dark]` to both nav date inputs so the
icon is black in light mode and light in dark mode.

---

## 2026-08-30 — Fix: after-8 PM naps rendered below the sleep chart axis

**Bug:** the sleep chart's columns run 8 PM → 8 PM (`Y_MIN = -4`, `Y_MAX = 20`),
but each sleep was assigned to a column by its `ended_at` **calendar day**. A nap
ending after 8 PM (e.g. 10 PM Aug 29) landed at hour ~22 — past `Y_MAX` — so it
rendered below the axis on the wrong day instead of at the top of the next day's
column.

**Fix (`frontend/src/routes/dashboard/index.tsx`):** added `windowDayOf()`, which
shifts the instant by +4h so the 8 PM boundary becomes midnight, then takes the
local calendar day — yielding the correct 8 PM→8 PM column (10 PM Aug 29 → Aug 30
column). Sleep points now use `windowDayOf(ended_at)` for column index and
vertical position, so an after-8 PM nap reads as a negative start at the top of
the next column. Drill-down (`date`) still uses `localDayOf(ended_at)` — the real
calendar day it was logged — so click-through targets the right `/day/:date`.

**Known edge case:** an after-8 PM nap on the *most recent* day in range maps to
tomorrow's not-yet-visible column and won't appear until the next day. Charts
kept sharing one aligned `days` array (no extra trailing column) to stay in line
with the weight/mood charts.

---

## 2026-08-30 — Fix: dashboard sleep chart tooltip showed raw wake-hour

**Bug:** hovering a sleep bar showed a bare number like `7.4166` — the wake time
as **hours-from-midnight** (7:25 AM), not sleep duration. The sleep series had
`tooltip: { trigger: "item" }` with no formatter, so ECharts dumped a raw value
from the plotted `[dayIndex, startHour, endHour]` array.

**Fix (`frontend/src/routes/dashboard/index.tsx`):** each sleep point now also
carries `started`/`ended` (local clock via new `clockTime`), `duration` (new
`durationLabel`, from `duration_minutes`), and `quality`. Added a tooltip
`formatter` showing duration as the headline, then the start→end clock range and
`quality n/10`. Plotted values/`renderItem` unchanged — only the hover text.

---

## 2026-08-30 — Fix: multiplier now scales manual calories

**Bug:** after the manual-calorie override shipped (entry below), the multiplier
didn't affect a manually-typed calorie value — 5 shots at 100 kcal still read
100, not 500. Two causes: the multiplier handler skipped the recompute in manual
mode, and manual calories were never scaled at all.

**Fix (`frontend/src/routes/food/index.tsx`):** added a `manualBase` signal
holding the per-serving calories typed. Displayed/submitted Calories in manual
mode = `round(manualBase × multiplier)`. The multiplier handler now recomputes
in both modes; typing the Calories field back-derives `manualBase` from the
shown total at the current multiplier (100 typed at ×5 → 500); `startEdit` seeds
`manualBase` from the stored calories (multiplier resets to 1); `resetForm` and
**Use auto** clear it.

---

## 2026-08-30 — Food form: manual calorie override (alcohol edge case)

**Problem:** Calories was read-only and auto-derived from 4/4/9 macros, so
alcohol (**7 kcal/g**, not a tracked macro) couldn't be logged — a straight shot
(0 protein/carb/fat) computed to 0 kcal. (Beer/wine also undercounted: they're
carbs *plus* alcohol calories.)

**Fix (front-end only, `frontend/src/routes/food/index.tsx`):** Calories is now
an editable input. A `manualCalories` signal gates the auto-calc — macro and
multiplier edits only overwrite Calories while it's in auto mode. Typing a value
flips it to manual (label shows "(manual)", with a **Use auto** button to revert);
clearing the field returns to auto. `startEdit` treats stored calories as manual
(they may not equal the macro math); `resetForm` clears the flag. No backend/
schema change. Fuller `alcohol_g`-as-4th-macro approach noted in future-features.

---

## 2026-08-30 — Day report: sticky section-jump buttons (category view)

**`frontend/src/routes/day/[date]/index.tsx`:** in the "By category" view, a
`<nav>` of pill buttons (Food/Sleep/Mood/Weight, only those present) sits right
under the timeline and is **sticky** at `top-16` (just below the sticky app
header) while scrolling. Clicking a button smooth-scrolls to its section via a
`jumpTo` handler (`getElementById(...).scrollIntoView`); each `Section` got an
`id` + `scroll-mt-32` so its heading clears the sticky header + jump bar.

**No container around the bar (per user):** dropped the border/`bg-surface/80`/
`backdrop-blur`/full-bleed — it's just the buttons now. Trade-off: with no
background, page content shows through the gaps between buttons while scrolling
(the buttons keep their own `bg-surface-muted` pill fill). Revisit if noisy.

---

## 2026-08-29 — Day report: timeline chart + feed edit buttons (icons) + deep-link editing

**Timeline (`frontend/src/components/day-timeline/day-timeline.tsx`, new):** a
horizontal one-day chart pinned to the top of the report (both views). Window is
**5 AM → midnight** (`START_HOUR`/`END_HOUR`), hour ticks at 5/9/13/17/21/24
(edge labels aligned inward so they don't overflow). Point entries
(food/mood/weight) render as colored pins, sleep as a labelled violet span over
the track; out-of-window times clamp to the nearest edge rather than drop.
Offsets are hours from the day's local midnight. Pure/presentational and only
renders client-side (day page loads in a visible task), so local-time Date math
can't cause a hydration mismatch. Food is placed by `created_at` (no eaten-time),
consistent with the feed.

**Feed action buttons (`frontend/src/routes/day/[date]/index.tsx`):** `Row` now
takes an optional `onEdit$` and renders **icon** buttons (local `PencilIcon` /
`TrashIcon`, Heroicons outline) instead of the old text "Delete" link — applied
to both the grouped and time views.

**Deep-link editing (option 1):** the Edit icon navigates to the entry's tracker
page with `?edit=<id>` (food also gets `&date=<entry_date>` since its list is
date-scoped). Each tracker page (`food`/`sleep`/`mood`/`weight`) now reads the
param in its load task and calls `startEdit` on the matching entry once loaded
(food first sets `selectedDate` from `?date`, defaulting to today). No-op if the
id isn't in the loaded list. Added `useLocation` to all four. **Note:** the edit
param persists in the URL, so a manual date change on the food page can re-open
the form if that entry is on the newly selected day — acceptable for now.

---

## 2026-08-29 — Day report: "By category" / "By time" view toggle + feed

**Goal:** the day report (`/day/[date]`) was grouped by tracker (Food / Sleep /
Mood / Weight), which the user likes. Added a second way to read the same day: a
single time-ordered feed, newest on top. This is step 1 of a larger day-report
revamp (later: sticky in-section jump links for the category view, then a
day-timeline chart on top).

**Changes (`frontend/src/routes/day/[date]/index.tsx`):**
- Segmented **view toggle** (`role=tablist`) in the report's header row: "By
  category" (default) vs "By time". Hidden when the day is empty. Backed by a
  `view` signal; grouped sections and the feed are gated on it.
- **Feed** (`buildFeed`): flattens all four trackers into one `FeedItem[]`
  discriminated union tagged with a sort time, sorted newest-first. Reuses the
  existing `Row` card, now with an optional tinted `kind` pill (amber/violet/
  accent/brand) so interleaved entries stay scannable; the grouped view omits
  the pill since the section heading already names the tracker.
- Feed timestamps: mood→`recorded_at`, weight→`measured_at`, sleep→`started_at`.
  **Food has no "eaten" time**, so it sorts/labels by `created_at` (when logged)
  — decided with the user. Feed rows show time-of-day only.

**Added `formatTime` to `frontend/src/utils/datetime.ts`:** UTC ISO → local
clock time ("7:30 AM"), for feed/timeline contexts where the day is already
established.

**Not done this pass (deferred by user):** sticky category jump-links, and the
day-timeline chart.

---

## 2026-08-29 — Food form: serving multiplier + "Where"/"Mood" relabels

**Front-end only (`frontend/src/routes/food/index.tsx`), no backend/schema
change.** Added a `multiplier` field (default 1) after Calories: macros are
typed per the label's serving, then scaled by the multiplier so both the
auto-calculated calories and the values sent to the API reflect the actual
serving (`scaleMacro`, rounded to 2 dp; empty/invalid multiplier falls back to
1). Relabeled "Serving" → "Where" and "Notes" → "Mood" (labels only; still
backed by `serving_description` / `notes`). **Gotcha:** there's no `multiplier`
column, so stored macros are already scaled — editing an entry resets the
multiplier to 1 and shows the final macros, not the original label values.

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
