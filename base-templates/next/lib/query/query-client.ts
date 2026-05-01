import { QueryClient } from '@tanstack/react-query';

let client: QueryClient | null = null;

/**
 * Singleton QueryClient.
 * Called once in Providers — every component shares the same instance.
 * Default staleTime is Infinity because campaign data comes from server actions
 * and is invalidated explicitly, not by time.
 */
export function getQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          gcTime: 1000 * 60 * 10, // 10 min
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return client;
}
