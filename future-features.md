# Future Features

Deferred until after the app is deployed and usable. None of these block a live
release — that's why they're here and not in
[`build-plan-updated-for-deployment.md`](build-plan-updated-for-deployment.md).
Pull from this list once the app is live; roughly ordered by value.

---

## Do-soon (first picks after deploy)

### Postgres backups
Scheduled dumps of the Dokku Postgres service, stored off-box. A backup isn't
trustworthy until a restore has been tested. (Original Phase 20 / Step 87.)

### Minimal test coverage — highest-risk paths first
Not full coverage, just the parts where a bug is dangerous:
- **Backend API tests:** register, login, logout, and **cross-user isolation**
  (user B cannot read/edit/delete user A's rows). These are the most important
  tests in the whole app.
- Dedicated **test database**, migrations applied, isolated + cleaned up per run.
(Original Phase 15 / Steps 65–67.)

---

## Goals
(Was Phase B in the deployment plan; deferred — a nice feature, not a blocker
for a live app.) One current goal record per user (not date-historical — see
"Further-out ideas").
- **Backend:** `user_goals` table + migration: daily **calorie** target (+
  optional protein/carb/fat), target **weight**, target **sleep**
  duration/night. `GET` / `PUT /api/v1/goals` (upsert), owner-scoped.
- **Frontend:** a simple goals form; then surface goals on the dashboard as
  reference lines on the food (calories), weight, and sleep charts. Neutral
  wording — it's tracking, not judgment.

## Dashboard day-boundary uses UTC, not the browser zone
Latent inconsistency, not a bug that's bitten yet. Entries are stored as UTC
instants and the log pages read/display them in the **browser's** local zone,
but the dashboard's "which calendar day" bucketing (`crud/analytics.py`) uses
the stored `users.timezone`, which is hard-defaulted to `"UTC"` for everyone and
never written. So at day boundaries a late-evening local entry can land on the
"next day" in the dashboard. Fix options: either persist a real per-user
timezone and set it (would also mean adding it to the account-settings page), or
have the dashboard bucket in a client-supplied zone. Deferred deliberately — the
account-settings work skips timezone to avoid this complexity for now.

## Security hardening
(Original Phase 16.) Much of this is already partly in place; this is the
review + tightening pass.
- Audit auth: `HttpOnly` + `Secure` cookies, intentional `SameSite`, token
  expiry, logout invalidation, no secrets committed, non-revealing auth errors.
- Request security: bounded request sizes, ownership enforced in every query,
  IDs treated as untrusted, no raw untrusted SQL.
- **Rate limiting** on login, registration, and (later) export + expensive
  analytics endpoints.
- Health-data hygiene: don't log record contents, document that this is a
  wellness tracker, not a clinical tool.

## Testing — full suite
(Original Phase 15, beyond the do-soon slice.)
- Backend unit tests: password hashing, token logic, daily totals, date
  handling, goal progress, validation boundaries.
- Full CRUD API tests for every resource; filtering, pagination, invalid data,
  missing records.
- Frontend component tests: form validation, submission states, date nav,
  summary rendering, auth redirects.
- End-to-end: register → log in → add entries → verify dashboard → edit →
  delete → log out → protected pages blocked → second user can't see first
  user's data.

## Reusable food templates / quick-add
(Original Phase 12.) Separate `saved_foods` resource (name, default serving,
macros, owner). Save an entry as a template, pick a template, tweak serving,
add to today. Keep templates and historical entries in separate tables.

## Data export & account controls
(Original Phase 13.)
- Personal-data export (JSON first — preserves structure — then CSV).
- Account deletion: re-auth required, transactional delete of owned data,
  session revocation.
- ~~Password change~~ — done pre-deploy (Phase B, account settings). Name/email
  editing landed with it.
- Password reset by email (needs email infra — lower priority).

## Frontend design system & accessibility
(Original Phase 14, beyond the styling already done.)
- Extract reusable primitives *after* patterns repeat (buttons, inputs, selects,
  cards, dialogs, empty states, alerts) — don't build a big system up front.
- Responsive nav polish; mobile navigation.
- Accessibility review: labels on all controls, keyboard nav, visible focus,
  errors associated with inputs, color not the only status signal, **textual
  summaries for charts**, contrast, dialog focus management.

## API & performance refinement
(Original Phase 17.)
- Consistent pagination on all growing collections (limit, stable ordering, max
  page size).
- Database indexes based on real query patterns (`user_id + timestamp/date`,
  unique normalized email).
- Kill inefficient patterns (N+1s, dashboard/analytics query counts); use SQL
  aggregation for large ranges.
- Flesh out OpenAPI docs: summaries, request/response descriptions, auth docs,
  error examples.

## Operations & maintenance
(Original Phase 20, beyond backups.)
- Monitoring: frontend/backend/DB availability, disk, memory, CPU, TLS renewal,
  failed deploys.
- Structured production logging (timestamp, severity, request id, route, status,
  duration) — never log passwords, tokens, or full health records.
- A repeatable release checklist (test → lint → build → migrate → deploy →
  smoke test → watch logs).

---

## Further-out ideas
Originally scoped out in Phase 0, still worth noting:
- Date-effective (historical) goals instead of one current goal record.
- Kilograms support in the UI (the `unit` field already stores the choice).
- Correlation / comparative charts (e.g. sleep vs. mood).
- Third-party food database / barcode scanning.
- Social features; native mobile apps.
- Email verification.
