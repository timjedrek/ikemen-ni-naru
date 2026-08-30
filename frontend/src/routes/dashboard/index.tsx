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
import { LogNav } from "~/components/log-nav/log-nav";
import { LogoMark } from "~/components/logo/logo";
import { ThemeToggle } from "~/components/theme-toggle/theme-toggle";
import {
  getCurrentUser,
  getFoodAnalytics,
  getMoodAnalytics,
  getSleepAnalytics,
  getWeightAnalytics,
  logout,
  type User,
} from "~/services/api";
import type {
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

function defaultStart(): string {
  return localDateIso(new Date(Date.now() - 29 * DAY_MS)); // last 30 days incl. today
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

// Clock-time y-axis label: 7 → "07:00", -1 → "23:00".
function clockLabel(hour: number): string {
  const h = ((Math.round(hour) % 24) + 24) % 24;
  return `${String(h).padStart(2, "0")}:00`;
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

function foodOption(series: FoodSeries, dark: boolean): object {
  const n = neutrals(dark);
  const dates = series.items.map((p) => p.date);
  // Stack macro *calorie contributions* (Atwater: 4/4/9) so the stack height
  // reads as total calories — grams alone wouldn't sum to calories.
  const pt = (grams: string, factor: number, date: string) => ({
    value: Math.round(Number(grams) * factor),
    date,
  });
  return {
    grid: baseGrid,
    tooltip: { trigger: "axis" },
    legend: {
      data: ["Protein", "Carbs", "Fat"],
      top: 0,
      right: 0,
      textStyle: { color: n.axis },
    },
    xAxis: {
      type: "category",
      data: dates,
      axisLabel: { color: n.axis },
      axisLine: { lineStyle: { color: n.split } },
    },
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
        data: series.items.map((p) => pt(p.protein_g, 4, p.date)),
      },
      {
        name: "Carbs",
        type: "line",
        stack: "cal",
        areaStyle: { opacity: 0.7 },
        showSymbol: false,
        lineStyle: { width: 1 },
        color: COLOR.carb,
        data: series.items.map((p) => pt(p.carb_g, 4, p.date)),
      },
      {
        name: "Fat",
        type: "line",
        stack: "cal",
        areaStyle: { opacity: 0.7 },
        showSymbol: false,
        lineStyle: { width: 1 },
        color: COLOR.fat,
        data: series.items.map((p) => pt(p.fat_g, 9, p.date)),
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

// Shared x-axis for the per-entry trackers (weight/mood): a real time axis
// spanning the selected window. Unlike the day-category axis, each reading sits
// at its own instant, so several readings in one day are distinct points and the
// line connects through *all* of them in chronological order — matching the
// hand-drawn reference where the line never skips a point.
function dayTimeAxis(start: string, end: string, dark: boolean): object {
  const n = neutrals(dark);
  return {
    type: "time",
    // Pin the window to the selected range so the line spans the whole month
    // rather than just the first/last reading.
    min: `${start}T00:00:00`,
    max: `${end}T23:59:59`,
    axisLabel: { color: n.axis, hideOverlap: true, formatter: "{M}/{d}" },
    axisLine: { lineStyle: { color: n.split } },
    axisTick: { show: false },
    splitLine: { show: false },
  };
}

// One reading, flattened for charting: its instant (`t`), value (`v`), and the
// local day it belongs to.
type EntryPoint = { t: string; v: number; day: string };

// Build the day-to-day connecting segments. A single polyline can't express
// "the 28th connects to *both* the 29th's readings" — it would just thread
// 240 → 245 → 242. So instead we fully connect each day's points to the next
// day's points (a bipartite join): every dot on day N gets a line to every dot
// on day N+1. Multiple readings a day therefore fan out into the diamond/zigzag
// shapes from the hand-drawn reference. "Next day" means the next day that has
// data, so gaps stay bridged and the line reads as continuous.
function daySegments(points: EntryPoint[]): { coords: [string, number][] }[] {
  const byDay = new Map<string, EntryPoint[]>();
  for (const p of points) {
    const bucket = byDay.get(p.day);
    if (bucket) bucket.push(p);
    else byDay.set(p.day, [p]);
  }
  const days = [...byDay.keys()].sort(); // "YYYY-MM-DD" sorts chronologically
  const segments: { coords: [string, number][] }[] = [];
  for (let i = 1; i < days.length; i++) {
    const prev = byDay.get(days[i - 1])!;
    const cur = byDay.get(days[i])!;
    for (const a of prev) {
      for (const b of cur) {
        segments.push({ coords: [[a.t, a.v], [b.t, b.v]] });
      }
    }
  }
  return segments;
}

// Item tooltip for a per-entry point: "Fri 8/29, 7:14 AM" over the value. The
// dot's value is [isoTimestamp, number]; `unit` is appended (e.g. "lb", "/ 10").
function entryTooltip(unit: string): object {
  return {
    trigger: "item",
    formatter: (p: { value: [string, number] }) => {
      const when = new Date(p.value[0]).toLocaleString(undefined, {
        weekday: "short",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `${when}<br/><strong>${p.value[1]} ${unit}</strong>`;
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
      // Keep the local day on each dot so a click drills into that day.
      data: points.map((p) => ({ value: [p.t, p.v], date: p.day })),
      z: 2,
    },
  ];
}

function weightOption(series: WeightSeries, start: string, end: string, dark: boolean): object {
  const n = neutrals(dark);
  const points: EntryPoint[] = series.items.map((p) => ({
    t: p.measured_at,
    v: Number(p.weight),
    day: localDayOf(p.measured_at),
  }));
  return {
    grid: baseGrid,
    tooltip: entryTooltip("lb"),
    xAxis: dayTimeAxis(start, end, dark),
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

function moodOption(series: MoodSeries, start: string, end: string, dark: boolean): object {
  const n = neutrals(dark);
  const points: EntryPoint[] = series.items.map((p) => ({
    t: p.recorded_at,
    v: p.mood_score,
    day: localDayOf(p.recorded_at),
  }));
  return {
    grid: baseGrid,
    tooltip: entryTooltip("/ 10"),
    xAxis: dayTimeAxis(start, end, dark),
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
  const points = series.items
    .map((s) => {
      const day = localDayOf(s.ended_at);
      const dayIndex = days.indexOf(day);
      if (dayIndex < 0) return null; // ended outside the visible range
      return {
        value: [
          dayIndex,
          hoursFromMidnight(s.started_at, day),
          hoursFromMidnight(s.ended_at, day),
        ],
        date: day,
      };
    })
    .filter((p): p is { value: number[]; date: string } => p !== null);

  // Fit the y-axis to the data with a little padding, but keep a sensible
  // default window (evening → late morning) when there's little/no data.
  const starts = points.map((p) => p.value[1]);
  const ends = points.map((p) => p.value[2]);
  const yMin = Math.floor(Math.min(-2, ...starts) - 1);
  const yMax = Math.ceil(Math.max(10, ...ends) + 1);

  return {
    grid: { ...baseGrid, left: 56 },
    tooltip: { trigger: "item" },
    xAxis: dayCategoryAxis(days, dark),
    yAxis: {
      type: "value",
      min: yMin,
      max: yMax,
      interval: 3,
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
          const top = api.coord([dayIndex, api.value(2)]); // wake time (higher y)
          const bottom = api.coord([dayIndex, api.value(1)]); // sleep start
          const bandWidth = api.size([1, 0])[0];
          const width = Math.max(6, bandWidth * 0.5);
          return {
            type: "rect",
            shape: {
              x: top[0] - width / 2,
              y: top[1],
              width,
              height: bottom[1] - top[1],
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

  const start = useSignal(defaultStart());
  const end = useSignal(defaultEnd());

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

  const doLogout = $(async () => {
    await logout();
    await nav("/login");
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
      <header class="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <div class="flex items-center gap-2.5">
            <LogoMark class="h-8 w-8" />
            <span class="text-base font-semibold tracking-tight text-foreground">
              Dashboard
            </span>
          </div>
          <LogNav />
          <div class="flex items-center gap-3">
            <span class="hidden text-sm text-muted lg:inline">
              Signed in as{" "}
              <span class="font-medium text-foreground">
                {authUser.value?.display_name || authUser.value?.email}
              </span>
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick$={doLogout}
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-muted ring-1 ring-line transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-6 py-8">
        <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
              Your trends
            </h1>
            <p class="mt-0.5 text-sm text-muted">
              Click any point to open that day's full breakdown.
            </p>
          </div>
          <div class="flex flex-wrap items-end gap-3">
            <label class="flex flex-col text-sm font-medium text-foreground">
              From
              <input
                type="date"
                value={start.value}
                max={end.value}
                onChange$={(_, el) => (start.value = el.value)}
                class="mt-1 rounded-lg border-0 bg-surface px-3 py-2 text-foreground shadow-sm ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
              />
            </label>
            <label class="flex flex-col text-sm font-medium text-foreground">
              To
              <input
                type="date"
                value={end.value}
                min={start.value}
                onChange$={(_, el) => (end.value = el.value)}
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
                option={noSerialize(weightOption(weight.value!, start.value, end.value, dark.value))}
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
                option={noSerialize(foodOption(food.value!, dark.value))}
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
                option={noSerialize(moodOption(mood.value!, start.value, end.value, dark.value))}
                onPointClick$={openDay}
              />
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>
        </div>
      </main>
    </div>
  );
});

const ChartCard = component$<{ title: string; href: string }>(
  ({ title, href }) => {
    return (
      <section class="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
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
