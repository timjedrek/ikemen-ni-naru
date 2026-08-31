import { component$, type QRL } from "@builder.io/qwik";
import type { MoodEntry } from "~/types/mood-entry";
import { formatTime } from "~/utils/datetime";

// Same waking window the day timeline uses: 5 AM → midnight. Entries outside are
// clamped to the nearest edge so a point is never dropped.
const START_HOUR = 5;
const END_HOUR = 24;
const SPAN = END_HOUR - START_HOUR;

// Hour gridlines/labels across the window (edges aligned inward).
const TICKS = [5, 9, 13, 17, 21, 24];
// Score gridlines/labels up the y-axis.
const SCORES = [0, 2, 4, 6, 8, 10];

// SVG coordinate space (scaled to full width via viewBox + w-full). Padding
// leaves room for the axis labels.
const W = 800;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 26, left: 30 };

function hourLabel(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr < 12 ? "AM" : "PM";
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display} ${period}`;
}

function clampHour(h: number): number {
  return Math.max(START_HOUR, Math.min(END_HOUR, h));
}

// Hour-of-day offset → x pixel; score (0–10) → y pixel (0 at the bottom).
function xAt(hourOffset: number): number {
  const frac = (clampHour(hourOffset) - START_HOUR) / SPAN;
  return PAD.left + frac * (W - PAD.left - PAD.right);
}
function yAt(score: number): number {
  const frac = Math.max(0, Math.min(10, score)) / 10;
  return H - PAD.bottom - frac * (H - PAD.top - PAD.bottom);
}

// How much to bow the line between points. 0 = straight segments; the standard
// Catmull-Rom smoothing is ~0.167 — this is intentionally gentler so the curve
// just softens the corners rather than swooping.
const TENSION = 0.06;

// Smooth (curved) path through the points via a Catmull-Rom → cubic-bezier
// conversion. Falls back to nothing for fewer than two points (dots only).
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) * TENSION;
    const c1y = p1.y + (p2.y - p0.y) * TENSION;
    const c2x = p2.x - (p3.x - p1.x) * TENSION;
    const c2y = p2.y - (p3.y - p1.y) * TENSION;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * A one-day mood line chart: the same 5 AM → midnight window as the day
 * timeline along the x-axis, mood score 0 (bottom) → 10 (top) on the y-axis,
 * curved between points. Each point is clickable and opens that entry for
 * editing. Full width so it spans the form + feed columns.
 *
 * Client-only (the page loads its data in a visible task), so local-time Date
 * math here can't cause a hydration mismatch.
 */
export const MoodChart = component$<{
  entries: MoodEntry[];
  date: string;
  onPointClick$: QRL<(entry: MoodEntry) => void>;
}>(({ entries, date, onPointClick$ }) => {
  const midnight = new Date(`${date}T00:00:00`).getTime();
  const toOffset = (iso: string) => (new Date(iso).getTime() - midnight) / 3_600_000;

  // Oldest → newest so the line reads left to right.
  const points = [...entries]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((e) => ({
      e,
      x: xAt(toOffset(e.recorded_at)),
      y: yAt(e.mood_score),
    }));

  return (
    <section class="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <h2 class="mb-4 text-lg font-semibold tracking-tight text-foreground">Mood timeline</h2>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        class="w-full"
        role="img"
        aria-label="Mood over the course of the day"
      >
        {/* Horizontal score gridlines + labels */}
        {SCORES.map((s) => (
          <g key={`y-${s}`}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yAt(s)}
              y2={yAt(s)}
              class="stroke-line"
              stroke-width={1}
            />
            <text
              x={PAD.left - 6}
              y={yAt(s)}
              text-anchor="end"
              dominant-baseline="middle"
              class="fill-subtle text-[11px]"
            >
              {s}
            </text>
          </g>
        ))}

        {/* Vertical hour gridlines + labels */}
        {TICKS.map((h, i) => (
          <g key={`x-${h}`}>
            <line
              x1={xAt(h)}
              x2={xAt(h)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              class="stroke-line"
              stroke-width={1}
            />
            <text
              x={xAt(h)}
              y={H - PAD.bottom + 16}
              text-anchor={i === 0 ? "start" : i === TICKS.length - 1 ? "end" : "middle"}
              class="fill-subtle text-[11px]"
            >
              {hourLabel(h)}
            </text>
          </g>
        ))}

        {/* The curved line */}
        {points.length >= 2 && (
          <path
            d={smoothPath(points)}
            fill="none"
            class="stroke-accent-500"
            stroke-width={2.5}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        )}

        {/* Points — each opens its entry for editing */}
        {points.map((p) => (
          <g
            key={p.e.id}
            class="cursor-pointer"
            onClick$={() => onPointClick$(p.e)}
            role="button"
            aria-label={`Mood ${p.e.mood_score} of 10 at ${formatTime(p.e.recorded_at)} — edit`}
          >
            <title>{`Mood ${p.e.mood_score}/10 · ${formatTime(p.e.recorded_at)}`}</title>
            {/* Larger transparent hit area for easy tapping */}
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={5}
              class="fill-accent-500 stroke-surface"
              stroke-width={2}
            />
          </g>
        ))}
      </svg>
    </section>
  );
});
