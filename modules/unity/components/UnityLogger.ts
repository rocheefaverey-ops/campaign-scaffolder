/**
 * UnityLogger — centralized structured logger for all Unity bridge activity.
 * Logs to console with color-coded prefixes and stores entries in a ring buffer
 * accessible via window.__unityLogs for external inspection.
 */

export type LogCategory =
    | 'lifecycle'   // init, load, destroy
    | 'progress'    // load progress updates
    | 'event'       // incoming events from Unity
    | 'message'     // outgoing SendMessage calls
    | 'error'       // errors and warnings
    | 'state'       // visibility / ready state changes
    | 'network'     // version.json / asset fetches
    | 'platform';   // device/platform detection

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface UnityLogEntry {
    id: number;
    timestamp: string;       // HH:MM:SS.mmm
    timestampMs: number;     // Date.now()
    category: LogCategory;
    level: LogLevel;
    message: string;
    data?: unknown;
}

const RING_BUFFER_SIZE = 500;
let _counter = 0;

const CATEGORY_COLORS: Record<LogCategory, string> = {
    lifecycle: '#4ade80',
    progress:  '#60a5fa',
    event:     '#f59e0b',
    message:   '#a78bfa',
    error:     '#f87171',
    state:     '#34d399',
    network:   '#38bdf8',
    platform:  '#fb923c',
};

function formatTimestamp(ms: number): string {
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const mmm = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${mmm}`;
}

function getBuffer(): UnityLogEntry[] {
    if (typeof window === 'undefined') return [];
    const w = window as Window & { __unityLogs?: UnityLogEntry[] };
    if (!w.__unityLogs) w.__unityLogs = [];
    return w.__unityLogs;
}

export function unityLog(
    category: LogCategory,
    level: LogLevel,
    message: string,
    data?: unknown
): UnityLogEntry {
    const ms = Date.now();
    const entry: UnityLogEntry = {
        id: ++_counter,
        timestamp: formatTimestamp(ms),
        timestampMs: ms,
        category,
        level,
        message,
        data,
    };

    const buf = getBuffer();
    buf.push(entry);
    if (buf.length > RING_BUFFER_SIZE) buf.shift();

    const color = CATEGORY_COLORS[category];
    const prefix = `%c[Unity:${category}]%c`;
    const style = `color:${color};font-weight:bold`;
    const reset = 'color:inherit;font-weight:normal';

    if (level === 'error') {
        data !== undefined
            ? console.error(prefix, style, reset, message, data)
            : console.error(prefix, style, reset, message);
    } else if (level === 'warn') {
        data !== undefined
            ? console.warn(prefix, style, reset, message, data)
            : console.warn(prefix, style, reset, message);
    } else if (level === 'debug') {
        data !== undefined
            // eslint-disable-next-line no-console
            ? console.debug(prefix, style, reset, message, data)
            // eslint-disable-next-line no-console
            : console.debug(prefix, style, reset, message);
    }

    return entry;
}

export const uLog = {
    lifecycle: (msg: string, data?: unknown) => unityLog('lifecycle', 'info',  msg, data),
    progress:  (msg: string, data?: unknown) => unityLog('progress',  'debug', msg, data),
    event:     (msg: string, data?: unknown) => unityLog('event',     'info',  msg, data),
    message:   (msg: string, data?: unknown) => unityLog('message',   'info',  msg, data),
    error:     (msg: string, data?: unknown) => unityLog('error',     'error', msg, data),
    warn:      (msg: string, data?: unknown) => unityLog('error',     'warn',  msg, data),
    state:     (msg: string, data?: unknown) => unityLog('state',     'info',  msg, data),
    network:   (msg: string, data?: unknown) => unityLog('network',   'info',  msg, data),
    platform:  (msg: string, data?: unknown) => unityLog('platform',  'info',  msg, data),
};

export function getUnityLogs(): UnityLogEntry[] {
    return [...getBuffer()];
}

export function clearUnityLogs(): void {
    const buf = getBuffer();
    buf.length = 0;
    _counter = 0;
}

export function exportUnityLogs(): string {
    return JSON.stringify(getBuffer(), null, 2);
}
