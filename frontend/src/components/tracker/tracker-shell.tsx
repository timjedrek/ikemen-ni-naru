import { component$, type QRL, Slot } from "@builder.io/qwik";
import { AppHeader } from "~/components/app-header/app-header";
import type { User } from "~/services/api";

// The page chrome shared by all four tracker log pages: the app header, the
// title row with the Day/Feed mode switch (date picker + "Show all"), and the
// two-column grid. Each page projects its own content into the `summary`,
// `form`, and `list` slots — those parts differ per tracker; this frame doesn't.
export type TrackerMode = "day" | "all";

export const TrackerShell = component$<{
  user: User | null;
  title: string;
  subtitle: string;
  mode: TrackerMode;
  selectedDate: string;
  onDateChange$: QRL<(date: string) => void>;
  onToggleMode$: QRL<() => void>;
}>(({ user, title, subtitle, mode, selectedDate, onDateChange$, onToggleMode$ }) => {
  return (
    <div class="min-h-screen">
      <AppHeader user={user} />

      <main class="mx-auto max-w-5xl px-6 py-8">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p class="mt-0.5 text-sm text-muted">{subtitle}</p>
          </div>
          <div class="flex items-center gap-3">
            {mode === "day" && (
              <label class="flex items-center gap-2 text-sm font-medium text-foreground">
                Date
                <input
                  type="date"
                  value={selectedDate}
                  onChange$={(_, el) => onDateChange$(el.value)}
                  class="rounded-lg border-0 bg-surface px-3 py-2 text-foreground shadow-sm ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
                />
              </label>
            )}
            <button
              type="button"
              onClick$={onToggleMode$}
              class="rounded-lg px-3 py-2 text-sm font-medium text-muted ring-1 ring-line transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              {mode === "day" ? "Show all" : "← Back to day"}
            </button>
          </div>
        </div>

        <Slot name="summary" />

        <div class="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Slot name="form" />
          <Slot name="list" />
        </div>
      </main>
    </div>
  );
});
