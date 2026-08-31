import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { EntryRow } from "~/components/tracker/entry-row";
import { FormCard } from "~/components/tracker/form-card";
import { InfiniteSentinel } from "~/components/tracker/infinite-sentinel";
import { ListStates } from "~/components/tracker/list-states";
import { StatCard } from "~/components/tracker/stat-card";
import { TrackerShell } from "~/components/tracker/tracker-shell";
import { useTrackerLog } from "~/hooks/use-tracker-log";
import {
  createWeightEntry,
  deleteWeightEntry,
  getWeightAnalytics,
  getWeightEntry,
  listWeightEntries,
  updateWeightEntry,
} from "~/services/api";
import type { WeightEntry, WeightEntryCreate } from "~/types/weight-entry";
import { formatDateTime, isoToLocalInput, localInputToIso, nowLocalInput } from "~/utils/datetime";

type FormState = { measured_at: string; weight: string; notes: string };

function blankForm(): FormState {
  return { measured_at: nowLocalInput(), weight: "", notes: "" };
}

// Local YYYY-MM-DD from a Date, for the trailing-7-day analytics range.
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-surface px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-inset ring-line-strong transition placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";

export default component$(() => {
  const t = useTrackerLog<WeightEntry, FormState>({
    initialForm: blankForm(),
    blankForm$: $(() => blankForm()),
    list$: $((params) => listWeightEntries(params)),
    getById$: $((id) => getWeightEntry(id).catch(() => undefined)),
    create$: $((payload) => createWeightEntry(payload as WeightEntryCreate)),
    update$: $((id, payload) => updateWeightEntry(id, payload as WeightEntryCreate)),
    delete$: $((id) => deleteWeightEntry(id)),
    toPayload$: $((form): WeightEntryCreate => ({
      measured_at: localInputToIso(form.measured_at),
      weight: form.weight,
      notes: form.notes.trim() || null,
    })),
    fromEntry$: $((entry): FormState => ({
      measured_at: isoToLocalInput(entry.measured_at),
      weight: entry.weight,
      notes: entry.notes ?? "",
    })),
  });

  // Trailing-7-day average — needs data beyond the selected day, so it comes
  // from the analytics series (tz-windowed server-side). Refreshes whenever the
  // list changes (a new weigh-in shifts the average).
  const avg7 = useSignal<number | null>(null);
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => t.authChecked.value);
    track(() => t.items.value);
    if (!t.authChecked.value) return;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    try {
      const series = await getWeightAnalytics(isoDate(start), isoDate(end));
      const nums = series.items
        .map((p) => Number(p.weight))
        .filter((n) => !Number.isNaN(n));
      avg7.value = nums.length
        ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
        : null;
    } catch {
      avg7.value = null;
    }
  });

  const editing = t.editingId.value !== null;
  const entries = t.items.value;
  const latest = entries[0]; // newest-first
  const dayMode = t.mode.value === "day";
  const unit = latest?.unit ?? "lb";
  // Average across the loaded day's weigh-ins (Day mode loads the whole day).
  const dayAvg =
    dayMode && entries.length > 0
      ? Math.round(
          (entries.reduce((a, e) => a + (Number(e.weight) || 0), 0) / entries.length) * 10,
        ) / 10
      : null;

  if (!t.authChecked.value) {
    return (
      <main class="flex min-h-screen items-center justify-center">
        <p class="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <TrackerShell
      user={t.authUser.value}
      title="Weight"
      subtitle="Log it whenever — each weigh-in keeps its own time."
      mode={t.mode.value}
      selectedDate={t.selectedDate.value}
      onDateChange$={t.setDate}
      onToggleMode$={t.toggleMode}
    >
      {(latest || avg7.value !== null) && (
        <div q:slot="summary" class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {latest && <StatCard label="Latest" value={latest.weight} unit={latest.unit} accent />}
          {avg7.value !== null && (
            <StatCard label="7-day avg" value={`${avg7.value}`} unit={unit} />
          )}
          {dayAvg !== null && <StatCard label="Today's avg" value={`${dayAvg}`} unit={unit} />}
          {dayMode && (
            <StatCard label="Today's weigh-ins" value={`${entries.length}`} unit="logged" />
          )}
          <StatCard label="Total weigh-ins" value={`${t.allTotal.value}`} unit="logged" />
        </div>
      )}

      <FormCard
        q:slot="form"
        formRef={t.formRef}
        title={editing ? "Edit measurement" : "Log a measurement"}
        subtitle={
          editing ? "Update the details below." : "Record your weight and when you took it."
        }
        error={t.formError.value}
        editing={editing}
        submitting={t.submitting.value}
        submitLabel={editing ? "Save changes" : "Add measurement"}
        onSubmit$={t.submit}
        onCancel$={t.resetForm}
      >
        <div>
          <label class={labelClass}>
            When
            <input
              type="datetime-local"
              required
              class={inputClass}
              value={t.form.measured_at}
              onInput$={(_, el) => (t.form.measured_at = el.value)}
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
              value={t.form.weight}
              onInput$={(_, el) => (t.form.weight = el.value)}
            />
          </label>
        </div>

        <div>
          <label class={labelClass}>
            Notes <span class="font-normal text-subtle">(optional)</span>
            <textarea
              rows={2}
              class={inputClass}
              value={t.form.notes}
              onInput$={(_, el) => (t.form.notes = el.value)}
            />
          </label>
        </div>
      </FormCard>

      <section q:slot="list" aria-labelledby="list-heading">
        <h2
          id="list-heading"
          class="mb-4 text-lg font-semibold tracking-tight text-foreground"
        >
          {dayMode ? `Weigh-ins for ${t.selectedDate.value || "today"}` : "All weigh-ins"}
        </h2>

        <ListStates
          loading={t.listLoading.value}
          error={t.listError.value}
          isEmpty={entries.length === 0}
          emoji="⚖️"
          emptyTitle={dayMode ? "No weigh-ins for this day" : "No weigh-ins yet"}
        />

        {entries.length > 0 && (
          <ul class="space-y-3">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                title={`${entry.weight} ${entry.unit}`}
                meta={formatDateTime(entry.measured_at)}
                notes={entry.notes}
                onEdit$={() => t.startEdit(entry)}
                onDelete$={() => t.remove(entry.id)}
              />
            ))}
          </ul>
        )}

        {t.loadingMore.value && <p class="mt-3 text-sm text-muted">Loading…</p>}
        {t.mode.value === "all" && t.hasMore.value && (
          <InfiniteSentinel onIntersect$={t.loadMore} />
        )}
      </section>
    </TrackerShell>
  );
});
