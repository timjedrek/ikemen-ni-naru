import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { AppHeader } from "~/components/app-header/app-header";
import {
  ApiError,
  createFoodEntry,
  deleteFoodEntry,
  getCurrentUser,
  listFoodEntries,
  updateFoodEntry,
  type User,
} from "~/services/api";
import {
  MEAL_CATEGORIES,
  type FoodEntry,
  type FoodEntryCreate,
  type FoodEntryList,
  type MealCategory,
} from "~/types/food-entry";

// Local YYYY-MM-DD for <input type="date"> defaults. Built from local date
// parts (not toISOString, which is UTC and can be off by a day near midnight).
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

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

// Tinted badge per meal — alternating brand/accent so the list scans quickly.
const MEAL_BADGE: Record<string, string> = {
  breakfast: "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300",
  lunch: "bg-accent-100 text-accent-800 dark:bg-accent-500/15 dark:text-accent-300",
  dinner: "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300",
  snack: "bg-accent-100 text-accent-800 dark:bg-accent-500/15 dark:text-accent-300",
};

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-1.5 block w-full rounded-lg border-0 bg-surface px-3.5 py-2.5 text-foreground shadow-sm ring-1 ring-inset ring-line-strong transition placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500";

export default component$(() => {
  const nav = useNavigate();
  // Auth gate: null until checked. We render nothing app-related until the
  // check resolves, so protected data never flashes before a possible redirect.
  const authUser = useSignal<User | null>(null);
  const authChecked = useSignal(false);

  const selectedDate = useSignal("");
  const data = useSignal<FoodEntryList | null>(null);
  const listError = useSignal<string | null>(null);
  const listLoading = useSignal(false);

  const form = useStore<FormState>(blankForm());
  const editingId = useSignal<number | null>(null);
  const submitting = useSignal(false);
  const formError = useSignal<string | null>(null);

  const reload = $(async () => {
    if (!selectedDate.value) return;
    listLoading.value = true;
    try {
      data.value = await listFoodEntries(selectedDate.value);
      listError.value = null;
    } catch (err) {
      listError.value = err instanceof Error ? err.message : "Failed to load entries";
    } finally {
      listLoading.value = false;
    }
  });

  // Route protection (buildplan Step 34): confirm a valid session before
  // showing anything. Unauthenticated → redirect to login. This is a usability
  // guard; the backend remains the real security boundary (every API call is
  // independently authenticated).
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const user = await getCurrentUser();
    if (!user) {
      await nav("/login");
      return;
    }
    authUser.value = user;
    authChecked.value = true;
    selectedDate.value = todayIso(); // triggers the load task below
  });

  // Reload whenever the selected date changes — but only once authenticated.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const date = track(() => selectedDate.value);
    if (!authChecked.value || !date) return;
    reload();
  });


  const resetForm = $(() => {
    Object.assign(form, blankForm());
    editingId.value = null;
    formError.value = null;
  });

  const startEdit = $((entry: FoodEntry) => {
    form.food_name = entry.food_name;
    form.meal_category = entry.meal_category;
    form.serving_description = entry.serving_description ?? "";
    form.calories = String(entry.calories);
    form.multiplier = "1"; // stored macros are already scaled; edit from 1x
    form.protein_g = entry.protein_g;
    form.carb_g = entry.carb_g;
    form.fat_g = entry.fat_g;
    form.notes = entry.notes ?? "";
    editingId.value = entry.id;
    formError.value = null;
  });

  const submit = $(async () => {
    submitting.value = true;
    formError.value = null;
    // Macros are typed per the label's serving, then scaled by the multiplier so
    // the stored values reflect the actual serving. Calories are already scaled
    // (caloriesFromMacros applies the multiplier). The API validates and coerces.
    const mult = multiplierValue(form);
    const payload: FoodEntryCreate = {
      entry_date: selectedDate.value,
      meal_category: form.meal_category,
      food_name: form.food_name.trim(),
      calories: Number(form.calories),
      protein_g: scaleMacro(form.protein_g, mult),
      carb_g: scaleMacro(form.carb_g, mult),
      fat_g: scaleMacro(form.fat_g, mult),
      serving_description: form.serving_description.trim() || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (editingId.value !== null) {
        await updateFoodEntry(editingId.value, payload);
      } else {
        await createFoodEntry(payload);
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
      await deleteFoodEntry(id);
      if (editingId.value === id) await resetForm();
      await reload();
    } catch (err) {
      listError.value = err instanceof Error ? err.message : "Failed to delete entry";
    }
  });

  const totals = data.value?.totals;
  const entries = data.value?.items ?? [];

  // Hold the whole page until auth resolves so protected content can't flash
  // before a redirect.
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
        {/* Date selector */}
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">
              Your day
            </h1>
            <p class="mt-0.5 text-sm text-muted">
              Track what you eat and watch your macros add up.
            </p>
          </div>
          <label class="flex items-center gap-2 text-sm font-medium text-foreground">
            Date
            <input
              type="date"
              value={selectedDate.value}
              onChange$={(_, el) => (selectedDate.value = el.value)}
              class="rounded-lg border-0 bg-surface px-3 py-2 text-foreground shadow-sm ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
            />
          </label>
        </div>

        {/* Totals summary */}
        {totals && entries.length > 0 && (
          <div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Calories" value={`${totals.calories}`} unit="kcal" accent />
            <StatCard label="Protein" value={totals.protein_g} unit="g" />
            <StatCard label="Carbs" value={totals.carb_g} unit="g" />
            <StatCard label="Fat" value={totals.fat_g} unit="g" />
          </div>
        )}

        <div class="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
          {/* Form */}
          <section
            aria-labelledby="form-heading"
            class="h-fit rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line lg:sticky lg:top-24"
          >
            <h2
              id="form-heading"
              class="text-lg font-semibold tracking-tight text-foreground"
            >
              {editingId.value !== null ? "Edit entry" : "Add an entry"}
            </h2>
            <p class="mt-0.5 text-sm text-muted">
              {editingId.value !== null
                ? "Update the details below."
                : "Log a food and its macros."}
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
                  Food name
                  <input
                    type="text"
                    required
                    class={inputClass}
                    value={form.food_name}
                    onInput$={(_, el) => (form.food_name = el.value)}
                  />
                </label>
              </div>

              <div>
                <label class={labelClass}>
                  Meal
                  <select
                    class={inputClass}
                    value={form.meal_category}
                    onChange$={(_, el) =>
                      (form.meal_category = el.value as MealCategory)
                    }
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
                  Where{" "}
                  <span class="font-normal text-subtle">(optional)</span>
                  <input
                    type="text"
                    class={inputClass}
                    value={form.serving_description}
                    onInput$={(_, el) => (form.serving_description = el.value)}
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
                    value={form.protein_g}
                    onInput$={(_, el) => {
                      form.protein_g = el.value;
                      form.calories = caloriesFromMacros(form);
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
                    value={form.carb_g}
                    onInput$={(_, el) => {
                      form.carb_g = el.value;
                      form.calories = caloriesFromMacros(form);
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
                    value={form.fat_g}
                    onInput$={(_, el) => {
                      form.fat_g = el.value;
                      form.calories = caloriesFromMacros(form);
                    }}
                  />
                </label>
              </div>

              <div>
                <label class={labelClass}>
                  Calories{" "}
                  <span class="font-normal text-subtle">(auto)</span>
                  <input
                    type="number"
                    readOnly
                    class={`${inputClass} bg-black/5 dark:bg-white/5`}
                    value={form.calories}
                  />
                </label>
              </div>

              <div>
                <label class={labelClass}>
                  Multiplier{" "}
                  <span class="font-normal text-subtle">(servings)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    class={inputClass}
                    value={form.multiplier}
                    onInput$={(_, el) => {
                      form.multiplier = el.value;
                      form.calories = caloriesFromMacros(form);
                    }}
                  />
                </label>
              </div>

              <div>
                <label class={labelClass}>
                  Mood{" "}
                  <span class="font-normal text-subtle">(optional)</span>
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
                      : "Add entry"}
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
            <h2
              id="list-heading"
              class="mb-4 text-lg font-semibold tracking-tight text-foreground"
            >
              Entries for {selectedDate.value || "today"}
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
                  🍽️
                </div>
                <p class="mt-4 text-sm font-medium text-foreground">
                  No entries yet for this day
                </p>
                <p class="mt-1 text-sm text-muted">
                  Add your first one using the form.
                </p>
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
                        <div class="flex flex-wrap items-center gap-2">
                          <h3 class="font-semibold text-foreground">
                            {entry.food_name}
                          </h3>
                          <span
                            class={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${MEAL_BADGE[entry.meal_category] ?? "bg-surface-muted text-muted"}`}
                          >
                            {entry.meal_category}
                          </span>
                        </div>
                        {entry.serving_description && (
                          <p class="mt-0.5 text-sm text-muted">
                            {entry.serving_description}
                          </p>
                        )}
                      </div>
                      <div class="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick$={() => startEdit(entry)}
                          class="rounded-md px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line transition-colors hover:bg-surface-muted hover:text-foreground"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick$={() => remove(entry.id)}
                          class="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50 dark:text-red-400 dark:ring-red-900/50 dark:hover:bg-red-950/40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span class="font-semibold text-foreground">
                        {entry.calories}{" "}
                        <span class="font-normal text-subtle">kcal</span>
                      </span>
                      <span class="text-muted">
                        P <span class="font-medium">{entry.protein_g}g</span>
                      </span>
                      <span class="text-muted">
                        C <span class="font-medium">{entry.carb_g}g</span>
                      </span>
                      <span class="text-muted">
                        F <span class="font-medium">{entry.fat_g}g</span>
                      </span>
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

// Compact macro/calorie summary tile.
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
        <span
          class={`ml-1 text-sm font-normal ${accent ? "text-white/70" : "text-subtle"}`}
        >
          {unit}
        </span>
      </p>
    </div>
  );
});
