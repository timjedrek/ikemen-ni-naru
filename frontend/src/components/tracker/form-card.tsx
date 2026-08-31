import {
  component$,
  type QRL,
  type Signal,
  Slot,
} from "@builder.io/qwik";

// The sticky form card shared by every tracker: heading + subtitle + error
// alert + <form> wrapper + submit/cancel buttons. Each page projects only its
// own fields into the default slot, so forms stay fully per-tracker while the
// identical chrome lives here. `formRef` is attached so the hook can scroll the
// card into view on mobile when editing.
export const FormCard = component$<{
  formRef: Signal<HTMLElement | undefined>;
  title: string;
  subtitle: string;
  error: string | null;
  editing: boolean;
  submitting: boolean;
  submitLabel: string;
  onSubmit$: QRL<() => void>;
  onCancel$: QRL<() => void>;
}>(
  ({
    formRef,
    title,
    subtitle,
    error,
    editing,
    submitting,
    submitLabel,
    onSubmit$,
    onCancel$,
  }) => {
    return (
      <section
        ref={formRef}
        aria-labelledby="form-heading"
        class="h-fit rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line lg:sticky lg:top-24"
      >
        <h2
          id="form-heading"
          class="text-lg font-semibold tracking-tight text-foreground"
        >
          {title}
        </h2>
        <p class="mt-0.5 text-sm text-muted">{subtitle}</p>

        {error && (
          <p
            role="alert"
            class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <form preventdefault:submit onSubmit$={onSubmit$} class="mt-5 space-y-4">
          <Slot />

          <div class="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              class="flex flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
            {editing && (
              <button
                type="button"
                disabled={submitting}
                onClick$={onCancel$}
                class="rounded-lg px-4 py-2.5 text-sm font-semibold text-muted ring-1 ring-line transition-colors hover:bg-surface-muted"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    );
  },
);
