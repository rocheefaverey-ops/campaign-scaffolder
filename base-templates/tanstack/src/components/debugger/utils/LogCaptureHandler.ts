const consoleTypeList = ['info', 'warn', 'error'] as const;
const extraTypeList = ['exception', 'promiseRejection'] as const;
type LogType = (typeof consoleTypeList)[number] | (typeof extraTypeList)[number];
type ConsoleType = (typeof consoleTypeList)[number];
type ConsoleMethod = (...args: Array<unknown>) => void;
type ConsoleArgs = Parameters<ConsoleMethod>;

interface ILogPayload {
  message: string;
  stack?: string;
}

export interface ILogEntry extends ILogPayload {
  type: LogType;
  timestamp: number;
  expanded?: boolean;
}

export class LogCaptureHandler {
  private readonly messageLengthLimit = 1000;

  private logs: Array<ILogEntry> = [];
  private listener?: (logs: Array<ILogEntry>) => void;
  private originalConsoleMethods: Map<ConsoleType, ConsoleMethod> = new Map();

  private readonly errorHandler: (e: ErrorEvent) => void;
  private readonly rejectionHandler: (e: PromiseRejectionEvent) => void;

  constructor() {
    this.errorHandler = this.handleErrorEvent.bind(this);
    this.rejectionHandler = this.handlePromiseRejectionEvent.bind(this);
  }

  public init(): void {
    this.captureConsoles();

    // Capture additional errors
    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.rejectionHandler);
  }

  public destroy(): void {
    window.removeEventListener('error', this.errorHandler);
    window.removeEventListener('unhandledrejection', this.rejectionHandler);

    for (const [type, original] of this.originalConsoleMethods) {
      console[type] = original;
    }

    this.setListener(undefined);
  }

  public setListener(listener?: (logs: Array<ILogEntry>) => void): void {
    this.listener = listener;
  }

  private captureConsoles(): void {
    for (const type of consoleTypeList) {
      const original = console[type].bind(console);
      this.originalConsoleMethods.set(type, original);

      console[type] = (...args: ConsoleArgs) => {
        const parsedArgs = this.parseArguments(args);
        this.captureLog(type, parsedArgs.message, parsedArgs.stack);
        this.listener?.([...this.logs]);
        original(...args);
      };
    }
  }

  private captureLog(type: LogType, message: string, stack?: string): void {
    this.logs.unshift({
      type,
      message,
      stack,
      timestamp: Date.now(),
    });
  }

  private parseArguments(args: ConsoleArgs): ILogPayload {
    const output: ILogPayload = {
      message: 'no error data',
    };

    // Go through arguments
    const messageParts: Array<string> = [];
    args.forEach((arg) => {
      let part: string;

      if (arg instanceof Error) {
        output.stack = arg.stack; // Capture stack if available
        part = arg.message;
      } else if (typeof arg === 'string') {
        part = arg;
      } else {
        try {
          part = JSON.stringify(arg);
        } catch {
          part = String(args);
        }
      }

      // If we have a part, add to layout
      if (part) {
        part = part.trim();
        part = part.length > this.messageLengthLimit ? `${part.substring(0, this.messageLengthLimit)}...` : part;
        messageParts.push(part);
      }
    });

    // If we have a parsed message, assign it
    const mergedMessage = messageParts.join(' ');
    if (mergedMessage) {
      output.message = mergedMessage;
    }

    // Return result
    return output;
  }

  private handleErrorEvent(e: ErrorEvent): void {
    this.captureLog('exception', `Unhandled Exception: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`);
  }

  private handlePromiseRejectionEvent(e: PromiseRejectionEvent): void {
    this.captureLog('promiseRejection', `Unhandled Promise Rejection: ${e.reason}`);
  }
}
