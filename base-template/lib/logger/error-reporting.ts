import Logger from './logger';

let gcpReporter: { report: (err: unknown) => void } | null = null;

if (typeof window === 'undefined' && process.env.GCP_ENABLE === 'true') {
  try {
    const { ErrorReporting } = require('@google-cloud/error-reporting');
    gcpReporter = new ErrorReporting({
      projectId: process.env.GCP_PROJECT_ID,
      reportMode: 'always',
    });
  } catch {
    Logger.warn('[ErrorReporting] @google-cloud/error-reporting not available');
  }
}

const ErrorReporter = {
  report(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    Logger.error(err.message, { stack: err.stack });
    gcpReporter?.report(err);
  },
};

export default ErrorReporter;
