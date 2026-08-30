import {
  $,
  component$,
  type QRL,
  Slot,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { Link, useLocation, useNavigate } from "@builder.io/qwik-city";
import { LogNav } from "~/components/log-nav/log-nav";
import { LogoMark } from "~/components/logo/logo";
import { ThemeToggle } from "~/components/theme-toggle/theme-toggle";
import {
  deleteFoodEntry,
  deleteMoodEntry,
  deleteSleepEntry,
  deleteWeightEntry,
  getCurrentUser,
  getDayDetail,
  logout,
  type User,
} from "~/services/api";
import type { DayDetail } from "~/types/analytics";
import { formatDateTime, formatDuration } from "~/utils/datetime";

// "2026-08-29" → "Saturday, Aug 29, 2026". Parsed as local midnight so the
// weekday/label match the day the user drilled into.
function formatDayHeading(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default component$(() => {
  const nav = useNavigate();
  const date = useLocation().params.date;

  const authUser = useSignal<User | null>(null);
  const authChecked = useSignal(false);

  const data = useSignal<DayDetail | null>(null);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);

  const reload = $(async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await getDayDetail(date);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load day";
    } finally {
      loading.value = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const user = await getCurrentUser();
    if (!user) {
      await nav("/login");
      return;
    }
    authUser.value = user;
    authChecked.value = true;
    await reload();
  });

  const doLogout = $(async () => {
    await logout();
    await nav("/login");
  });

  // Delete in place, then refresh the day. Edits happen on the tracker pages
  // (linked per entry), which own the forms.
  const removeFood = $(async (id: number) => {
    await deleteFoodEntry(id);
    await reload();
  });
  const removeWeight = $(async (id: number) => {
    await deleteWeightEntry(id);
    await reload();
  });
  const removeMood = $(async (id: number) => {
    await deleteMoodEntry(id);
    await reload();
  });
  const removeSleep = $(async (id: number) => {
    await deleteSleepEntry(id);
    await reload();
  });

  if (!authChecked.value) {
    return (
      <main class="flex min-h-screen items-center justify-center">
        <p class="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  const d = data.value;
  const isEmpty =
    d !== null &&
    d.food.length === 0 &&
    d.weight.length === 0 &&
    d.mood.length === 0 &&
    d.sleep.length === 0;

  return (
    <div class="min-h-screen">
      <header class="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur">
        <div class="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3.5">
          <div class="flex items-center gap-2.5">
            <LogoMark class="h-8 w-8" />
            <span class="text-base font-semibold tracking-tight text-foreground">
              Day
            </span>
          </div>
          <LogNav />
          <div class="flex items-center gap-3">
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

      <main class="mx-auto max-w-4xl px-6 py-8">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard"
              class="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              ← Back to dashboard
            </Link>
            <h1 class="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {formatDayHeading(date)}
            </h1>
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

        {isEmpty && (
          <div class="rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-brand-500/15">
              🗓️
            </div>
            <p class="mt-4 text-sm font-medium text-foreground">
              Nothing logged on this day
            </p>
            <p class="mt-1 text-sm text-muted">
              Pick another day from the dashboard.
            </p>
          </div>
        )}

        {d && !isEmpty && (
          <div class="space-y-8">
            {/* Food */}
            {d.food.length > 0 && (
              <Section title="Food" href="/food">
                <ul class="space-y-3">
                  {d.food.map((e) => (
                    <Row
                      key={e.id}
                      title={e.food_name}
                      badge={e.meal_category}
                      meta={`${e.calories} kcal · P ${e.protein_g}g · C ${e.carb_g}g · F ${e.fat_g}g`}
                      sub={e.serving_description}
                      notes={e.notes}
                      onDelete$={() => removeFood(e.id)}
                    />
                  ))}
                </ul>
              </Section>
            )}

            {/* Sleep */}
            {d.sleep.length > 0 && (
              <Section title="Sleep" href="/sleep">
                <ul class="space-y-3">
                  {d.sleep.map((e) => (
                    <Row
                      key={e.id}
                      title={formatDuration(e.duration_minutes)}
                      badge={`quality ${e.quality_score}/10`}
                      meta={`${formatDateTime(e.started_at)} → ${formatDateTime(e.ended_at)}`}
                      notes={e.notes}
                      onDelete$={() => removeSleep(e.id)}
                    />
                  ))}
                </ul>
              </Section>
            )}

            {/* Mood */}
            {d.mood.length > 0 && (
              <Section title="Mood" href="/mood">
                <ul class="space-y-3">
                  {d.mood.map((e) => (
                    <Row
                      key={e.id}
                      title={`${e.mood_score}/10`}
                      meta={formatDateTime(e.recorded_at)}
                      notes={e.notes}
                      onDelete$={() => removeMood(e.id)}
                    />
                  ))}
                </ul>
              </Section>
            )}

            {/* Weight */}
            {d.weight.length > 0 && (
              <Section title="Weight" href="/weight">
                <ul class="space-y-3">
                  {d.weight.map((e) => (
                    <Row
                      key={e.id}
                      title={`${e.weight} ${e.unit}`}
                      meta={formatDateTime(e.measured_at)}
                      notes={e.notes}
                      onDelete$={() => removeWeight(e.id)}
                    />
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
});

// A tracker section with a heading that links to the full log page (where
// entries are edited).
const Section = component$<{ title: string; href: string }>(
  ({ title, href }) => {
    return (
      <section>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <Link
            href={href}
            class="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Open {title.toLowerCase()} log →
          </Link>
        </div>
        <Slot />
      </section>
    );
  },
);

// One entry card, shared across all four trackers.
const Row = component$<{
  title: string;
  badge?: string;
  meta: string;
  sub?: string | null;
  notes?: string | null;
  onDelete$: QRL<() => void>;
}>(({ title, badge, meta, sub, notes, onDelete$ }) => {
  return (
    <li class="rounded-xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-semibold text-foreground">{title}</h3>
            {badge && (
              <span class="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium capitalize text-muted">
                {badge}
              </span>
            )}
          </div>
          {sub && <p class="mt-0.5 text-sm text-muted">{sub}</p>}
          <p class="mt-1 text-sm text-muted">{meta}</p>
        </div>
        <button
          type="button"
          onClick$={onDelete$}
          class="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50 dark:text-red-400 dark:ring-red-900/50 dark:hover:bg-red-950/40"
        >
          Delete
        </button>
      </div>
      {notes && (
        <p class="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted">
          {notes}
        </p>
      )}
    </li>
  );
});
