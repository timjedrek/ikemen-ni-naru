import { $, component$, useSignal } from "@builder.io/qwik";
import { EntryRow } from "~/components/tracker/entry-row";
import { FormCard } from "~/components/tracker/form-card";
import { InfiniteSentinel } from "~/components/tracker/infinite-sentinel";
import { ListStates } from "~/components/tracker/list-states";
import { StatCard } from "~/components/tracker/stat-card";
import { TrackerShell } from "~/components/tracker/tracker-shell";
import { useTrackerLog } from "~/hooks/use-tracker-log";
import {
  createFoodEntry,
  deleteFoodEntry,
  getFoodEntry,
  listFoodEntries,
  updateFoodEntry,
} from "~/services/api";
import {
  MEAL_CATEGORIES,
  type FoodEntry,
  type FoodEntryCreate,
  type MealCategory,
} from "~/types/food-entry";
import { formatDay } from "~/utils/datetime";

// The form holds every field as a string (what inputs produce). Converted to
// the API payload on submit.
type FormState = {
  food_name: string;
  meal_category: MealCategory;
  serving_description: string;
  calories: string;
  multiplier: string;
  protein_g: string;
  carb_g: string;
  fat_g: string;
  notes: string;
};

function blankForm(): FormState {
  return {
    food_name: "",
    meal_category: "breakfast",
    serving_description: "",
    calories: "",
    multiplier: "1",
    protein_g: "",
    carb_g: "",
    fat_g: "",
    notes: "",
  };
}

// Parsed multiplier, defaulting to 1 (so an empty/invalid field never zeroes out
// the macros). Used to scale a label's per-serving values to the actual serving.
function multiplierValue(form: FormState): number {
  const mult = Number(form.multiplier);
  return mult > 0 ? mult : 1;
}

// Scale a typed macro string by the multiplier, rounded to 2 decimals to avoid
// floating-point noise. Returns the value as-typed when the multiplier is 1.
function scaleMacro(value: string, mult: number): string {
  const n = Number(value) || 0;
  return String(Math.round(n * mult * 100) / 100);
}

// Atwater factors: 4 cal/g protein & carb, 9 cal/g fat, scaled by the serving
// multiplier. Returns "" when no macros are entered so the field stays blank
// rather than showing 0.
function caloriesFromMacros(form: FormState): string {
  const protein = Number(form.protein_g) || 0;
  const carb = Number(form.carb_g) || 0;
  const fat = Number(form.fat_g) || 0;
  if (!protein && !carb && !fat) return "";
  const mult = multiplierValue(form);
  return String(Math.round((protein * 4 + carb * 4 + fat * 9) * mult));
}

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-surface px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-inset ring-line-strong transition placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";

export default component$(() => {
  // Calories can be typed by hand (alcohol: 7 kcal/g, not a tracked macro)
  // rather than derived from the 4/4/9 macro math. `manualBase` holds the
  // per-serving calories typed; the shown/submitted value is base × multiplier.
  // These are food-only, so they live here and feed the hook via after-hooks.
  const manualCalories = useSignal(false);
  const manualBase = useSignal(0);

  const t = useTrackerLog<FoodEntry, FormState>({
    initialForm: blankForm(),
    blankForm$: $(() => blankForm()),
    list$: $((params) => listFoodEntries(params)),
    getById$: $((id) => getFoodEntry(id).catch(() => undefined)),
    create$: $((payload) => createFoodEntry(payload as FoodEntryCreate)),
    update$: $((id, payload) => updateFoodEntry(id, payload as FoodEntryCreate)),
    delete$: $((id) => deleteFoodEntry(id)),
    toPayload$: $((form, ctx): FoodEntryCreate => {
      // Macros are typed per the label's serving, then scaled by the multiplier
      // so stored values reflect the actual serving. Calories are already scaled.
      const mult = multiplierValue(form);
      return {
        entry_date: ctx.date,
        meal_category: form.meal_category,
        food_name: form.food_name.trim(),
        calories: Number(form.calories),
        protein_g: scaleMacro(form.protein_g, mult),
        carb_g: scaleMacro(form.carb_g, mult),
        fat_g: scaleMacro(form.fat_g, mult),
        serving_description: form.serving_description.trim() || null,
        notes: form.notes.trim() || null,
      };
    }),
    fromEntry$: $((entry): FormState => ({
      food_name: entry.food_name,
      meal_category: entry.meal_category,
      serving_description: entry.serving_description ?? "",
      calories: String(entry.calories),
      multiplier: "1", // stored macros are already scaled; edit from 1x
      protein_g: entry.protein_g,
      carb_g: entry.carb_g,
      fat_g: entry.fat_g,
      notes: entry.notes ?? "",
    })),
    // Stored calories may not equal the macro math (e.g. alcohol), so an edit is
    // treated as a manual value; multiplier resets to 1 so the total is the base.
    afterStartEdit$: $((entry) => {
      manualCalories.value = true;
      manualBase.value = entry.calories;
    }),
    afterReset$: $(() => {
      manualCalories.value = false;
      manualBase.value = 0;
    }),
  });

  const editing = t.editingId.value !== null;

  // Day-mode summary: totals for the loaded day (computed client-side — Day mode
  // loads the whole day). Hidden in Feed mode where partial-page sums mislead.
  const entries = t.items.value;
  const dayTotals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + (Number(e.protein_g) || 0),
      carb: acc.carb + (Number(e.carb_g) || 0),
      fat: acc.fat + (Number(e.fat_g) || 0),
    }),
    { calories: 0, protein: 0, carb: 0, fat: 0 },
  );
  const showSummary = t.mode.value === "day" && entries.length > 0;

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
      title="Food tracking"
      subtitle="You sure you need to eat that?"
      mode={t.mode.value}
      selectedDate={t.selectedDate.value}
      onDateChange$={t.setDate}
      onToggleMode$={t.toggleMode}
    >
      {showSummary && (
        <div q:slot="summary" class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Calories" value={`${dayTotals.calories}`} unit="kcal" accent />
          <StatCard label="Protein" value={`${Math.round(dayTotals.protein)}`} unit="g" />
          <StatCard label="Carbs" value={`${Math.round(dayTotals.carb)}`} unit="g" />
          <StatCard label="Fat" value={`${Math.round(dayTotals.fat)}`} unit="g" />
        </div>
      )}

      <FormCard
        q:slot="form"
        formRef={t.formRef}
        title={editing ? "Edit entry" : "Add an entry"}
        subtitle={editing ? "Update the details below." : "Log a food and its macros."}
        error={t.formError.value}
        editing={editing}
        submitting={t.submitting.value}
        submitLabel={editing ? "Save changes" : "Add entry"}
        onSubmit$={t.submit}
        onCancel$={t.resetForm}
      >
        <div>
          <label class={labelClass}>
            Food name
            <input
              type="text"
              required
              class={inputClass}
              value={t.form.food_name}
              onInput$={(_, el) => (t.form.food_name = el.value)}
            />
          </label>
        </div>

        <div>
          <label class={labelClass}>
            Meal
            <select
              class={inputClass}
              value={t.form.meal_category}
              onChange$={(_, el) => (t.form.meal_category = el.value as MealCategory)}
            >
              {MEAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label class={labelClass}>
            Where <span class="font-normal text-subtle">(optional)</span>
            <input
              type="text"
              class={inputClass}
              value={t.form.serving_description}
              onInput$={(_, el) => (t.form.serving_description = el.value)}
            />
          </label>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <label class={labelClass}>
            Protein
            <input
              type="number"
              required
              min="0"
              step="0.01"
              class={inputClass}
              value={t.form.protein_g}
              onInput$={(_, el) => {
                t.form.protein_g = el.value;
                if (!manualCalories.value) t.form.calories = caloriesFromMacros(t.form);
              }}
            />
          </label>
          <label class={labelClass}>
            Carbs
            <input
              type="number"
              required
              min="0"
              step="0.01"
              class={inputClass}
              value={t.form.carb_g}
              onInput$={(_, el) => {
                t.form.carb_g = el.value;
                if (!manualCalories.value) t.form.calories = caloriesFromMacros(t.form);
              }}
            />
          </label>
          <label class={labelClass}>
            Fat
            <input
              type="number"
              required
              min="0"
              step="0.01"
              class={inputClass}
              value={t.form.fat_g}
              onInput$={(_, el) => {
                t.form.fat_g = el.value;
                if (!manualCalories.value) t.form.calories = caloriesFromMacros(t.form);
              }}
            />
          </label>
        </div>

        <div>
          <label class={labelClass}>
            <span class="flex items-center justify-between">
              <span>
                Calories{" "}
                <span class="font-normal text-subtle">
                  {manualCalories.value ? "(manual)" : "(auto)"}
                </span>
              </span>
              {manualCalories.value && (
                <button
                  type="button"
                  onClick$={() => {
                    manualCalories.value = false;
                    manualBase.value = 0;
                    t.form.calories = caloriesFromMacros(t.form);
                  }}
                  class="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Use auto
                </button>
              )}
            </span>
            <input
              type="number"
              min="0"
              step="1"
              class={inputClass}
              value={t.form.calories}
              onInput$={(_, el) => {
                // Typing sets a manual value; clearing reverts to auto.
                if (el.value === "") {
                  manualCalories.value = false;
                  manualBase.value = 0;
                  t.form.calories = caloriesFromMacros(t.form);
                } else {
                  manualCalories.value = true;
                  // Typed number is the total at the current multiplier; store
                  // the per-serving base so changing the multiplier rescales it.
                  t.form.calories = el.value;
                  manualBase.value = (Number(el.value) || 0) / multiplierValue(t.form);
                }
              }}
            />
          </label>
        </div>

        <div>
          <label class={labelClass}>
            Multiplier <span class="font-normal text-subtle">(servings)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              class={inputClass}
              value={t.form.multiplier}
              onInput$={(_, el) => {
                t.form.multiplier = el.value;
                t.form.calories = manualCalories.value
                  ? String(Math.round(manualBase.value * multiplierValue(t.form)))
                  : caloriesFromMacros(t.form);
              }}
            />
          </label>
        </div>

        <div>
          <label class={labelClass}>
            Mood <span class="font-normal text-subtle">(optional)</span>
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
            ? `Entries for ${t.selectedDate.value || "today"}`
            : "All entries"}
        </h2>

        <ListStates
          loading={t.listLoading.value}
          error={t.listError.value}
          isEmpty={entries.length === 0}
          emoji="🍽️"
          emptyTitle={
            t.mode.value === "day" ? "No entries yet for this day" : "No entries yet"
          }
        />

        {entries.length > 0 && (
          <ul class="space-y-3">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                title={entry.food_name}
                badge={entry.meal_category}
                sub={entry.serving_description}
                meta={
                  // In Feed mode entries span days, so lead with the day; in Day
                  // mode the heading already states it, so show macros only.
                  (t.mode.value === "all" ? `${formatDay(entry.entry_date)} · ` : "") +
                  `${entry.calories} kcal · P ${entry.protein_g}g · C ${entry.carb_g}g · F ${entry.fat_g}g`
                }
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
