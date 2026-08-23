import type { HealthResponse } from "~/types/health";

// Single source of truth for the backend origin, read from the environment
// (PUBLIC_API_BASE_URL in frontend/.env). Only PUBLIC_-prefixed vars are
// exposed to browser code by Vite. The fallback keeps local dev working if the
// var is unset. Do not scatter this URL across components.
export const API_BASE_URL =
  import.meta.env.PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

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
