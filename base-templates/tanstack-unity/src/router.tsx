import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.ts';
import { getNonce } from '~/server/middleware/SecurityMiddleware.ts';

// Create and export the router
export const getRouter = () => {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultViewTransition: true,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    context: {
      language: process.env.CAPE_CAMPAIGN_LANGUAGE || 'EN', // Default language
    },
    ssr: {
      nonce: getNonce(),
    },
  });
};
