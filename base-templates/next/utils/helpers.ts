import { clsx, type ClassValue } from 'clsx';

/** Merge Tailwind class names, filtering falsy values */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Delay for a given number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a random ID (UUID v4 where available, fallback to Math.random) */
export function getRandomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

/** Safe integer parse with fallback */
export function parseNumber(input: unknown, fallback = 0): number {
  const n = Number(input);
  return isNaN(n) ? fallback : n;
}

/** Safe boolean parse — treats 'true'/'1'/true as true */
export function parseBoolean(input: unknown, fallback = false): boolean {
  if (typeof input === 'boolean') return input;
  if (input === 'true' || input === '1') return true;
  if (input === 'false' || input === '0') return false;
  return fallback;
}

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function isProduction(): boolean {
  return process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
}

export function isLocal(): boolean {
  return process.env.APP_ENV === 'local' || process.env.NODE_ENV === 'development';
}
