import { ErrorReporting as GcpErrorReporting } from '@google-cloud/error-reporting';
import { NextApiRequest } from 'next';
import Logger from './logger';

let gcpErrors: GcpErrorReporting;
if (process.env.LOG_TO_GCP === '1') {
  Logger.info('Init. GCP ErrorReporting');

  gcpErrors = new GcpErrorReporting({
    reportMode: 'always',
    serviceContext: {
      service: process.env.GCP_REPORTING_NAME,
      version: '1.0.0'
    },
    projectId: process.env.GCP_LOG_PROJECT ? process.env.GCP_LOG_PROJECT : undefined,
    keyFilename: process.env.GCP_LOG_KEYFILE ? process.env.GCP_LOG_KEYFILE : undefined
  });
} else {
  Logger.info('GCP ErrorReporting not enabled, skipped.');
}

export default class ErrorReporting {
  public static report(err: Error, req?: Request | NextApiRequest) {
    if (gcpErrors) {
      Logger.info('Logging error to GCP');

      gcpErrors.report(err, req);
    } else {
      Logger.info('Logging error to default');
      Logger.error(err);

      // Do console error log on dev env, to get the whole object
      if (process.env.APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
  }

  public static reportAny(err: unknown, req?: Request | NextApiRequest) {
    if (err instanceof Error) {
      // Report the error
      this.report(err, req);
    } else {
      // Write details to regular console to make sure we have as much info as possible
      // eslint-disable-next-line no-console
      console.error(err);

      // Report the error. Unfortunately we can't safely add more detail as 'reason' is unknown.
      this.report(new Error(`Error of different type than 'Error' occurred, please see console log for more info`), req);
    }
  }
}
