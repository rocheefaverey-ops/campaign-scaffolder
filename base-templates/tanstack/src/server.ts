import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import ErrorReporting from '~/utils/gcp/ErrorReporting.ts';
import Logger from '~/utils/gcp/Logger.ts';

function processCrash(name: string, err: unknown) {
  // Log normally, in case it is the logging driver itself causing issues
  console.error(`${name} occurred, exiting process`);
  console.error(err);

  // Send to GCP Error Reporting
  Logger.error(`${name} occurred, exiting process`);
  ErrorReporting.reportAny(err, undefined, () => process.exit(1));

  // Fallback exit in case GCP reporting takes too long
  setTimeout(() => process.exit(1), 5000);
}

function installCrashListeners() {
  process.on('uncaughtException', (err) => processCrash('uncaughtException', err));
  process.on('unhandledRejection', (reason) => processCrash('unhandledRejection', reason));
}

installCrashListeners();

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request);
  },
});
