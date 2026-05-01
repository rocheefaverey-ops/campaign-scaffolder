import { createMiddleware } from '@tanstack/react-start';
import type { ICapeData } from '~/interfaces/cape/ICapeData.ts';
import { isLocal } from '~/utils/Helper.ts';

// State
const defaultTTL = 5 * 60 * 1000;
const shortTTL = 15 * 1000;
let cacheTime = 0;
let cachedData: ICapeData = {};
let fetchRequest: Promise<void> | null = null;

// Fetcher
export const fetchCapeData = createMiddleware()
  .server(async ({ next, request }) => {
    const url = new URL(request.url);
    const useShortTTL = url.pathname.startsWith('/api');
    await requestCapeData(useShortTTL);

    // Provide data to next middleware / handler
    return next({
      context: {
        capeData: cachedData,
      },
    });
  });

function requestCapeData(useShortTTL: boolean) {
  const maxAge = useShortTTL ? shortTTL : defaultTTL;
  const isExpired = !cacheTime || Date.now() > cacheTime + maxAge;

  if (isExpired) {
    if (!fetchRequest) {
      const requestUrl = `${process.env.CAPE_BASE_URL}/${process.env.CAPE_CAMPAIGN_ID}_${process.env.CAPE_CAMPAIGN_MARKET}.json`;

      // Log the request URL on local builds
      if (isLocal()) {
        console.log('Fetching Cape Data from:', requestUrl);
      }

      // Initiate fetch request
      fetchRequest = fetch(requestUrl)
        .then((res) => res.json())
        .then((data) => {
          cacheTime = Date.now();
          cachedData = data || {};
        })
        .catch((e) => {
          cacheTime = Date.now();
          console.error('Failed to fetch Cape data:', e);
        })
        .finally(() => {
          fetchRequest = null;
        });
    }
    return fetchRequest;
  }
  return Promise.resolve();
}
