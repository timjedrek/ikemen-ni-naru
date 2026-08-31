8/31/2026 -> Bug report / features discussion after using the app for 1 and a half days..


## Bugs

- After submitting a form, the day feed at the bottom does not update. New posts appear only after a full page refresh. This may be the same issue as “can’t add another post.”
- After deleting a record, new entries cannot be added. A brief flash appears in the feed, then nothing. Logging out and back in resets it (possible session issue). Might be related to above issue after submitting a form.
- iPhone Safari: focusing a form field auto-zooms. After leaving the field and saving, the whole viewport stays at the wrong size.
- iPhone Safari: “Ru” on the home splash (naru) is cut off.
- Long notes are truncated in the feed with no “view more.” <- actually no.  Its not truncated.  Its the same issue as above with the no update after submit thing.
- Date/time placeholder in the form used GMT/Zulu; the form itself did not work in that state. <- Yes, when using the app, sometimes it defaults to local time, others go to GMT time
- Mobile Safari: date fields have no outlines; mobile date selection in the menu did not work (may have been tied to the earlier Safari breakage). < - on chrome it works well.  Its the default safari date selector. 
- Alcohol calories are logged but are not included in the dashboard chart equation.

## Future features / product work

**Meals & food**
- Auto-select meal type by time of day:  
  5:00–10:30 breakfast, 10:30–15:30 lunch, 15:30–20:00 dinner, 20:00–05:00 snack.
- Duplicate / copy button that prefills the form from an existing entry (same day or earlier days).
- Food item lookup via [Open Nutrition](https://www.opennutrition.app/download), with required attribution.
- On the food entry page only: short blurb + link, e.g. “food lookup by XXX.” <- this is attributino link to Open Nutrition on the very bottom footer.
- Treat entry date/time as first-class (retroactive logging is common).

**Mood, photos, starring**
- Split mood into Overall (current), Body, and Mind.
- Photos on mood and food entries (S3 or Linode object storage).
- Star entries and a way to surface starred items.

**Exercise**
- New exercise log: start/stop time, place, description, type (cardio / weights / both), intensity score, photos (same pattern as mood/food).

**Navigation & layout**
- Previous / next day buttons on the day feed.
- Expandable text box on forms (called out as helpful on Android).
- Footer on all pages: logo, “open source project,” links.
- About page.

**Copy & polish**
- Change login page copy.
- Change health-check copy; remove the word “backend.”
- Dummy/health JSON on splash (e.g. something like “health: tracked”) — copy still TBD.

**Misc notes from the logs**
- Dashboard charts currently ignore alcohol calories even when they are stored.
- Several Safari-only issues clustered around forms, zoom, date pickers, and splash text.


Othes stuff just thought of
- robots.txt <- make sure to block everything past login.  Shouldnt be accessible anyways without user auth
Weight chart.  Let's make it adjustable for the y-axis.  For me personally using the app, I want like max 255 and lowest at 190.  But everyone has a different range so its not duplicatable if say I'm a female using the app and I only weigh 140 and I want to get down to 130.

//////////

Other thoughts I have,
We already have charts on the dashboard with date pickers.  Can we make that a reusable component and then bring it to the entry pages on top?

Should Entry pages and View pages be the same as it is right now?

Looking at the mood chart.  Which will also affect the weight chart too I guess.. Its becoming a tangled mess with every point from previous day hitting all points of the next day.  What if we make a line from the highest value to lowest value of the day so a vertical line for that day.  Then, just the highest value connects to the highest value of the next day.  Same with he lowest value.  The lowest value of the day then connects to the lowest value of the next day. So instead of a web, its more of like a pipe.

/////////

RAW text from using the app..

QA / bugs / product only. Personal health notes stripped. Mixed entries are cut down to the dev sentences.

### Sunday, Aug 30, 2026

**11:43 PM** — Food · Chocolate biscuit  
Another feature: depending on the day, auto select breakfast lunch dinner. 5am to 10:30 am breakfast 10:30 to 3:30 lunch 3:30 pm to 8pm dinner 8 to 5 am snack.

**11:32 PM** — Mood 7/10  
Another update needed. So like in the docs in the repo. Like build plan and deploy plan, there's a mention of like the test user and migration id or something. First let's look for it in the db. And second, let's remove in the main docs and just put it in the log file.

**10:40 PM** — Mood 8/10  
Also need to change copy on the login page. And like when I go to enter the form on iPhone safari, it auto zooms to the field. (Which is small and not adjustable). So when I click out and save changes, the window size is wrong for the whole screen. And. After submitting the form, the bottom day entries don’t update. That’s when I think the can’t add another post comes from. I have to refresh the page and then it works. Other things… The Ru in the home splash screen in naru is cut off in mobile view safari. Change the copy for health check. Remove the word backend. Then we can add some dummy json lol Like health: tracked Iono. I’ll come up with something more creative later.

**10:24 PM** — Food · テキーラ！  
So the question now is on the dashboard chart, are the calories from alcohol going to fat? The answer is YA. Hahaha. Ya as in alcohol will lead to fat. But no in the charts. It just doesn’t add it in the equation. A duplication button would be nice. You click the button and it prefills the form. So like if I had a cookie earlier. Then had another one later. Or another day like if I had a cookie yesterday or last week. I could just copy it over to prefill.

**10:20 PM** — Mood 8/10  
Testing the app. It’s chill. It’s like mostly there. Which is insane.

**10:15 PM** — Mood 8/10  
Test 123

**10:15 PM** — Mood 7/10  
Hmmm.. weird bug. After I deleted a record, I can’t add new entries anymore. When I try there’s a small blip in the feed. But then it does away in a millisecond. Logging out and back in seems to have solved it. So that helps reset the session I guess which might be connected. Another part of it was the time zone that was autofilled like as a placeholder in the form. It was gmt Zulu time. The form didn’t work though so yea. Also this message gets cut off in the feed. I guess put a view more thing then. Another feature to add would be ⭐️ staring entries. And then we need to figure out a way to go show them.

**8:01 PM** — Food · Another shot lol  
Updating the app right now..

**6:09 PM** — Mood 8/10  
testing scroll

**6:09 PM** — Mood 8/10  
scroll test 2

**2:49 PM** — Mood 9/10  
Yay. I deployed the app and this thing is live.

**1:26 PM** — Food · Coffee + milk  
EDIT: we need to take into consideration the date/time of entry. Like I do in fact log things retroactively. But I really should log it right before or after I eat.

---

### Monday, Aug 31, 2026

**1:15 AM** — Mood 6/10  
Last feature for tonight. So for mood let's have additional score parameters. Overall (current one right now), body, mind.

**12:57 AM** — Mood 6/10  
Hmmm.. date Fields in the form look good in android. Although expanding this text box would be very helpful. Also.. another feature request. So let's log exercise. Like time start and stop, place, description, type (cardio, weight training, both), intensity score, and pics (implement same time as mood and food)

**12:31 AM** — Mood 8/10  
Test char Also. On mobile. Date fields have no outlines? Mobile menu date selection does not work on safari I guess while that was broken. I came up with another addition thatd be nice. On the day feed (after going to a specific date), there should be some buttons to go to the next or previous date. I guess if the nav bar date selector works that feature wouldn’t be as important.

**12:25 AM** — Mood 5/10  
Use this https://www.opennutrition.app/download For item look up feature It needs attribution. So with that being said, let’s make a footer for all of the pages. Put the logo there. Say it’s an open source project. Add some links. Let’s do an about page. On the food entry page only, we can add a blurb with the link that says food lookup by XXX. Also another feature. Photos. Let’s add it to the mood and food. We’ll need to setup an s3 bucket im assuming? Or I saw in linode there was a bucket option. We can look. Although s3 is free.

----

# Future Features

Deferred until after the app is deployed and usable. None of these block a live
release — that's why they're here and not in
[`build-plan-updated-for-deployment.md`](build-plan-updated-for-deployment.md).
Pull from this list once the app is live; roughly ordered by value.

---

## Known bugs & issues
Things that are shipped but not fully right. Log new ones here as they surface;
add detail/repro when known.

_(none open)_

### ~~Day-report timeline: edit buttons don't work 100%~~ — FIXED 2026-08-30
Root cause was a Qwik QRL declaration-order trap: the deep-link `useVisibleTask$`
referenced `startEdit`/`clearEditParam` declared below it, so the optimizer
captured them as undefined. Fixed by moving the handlers above the task, adding a
`getById` fallback for entries outside the loaded page, and stripping `?edit`
after opening. Later folded into the shared tracker-log shell (see log.md), where
all four pages are date-scoped and the day report deep-links with `?date` too.

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

## Better analytics — especially over time
The per-page summary cards (latest, 7-day averages, daily totals, all-time
counts) and the mood day chart are a start, but the app needs real
trend/analysis views as data accumulates:
- Longer-range trends per tracker (weight/mood/sleep/calories over weeks &
  months), selectable ranges, moving averages.
- Cross-tracker correlation (e.g. sleep vs. mood, calories vs. weight) — see
  "Further-out ideas".
- Totals/streaks/consistency and other rollups worth surfacing.
Intentionally deferred: hold until real usage clarifies which views actually
earn their place, rather than building charts speculatively.

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

## Model alcohol as a real macro (`alcohol_g`)
Alcohol is **7 kcal/g** and isn't captured by the 4/4/9 protein/carb/fat math.
Shipped a front-end **manual calorie override** so alcohol is loggable now (type
the calories directly; a shot ≈ 100 kcal / 0 macros; beer/wine = carbs *plus*
alcohol calories). The fuller version: add an `alcohol_g` column + migration,
fold it into the auto-calc (`… + alcohol * 7`), expose it as a 4th macro input,
and track/chart it. Backend + type changes — deferred.

## Further-out ideas
Originally scoped out in Phase 0, still worth noting:
- Date-effective (historical) goals instead of one current goal record.
- Kilograms support in the UI (the `unit` field already stores the choice).
- Correlation / comparative charts (e.g. sleep vs. mood).
- Third-party food database / barcode scanning.
- Social features; native mobile apps.
- Email verification.
