import winston from 'winston';

const { combine, timestamp, json, colorize, simple } = winston.format;

const isServer = typeof window === 'undefined';
const level = process.env.LOG_LEVEL ?? 'info';
const gcpEnabled = process.env.GCP_ENABLE === 'true';

const transports: winston.transport[] = [];

if (isServer) {
  transports.push(
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'development'
          ? combine(colorize(), simple())
          : combine(timestamp(), json()),
    }),
  );

  if (gcpEnabled) {
    // Dynamically require to avoid bundling in local/dev
    try {
      const { LoggingWinston } = require('@google-cloud/logging-winston');
      transports.push(
        new LoggingWinston({
          projectId: process.env.GCP_PROJECT_ID,
          logName: process.env.GCP_LOG_NAME ?? 'campaign',
        }),
      );
    } catch {
      console.warn('[Logger] @google-cloud/logging-winston not available');
    }
  }
}

const Logger = winston.createLogger({
  level,
  transports,
  // Silence entirely on client (browser) — use InfoLogging action instead
  silent: !isServer,
});

export default Logger;
