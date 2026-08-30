import {
  $,
  component$,
  noSerialize,
  Slot,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { Chart, type ChartClickParams } from "~/components/chart/chart";
import { AppHeader } from "~/components/app-header/app-header";
import { DayFeed } from "~/components/day-feed/day-feed";
import {
  getCurrentUser,
  getFoodAnalytics,
  getMoodAnalytics,
  getSleepAnalytics,
  getWeightAnalytics,
  type User,
} from "~/services/api";
import type {
  FoodDayPoint,
  FoodSeries,
  MoodSeries,
  SleepSeries,
  WeightSeries,
} from "~/types/analytics";

// --- date helpers (local time) --------------------------------------------

// A Date → "YYYY-MM-DD" in the browser's local zone (not toISOString, which is
// UTC and can land on the wrong day near midnight).
function localDateIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const DAY_MS = 86_400_000;

// Selectable look-back windows (days), including today. 7 is the default.
const RANGE_OPTIONS = [7, 14, 30, 60, 90] as const;
const DEFAULT_RANGE = 7;

function startForRange(days: number): string {
  return localDateIso(new Date(Date.now() - (days - 1) * DAY_MS));
}
function defaultEnd(): string {
  return localDateIso(new Date());
}

// Which calendar day (local) a UTC instant belongs to — for drilling in from a
// timestamped point (weight/mood/sleep).
function localDayOf(iso: string): string {
  return localDateIso(new Date(iso));
}

// Every day in the inclusive [start, end] range as "YYYY-MM-DD". These are the
// shared x-axis categories for the weight/mood/sleep charts, so each day is a
// column and missing days simply show as empty columns.
function daysInRange(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  // Guard against an inverted range producing an unbounded loop.
  while (d <= last && out.length < 400) {
    out.push(localDateIso(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// A day category value ("YYYY-MM-DD") → short axis label, e.g. "Sat 8/29".
function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

// Hours (may be fractional/negative) of an instant relative to midnight of the
// given local day. Used to place a sleep vertically on its day's column: a sleep
// that began the previous evening reads as a negative start (e.g. 23:00 → -1).
function hoursFromMidnight(iso: string, dayIso: string): number {
  const midnight = new Date(`${dayIso}T00:00:00`).getTime();
  return (new Date(iso).getTime() - midnight) / 3_600_000;
}

// Which sleep-chart column an instant belongs to. The columns run 8 PM → 8 PM,
// so anything logged after 8 PM belongs to the *next* day's column (it sits at
// the top of that column, before midnight). Shifting +4h moves the 8 PM
// boundary to midnight, so the calendar day of the shifted instant is the
// column: 10 PM Aug 29 → 2 AM Aug 30 → the Aug 30 column.
const WINDOW_ANCHOR_MS = 4 * 3_600_000;
function windowDayOf(iso: string): string {
  return localDateIso(new Date(new Date(iso).getTime() + WINDOW_ANCHOR_MS));
}

// Clock-time y-axis label in 12-hour form so evening vs. morning is obvious as
// the axis crosses midnight: -3 → "9 PM", 0 → "12 AM", 6 → "6 AM", 9 → "9 AM".
function clockLabel(hour: number): string {
  const h = ((Math.round(hour) % 24) + 24) % 24;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

// Whole minutes → "6h 25m" (or "45m" under an hour). For the sleep tooltip.
function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// A UTC instant → local clock time, e.g. "7:25 AM". For the sleep tooltip.
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// --- chart palette ----------------------------------------------------------
// ECharts can't read our CSS tokens, so the brand/accent palette is mirrored as
// hex here. Axis/grid neutrals flip with the theme.

const COLOR = {
  protein: "#10b981", // emerald-500 (brand)
  carb: "#8b5cf6", // violet-500 (accent)
  fat: "#f59e0b", // amber-500
  weight: "#059669", // emerald-600
  mood: "#8b5cf6", // violet-500
  sleep: "#6366f1", // indigo-500
};

function neutrals(dark: boolean) {
  return {
    axis: dark ? "#94a3b8" : "#64748b", // slate-400 / slate-500
    split: dark ? "#1e293b" : "#e2e8f0", // slate-800 / slate-200
  };
}

const baseGrid = { left: 48, right: 16, top: 24, bottom: 32 };

// --- option builders (pure; no inline functions except ECharts renderItem) --

// Axis tooltip for the food chart: the day, then one line per macro showing
// both its calorie contribution and the grams behind it, then a calorie total.
type FoodTip = {
  seriesName: string;
  marker: string;
  axisValueLabel: string;
  value: number;
  data: { grams: number };
};
function foodTooltip(params: FoodTip[]): string {
  const head = params[0]?.axisValueLabel ?? "";
  const total = params.reduce((sum, p) => sum + (p.value || 0), 0);
  const rows = params
    .map(
      (p) =>
        `${p.marker}${p.seriesName}: <strong>${p.value} kcal</strong> (${p.data.grams} g)`,
    )
    .join("<br/>");
  return `${head}<br/>${rows}<br/>Total: <strong>${total} kcal</strong>`;
}

function foodOption(series: FoodSeries, days: string[], dark: boolean): object {
  const n = neutrals(dark);
  // Index the API's per-day points so we can lay them out over the full
  // selected window; days with no logged food render as an empty (0) column
  // rather than being dropped — that's what makes the range selector visibly
  // change this chart the way it does the weight/mood/sleep ones.
  const byDay = new Map(series.items.map((p) => [p.date, p]));
  // Stack macro *calorie contributions* (Atwater: 4/4/9) so the stack height
  // reads as total calories — grams alone wouldn't sum to calories. Each point
  // also carries its raw grams so the tooltip can show both.
  const macro = (factor: number, grams: (p: FoodDayPoint) => string) =>
    days.map((date) => {
      const p = byDay.get(date);
      const g = p ? Math.round(Number(grams(p))) : 0;
      return { value: p ? Math.round(g * factor) : 0, grams: g, date };
    });
  return {
    grid: baseGrid,
    tooltip: { trigger: "axis", formatter: foodTooltip },
    legend: {
      data: ["Protein", "Carbs", "Fat"],
      top: 0,
      right: 0,
      textStyle: { color: n.axis },
    },
    xAxis: dayCategoryAxis(days, dark),
    yAxis: {
      type: "value",
      name: "kcal",
      nameTextStyle: { color: n.axis },
      axisLabel: { color: n.axis },
      splitLine: { lineStyle: { color: n.split } },
    },
    series: [
      {
        name: "Protein",
        type: "line",
        stack: "cal",
        areaStyle: { opacity: 0.7 },
        showSymbol: false,
        lineStyle: { width: 1 },
        color: COLOR.protein,
        data: macro(4, (p) => p.protein_g),
      },
      {
        name: "Carbs",
        type: "line",
        stack: "cal",
        areaStyle: { opacity: 0.7 },
        showSymbol: false,
        lineStyle: { width: 1 },
        color: COLOR.carb,
        data: macro(4, (p) => p.carb_g),
      },
      {
        name: "Fat",
        type: "line",
        stack: "cal",
        areaStyle: { opacity: 0.7 },
        showSymbol: false,
        lineStyle: { width: 1 },
        color: COLOR.fat,
        data: macro(9, (p) => p.fat_g),
      },
    ],
  };
}

// Shared x-axis: one column per day in the range, weekday-labelled.
function dayCategoryAxis(days: string[], dark: boolean): object {
  const n = neutrals(dark);
  return {
    type: "category",
    data: days,
    boundaryGap: true,
    axisLabel: { color: n.axis, hideOverlap: true, formatter: dayLabel },
    axisLine: { lineStyle: { color: n.split } },
    axisTick: { show: false },
  };
}

// One reading, flattened for charting: the index of its day-column (`xi`), its
// real instant (`t`, for the tooltip), value (`v`), and the local day it belongs
// to. Position is by day-column, not by clock time, so every day is evenly
// spaced and multiple readings a day stack on the same column.
type EntryPoint = { xi: number; t: string; v: number; day: string };

// Flatten a tracker's items into day-column points, dropping anything outside
// the visible range.
function toDayPoints(
  items: { t: string; v: number }[],
  days: string[],
): EntryPoint[] {
  return items
    .map(({ t, v }) => {
      const day = localDayOf(t);
      const xi = days.indexOf(day);
      return xi < 0 ? null : { xi, t, v, day };
    })
    .filter((p): p is EntryPoint => p !== null);
}

// Build the day-to-day connecting segments. A single polyline can't express
// "the 28th connects to *both* the 29th's readings" — it would just thread
// 240 → 245 → 242. So instead we fully connect each day's points to the next
// day's points (a bipartite join): every dot on day N gets a line to every dot
// on day N+1. Multiple readings a day therefore fan out into the diamond/zigzag
// shapes from the hand-drawn reference. "Next day" means the next day-column
// that has data, so gaps stay bridged and the line reads as continuous.
function daySegments(points: EntryPoint[]): { coords: [number, number][] }[] {
  const byDay = new Map<string, EntryPoint[]>();
  for (const p of points) {
    const bucket = byDay.get(p.day);
    if (bucket) bucket.push(p);
    else byDay.set(p.day, [p]);
  }
  const days = [...byDay.keys()].sort(); // "YYYY-MM-DD" sorts chronologically
  const segments: { coords: [number, number][] }[] = [];
  for (let i = 1; i < days.length; i++) {
    const prev = byDay.get(days[i - 1])!;
    const cur = byDay.get(days[i])!;
    for (const a of prev) {
      for (const b of cur) {
        segments.push({ coords: [[a.xi, a.v], [b.xi, b.v]] });
      }
    }
  }
  return segments;
}

// Item tooltip for a per-entry point: "Fri 8/29, 7:14 AM" over the value. The
// real timestamp rides along on the dot's data as `t` (the x-position is only a
// day index); `unit` is appended (e.g. "lb", "/ 10").
function entryTooltip(unit: string): object {
  return {
    trigger: "item",
    formatter: (p: { data: { t: string; value: [number, number] } }) => {
      const when = new Date(p.data.t).toLocaleString(undefined, {
        weekday: "short",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `${when}<br/><strong>${p.data.value[1]} ${unit}</strong>`;
    },
  };
}

// Shared series for a per-entry tracker (weight/mood): the fan-out segments as a
// `lines` series, plus a `scatter` series for the (clickable) dots on top.
function connectedDaySeries(points: EntryPoint[], color: string): object[] {
  return [
    {
      type: "lines",
      coordinateSystem: "cartesian2d",
      polyline: false,
      silent: true,
      lineStyle: { color, width: 2, opacity: 0.9 },
      data: daySegments(points),
      z: 1,
    },
    {
      type: "scatter",
      symbolSize: 8,
      itemStyle: { color },
      // Keep the local day (for click drill-down) and real instant (for the
      // tooltip) on each dot; the value's x is just the day-column index.
      data: points.map((p) => ({ value: [p.xi, p.v], date: p.day, t: p.t })),
      z: 2,
    },
  ];
}

function weightOption(series: WeightSeries, days: string[], dark: boolean): object {
  const n = neutrals(dark);
  const points = toDayPoints(
    series.items.map((p) => ({ t: p.measured_at, v: Number(p.weight) })),
    days,
  );
  return {
    grid: baseGrid,
    tooltip: entryTooltip("lb"),
    xAxis: dayCategoryAxis(days, dark),
    yAxis: {
      type: "value",
      scale: true,
      name: "lb",
      nameTextStyle: { color: n.axis },
      axisLabel: { color: n.axis },
      splitLine: { lineStyle: { color: n.split } },
    },
    series: connectedDaySeries(points, COLOR.weight),
  };
}

function moodOption(series: MoodSeries, days: string[], dark: boolean): object {
  const n = neutrals(dark);
  const points = toDayPoints(
    series.items.map((p) => ({ t: p.recorded_at, v: p.mood_score })),
    days,
  );
  return {
    grid: baseGrid,
    tooltip: entryTooltip("/ 10"),
    xAxis: dayCategoryAxis(days, dark),
    yAxis: {
      type: "value",
      min: 1,
      max: 10,
      name: "mood",
      nameTextStyle: { color: n.axis },
      axisLabel: { color: n.axis },
      splitLine: { lineStyle: { color: n.split } },
    },
    series: connectedDaySeries(points, COLOR.mood),
  };
}

function sleepOption(series: SleepSeries, days: string[], dark: boolean): object {
  const n = neutrals(dark);
  // Each sleep is a vertical bar on its day's column, spanning its clock-time
  // range (y = time of day). A sleep is attributed to the day it *ended* (the
  // morning you woke), so an overnight sleep starts just below midnight (a
  // negative hour) and rises to the wake time. Naps fall out as short daytime
  // bars. Drawn with a custom renderItem — the one place ECharts needs a
  // function; this option is only ever consumed client-side.
  type SleepPoint = {
    value: number[];
    date: string;
    started: string;
    ended: string;
    duration: string;
    quality: number;
  };
  const points = series.items
    .map((s): SleepPoint | null => {
      // Place the bar in the 8 PM→8 PM column the sleep ended in, and measure
      // its vertical position from that column's midnight so an after-8 PM nap
      // reads as a negative start at the top of the next day's column rather
      // than dropping off the bottom of the day it was logged.
      const column = windowDayOf(s.ended_at);
      const dayIndex = days.indexOf(column);
      if (dayIndex < 0) return null; // ended outside the visible range
      return {
        value: [
          dayIndex,
          hoursFromMidnight(s.started_at, column),
          hoursFromMidnight(s.ended_at, column),
        ],
        // Drill-down still targets the real calendar day it was logged.
        date: localDayOf(s.ended_at),
        started: clockTime(s.started_at),
        ended: clockTime(s.ended_at),
        duration: durationLabel(s.duration_minutes),
        quality: s.quality_score,
      };
    })
    .filter((p): p is SleepPoint => p !== null);

  // Fixed 24-hour window anchored at 8 PM, drawn top-to-bottom (`inverse`): 8 PM
  // sits at the top, time flows down through midnight and morning to 8 PM the
  // next day at the bottom. In hours-from-midnight terms that's -4 → 20. A fixed
  // frame keeps every night comparable and stops a stray daytime nap from
  // stretching/squishing the overnight bars. Ticks every 4h land on clean clock
  // hours (8 PM, 12 AM, 4 AM, 8 AM, 12 PM, 4 PM, 8 PM).
  const Y_MIN = -4;
  const Y_MAX = 20;

  return {
    grid: { ...baseGrid, left: 56 },
    tooltip: {
      trigger: "item",
      // Duration is the headline; the clock range and quality give context. The
      // raw plotted value is hours-from-midnight, which is meaningless to read.
      formatter: (p: { data?: SleepPoint }) => {
        const d = p.data;
        if (!d) return "";
        return [
          `<strong>${d.duration}</strong>`,
          `${d.started} → ${d.ended}`,
          `quality ${d.quality}/10`,
        ].join("<br/>");
      },
    },
    xAxis: dayCategoryAxis(days, dark),
    yAxis: {
      type: "value",
      min: Y_MIN,
      max: Y_MAX,
      interval: 4,
      inverse: true,
      name: "time",
      nameTextStyle: { color: n.axis },
      axisLabel: { color: n.axis, formatter: clockLabel },
      splitLine: { lineStyle: { color: n.split } },
    },
    series: [
      {
        type: "custom",
        color: COLOR.sleep,
        renderItem: (
          params: unknown,
          api: {
            value: (i: number) => number;
            coord: (v: [number, number]) => [number, number];
            size: (v: [number, number]) => [number, number];
            style: () => unknown;
          },
        ) => {
          const dayIndex = api.value(0);
          // Orientation-independent: take both endpoints' pixels and span from
          // the smaller y down, so the bar draws correctly whether or not the
          // axis is inverted.
          const p1 = api.coord([dayIndex, api.value(1)]); // sleep start
          const p2 = api.coord([dayIndex, api.value(2)]); // wake
          const bandWidth = api.size([1, 0])[0];
          const width = Math.max(6, bandWidth * 0.5);
          return {
            type: "rect",
            shape: {
              x: p1[0] - width / 2,
              y: Math.min(p1[1], p2[1]),
              width,
              height: Math.abs(p2[1] - p1[1]),
              r: 3,
            },
            style: api.style(),
          };
        },
        encode: { x: 0, y: [1, 2] },
        data: points,
      },
    ],
  };
}

// --- page -------------------------------------------------------------------

export default component$(() => {
  const nav = useNavigate();
  const authUser = useSignal<User | null>(null);
  const authChecked = useSignal(false);

  // The active preset (7/14/…); null when the user has picked a custom range.
  const rangeDays = useSignal<number | null>(DEFAULT_RANGE);
  const start = useSignal(startForRange(DEFAULT_RANGE));
  const end = useSignal(defaultEnd());
  // Today's local date, for the "Today" feed at the bottom. Re-stamped
  // client-side in the auth task so it reflects the user's zone, not the server.
  const today = useSignal(defaultEnd());

  const food = useSignal<FoodSeries | null>(null);
  const weight = useSignal<WeightSeries | null>(null);
  const mood = useSignal<MoodSeries | null>(null);
  const sleep = useSignal<SleepSeries | null>(null);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  // Theme at render time, read client-side; option builders use it to pick
  // axis/grid neutrals that read on both light and dark surfaces.
  const dark = useSignal(false);

  const reload = $(async () => {
    if (!start.value || !end.value) return;
    loading.value = true;
    error.value = null;
    try {
      const [f, w, m, s] = await Promise.all([
        getFoodAnalytics(start.value, end.value),
        getWeightAnalytics(start.value, end.value),
        getMoodAnalytics(start.value, end.value),
        getSleepAnalytics(start.value, end.value),
      ]);
      food.value = f;
      weight.value = w;
      mood.value = m;
      sleep.value = s;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load charts";
    } finally {
      loading.value = false;
    }
  });

  // Auth gate + first load (buildplan Step 34 pattern). Nothing app-related
  // renders until the session check resolves.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const user = await getCurrentUser();
    if (!user) {
      await nav("/login");
      return;
    }
    authUser.value = user;
    dark.value = document.documentElement.classList.contains("dark");
    today.value = defaultEnd();
    authChecked.value = true;
    await reload();
  });

  // Reload when the range changes, but only once authenticated.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => start.value);
    track(() => end.value);
    if (!authChecked.value) return;
    reload();
  });


  // Switch the look-back window; the range-tracking task below reloads the data.
  const setRange = $((days: number) => {
    rangeDays.value = days;
    end.value = defaultEnd();
    start.value = startForRange(days);
  });

  const openDay = $((params: ChartClickParams) => {
    if (params.date) nav(`/day/${params.date}`);
  });

  if (!authChecked.value) {
    return (
      <main class="flex min-h-screen items-center justify-center">
        <p class="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  const hasFood = (food.value?.items.length ?? 0) > 0;
  const hasWeight = (weight.value?.items.length ?? 0) > 0;
  const hasMood = (mood.value?.items.length ?? 0) > 0;
  const hasSleep = (sleep.value?.items.length ?? 0) > 0;

  // Shared day columns for the weight/mood/sleep charts.
  const days = daysInRange(start.value, end.value);

  return (
    <div class="min-h-screen">
      <AppHeader user={authUser.value} />

      <main class="mx-auto max-w-6xl px-6 py-8">
        <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p class="mt-0.5 text-sm text-muted">
              Are you on track with your goals?
            </p>
          </div>
          <div class="flex flex-wrap items-end gap-3">
            <div
              role="group"
              aria-label="Quick date range"
              class="inline-flex rounded-lg bg-surface p-1 shadow-sm ring-1 ring-inset ring-line-strong"
            >
              {RANGE_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={rangeDays.value === days}
                  onClick$={() => setRange(days)}
                  class={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    rangeDays.value === days
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-muted hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <label class="flex flex-col text-sm font-medium text-foreground">
              From
              <input
                type="date"
                value={start.value}
                max={end.value}
                onChange$={(_, el) => {
                  start.value = el.value;
                  rangeDays.value = null; // custom range: clear preset highlight
                }}
                class="mt-1 rounded-lg border-0 bg-surface px-3 py-2 text-foreground shadow-sm ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
              />
            </label>
            <label class="flex flex-col text-sm font-medium text-foreground">
              To
              <input
                type="date"
                value={end.value}
                min={start.value}
                onChange$={(_, el) => {
                  end.value = el.value;
                  rangeDays.value = null;
                }}
                class="mt-1 rounded-lg border-0 bg-surface px-3 py-2 text-foreground shadow-sm ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
              />
            </label>
          </div>
        </div>

        {error.value && (
          <p
            role="alert"
            class="mb-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error.value}
          </p>
        )}
        {loading.value && <p class="mb-4 text-sm text-muted">Loading…</p>}

        <div class="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Weight" href="/weight">
            {hasWeight ? (
              <Chart
                class="h-72 w-full"
                option={noSerialize(weightOption(weight.value!, days, dark.value))}
                onPointClick$={openDay}
              />
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>

          <ChartCard title="Food" href="/food">
            {hasFood ? (
              <Chart
                class="h-72 w-full"
                option={noSerialize(foodOption(food.value!, days, dark.value))}
                onPointClick$={openDay}
              />
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>

          <ChartCard title="Sleep" href="/sleep">
            {hasSleep ? (
              <Chart
                class="h-72 w-full"
                option={noSerialize(sleepOption(sleep.value!, days, dark.value))}
                onPointClick$={openDay}
              />
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>

          <ChartCard title="Mood" href="/mood">
            {hasMood ? (
              <Chart
                class="h-72 w-full"
                option={noSerialize(moodOption(mood.value!, days, dark.value))}
                onPointClick$={openDay}
              />
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>
        </div>

        {/* Today's full breakdown — the same view as /day/[date], for today. */}
        <section class="mt-12">
          <div class="mb-6 flex items-center justify-between gap-3">
            <h2 class="text-xl font-bold tracking-tight text-foreground">
              Today
            </h2>
            <Link
              href={`/day/${today.value}`}
              class="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Open full day →
            </Link>
          </div>
          <DayFeed date={today.value} />
        </section>
      </main>
    </div>
  );
});

const ChartCard = component$<{ title: string; href: string }>(
  ({ title, href }) => {
    return (
      <section class="min-w-0 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <h2 class="mb-3 text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <Slot />
        <div class="mt-4 flex justify-end">
          <Link
            href={href}
            class="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            + Add {title.toLowerCase()} entry
          </Link>
        </div>
      </section>
    );
  },
);

const ChartEmpty = component$(() => {
  return (
    <div class="flex h-72 items-center justify-center rounded-xl border border-dashed border-line bg-surface/50">
      <p class="text-sm text-muted">No data in this range.</p>
    </div>
  );
});
