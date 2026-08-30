import {
  $,
  component$,
  type QRL,
  Slot,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { Link, useNavigate } from "@builder.io/qwik-city";
import { DayTimeline } from "~/components/day-timeline/day-timeline";
import { PencilIcon, TrashIcon } from "~/components/icons/action-icons";
import {
  deleteFoodEntry,
  deleteMoodEntry,
  deleteSleepEntry,
  deleteWeightEntry,
  getDayDetail,
} from "~/services/api";
import type { DayDetail } from "~/types/analytics";
import type { FoodEntry } from "~/types/food-entry";
import type { MoodEntry } from "~/types/mood-entry";
import type { SleepEntry } from "~/types/sleep-entry";
import type { WeightEntry } from "~/types/weight-entry";
import { formatDateTime, formatDuration, formatTime } from "~/utils/datetime";

// The two ways to read the day: grouped by tracker, or one time-ordered feed.
type DayView = "category" | "time";

type FeedKind = "food" | "sleep" | "mood" | "weight";

// A tinted pill per tracker, so the "By time" feed (which interleaves all four)
// stays scannable. Mirrors the meal badge palette used on the food page.
const KIND_BADGE: Record<FeedKind, string> = {
  food: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  sleep: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  mood: "bg-accent-100 text-accent-800 dark:bg-accent-500/15 dark:text-accent-300",
  weight: "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300",
};

// One entry from any tracker, tagged with the time it happened so the feed can
// sort across all four. Food has no "eaten" time, so it uses created_at (when
// it was logged); the others use their real timestamps.
type FeedItem =
  | { key: string; kind: "food"; time: number; e: FoodEntry }
  | { key: string; kind: "sleep"; time: number; e: SleepEntry }
  | { key: string; kind: "mood"; time: number; e: MoodEntry }
  | { key: string; kind: "weight"; time: number; e: WeightEntry };

// Flatten the day's four trackers into a single newest-first feed.
function buildFeed(d: DayDetail): FeedItem[] {
  const items: FeedItem[] = [
    ...d.food.map(
      (e): FeedItem => ({
        key: `food-${e.id}`,
        kind: "food",
        time: new Date(e.created_at).getTime(),
        e,
      }),
    ),
    ...d.sleep.map(
      (e): FeedItem => ({
        key: `sleep-${e.id}`,
        kind: "sleep",
        time: new Date(e.started_at).getTime(),
        e,
      }),
    ),
    ...d.mood.map(
      (e): FeedItem => ({
        key: `mood-${e.id}`,
        kind: "mood",
        time: new Date(e.recorded_at).getTime(),
        e,
      }),
    ),
    ...d.weight.map(
      (e): FeedItem => ({
        key: `weight-${e.id}`,
        kind: "weight",
        time: new Date(e.measured_at).getTime(),
        e,
      }),
    ),
  ];
  return items.sort((a, b) => b.time - a.time);
}

/**
 * The full breakdown of a single day: the summary timeline, a category/time
 * view switch, and every entry from all four trackers (each editable/deletable
 * in place). Owns its own load + delete + view state keyed off the `date` prop,
 * so it renders identically whether it's the /day/[date] page or embedded as
 * "today" on the dashboard. It reloads whenever `date` changes.
 */
export const DayFeed = component$<{ date: string }>(({ date }) => {
  const nav = useNavigate();

  const data = useSignal<DayDetail | null>(null);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const view = useSignal<DayView>("category");

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

  // Load, and reload whenever the date changes (the /day route reuses this
  // component across in-route date navigation).
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => date);
    reload();
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

  // Smooth-scroll to a category section. `scroll-margin-top` on the target
  // (scroll-mt-*) keeps its heading clear of the sticky app header + jump bar.
  const jumpTo = $((id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const d = data.value;
  const isEmpty =
    d !== null &&
    d.food.length === 0 &&
    d.weight.length === 0 &&
    d.mood.length === 0 &&
    d.sleep.length === 0;

  return (
    <>
      {error.value && (
        <p
          role="alert"
          class="mb-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error.value}
        </p>
      )}
      {loading.value && <p class="mb-4 text-sm text-muted">Loading…</p>}

      {d && !isEmpty && (
        <div class="mb-8">
          <DayTimeline detail={d} />
        </div>
      )}

      {isEmpty && (
        <div class="rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-brand-500/15">
            🗓️
          </div>
          <p class="mt-4 text-sm font-medium text-foreground">
            Nothing logged on this day
          </p>
          <p class="mt-1 text-sm text-muted">
            Add an entry from any tracker to see it here.
          </p>
        </div>
      )}

      {/* Sticky controls row under the timeline: jump buttons (category view
          only) left, view switch right. Renders in both views so the switch
          stays reachable from the time view. */}
      {d && !isEmpty && (
        <div class="sticky top-16 z-10 mb-8 flex flex-wrap items-center justify-between gap-3 py-3">
          <nav aria-label="Jump to section" class="flex flex-wrap gap-2">
            {view.value === "category" &&
              (
                [
                  ["food", "Food"],
                  ["sleep", "Sleep"],
                  ["mood", "Mood"],
                  ["weight", "Weight"],
                ] as [keyof Pick<DayDetail, "food" | "sleep" | "mood" | "weight">, string][]
              )
                .filter(([key]) => d[key].length > 0)
                .map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick$={() => jumpTo(key)}
                    class="rounded-full bg-surface-muted px-3 py-1.5 text-sm font-medium text-muted ring-1 ring-line transition-colors hover:bg-surface hover:text-foreground"
                  >
                    {label}
                  </button>
                ))}
          </nav>

          <div
            role="tablist"
            aria-label="Day view"
            class="inline-flex rounded-lg bg-surface-muted p-1 ring-1 ring-line"
          >
            {(
              [
                ["category", "By category"],
                ["time", "By time"],
              ] as [DayView, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view.value === value}
                onClick$={() => (view.value = value)}
                class={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view.value === value
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {d && !isEmpty && view.value === "category" && (
        <div class="space-y-8">
          {/* Food */}
          {d.food.length > 0 && (
            <Section id="food" title="Food" href="/food">
              <ul class="space-y-3">
                {d.food.map((e) => (
                  <Row
                    key={e.id}
                    title={e.food_name}
                    badge={e.meal_category}
                    meta={`${e.calories} kcal · P ${e.protein_g}g · C ${e.carb_g}g · F ${e.fat_g}g`}
                    sub={e.serving_description}
                    notes={e.notes}
                    onEdit$={() => nav(`/food?date=${e.entry_date}&edit=${e.id}`)}
                    onDelete$={() => removeFood(e.id)}
                  />
                ))}
              </ul>
            </Section>
          )}

          {/* Sleep */}
          {d.sleep.length > 0 && (
            <Section id="sleep" title="Sleep" href="/sleep">
              <ul class="space-y-3">
                {d.sleep.map((e) => (
                  <Row
                    key={e.id}
                    title={formatDuration(e.duration_minutes)}
                    badge={`quality ${e.quality_score}/10`}
                    meta={`${formatDateTime(e.started_at)} → ${formatDateTime(e.ended_at)}`}
                    notes={e.notes}
                    onEdit$={() => nav(`/sleep?edit=${e.id}`)}
                    onDelete$={() => removeSleep(e.id)}
                  />
                ))}
              </ul>
            </Section>
          )}

          {/* Mood */}
          {d.mood.length > 0 && (
            <Section id="mood" title="Mood" href="/mood">
              <ul class="space-y-3">
                {d.mood.map((e) => (
                  <Row
                    key={e.id}
                    title={`${e.mood_score}/10`}
                    meta={formatDateTime(e.recorded_at)}
                    notes={e.notes}
                    onEdit$={() => nav(`/mood?edit=${e.id}`)}
                    onDelete$={() => removeMood(e.id)}
                  />
                ))}
              </ul>
            </Section>
          )}

          {/* Weight */}
          {d.weight.length > 0 && (
            <Section id="weight" title="Weight" href="/weight">
              <ul class="space-y-3">
                {d.weight.map((e) => (
                  <Row
                    key={e.id}
                    title={`${e.weight} ${e.unit}`}
                    meta={formatDateTime(e.measured_at)}
                    notes={e.notes}
                    onEdit$={() => nav(`/weight?edit=${e.id}`)}
                    onDelete$={() => removeWeight(e.id)}
                  />
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {/* By time: every entry from all four trackers, newest first. */}
      {d && !isEmpty && view.value === "time" && (
        <ul class="space-y-3">
          {buildFeed(d).map((item) => {
            switch (item.kind) {
              case "food": {
                const e = item.e;
                return (
                  <Row
                    key={item.key}
                    kind="food"
                    title={e.food_name}
                    badge={e.meal_category}
                    meta={`${formatTime(e.created_at)} · ${e.calories} kcal · P ${e.protein_g}g · C ${e.carb_g}g · F ${e.fat_g}g`}
                    sub={e.serving_description}
                    notes={e.notes}
                    onEdit$={() => nav(`/food?date=${e.entry_date}&edit=${e.id}`)}
                    onDelete$={() => removeFood(e.id)}
                  />
                );
              }
              case "sleep": {
                const e = item.e;
                return (
                  <Row
                    key={item.key}
                    kind="sleep"
                    title={formatDuration(e.duration_minutes)}
                    badge={`quality ${e.quality_score}/10`}
                    meta={`${formatTime(e.started_at)} → ${formatTime(e.ended_at)}`}
                    notes={e.notes}
                    onEdit$={() => nav(`/sleep?edit=${e.id}`)}
                    onDelete$={() => removeSleep(e.id)}
                  />
                );
              }
              case "mood": {
                const e = item.e;
                return (
                  <Row
                    key={item.key}
                    kind="mood"
                    title={`${e.mood_score}/10`}
                    meta={formatTime(e.recorded_at)}
                    notes={e.notes}
                    onEdit$={() => nav(`/mood?edit=${e.id}`)}
                    onDelete$={() => removeMood(e.id)}
                  />
                );
              }
              case "weight": {
                const e = item.e;
                return (
                  <Row
                    key={item.key}
                    kind="weight"
                    title={`${e.weight} ${e.unit}`}
                    meta={formatTime(e.measured_at)}
                    notes={e.notes}
                    onEdit$={() => nav(`/weight?edit=${e.id}`)}
                    onDelete$={() => removeWeight(e.id)}
                  />
                );
              }
            }
          })}
        </ul>
      )}
    </>
  );
});

// A tracker section with a heading that links to the full log page (where
// entries are edited).
const Section = component$<{ id: string; title: string; href: string }>(
  ({ id, title, href }) => {
    return (
      // scroll-mt clears the sticky app header + jump bar when jumped to.
      <section id={id} class="scroll-mt-32">
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

// One entry card, shared across all four trackers. In the "By time" feed a
// `kind` pill is shown so the tracker each entry came from is obvious; the
// grouped view omits it (the section heading already says which tracker).
const Row = component$<{
  title: string;
  kind?: FeedKind;
  badge?: string;
  meta: string;
  sub?: string | null;
  notes?: string | null;
  onEdit$?: QRL<() => void>;
  onDelete$: QRL<() => void>;
}>(({ title, kind, badge, meta, sub, notes, onEdit$, onDelete$ }) => {
  return (
    <li class="rounded-xl bg-surface p-4 shadow-sm ring-1 ring-line">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            {kind && (
              <span
                class={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${KIND_BADGE[kind]}`}
              >
                {kind}
              </span>
            )}
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
        <div class="flex shrink-0 gap-1">
          {onEdit$ && (
            <button
              type="button"
              onClick$={onEdit$}
              aria-label="Edit entry"
              title="Edit"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted ring-1 ring-line transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <PencilIcon />
            </button>
          )}
          <button
            type="button"
            onClick$={onDelete$}
            aria-label="Delete entry"
            title="Delete"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50 dark:text-red-400 dark:ring-red-900/50 dark:hover:bg-red-950/40"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      {notes && (
        <p class="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted">
          {notes}
        </p>
      )}
    </li>
  );
});
