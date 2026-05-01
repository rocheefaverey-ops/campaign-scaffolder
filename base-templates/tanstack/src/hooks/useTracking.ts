import { useCallback } from 'react';

interface TrackEventParams {
  event: string;
  [key: string]: unknown;
}

export const useTracking = () => {
  const trackEvent = useCallback((params: TrackEventParams) => {
    if (typeof window === 'undefined') return; // SSR safeguard
    window.dataLayer?.push(params);
  }, []);

  const trackPageView = useCallback((pageName: string, additionalData?: Record<string, unknown>) => {
    trackEvent({
      event: 'page_view',
      page_name: pageName,
      ...additionalData,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
  };
};
