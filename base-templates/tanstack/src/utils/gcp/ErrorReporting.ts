import { ErrorReporting as GcpErrorReporting } from '@google-cloud/error-reporting';
import Logger from './Logger';

let gcpErrors: GcpErrorReporting | undefined;

if (process.env.LOG_TO_GCP === '1') {
  Logger.info('Init. GCP ErrorReporting');

  gcpErrors = new GcpErrorReporting({
    reportMode: 'always',
    serviceContext: {
      service: process.env.GCP_REPORTING_NAME ? process.env.GCP_REPORTING_NAME : process.env.APP_NAME,
      version: '1.0.0',
    },
    projectId: process.env.GCP_LOG_PROJECT ? process.env.GCP_LOG_PROJECT : undefined,
    keyFilename: process.env.GCP_LOG_KEYFILE ? process.env.GCP_LOG_KEYFILE : undefined,
  });
} else {
  Logger.info('GCP ErrorReporting not enabled, skipped.');
}

export default class ErrorReporting {
  public static report(err: Error, req?: Request, callback?: () => void) {
    if (!gcpErrors) {
      Logger.info('Logging error to default');
      Logger.error(err);

      // Do console error log on dev env, to get the whole object
      if (process.env.APP_ENV === 'development') {
        console.error(err);
      }

      if (callback) callback();
      return;
    }

    Logger.info('Logging error to GCP');

    // I know this error callback is messy, but it fixes
    //  ERROR:@google-cloud/error-reporting: Encountered an error while attempting to transmit an error
    //  to the Error Reporting API. ApiError: ReportedErrorEvent.context must contain a location
    //  unless `message` contain an exception or stacktrace.
    gcpErrors.report(err, req, undefined, (gcpErr) => {
      if (!gcpErr) {
        if (callback) callback();
        return;
      }

      const msg = `Error Reporting had error - retrying if possible - for message '${err.message}' - '${gcpErr.message}'`;
      Logger.error(msg);

      // If possible, add a dummy stack trace and retry
      if (!err.stack) {
        err.stack = `Error: ${err.message}\n\tat /unknown:0:0`;
        gcpErrors.report(err, req, undefined, (gcpErr2) => {
          if (gcpErr2) {
            const msg2 = `Error Reporting retry also failed for message '${err.message}' - '${gcpErr2.message}'`;
            Logger.error(msg2);
          }
          if (callback) callback();
        });
        return;
      }

      // As a last resort, re-throw using our own message
      try {
        throw new Error(msg);
      } catch (err2: any) {
        gcpErrors.report(err2, req, undefined, (gcpErr3) => {
          if (gcpErr3) {
            const msg3 = `Error Reporting final retry also failed for message '${err2?.message}' - '${gcpErr3.message}'`;
            Logger.error(msg3);
          }
          if (callback) callback();
        });
      }
    });
  }

  public static reportAny(err: any, req?: Request, callback?: () => void) {
    if (err instanceof Error) {
      // Report the error
      this.report(err, req, callback);
    } else {
      // Write details to regular console to make sure we have as much info as possible
      console.error(err);

      // This re-throw is really ugly, but it fixes:
      //  ERROR:@google-cloud/error-reporting: Encountered an error while attempting to transmit an error
      //  to the Error Reporting API. ApiError: ReportedErrorEvent.context must contain a location
      //  unless `message` contain an exception or stacktrace.
      try {
        // Report the error. Unfortunately we can't safely add more detail as 'reason' is unknown.
        throw new Error(
          `Error of different type than 'Error' occurred, please see console log for more info: ${err?.message}`
        );
      } catch (err2: any) {
        this.report(err2, req, callback);
      }
    }
  }
}
