import type { HealthResponse } from "~/types/health";

// Single source of truth for the backend origin. Hard-coded for now;
// environment-based configuration lands in Phase 3. Do not scatter this
// URL across components.
export const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

/**
 * Thin fetch wrapper that resolves paths against the API base URL and
 * throws on non-2xx responses. Path should start with "/".
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new Error(`API returned ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}
