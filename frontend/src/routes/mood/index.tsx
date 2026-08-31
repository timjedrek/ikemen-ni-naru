import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { MoodChart } from "~/components/mood-chart/mood-chart";
import { EntryRow } from "~/components/tracker/entry-row";
import { FormCard } from "~/components/tracker/form-card";
import { InfiniteSentinel } from "~/components/tracker/infinite-sentinel";
import { ListStates } from "~/components/tracker/list-states";
import { StatCard } from "~/components/tracker/stat-card";
import { TrackerShell } from "~/components/tracker/tracker-shell";
import { useTrackerLog } from "~/hooks/use-tracker-log";
import {
  createMoodEntry,
  deleteMoodEntry,
  getMoodAnalytics,
  getMoodEntry,
  listMoodEntries,
  updateMoodEntry,
} from "~/services/api";
import type { MoodEntry, MoodEntryCreate } from "~/types/mood-entry";
import { formatDateTime, isoToLocalInput, localInputToIso, nowLocalInput } from "~/utils/datetime";

type FormState = { recorded_at: string; mood_score: string; notes: string };

function blankForm(): FormState {
  return { recorded_at: nowLocalInput(), mood_score: "5", notes: "" };
}

// Local YYYY-MM-DD from a Date, for the trailing-7-day analytics range.
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-surface px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-inset ring-line-strong transition placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";

export default component$(() => {
  const t = useTrackerLog<MoodEntry, FormState>({
    initialForm: blankForm(),
    blankForm$: $(() => blankForm()),
    list$: $((params) => listMoodEntries(params)),
    getById$: $((id) => getMoodEntry(id).catch(() => undefined)),
    create$: $((payload) => createMoodEntry(payload as MoodEntryCreate)),
    update$: $((id, payload) => updateMoodEntry(id, payload as MoodEntryCreate)),
    delete$: $((id) => deleteMoodEntry(id)),
    toPayload$: $((form): MoodEntryCreate => ({
      recorded_at: localInputToIso(form.recorded_at),
      mood_score: Number(form.mood_score),
      notes: form.notes.trim() || null,
    })),
    fromEntry$: $((entry): FormState => ({
      recorded_at: isoToLocalInput(entry.recorded_at),
      mood_score: String(entry.mood_score),
      notes: entry.notes ?? "",
    })),
  });

  // Trailing-7-day average — spans days beyond the selected one, so it comes
  // from the analytics series. Refreshes whenever the list changes.
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
      const series = await getMoodAnalytics(isoDate(start), isoDate(end));
      const nums = series.items.map((p) => p.mood_score);
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
  // Average mood across the loaded entries (the day's, in Day mode).
  const avg =
    entries.length > 0
      ? Math.round((entries.reduce((a, e) => a + e.mood_score, 0) / entries.length) * 10) / 10
      : 0;

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
      title="Mood"
      subtitle="A journal — log it as often as your day shifts."
      mode={t.mode.value}
      selectedDate={t.selectedDate.value}
      onDateChange$={t.setDate}
      onToggleMode$={t.toggleMode}
    >
      {latest && (
        <div q:slot="summary" class="mb-8 space-y-8">
          {dayMode && entries.length > 0 && (
            <MoodChart entries={entries} date={t.selectedDate.value} onPointClick$={t.startEdit} />
          )}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {avg7.value !== null && (
              <StatCard label="7-day avg" value={`${avg7.value}`} unit="/ 10" accent />
            )}
            {dayMode && <StatCard label="Average" value={`${avg}`} unit="/ 10" />}
            {dayMode && <StatCard label="Entries" value={`${entries.length}`} unit="logged" />}
            <StatCard label="Total entries" value={`${t.allTotal.value}`} unit="logged" />
          </div>
        </div>
      )}

      <FormCard
        q:slot="form"
        formRef={t.formRef}
        title={editing ? "Edit mood" : "How are you feeling?"}
        subtitle={editing ? "Update the details below." : "Rate your mood and jot down why."}
        error={t.formError.value}
        editing={editing}
        submitting={t.submitting.value}
        submitLabel={editing ? "Save changes" : "Add entry"}
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
              value={t.form.recorded_at}
              onInput$={(_, el) => (t.form.recorded_at = el.value)}
            />
          </label>
        </div>

        <div>
          <label class={labelClass}>
            Mood <span class="font-normal text-subtle">(1 = rough, 10 = great)</span>
            <select
              class={inputClass}
              value={t.form.mood_score}
              onChange$={(_, el) => (t.form.mood_score = el.value)}
            >
              {SCORES.map((n) => (
                <option key={n} value={String(n)}>
                  {String(n)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label class={labelClass}>
            Notes <span class="font-normal text-subtle">(optional)</span>
            <textarea
              rows={3}
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
          {dayMode ? `Entries for ${t.selectedDate.value || "today"}` : "All entries"}
        </h2>

        <ListStates
          loading={t.listLoading.value}
          error={t.listError.value}
          isEmpty={entries.length === 0}
          emoji="🙂"
          emptyTitle={dayMode ? "No mood entries for this day" : "No mood entries yet"}
        />

        {entries.length > 0 && (
          <ul class="space-y-3">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                title={`${entry.mood_score} / 10`}
                meta={formatDateTime(entry.recorded_at)}
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
