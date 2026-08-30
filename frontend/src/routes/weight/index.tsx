import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { AppHeader } from "~/components/app-header/app-header";
import { PencilIcon, TrashIcon } from "~/components/icons/action-icons";
import {
  ApiError,
  createWeightEntry,
  deleteWeightEntry,
  getCurrentUser,
  getWeightEntry,
  listWeightEntries,
  updateWeightEntry,
  type User,
} from "~/services/api";
import type { WeightEntry, WeightEntryCreate } from "~/types/weight-entry";
import {
  formatDateTime,
  isoToLocalInput,
  localInputToIso,
  nowLocalInput,
} from "~/utils/datetime";

// The form holds every field as a string (what inputs produce). Converted to
// the API payload on submit.
type FormState = { measured_at: string; weight: string; notes: string };

function blankForm(): FormState {
  return { measured_at: nowLocalInput(), weight: "", notes: "" };
}

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-surface px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-inset ring-line-strong transition placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";

export default component$(() => {
  const nav = useNavigate();
  // Auth gate: null until checked. We render nothing app-related until the
  // check resolves, so protected data never flashes before a possible redirect.
  const authUser = useSignal<User | null>(null);
  const authChecked = useSignal(false);

  const items = useSignal<WeightEntry[]>([]);
  const listError = useSignal<string | null>(null);
  const listLoading = useSignal(false);

  const form = useStore<FormState>(blankForm());
  const formRef = useSignal<HTMLElement>();
  const editingId = useSignal<number | null>(null);
  const submitting = useSignal(false);
  const formError = useSignal<string | null>(null);

  const reload = $(async () => {
    listLoading.value = true;
    try {
      items.value = (await listWeightEntries()).items;
      listError.value = null;
    } catch (err) {
      listError.value = err instanceof Error ? err.message : "Failed to load entries";
    } finally {
      listLoading.value = false;
    }
  });

  const resetForm = $(() => {
    Object.assign(form, blankForm());
    editingId.value = null;
    formError.value = null;
  });

  // Drop ?edit from the URL after opening (or failing to open) the form, so a
  // later reload or date change can't re-trigger editing from a stale param.
  const clearEditParam = $(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (!u.searchParams.has("edit")) return;
    u.searchParams.delete("edit");
    window.history.replaceState(null, "", u.pathname + u.search);
  });

  // On the single-column mobile/tablet layout the form is stacked above the
  // list, so editing a lower entry leaves it off-screen. On desktop (lg+) the
  // form is sticky and always visible, so only scroll below that breakpoint.
  const scrollFormIntoView = $(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      formRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const startEdit = $((entry: WeightEntry) => {
    form.measured_at = isoToLocalInput(entry.measured_at);
    form.weight = entry.weight;
    form.notes = entry.notes ?? "";
    editingId.value = entry.id;
    formError.value = null;
    scrollFormIntoView();
  });

  // Route protection (buildplan Step 34): confirm a valid session before showing
  // anything. Usability guard only; the backend is the real security boundary.
  // NOTE: references startEdit/clearEditParam, which the Qwik optimizer captures
  // by lexical scope at registration time — so they must be declared *above*
  // this task, or they resolve to undefined when it runs.
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
    // Deep link from the day report (?edit=<id>): open that entry's edit form.
    // Prefer the loaded list; fall back to fetching the entry by id so the link
    // works even when it's older than the recently-loaded page.
    const editId = Number(new URLSearchParams(window.location.search).get("edit"));
    if (editId) {
      let entry = items.value.find((e) => e.id === editId);
      if (!entry) entry = await getWeightEntry(editId).catch(() => undefined);
      if (entry) await startEdit(entry);
      clearEditParam();
    }
  });

  const submit = $(async () => {
    submitting.value = true;
    formError.value = null;
    const payload: WeightEntryCreate = {
      measured_at: localInputToIso(form.measured_at),
      weight: form.weight,
      notes: form.notes.trim() || null,
    };
    try {
      if (editingId.value !== null) {
        await updateWeightEntry(editingId.value, payload);
      } else {
        await createWeightEntry(payload);
      }
      await resetForm();
      await reload();
    } catch (err) {
      formError.value =
        err instanceof ApiError ? err.message : "Something went wrong. Try again.";
    } finally {
      submitting.value = false;
    }
  });

  const remove = $(async (id: number) => {
    try {
      await deleteWeightEntry(id);
      if (editingId.value === id) await resetForm();
      await reload();
    } catch (err) {
      listError.value = err instanceof Error ? err.message : "Failed to delete entry";
    }
  });

  const entries = items.value;
  const latest = entries[0]; // list is newest-first

  // Hold the whole page until auth resolves so protected content can't flash.
  if (!authChecked.value) {
    return (
      <main class="flex min-h-screen items-center justify-center">
        <p class="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <div class="min-h-screen">
      {/* Top bar */}
      <AppHeader user={authUser.value} />

      <main class="mx-auto max-w-5xl px-6 py-8">
        {/* Heading */}
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">Weight</h1>
            <p class="mt-0.5 text-sm text-muted">
              Log it whenever — each weigh-in keeps its own time.
            </p>
          </div>
        </div>

        {/* Latest summary */}
        {latest && (
          <div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Latest" value={latest.weight} unit={latest.unit} accent />
            <StatCard label="Weigh-ins" value={`${entries.length}`} unit="logged" />
          </div>
        )}

        <div class="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
          {/* Form */}
          <section
            ref={formRef}
            aria-labelledby="form-heading"
            class="h-fit rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line lg:sticky lg:top-24"
          >
            <h2 id="form-heading" class="text-lg font-semibold tracking-tight text-foreground">
              {editingId.value !== null ? "Edit measurement" : "Log a measurement"}
            </h2>
            <p class="mt-0.5 text-sm text-muted">
              {editingId.value !== null
                ? "Update the details below."
                : "Record your weight and when you took it."}
            </p>

            {formError.value && (
              <p
                role="alert"
                class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {formError.value}
              </p>
            )}

            <form preventdefault:submit onSubmit$={submit} class="mt-5 space-y-4">
              <div>
                <label class={labelClass}>
                  When
                  <input
                    type="datetime-local"
                    required
                    class={inputClass}
                    value={form.measured_at}
                    onInput$={(_, el) => (form.measured_at = el.value)}
                  />
                </label>
              </div>

              <div>
                <label class={labelClass}>
                  Weight <span class="font-normal text-subtle">(lb)</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    class={inputClass}
                    value={form.weight}
                    onInput$={(_, el) => (form.weight = el.value)}
                  />
                </label>
              </div>

              <div>
                <label class={labelClass}>
                  Notes <span class="font-normal text-subtle">(optional)</span>
                  <textarea
                    rows={2}
                    class={inputClass}
                    value={form.notes}
                    onInput$={(_, el) => (form.notes = el.value)}
                  />
                </label>
              </div>

              <div class="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting.value}
                  class="flex flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting.value
                    ? "Saving…"
                    : editingId.value !== null
                      ? "Save changes"
                      : "Add measurement"}
                </button>
                {editingId.value !== null && (
                  <button
                    type="button"
                    disabled={submitting.value}
                    onClick$={resetForm}
                    class="rounded-lg px-4 py-2.5 text-sm font-semibold text-muted ring-1 ring-line transition-colors hover:bg-surface-muted"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Entries list */}
          <section aria-labelledby="list-heading">
            <h2 id="list-heading" class="mb-4 text-lg font-semibold tracking-tight text-foreground">
              Recent weigh-ins
            </h2>

            {listLoading.value && <p class="text-sm text-muted">Loading…</p>}
            {listError.value && (
              <p
                role="alert"
                class="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {listError.value}
              </p>
            )}

            {!listLoading.value && !listError.value && entries.length === 0 && (
              <div class="rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-brand-500/15">
                  ⚖️
                </div>
                <p class="mt-4 text-sm font-medium text-foreground">No weigh-ins yet</p>
                <p class="mt-1 text-sm text-muted">Add your first one using the form.</p>
              </div>
            )}

            {entries.length > 0 && (
              <ul class="space-y-3">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    class="group rounded-xl bg-surface p-4 shadow-sm ring-1 ring-line transition hover:shadow-md"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <h3 class="font-semibold text-foreground">
                          {entry.weight}{" "}
                          <span class="text-sm font-normal text-subtle">{entry.unit}</span>
                        </h3>
                        <p class="mt-0.5 text-sm text-muted">
                          {formatDateTime(entry.measured_at)}
                        </p>
                      </div>
                      <div class="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick$={() => startEdit(entry)}
                          aria-label="Edit entry"
                          title="Edit"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted ring-1 ring-line transition-colors hover:bg-surface-muted hover:text-foreground"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick$={() => remove(entry.id)}
                          aria-label="Delete entry"
                          title="Delete"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50 dark:text-red-400 dark:ring-red-900/50 dark:hover:bg-red-950/40"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    {entry.notes && (
                      <p class="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted">
                        {entry.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
});

// Compact summary tile (matches the food page's StatCard).
const StatCard = component$<{
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}>(({ label, value, unit, accent }) => {
  return (
    <div
      class={`rounded-xl p-4 shadow-sm ring-1 ${
        accent
          ? "bg-gradient-to-br from-brand-600 to-accent-600 text-white ring-transparent"
          : "bg-surface text-foreground ring-line"
      }`}
    >
      <p
        class={`text-xs font-medium uppercase tracking-wide ${accent ? "text-white/80" : "text-muted"}`}
      >
        {label}
      </p>
      <p class="mt-1 text-2xl font-bold tracking-tight">
        {value}
        <span class={`ml-1 text-sm font-normal ${accent ? "text-white/70" : "text-subtle"}`}>
          {unit}
        </span>
      </p>
    </div>
  );
});
