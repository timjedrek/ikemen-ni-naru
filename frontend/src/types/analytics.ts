// Mirror of the backend analytics read model (backend/app/schemas/analytics.py).
// These are the chart-ready shapes the dashboard consumes — the backend does
// the aggregation, the browser only draws.

import type { FoodEntry } from "~/types/food-entry";
import type { WeightEntry } from "~/types/weight-entry";
import type { MoodEntry } from "~/types/mood-entry";
import type { SleepEntry } from "~/types/sleep-entry";

// Numeric macros/weight arrive as strings (Decimal serialized as JSON string).

export type FoodDayPoint = {
  date: string; // ISO 8601 date, e.g. "2026-08-29"
  calories: number;
  protein_g: string;
  carb_g: string;
  fat_g: string;
};

export type WeightPoint = {
  id: number;
  measured_at: string; // ISO 8601 datetime (UTC)
  weight: string;
  unit: string;
};

export type MoodPoint = {
  id: number;
  recorded_at: string; // ISO 8601 datetime (UTC)
  mood_score: number;
};

export type SleepInterval = {
  id: number;
  started_at: string; // ISO 8601 datetime (UTC)
  ended_at: string; // ISO 8601 datetime (UTC)
  duration_minutes: number;
  quality_score: number;
};

export type FoodSeries = { items: FoodDayPoint[] };
export type WeightSeries = { items: WeightPoint[] };
export type MoodSeries = { items: MoodPoint[] };
export type SleepSeries = { items: SleepInterval[] };

// The day drill-down: every entry for one calendar day, across all trackers.
export type DayDetail = {
  date: string;
  food: FoodEntry[];
  weight: WeightEntry[];
  mood: MoodEntry[];
  sleep: SleepEntry[];
};
