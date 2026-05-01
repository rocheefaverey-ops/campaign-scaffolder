import { createMiddleware } from '@tanstack/react-start';
import { isDocumentRequest, parseBoolean } from '~/utils/Helper.ts';

// Whitelist for direct access
const whitelist = [
  '/api',
];

export const enforceFlowMiddleware = createMiddleware().server(({ request, next }) => {
  const url = new URL(request.url);

  // Check if the method is GET and if it's a browser request
  if (!parseBoolean(process.env.ENFORCE_FLOW) || !isDocumentRequest(request)) {
    return next();
  }

  // Check whitelist (or root)
  for (const path of whitelist) {
    if (url.pathname === '/' || url.pathname.startsWith(path)) {
      return next();
    }
  }

  // Redirect to root if not whitelisted
  url.pathname = '/';
  return Response.redirect(url.toString(), 302);
});
