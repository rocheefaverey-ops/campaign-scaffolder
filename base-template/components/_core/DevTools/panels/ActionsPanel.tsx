'use client';

import { useState, useCallback } from 'react';

export interface ActionLogEntry {
  id: string;
  name: string;
  success: boolean;
  durationMs: number;
  timestamp: string;
}

// Module-level log store so it survives component re-mounts
const actionLog: ActionLogEntry[] = [];
let subscribers: Array<() => void> = [];

export function logAction(entry: Omit<ActionLogEntry, 'id'>) {
  actionLog.unshift({
    ...entry,
    id: Math.random().toString(36).slice(2),
  });
  if (actionLog.length > 50) actionLog.pop();
  subscribers.forEach((fn) => fn());
}

/** Display server action call history */
export default function ActionsPanel() {
  const [, forceUpdate] = useState(0);

  // Subscribe to log updates
  useCallback(() => {
    const refresh = () => forceUpdate((n) => n + 1);
    subscribers.push(refresh);
    return () => {
      subscribers = subscribers.filter((s) => s !== refresh);
    };
  }, [])();

  if (actionLog.length === 0) {
    return <p className="text-white/40">No actions logged yet.</p>;
  }

  return (
    <div className="space-y-2">
      {actionLog.map((entry) => (
        <div key={entry.id} className="border-b border-white/10 pb-2">
          <div className="flex justify-between">
            <span className={entry.success ? 'text-green-400' : 'text-red-400'}>
              {entry.success ? '✓' : '✗'} {entry.name}
            </span>
            <span className="text-white/40">{entry.durationMs}ms</span>
          </div>
          <div className="text-white/30">{entry.timestamp}</div>
        </div>
      ))}
    </div>
  );
}
