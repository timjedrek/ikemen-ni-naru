import { component$ } from "@builder.io/qwik";
import type { DayDetail } from "~/types/analytics";
import { formatDuration, formatTime } from "~/utils/datetime";

// The day is drawn from 5 AM to midnight (the next day), the waking window most
// entries fall in. Anything outside is clamped to the nearest edge rather than
// dropped, so a pin is never lost — it just sits at the boundary.
const START_HOUR = 5;
const END_HOUR = 24; // midnight, next day
const SPAN = END_HOUR - START_HOUR;

// Tick marks across the window. The two edges are aligned inward (left/right) so
// their labels don't overflow the plot; the interior ticks center on their mark.
const TICKS: { h: number; align: "left" | "center" | "right" }[] = [
  { h: 5, align: "left" },
  { h: 9, align: "center" },
  { h: 13, align: "center" },
  { h: 17, align: "center" },
  { h: 21, align: "center" },
  { h: 24, align: "right" },
];

type PointKind = "food" | "mood" | "weight";

// Solid dot color per point tracker. Sleep isn't here — it's a span, not a pin.
const PIN_COLOR: Record<PointKind, string> = {
  food: "bg-amber-500",
  mood: "bg-accent-500",
  weight: "bg-brand-500",
};

const LEGEND_LABEL: Record<PointKind | "sleep", string> = {
  food: "Food",
  sleep: "Sleep",
  mood: "Mood",
  weight: "Weight",
};

// Hour-of-day (0–24) → "5 AM" / "1 PM" / "12 AM".
function hourLabel(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr < 12 ? "AM" : "PM";
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display} ${period}`;
}

function clampHour(h: number): number {
  return Math.max(START_HOUR, Math.min(END_HOUR, h));
}

// An hour offset from the day's local midnight → percent across the window.
function pct(hourOffset: number): number {
  return ((clampHour(hourOffset) - START_HOUR) / SPAN) * 100;
}

/**
 * A one-day timeline: a horizontal bar spanning 5 AM → midnight with hour ticks,
 * a pin for each point entry (food/mood/weight) and a labelled span for each
 * sleep. Times are local; food has no "eaten" time so it's placed by created_at
 * (when it was logged), matching the "By time" feed.
 *
 * Pure/presentational — it only renders on the client (the day page fetches its
 * data in a visible task), so local-time Date math can't cause a hydration
 * mismatch.
 */
export const DayTimeline = component$<{ detail: DayDetail }>(({ detail }) => {
  const midnight = new Date(`${detail.date}T00:00:00`).getTime();
  const toOffset = (iso: string) => (new Date(iso).getTime() - midnight) / 3_600_000;

  const points = [
    ...detail.food.map((e) => ({
      kind: "food" as const,
      offset: toOffset(e.created_at),
      label: e.food_name,
      iso: e.created_at,
    })),
    ...detail.mood.map((e) => ({
      kind: "mood" as const,
      offset: toOffset(e.recorded_at),
      label: `Mood ${e.mood_score}/10`,
      iso: e.recorded_at,
    })),
    ...detail.weight.map((e) => ({
      kind: "weight" as const,
      offset: toOffset(e.measured_at),
      label: `${e.weight} ${e.unit}`,
      iso: e.measured_at,
    })),
  ];

  // Keep only sleeps whose span overlaps the visible window at all.
  const sleeps = detail.sleep
    .map((e) => ({
      start: toOffset(e.started_at),
      end: toOffset(e.ended_at),
      duration: e.duration_minutes,
    }))
    .filter((s) => s.end > START_HOUR && s.start < END_HOUR);

  const present = (["food", "sleep", "mood", "weight"] as const).filter(
    (k) => detail[k].length > 0,
  );

  return (
    <section class="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-semibold tracking-tight text-foreground">
          Timeline
        </h2>
        <div class="flex flex-wrap items-center gap-3 text-xs text-muted">
          {present.map((k) => (
            <span key={k} class="inline-flex items-center gap-1.5">
              <span
                class={`h-2.5 w-2.5 rounded-full ${
                  k === "sleep"
                    ? "bg-violet-500/30 ring-1 ring-violet-500"
                    : PIN_COLOR[k]
                }`}
              />
              {LEGEND_LABEL[k]}
            </span>
          ))}
        </div>
      </div>

      {/* Plot: gridlines, the track band, sleep spans, then point pins on top. */}
      <div class="relative h-10">
        {TICKS.map((t) => (
          <div
            key={`grid-${t.h}`}
            class="absolute bottom-0 top-0 w-px bg-line"
            style={{ left: `${pct(t.h)}%` }}
          />
        ))}

        <div class="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 rounded-lg bg-surface-muted ring-1 ring-line" />

        {sleeps.map((s, i) => {
          const left = pct(s.start);
          const width = pct(s.end) - left;
          return (
            <div
              key={`sleep-${i}`}
              title={`Sleep · ${formatDuration(s.duration)}`}
              class="absolute top-1/2 flex h-6 -translate-y-1/2 items-center justify-center overflow-hidden rounded-lg bg-violet-500/20 px-2 text-xs font-medium text-violet-700 ring-1 ring-violet-500/40 dark:text-violet-300"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span class="truncate">Sleep</span>
            </div>
          );
        })}

        {points.map((p, i) => (
          <div
            key={`pin-${i}`}
            title={`${p.label} · ${formatTime(p.iso)}`}
            class={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${PIN_COLOR[p.kind]}`}
            style={{ left: `${pct(p.offset)}%` }}
          />
        ))}
      </div>

      {/* Hour labels */}
      <div class="relative mt-2 h-4">
        {TICKS.map((t) => (
          <span
            key={`label-${t.h}`}
            class="absolute text-xs text-subtle"
            style={{
              left: `${pct(t.h)}%`,
              transform:
                t.align === "left"
                  ? "translateX(0)"
                  : t.align === "right"
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            {hourLabel(t.h)}
          </span>
        ))}
      </div>
    </section>
  );
});
