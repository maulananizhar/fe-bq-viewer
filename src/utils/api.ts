import { getToken } from "./auth";

// =============================================================================
// API Hit Logger — mencatat setiap request API untuk debugging
// =============================================================================

export interface ApiLogEntry {
  timestamp: string;
  method: string;
  path: string;
  status?: number;
  duration?: number;
  error?: string;
  requestBody?: string;
}

const MAX_LOG_ENTRIES = 500;
const _apiLog: ApiLogEntry[] = [];

/**
 * Ambil salinan log API yang terkumpul.
 */
export function getApiLog(): ApiLogEntry[] {
  return [..._apiLog];
}

/**
 * Hapus semua log API.
 */
export function clearApiLog(): void {
  _apiLog.length = 0;
}

function pushLog(entry: ApiLogEntry) {
  _apiLog.push(entry);
  if (_apiLog.length > MAX_LOG_ENTRIES) {
    _apiLog.shift();
  }

  const prefix = `[API ${entry.timestamp}]`;
  const line = `${entry.method} ${entry.path} → ${entry.status ?? "???"} (${entry.duration ?? "?"}ms)`;

  if (entry.error) {
    console.error(`%c${prefix} ${line}`, "color:#ef4444;font-weight:600", entry.error);
  } else if (entry.status && entry.status >= 400) {
    console.warn(`%c${prefix} ${line}`, "color:#f59e0b;font-weight:600");
  } else {
    console.log(`%c${prefix} ${line}`, "color:#22c55e;font-weight:600");
  }
}

// =============================================================================
// API Client — configurable BASE_URL support + logging
// =============================================================================

interface ApiOptions extends RequestInit {
  /** Skips adding the Authorization header */
  noAuth?: boolean;
  /** Set to false to skip logging this request */
  noLog?: boolean;
}

/**
 * BASE_URL bisa diatur via env var VITE_API_URL.
 *
 * - Tanpa proxy (langsung ke backend): set `VITE_API_URL=http://host:5000/api`
 *   Contoh: fetch(`${BASE_URL}/health`) → http://host:5000/api/health
 *   Catatan: backend harus allow CORS origin frontend.
 *
 * - Dengan proxy (via nginx): tidak perlu set VITE_API_URL, fallback ke "/api"
 *   Contoh: fetch(`${BASE_URL}/health`) → /api/health → nginx → backend
 */
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

if (import.meta.env.DEV && BASE_URL !== "/api") {
  console.log(`[API] Using custom BASE_URL: ${BASE_URL}`);
}

/**
 * Wrapper around fetch that automatically:
 * - Includes auth token
 * - Handles 401 (clears token, dispatches auth:unauthorized event)
 * - Logs every request to console (and internal buffer)
 */
export async function api<T = any>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { noAuth, noLog, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!noAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Default Content-Type for POST/PUT/DELETE if body is present and no Content-Type set
  if (fetchOptions.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${BASE_URL}${path}`;
  const startTime = performance.now();
  const logEntry: ApiLogEntry = {
    timestamp: new Date().toISOString(),
    method: fetchOptions.method || "GET",
    path,
    requestBody: fetchOptions.body as string | undefined,
  };

  let response: Response;

  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
    logEntry.status = response.status;
    logEntry.duration = Math.round(performance.now() - startTime);

    // If the response is 401 (unauthorized), clear token and throw
    if (response.status === 401) {
      if (noAuth) {
        // For unauthenticated requests (e.g., login), return the error response body
        // so the caller can display the actual error message from the server.
        if (!noLog) pushLog(logEntry);
        return response.json();
      }
      const { clearToken } = await import("./auth");
      clearToken();
      // Dispatch a custom event so the app can react
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      throw new Error("Unauthorized");
    }

    const data = await response.json();
    if (!noLog) pushLog(logEntry);
    return data;
  } catch (err) {
    logEntry.duration = Math.round(performance.now() - startTime);
    logEntry.error = err instanceof Error ? err.message : String(err);
    if (!noLog) pushLog(logEntry);
    throw err;
  }
}

/** Convenience methods */
export const apiService = {
  get: <T = any>(path: string, options?: ApiOptions) =>
    api<T>(path, { ...options, method: "GET" }),

  post: <T = any>(path: string, body?: any, options?: ApiOptions) =>
    api<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(path: string, body?: any, options?: ApiOptions) =>
    api<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(path: string, options?: ApiOptions) =>
    api<T>(path, { ...options, method: "DELETE" }),
};
