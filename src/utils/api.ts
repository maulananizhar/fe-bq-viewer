import { getToken } from './auth';

interface ApiOptions extends RequestInit {
  /** Skips adding the Authorization header */
  noAuth?: boolean;
}

const BASE_URL = '/api';

/**
 * Wrapper around fetch that automatically includes the auth token
 * and handles 401 responses (clears token and redirects to login).
 */
export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { noAuth, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!noAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Default Content-Type for POST/PUT/DELETE if body is present and no Content-Type set
  if (fetchOptions.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  // If the response is 401 (unauthorized), clear token and throw
  if (response.status === 401) {
    const { clearToken } = await import('./auth');
    clearToken();
    // Dispatch a custom event so the app can react
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('Unauthorized');
  }

  return response.json();
}

/** Convenience methods */
export const apiService = {
  get: <T = any>(path: string, options?: ApiOptions) =>
    api<T>(path, { ...options, method: 'GET' }),

  post: <T = any>(path: string, body?: any, options?: ApiOptions) =>
    api<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  put: <T = any>(path: string, body?: any, options?: ApiOptions) =>
    api<T>(path, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  delete: <T = any>(path: string, options?: ApiOptions) =>
    api<T>(path, { ...options, method: 'DELETE' }),
};
