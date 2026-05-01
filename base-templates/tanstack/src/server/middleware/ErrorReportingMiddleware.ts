import { createMiddleware } from '@tanstack/react-start';
import ErrorReporting from '~/utils/gcp/ErrorReporting.ts';

export const errorReportingMiddleware = createMiddleware().server(async ({ request, next }) => {
  try {
    return await next();
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    ErrorReporting.report(error, request);
    throw e;
  }
});
