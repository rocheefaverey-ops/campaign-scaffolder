import { createFileRoute } from '@tanstack/react-router';
import { fetchCapeData } from '~/server/cape/CapeMiddleware.ts';

export const Route = createFileRoute('/api/cape')({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: {
          middleware: [fetchCapeData],
          handler: ({ context }) => new Response(JSON.stringify(context.capeData, null, 2), {
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        },
      }),
  },
});
