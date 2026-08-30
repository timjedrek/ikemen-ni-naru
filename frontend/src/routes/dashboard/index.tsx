import {
  $,
  component$,
  noSerialize,
  Slot,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
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

function weightOption(series: WeightSeries, dark: boolean): object {
  const n = neutrals(dark);
  return {
    grid: baseGrid,
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "time",
      axisLabel: { color: n.axis },
      axisLine: { lineStyle: { color: n.split } },
    },
    yAxis: {
      type: "value",
      scale: true,
      name: "lb",
      nameTextStyle: { color: n.axis },
      axisLabel: { color: n.axis },
      splitLine: { lineStyle: { color: n.split } },
    },
    series: [
      {
        type: "line",
        showSymbol: true,
        symbolSize: 8,
        color: COLOR.weight,
        // One point per weigh-in — multiple same-day weigh-ins keep their own
        // timestamps and plot as separate dots.
        data: series.items.map((p) => ({
          value: [p.measured_at, Number(p.weight)],
          date: localDayOf(p.measured_at),
        })),
      },
    ],
  };
}

function moodOption(series: MoodSeries, dark: boolean): object {
  const n = neutrals(dark);
  return {
    grid: baseGrid,
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "time",
      axisLabel: { color: n.axis },
      axisLine: { lineStyle: { color: n.split } },
    },
    yAxis: {
      type: "value",
      min: 1,
      max: 10,
      name: "mood",
      nameTextStyle: { color: n.axis },
      axisLabel: { color: n.axis },
      splitLine: { lineStyle: { color: n.split } },
    },
    series: [
      {
        type: "line",
        showSymbol: true,
        symbolSize: 8,
        color: COLOR.mood,
        data: series.items.map((p) => ({
          value: [p.recorded_at, p.mood_score],
          date: localDayOf(p.recorded_at),
        })),
      },
    ],
  };
}

function sleepOption(series: SleepSeries, dark: boolean): object {
  const n = neutrals(dark);
  // A Gantt-style timeline: each sleep is a bar spanning start→end on a real
  // time axis, so the chart shows *when* sleep happened (naps included), not
  // just how long. Drawn with a custom renderItem (the one place ECharts needs
  // a function; this option is only ever consumed client-side).
  return {
    grid: { ...baseGrid, left: 64 },
    tooltip: { trigger: "item" },
    xAxis: {
      type: "time",
      axisLabel: { color: n.axis },
      axisLine: { lineStyle: { color: n.split } },
      splitLine: { show: true, lineStyle: { color: n.split } },
    },
    yAxis: {
      type: "category",
      data: ["Sleep"],
      axisLabel: { color: n.axis },
      axisLine: { lineStyle: { color: n.split } },
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
          const lane = api.value(0);
          const start = api.coord([api.value(1), lane]);
          const end = api.coord([api.value(2), lane]);
          const height = api.size([0, 1])[1] * 0.5;
          return {
            type: "rect",
            shape: {
              x: start[0],
              y: start[1] - height / 2,
              width: end[0] - start[0],
              height,
            },
            style: api.style(),
          };
        },
        encode: { x: [1, 2], y: 0 },
        data: series.items.map((s) => ({
          value: [0, Date.parse(s.started_at), Date.parse(s.ended_at)],
          // A sleep belongs to the day it *ended* (the morning you woke).
          date: localDayOf(s.ended_at),
        })),
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
          <ChartCard title="Food" subtitle="Calories by macro, per day">
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

          <ChartCard title="Sleep" subtitle="When you slept (and for how long)">
            {hasSleep ? (
              <Chart
                class="h-72 w-full"
                option={noSerialize(sleepOption(sleep.value!, dark.value))}
                onPointClick$={openDay}
              />
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>

          <ChartCard title="Mood" subtitle="Every reading, over time">
            {hasMood ? (
              <Chart
                class="h-72 w-full"
                option={noSerialize(moodOption(mood.value!, dark.value))}
                onPointClick$={openDay}
              />
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>

          <ChartCard title="Weight" subtitle="Every weigh-in, over time">
            {hasWeight ? (
              <Chart
                class="h-72 w-full"
                option={noSerialize(weightOption(weight.value!, dark.value))}
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

const ChartCard = component$<{ title: string; subtitle: string }>(
  ({ title, subtitle }) => {
    return (
      <section class="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
        <div class="mb-3">
          <h2 class="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p class="text-sm text-muted">{subtitle}</p>
        </div>
        <Slot />
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
