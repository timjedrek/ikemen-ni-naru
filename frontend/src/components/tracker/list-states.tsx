import { component$ } from "@builder.io/qwik";

// The loading / error / empty states shared by every tracker's list section.
// Renders nothing once there's data (the page renders the list itself). Keeping
// these three states in one place removes the identical blocks the four pages
// each carried.
export const ListStates = component$<{
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emoji: string;
  emptyTitle: string;
  emptySubtitle?: string;
}>(({ loading, error, isEmpty, emoji, emptyTitle, emptySubtitle }) => {
  return (
    <>
      {loading && <p class="text-sm text-muted">Loading…</p>}
      {error && (
        <p
          role="alert"
          class="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {!loading && !error && isEmpty && (
        <div class="rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-brand-500/15">
            {emoji}
          </div>
          <p class="mt-4 text-sm font-medium text-foreground">{emptyTitle}</p>
          <p class="mt-1 text-sm text-muted">
            {emptySubtitle ?? "Add your first one using the form."}
          </p>
        </div>
      )}
    </>
  );
});
