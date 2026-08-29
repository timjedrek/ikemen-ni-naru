// Mirror of the backend sleep-entry schemas (backend/app/schemas/sleep_entry.py).
// duration_minutes is derived server-side from started_at/ended_at; the client
// never sends it.

export type SleepEntry = {
  id: number;
  started_at: string; // ISO 8601 datetime (UTC)
  ended_at: string; // ISO 8601 datetime (UTC)
  duration_minutes: number;
  quality_score: number; // 1 (worst) – 10 (best)
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SleepEntryCreate = {
  started_at: string;
  ended_at: string;
  quality_score: number;
  notes?: string | null;
};

// PATCH input: every field optional; only sent fields are changed.
export type SleepEntryUpdate = Partial<SleepEntryCreate>;

export type SleepEntryList = {
  items: SleepEntry[];
  total: number;
  limit: number;
  offset: number;
};
