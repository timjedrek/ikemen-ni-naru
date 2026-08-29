import type { HealthResponse } from "~/types/health";
import type {
  FoodEntry,
  FoodEntryCreate,
  FoodEntryList,
  FoodEntryUpdate,
} from "~/types/food-entry";

// Single source of truth for the backend origin, read from the environment
// (PUBLIC_API_BASE_URL in frontend/.env). Only PUBLIC_-prefixed vars are
// exposed to browser code by Vite. The fallback keeps local dev working if the
// var is unset. Do not scatter this URL across components.
export const API_BASE_URL =
  import.meta.env.PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

/**
 * Error thrown for non-2xx responses. Carries the HTTP status and a
 * human-readable message extracted from FastAPI's `detail` field so callers
 * (e.g. the food form) can show server-side validation errors to the user.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FastApiValidationItem = { loc: (string | number)[]; msg: string };

// FastAPI reports errors as {detail: "..."} (our HTTPExceptions) or
// {detail: [{loc, msg}, ...]} (request-body validation). Flatten both into one
// readable string.
function messageFromDetail(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null || !("detail" in body)) {
    return fallback;
  }
  const detail = (body as { detail: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: FastApiValidationItem) => {
        const field = item.loc?.[item.loc.length - 1];
        return field ? `${field}: ${item.msg}` : item.msg;
      })
      .join("; ");
  }
  return fallback;
}

/**
 * Thin fetch wrapper that resolves paths against the API base URL. Serializes a
 * JSON body when given, throws {@link ApiError} on non-2xx, and returns
 * `undefined` for 204 No Content. Path should start with "/".
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers:
      json !== undefined
        ? { "Content-Type": "application/json", ...headers }
        : headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      messageFromDetail(body, `${response.status} ${response.statusText}`),
    );
  }

  // 204 (and other empty bodies) have nothing to parse.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

// --- Food entries (buildplan Phase 5) ---

export function listFoodEntries(date?: string): Promise<FoodEntryList> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<FoodEntryList>(`/food-entries${query}`);
}

export function createFoodEntry(data: FoodEntryCreate): Promise<FoodEntry> {
  return apiFetch<FoodEntry>("/food-entries", { method: "POST", json: data });
}

export function updateFoodEntry(
  id: number,
  data: FoodEntryUpdate,
): Promise<FoodEntry> {
  return apiFetch<FoodEntry>(`/food-entries/${id}`, {
    method: "PATCH",
    json: data,
  });
}

export function deleteFoodEntry(id: number): Promise<void> {
  return apiFetch<void>(`/food-entries/${id}`, { method: "DELETE" });
}
