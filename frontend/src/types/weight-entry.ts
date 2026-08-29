// Mirror of the backend weight-entry schemas (backend/app/schemas/weight_entry.py).
// `weight` arrives as a string because the API serializes Decimal as a JSON
// string to avoid float precision loss; the UI parses it for display.

export type WeightUnit = "lb" | "kg";

export type WeightEntry = {
  id: number;
  measured_at: string; // ISO 8601 datetime (UTC)
  weight: string;
  unit: WeightUnit;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WeightEntryCreate = {
  measured_at: string;
  weight: string;
  unit?: WeightUnit;
  notes?: string | null;
};

// PATCH input: every field optional; only sent fields are changed.
export type WeightEntryUpdate = Partial<WeightEntryCreate>;

export type WeightEntryList = {
  items: WeightEntry[];
  total: number;
  limit: number;
  offset: number;
};
