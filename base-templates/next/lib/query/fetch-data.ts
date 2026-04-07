import ErrorReporter from '@lib/logger/error-reporting';
import type { FetchDataResponse } from '@/types/actions/fetch-data';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  authToken?: string;
  headers?: Record<string, string>;
}

/**
 * Central fetch wrapper for all server actions.
 *
 * - Attaches auth header if a token is provided
 * - Parses JSON response
 * - Catches all errors and reports to GCP
 * - Returns a typed FetchDataResponse<T> so callers always get a consistent shape
 */
export async function fetchData<T>(
  url: string,
  options: FetchOptions = {},
): Promise<FetchDataResponse<T>> {
  const { method = 'GET', body, authToken, headers = {} } = options;

  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authToken) {
    fetchHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    let data: T | null = null;
    const contentType = res.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      data = (await res.json()) as T;
    }

    if (!res.ok) {
      const errorMessage =
        (data as { message?: string })?.message ??
        `Request failed: ${res.status} ${res.statusText}`;
      return { success: false, data: null, error: errorMessage };
    }

    return { success: true, data: data as T, error: null };
  } catch (error) {
    ErrorReporter.report(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, data: null, error: message };
  }
}
