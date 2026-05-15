import type { PlatformType } from '~/utils/Constants.ts';

/**
 * Merges a list of classes into a single string, removing any undefined or empty values
 * @param classes the list of classes to merge
 */
export function mergeClasses(...classes: Array<string | false | undefined>): string | undefined {
  const merged = classes
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length)
    .join(' ');
  return merged || undefined;
}

/**
 * Extracts the base URL (protocol + host) from a full URL string
 * @param fullUrl the full URL string
 */
export function extractBaseUrl(fullUrl: string): string {
  try {
    const url = new URL(fullUrl);
    return url.origin;
  } catch (e) {
    console.error('Invalid URL provided to extractBaseUrl:', fullUrl);
    return '';
  }
}

/**
 * A promise-based delay, handy for things like polling
 * @param durationMs the amount of time to wait in milliseconds
 */
export function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

/**
 * Parse platform from user agent string
 * @param userAgent the user agent string
 */
export function parsePlatform(userAgent: string): PlatformType {
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'ios';
  } else if (/Android/i.test(userAgent)) {
    return 'android';
  } else {
    return 'desktop';
  }
}

/**
 * Capitalize the first letter of a string
 * @param input the string to capitalize
 */
export function capitalizeWord(input: string): string {
  return input ? input.charAt(0).toUpperCase() + input.slice(1) : input;
}

/**
 * Parse string input to number, with fallback
 * @param input the string input
 * @param fallback the fallback value if parsing fails
 */
export function parseNumber(input: string | null | undefined, fallback: number = 0): number {
  const parsed = Number(input);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse string input to boolean, with fallback
 * @param input the string input
 * @param fallback the fallback value if parsing fails
 */
export function parseBoolean(input: string | null | undefined, fallback: boolean = false): boolean {
  const lowerInput = input?.toLowerCase();
  if (lowerInput === 'true' || lowerInput === '1') return true;
  if (lowerInput === 'false' || lowerInput === '0') return false;
  return fallback;
}

/**
 * Check if the current environment is local
 */
export function isLocal(): boolean {
  return import.meta.env.VITE_ENVIRONMENT === 'local';
}

/**
 * Check if the current environment is production
 */
export function isProduction(): boolean {
  return import.meta.env.VITE_ENVIRONMENT === 'production';
}

/**
 * Check if a request is a document request (i.e., a browser navigation request for an HTML page)
 * @param request
 */
export function isDocumentRequest(request: Request): boolean {
  const accept = request.headers.get('accept') ?? '';
  return request.method === 'GET' && accept.includes('text/html');
}

/**
 * Returns a random ID
 */
export function getRandomId() {
  return Math.random().toString(16).slice(2);
}
