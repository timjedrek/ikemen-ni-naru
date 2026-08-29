// Helpers for moving between the API (UTC ISO 8601 strings) and the browser's
// <input type="datetime-local"> value, which is a *naive local* "YYYY-MM-DDTHH:MM".
//
// The API stores instants in UTC; the user thinks in local time. We convert at
// the edge: local → UTC on submit, UTC → local when prefilling a form, and
// UTC → friendly local text for display.

// Zero-pad to two digits.
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Current local time as a datetime-local value, for form defaults.
export function nowLocalInput(): string {
  return dateToLocalInput(new Date());
}

// A Date → "YYYY-MM-DDTHH:MM" in the browser's local timezone.
function dateToLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

// datetime-local value (local wall-clock) → UTC ISO string for the API.
// `new Date("YYYY-MM-DDTHH:MM")` parses as local time, so toISOString() gives
// the correct UTC instant.
export function localInputToIso(local: string): string {
  return new Date(local).toISOString();
}

// UTC ISO string from the API → datetime-local value, for prefilling an edit.
export function isoToLocalInput(iso: string): string {
  return dateToLocalInput(new Date(iso));
}

// UTC ISO → friendly local text, e.g. "Aug 29, 2026, 7:30 AM".
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Whole minutes → "7h 45m" (or "45m" when under an hour).
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
