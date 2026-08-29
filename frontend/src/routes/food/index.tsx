import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import {
  ApiError,
  createFoodEntry,
  deleteFoodEntry,
  getCurrentUser,
  listFoodEntries,
  logout,
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
    protein_g: "",
    carb_g: "",
    fat_g: "",
    notes: "",
  };
}

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

  const doLogout = $(async () => {
    await logout();
    await nav("/login");
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
    // Macros/calories left as-typed strings; the API validates and coerces.
    const payload: FoodEntryCreate = {
      entry_date: selectedDate.value,
      meal_category: form.meal_category,
      food_name: form.food_name.trim(),
      calories: Number(form.calories),
      protein_g: form.protein_g,
      carb_g: form.carb_g,
      fat_g: form.fat_g,
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
  if (!authChecked.value) return <p>Loading...</p>;

  return (
    <main>
      <header>
        <h1>Food Log</h1>
        <p>
          Signed in as{" "}
          <strong>{authUser.value?.display_name || authUser.value?.email}</strong>{" "}
          <button type="button" onClick$={doLogout}>
            Log out
          </button>
        </p>
      </header>

      <p>
        <label>
          Date{" "}
          <input
            type="date"
            value={selectedDate.value}
            onChange$={(_, el) => (selectedDate.value = el.value)}
          />
        </label>
      </p>

      <section aria-labelledby="form-heading">
        <h2 id="form-heading">
          {editingId.value !== null ? "Edit entry" : "Add an entry"}
        </h2>

        {formError.value && <p role="alert">{formError.value}</p>}

        <form
          preventdefault:submit
          onSubmit$={submit}
        >
          <p>
            <label>
              Food name
              <input
                type="text"
                required
                value={form.food_name}
                onInput$={(_, el) => (form.food_name = el.value)}
              />
            </label>
          </p>

          <p>
            <label>
              Meal
              <select
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
          </p>

          <p>
            <label>
              Serving (optional)
              <input
                type="text"
                value={form.serving_description}
                onInput$={(_, el) => (form.serving_description = el.value)}
              />
            </label>
          </p>

          <p>
            <label>
              Calories
              <input
                type="number"
                required
                min="0"
                step="1"
                value={form.calories}
                onInput$={(_, el) => (form.calories = el.value)}
              />
            </label>
          </p>

          <p>
            <label>
              Protein (g)
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.protein_g}
                onInput$={(_, el) => (form.protein_g = el.value)}
              />
            </label>
          </p>

          <p>
            <label>
              Carbs (g)
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.carb_g}
                onInput$={(_, el) => (form.carb_g = el.value)}
              />
            </label>
          </p>

          <p>
            <label>
              Fat (g)
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.fat_g}
                onInput$={(_, el) => (form.fat_g = el.value)}
              />
            </label>
          </p>

          <p>
            <label>
              Notes (optional)
              <textarea
                value={form.notes}
                onInput$={(_, el) => (form.notes = el.value)}
              />
            </label>
          </p>

          <p>
            <button type="submit" disabled={submitting.value}>
              {submitting.value
                ? "Saving..."
                : editingId.value !== null
                  ? "Save changes"
                  : "Add entry"}
            </button>
            {editingId.value !== null && (
              <button type="button" disabled={submitting.value} onClick$={resetForm}>
                Cancel
              </button>
            )}
          </p>
        </form>
      </section>

      <section aria-labelledby="list-heading">
        <h2 id="list-heading">Entries for {selectedDate.value || "today"}</h2>

        {listLoading.value && <p>Loading...</p>}
        {listError.value && <p role="alert">{listError.value}</p>}

        {!listLoading.value && !listError.value && entries.length === 0 && (
          <p>No entries yet for this day. Add your first one above.</p>
        )}

        {entries.length > 0 && (
          <>
            <ul>
              {entries.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.food_name}</strong> ({entry.meal_category})
                  {entry.serving_description ? ` — ${entry.serving_description}` : ""}
                  <br />
                  {entry.calories} kcal · P {entry.protein_g}g · C {entry.carb_g}g · F{" "}
                  {entry.fat_g}g
                  {entry.notes ? <div>Notes: {entry.notes}</div> : null}
                  <div>
                    <button type="button" onClick$={() => startEdit(entry)}>
                      Edit
                    </button>
                    <button type="button" onClick$={() => remove(entry.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {totals && (
              <p>
                <strong>Daily totals:</strong> {totals.calories} kcal · P{" "}
                {totals.protein_g}g · C {totals.carb_g}g · F {totals.fat_g}g
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
});
