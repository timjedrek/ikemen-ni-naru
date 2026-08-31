# Post-Deploy Features & Bugs — August 2026

Source: `future-features.md` notes from 1.5 days of real-world app use (Aug 30–31, 2026).

---

## BUGS — Fix first

These are broken behaviors on the live app.

| # | Bug | Severity | Notes |
|---|-----|----------|-------|
| B1 | Feed does not update after form submit — requires full page refresh | High | Likely root cause of the "can't add another post" reports |
| B2 | After deleting a record, new entries can't be added (flash + disappear) — logout/login resets it | High | Probably same state/signal issue as B1 |
| B3 | Date/time field sometimes defaults to GMT/Zulu instead of local time — form breaks in that state | High | Intermittent; broken form state is the main issue |
| B4 | Alcohol calories stored but not included in dashboard chart equation | Medium | Tracked in future-features.md; affects accuracy |
| B5 | iPhone Safari: form field focus auto-zooms; viewport stays wrong after saving | Medium | CSS font-size fix on inputs typically resolves this |
| B6 | iPhone Safari: "Ru" in "naru" splash text is cut off | Low | Layout/overflow issue |
| B7 | Mobile Safari: date fields have no outlines; date picker in menu broken | Low | Possibly tied to B5 breakage state |

---

## QUICK WINS — Copy & polish (low effort, high visibility)

| # | Task |
|---|------|
| C1 | Change login page copy |
| C2 | Health-check page: remove the word "backend"; add fun dummy JSON (e.g. `"health": "tracked"`) |
| C3 | `robots.txt` — block everything past login (protected routes should already require auth) |

---

## NEAR TERM — High-value features

### N1 — Auto-select meal type by time of day
Food entry form pre-selects meal type based on current time:
- 05:00–10:30 → Breakfast
- 10:30–15:30 → Lunch
- 15:30–20:00 → Dinner
- 20:00–05:00 → Snack

### N2 — Previous / next day buttons on day feed
Navigation buttons on the `/day/[date]` page to step to adjacent days without touching the date picker.

### N3 — Duplicate / copy entry button
"Copy" button on any existing entry that pre-fills the form with that entry's values. Useful for repeated foods or retroactive logging.

### N4 — Expandable text area on forms
Text inputs that grow with content (Android noted as particularly helpful).

### N5 — Mood: split into Overall / Body / Mind
Add two new score fields to mood entries. Overall stays as the primary; Body and Mind are new optional secondaries.

### N6 — Weight chart y-axis: user-configurable range
Let the user set min/max for the weight chart y-axis instead of auto-scaling. Personal default might be 190–255 lbs; should work for anyone's range.

---

## MEDIUM TERM — More involved features

### M1 — Footer on all pages
Logo, "open source project" label, nav links. Foundation for the about page and food attribution.

### M2 — About page
Linked from footer.

### M3 — Food lookup via Open Nutrition
Integrate [Open Nutrition](https://www.opennutrition.app/download) for item lookup. Required attribution: footer blurb + link on food entry page only ("food lookup by Open Nutrition").

### M4 — Exercise log (new resource)
New tracker type: start/stop time, place, description, type (cardio / weights / both), intensity score. Photos deferred to same phase as mood/food photos.

### M5 — Photos on mood and food entries
File upload per entry, stored in object storage (S3 or Linode bucket). Same implementation for mood and food; exercise photos follow same pattern.

### M6 — Star / favorite entries
Star any entry; surface starred items in a dedicated view.

---

## LONGER TERM — Architecture / chart rethink

### L1 — Reusable chart component for entry pages
The dashboard date-range charts are useful. Can the same component be dropped into the top of food/weight/mood/sleep entry pages?

### L2 — Mood/weight chart: "pipe" visualization
Instead of every point connecting to every other point (web-like mess), draw a vertical line per day from min to max value, then connect: highest-to-highest and lowest-to-lowest across days. Creates a "pipe" silhouette instead of a tangle.

### L3 — Alcohol as a real macro (`alcohol_g`)
Add `alcohol_g` column, fold 7 kcal/g into auto-calc, expose as 4th macro input. Backend migration required. The manual calorie override is the current workaround.

---

## DEFERRED (already in future-features.md, not re-ordered here)

- Postgres backups & restore test
- Minimal test coverage (cross-user isolation)
- Goals feature
- UTC/timezone day-boundary fix
- Security hardening pass
- Full test suite
- Reusable food templates
- Data export & account deletion
- Full design system & accessibility audit
- API/performance refinement (indexes, pagination, N+1s)
- Operations & monitoring

---

## Open questions (to resolve before implementation)

1. **B1/B2 root cause** — Is this a Qwik signal reactivity issue (store not updated after mutation) or an API/session problem? Needs a look at the form submit handlers.
2. **B3 timezone** — Is the date field populated from JS `new Date()` or from the server? Is there a specific trigger for the GMT fallback?
3. **N5 mood fields** — Are Body and Mind required or optional? Do they affect the mood chart or just stored for reference?
4. **N6 weight chart range** — Store the user's preferred range in the DB (per-user setting) or browser local storage?
5. **M3 food lookup** — Search-as-you-type or a separate lookup modal? Does it auto-fill macros or just the food name?
6. **M5 photos** — S3 or Linode object storage? Who pays / what's the budget?
7. **L1 reusable chart** — Should entry pages and view pages stay as they are now, or merge?


/////// AI generated improvements..

  UI/UX Issues

  High impact:

  1. No delete confirmation — EntryRow deletes immediately on click. One misclick and an entry is gone with no undo. A
  simple "Are you sure?" or even a 3-second toast with an undo option would help a lot.
  2. Mood score is a <select> dropdown — A 1–10 scale is inherently spatial. A range slider would be much more intuitive
   and faster to use than opening a dropdown and picking a number. Could add emoji anchors (😢 → 😁) at the ends.
  3. "Where" field label on food form — The field is serving_description but labeled "Where". This is confusing — users
  expect "Where" to mean location. Better labels: "Serving size", "Description", or just "Notes (serving)".
  4. Dashboard requires lots of scrolling on mobile — The "Today" feed is below four charts. If someone opens the app to
   quickly log something or check today, they have to scroll past all the chart cards first. Consider moving Today
  higher or making the charts collapsible.

  Medium impact:

  5. "Jump to date" input in nav is invisible on desktop — It's just a bare date picker after the nav links with no
  label visible on screen (sr-only). Most users won't know it's there. A small calendar icon button that reveals the
  picker would be clearer.
  6. Multiplier field is jargon-heavy — "Multiplier (servings)" is technical. Renaming it to "Servings" and using step
  0.25 (common serving fractions) would be friendlier.
  7. Food macro precision in entry list — The list shows raw decimal strings: P 12.5g · C 30.0g · F 8.75g. These come
  straight from the DB without rounding. Math.round() on display would be cleaner.

  Low impact / polish:

  8. Mood score in list is just a number — "5 / 10" as a title is a bit cold. Even a colored indicator
  (green/yellow/red) based on the score would give the list visual scanability.
  9. The Day/All toggle label — "← Back to day" is fine but "Show all" doesn't convey what it does well — "All time" or
  "Feed" might be clearer.
  10. "Date" label in TrackerShell — On tracker pages, the date picker is labeled just "Date". Since it filters entries,
   something like "Viewing" or "For date" would communicate its purpose better.

