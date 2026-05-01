import { createStart } from '@tanstack/react-start';
import { securityMiddleware } from '~/server/middleware/SecurityMiddleware.ts';
import { enforceFlowMiddleware } from '~/server/middleware/EnforceFlowMiddleware.ts';
import { errorReportingMiddleware } from '~/server/middleware/ErrorReportingMiddleware.ts';

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [errorReportingMiddleware, securityMiddleware, enforceFlowMiddleware],
  };
});
