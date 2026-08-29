// Mirror of the backend food-entry schemas (backend/app/schemas/food_entry.py).
// Numeric macros arrive as strings because the API serializes Decimal as a JSON
// string to avoid float precision loss; the UI parses them for display/sums.

export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_CATEGORIES: MealCategory[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export type FoodEntry = {
  id: number;
  entry_date: string; // ISO 8601 date, e.g. "2026-08-29"
  meal_category: MealCategory;
  food_name: string;
  serving_description: string | null;
  calories: number;
  protein_g: string;
  carb_g: string;
  fat_g: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FoodEntryCreate = {
  entry_date: string;
  meal_category: MealCategory;
  food_name: string;
  serving_description?: string | null;
  calories: number;
  protein_g: string;
  carb_g: string;
  fat_g: string;
  notes?: string | null;
};

// PATCH input: every field optional; only sent fields are changed.
export type FoodEntryUpdate = Partial<FoodEntryCreate>;

export type DailyTotals = {
  calories: number;
  protein_g: string;
  carb_g: string;
  fat_g: string;
};

export type FoodEntryList = {
  items: FoodEntry[];
  total: number;
  limit: number;
  offset: number;
  totals: DailyTotals;
};
