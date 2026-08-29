// Mirror of the backend mood-entry schemas (backend/app/schemas/mood_entry.py).

export type MoodEntry = {
  id: number;
  recorded_at: string; // ISO 8601 datetime (UTC)
  mood_score: number; // 1 (worst) – 10 (best)
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MoodEntryCreate = {
  recorded_at: string;
  mood_score: number;
  notes?: string | null;
};

// PATCH input: every field optional; only sent fields are changed.
export type MoodEntryUpdate = Partial<MoodEntryCreate>;

export type MoodEntryList = {
  items: MoodEntry[];
  total: number;
  limit: number;
  offset: number;
};
