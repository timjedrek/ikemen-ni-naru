import { component$, type QRL } from "@builder.io/qwik";
import { PencilIcon, TrashIcon } from "~/components/icons/action-icons";

// The tracker each row came from, used only for the tinted pill in the day
// feed's "By time" view. Tracker log pages omit `kind` (their section already
// names the tracker), so no pill shows.
export type FeedKind = "food" | "sleep" | "mood" | "weight";

const KIND_BADGE: Record<FeedKind, string> = {
  food: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  sleep: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  mood: "bg-accent-100 text-accent-800 dark:bg-accent-500/15 dark:text-accent-300",
  weight: "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300",
};

// One entry card, shared by all four tracker log pages and the day feed. Takes
// only serializable strings + two QRLs (edit/delete) so it never crosses Qwik's
// serialization boundary — the page maps each entry to these props inline.
export const EntryRow = component$<{
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
    <li class="group rounded-xl bg-surface p-4 shadow-sm ring-1 ring-line transition hover:shadow-md">
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
