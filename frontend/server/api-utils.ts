import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import cls, { run } from '@utils/error-handling/cls';
import ErrorReporting from '@utils/error-handling/error-reporting';

export function apiMiddleware<T extends unknown[]>(handler: (...args: T) => Promise<Response | NextResponse>) {
  return (...args: T): Promise<Response | NextResponse> => {
    return run(async () => {
      cls.logFields = { labels: {} };

      const project = process.env.GCP_LOG_PROJECT;
      if (project) {
        const traceHeader = (await headers()).get('x-cloud-trace-context');
        if (traceHeader) {
          const [trace] = traceHeader.split('/');
          cls.logFields['logging.googleapis.com/trace'] = `projects/${project}/traces/${trace}`;
        }
      }

      try {
        return await handler(...args);
      } catch (err) {
        ErrorReporting.report(err instanceof Error ? err : new Error(String(err)));
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    });
  };
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
