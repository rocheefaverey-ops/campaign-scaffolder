import { createFileRoute } from '@tanstack/react-router';
import { getCapeCopyMapUnity } from '~/server/cape/CapeProvider.ts';

export const Route = createFileRoute('/api/unity')({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: {
          handler: async ({ request }) => {
            const url = new URL(request.url);
            const language = url.searchParams.get('language')?.toUpperCase() || 'EN';
            const translations = await getCapeCopyMapUnity(language, ['game']);
            return new Response(JSON.stringify(translations, null, 2), {
              headers: {
                'Content-Type': 'application/json',
              },
            });
          },
        },
      }),
  },
});
