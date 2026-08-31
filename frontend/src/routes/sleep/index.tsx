import { $, component$ } from "@builder.io/qwik";
import { EntryRow } from "~/components/tracker/entry-row";
import { FormCard } from "~/components/tracker/form-card";
import { InfiniteSentinel } from "~/components/tracker/infinite-sentinel";
import { ListStates } from "~/components/tracker/list-states";
import { StatCard } from "~/components/tracker/stat-card";
import { TrackerShell } from "~/components/tracker/tracker-shell";
import { useTrackerLog } from "~/hooks/use-tracker-log";
import {
  createSleepEntry,
  deleteSleepEntry,
  getSleepEntry,
  listSleepEntries,
  updateSleepEntry,
} from "~/services/api";
import type { SleepEntry, SleepEntryCreate } from "~/types/sleep-entry";
import {
  formatDateTime,
  formatDuration,
  isoToLocalInput,
  localInputToIso,
  nowLocalInput,
} from "~/utils/datetime";

type FormState = {
  started_at: string;
  ended_at: string;
  quality_score: string;
  notes: string;
};

function blankForm(): FormState {
  // Woke time defaults to now; sleep time is left blank for the user to enter.
  return { started_at: "", ended_at: nowLocalInput(), quality_score: "7", notes: "" };
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-surface px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-inset ring-line-strong transition placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";

export default component$(() => {
  const t = useTrackerLog<SleepEntry, FormState>({
    initialForm: blankForm(),
    blankForm$: $(() => blankForm()),
    list$: $((params) => listSleepEntries(params)),
    getById$: $((id) => getSleepEntry(id).catch(() => undefined)),
    create$: $((payload) => createSleepEntry(payload as SleepEntryCreate)),
    update$: $((id, payload) => updateSleepEntry(id, payload as SleepEntryCreate)),
    delete$: $((id) => deleteSleepEntry(id)),
    // Cheap client-side guard; the server + DB CHECK still enforce it.
    validate$: $((form) =>
      new Date(form.ended_at) <= new Date(form.started_at)
        ? "Wake time must be after sleep time."
        : null,
    ),
    toPayload$: $((form): SleepEntryCreate => ({
      started_at: localInputToIso(form.started_at),
      ended_at: localInputToIso(form.ended_at),
      quality_score: Number(form.quality_score),
      notes: form.notes.trim() || null,
    })),
    fromEntry$: $((entry): FormState => ({
      started_at: isoToLocalInput(entry.started_at),
      ended_at: isoToLocalInput(entry.ended_at),
      quality_score: String(entry.quality_score),
      notes: entry.notes ?? "",
    })),
  });

  const editing = t.editingId.value !== null;
  const entries = t.items.value;
  const latest = entries[0]; // newest-first
  const dayMode = t.mode.value === "day";
  // Total sleep attributed to the day. The list is bucketed by wake time, so the
  // day's entries are the overnight sleep that ended today plus any naps — their
  // durations sum to the day's total.
  const daySleep = entries.reduce((a, e) => a + e.duration_minutes, 0);

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
      title="Sleep"
      subtitle="Enter when you fell asleep and woke — naps included."
      mode={t.mode.value}
      selectedDate={t.selectedDate.value}
      onDateChange$={t.setDate}
      onToggleMode$={t.toggleMode}
    >
      {latest && (
        <div q:slot="summary" class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={dayMode ? "Total sleep" : "Last sleep"}
            value={formatDuration(dayMode ? daySleep : latest.duration_minutes)}
            unit=""
            accent
          />
          <StatCard label="Quality" value={`${latest.quality_score}`} unit="/ 10" />
          <StatCard label="Total entries" value={`${t.allTotal.value}`} unit="logged" />
        </div>
      )}

      <FormCard
        q:slot="form"
        formRef={t.formRef}
        title={editing ? "Edit sleep" : "Log sleep"}
        subtitle={
          editing
            ? "Update the details below."
            : "Duration is worked out from the times you enter."
        }
        error={t.formError.value}
        editing={editing}
        submitting={t.submitting.value}
        submitLabel={editing ? "Save changes" : "Add sleep"}
        onSubmit$={t.submit}
        onCancel$={t.resetForm}
      >
        <div>
          <label class={labelClass}>
            Fell asleep
            <input
              type="datetime-local"
              required
              class={inputClass}
              value={t.form.started_at}
              onInput$={(_, el) => (t.form.started_at = el.value)}
            />
          </label>
        </div>

        <div>
          <label class={labelClass}>
            Woke up
            <input
              type="datetime-local"
              required
              class={inputClass}
              value={t.form.ended_at}
              onInput$={(_, el) => (t.form.ended_at = el.value)}
            />
          </label>
        </div>

        <div>
          <label class={labelClass}>
            Quality <span class="font-normal text-subtle">(1 = poor, 10 = great)</span>
            <select
              class={inputClass}
              value={t.form.quality_score}
              onChange$={(_, el) => (t.form.quality_score = el.value)}
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
          {t.mode.value === "day"
            ? `Sleep for ${t.selectedDate.value || "today"}`
            : "All sleep"}
        </h2>

        <ListStates
          loading={t.listLoading.value}
          error={t.listError.value}
          isEmpty={entries.length === 0}
          emoji="😴"
          emptyTitle={
            t.mode.value === "day" ? "No sleep logged for this day" : "No sleep logged yet"
          }
        />

        {entries.length > 0 && (
          <ul class="space-y-3">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                title={formatDuration(entry.duration_minutes)}
                badge={`quality ${entry.quality_score}/10`}
                meta={`${formatDateTime(entry.started_at)} → ${formatDateTime(entry.ended_at)}`}
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
