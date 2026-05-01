'use server';

import Logger from '@lib/logger/logger';

interface InfoLoggingProps {
  key: string;
  value: unknown;
  token?: string;
}

/**
 * Thin server action that relays client-side events to the server logger.
 * Use for tracking user flow milestones without exposing the logger to the client bundle.
 */
export default async function InfoLogging({
  key,
  value,
  token,
}: InfoLoggingProps): Promise<void> {
  const prefix = token ? `[${token.slice(0, 8)}…]` : '[anon]';
  Logger.info(`${prefix} ${key}`, { value });
}
