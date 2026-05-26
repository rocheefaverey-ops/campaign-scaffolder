export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    let isExiting = false;

    const exitOnUncaught = (name: string, errOrReason: unknown) => {
      if (isExiting) return;
      isExiting = true;

      // Also log to regular console in case the logging driver itself is the problem
      // eslint-disable-next-line no-console
      console.error(`${name} occurred`);
      // eslint-disable-next-line no-console
      console.error(errOrReason);

      // Dynamic imports to avoid loading at build time
      Promise.all([
        import('@utils/error-handling/error-reporting'),
        import('@utils/error-handling/logger')
      ]).then(([{ default: ErrorReporting }, { default: Logger }]) => {
        Logger.error(`${name}: ${errOrReason instanceof Error ? errOrReason.message : String(errOrReason)}`);

        ErrorReporting.reportAny(errOrReason);

        // Give some time for the error report to be sent before forcing exit
        setTimeout(() => {
          process.exit(1);
        }, 5000);
      }).catch(() => {
        // If even the reporting fails, just exit
        process.exit(1);
      });
    };

    process.on('unhandledRejection', (reason) => exitOnUncaught('unhandledRejection', reason));
    process.on('uncaughtException', (err) => exitOnUncaught('uncaughtException', err));
  }
}
