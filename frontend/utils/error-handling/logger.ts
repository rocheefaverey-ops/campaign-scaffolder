/* eslint-disable @typescript-eslint/no-explicit-any */
import lodash from 'lodash';
import WinstonLogger from './winstonlogger';
import cls from './cls';

const LOG_LEVELS = {
  emergency: 0,
  alert: 1,
  critical: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

interface ILogger {
  alert(msg: string | any, meta?: any): void;
  error(msg: string | any, meta?: any): void;
  warning(msg: string | any, meta?: any): void;
  notice(msg: string | any, meta?: any): void;
  info(msg: string | any, meta?: any): void;
  debug(msg: string | any, meta?: any): void;
}

class ConsoleLogger implements ILogger {
  private static shouldLog(level: LogLevel): boolean {
    const configuredLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'warning';
    return LOG_LEVELS[level] <= LOG_LEVELS[configuredLevel];
  }

  private static formatLog(level: LogLevel, msg: string | any, meta: any = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      severity: level.toUpperCase(),
      message: typeof msg === 'string' ? msg : JSON.stringify(msg),
      ...meta
    };
    console.log(JSON.stringify(logEntry));
  }

  alert(msg: string | any, meta: any = {}) {
    ConsoleLogger.formatLog('alert', msg, meta);
  }
  error(msg: string | any, meta: any = {}) {
    ConsoleLogger.formatLog('error', msg, meta);
  }
  warning(msg: string | any, meta: any = {}) {
    ConsoleLogger.formatLog('warning', msg, meta);
  }
  notice(msg: string | any, meta: any = {}) {
    ConsoleLogger.formatLog('notice', msg, meta);
  }
  info(msg: string | any, meta: any = {}) {
    ConsoleLogger.formatLog('info', msg, meta);
  }
  debug(msg: string | any, meta: any = {}) {
    ConsoleLogger.formatLog('debug', msg, meta);
  }
}

export default class Logger {
  private static finishMeta(meta: any = {}) {
    const clsFields = cls.logFields ?? {};

    if (Object.entries(clsFields).length === 0 && Object.entries(meta).length === 0) return undefined;

    const ret = { ...(clsFields ?? {}) };

    lodash.merge(ret, meta);

    return ret;
  }

  private static getLogger(): ILogger {
    return process.env.LOG_STRUCTURED_CONSOLE === '1' ? new ConsoleLogger() : WinstonLogger;
  }

  public static alert(msg: string | any, meta: any = {}) {
    this.getLogger().alert(msg, Logger.finishMeta(meta));
  }
  public static error(msg: string | any, meta: any = {}) {
    this.getLogger().error(msg, Logger.finishMeta(meta));
  }
  public static warning(msg: string | any, meta: any = {}) {
    this.getLogger().warning(msg, Logger.finishMeta(meta));
  }
  public static notice(msg: string | any, meta: any = {}) {
    this.getLogger().notice(msg, Logger.finishMeta(meta));
  }
  public static info(msg: string | any, meta: any = {}) {
    this.getLogger().info(msg, Logger.finishMeta(meta));
  }
  public static debug(msg: string | any, meta: any = {}) {
    this.getLogger().debug(msg, Logger.finishMeta(meta));
  }
}
