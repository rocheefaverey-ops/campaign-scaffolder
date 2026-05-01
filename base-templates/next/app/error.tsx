'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Error is already captured server-side via GCP Error Reporting.
    // Log client-side boundary catches separately.
    console.error('[GlobalError boundary]', error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-2xl font-bold">Something went wrong.</h2>
      <button
        onClick={reset}
        className="rounded bg-[var(--color-primary)] px-6 py-3 text-[var(--color-secondary)]"
      >
        Try again
      </button>
    </div>
  );
}
