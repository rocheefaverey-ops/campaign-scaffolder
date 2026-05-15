'use client';

import { useState } from 'react';
import { useGameBridge } from '@hooks/useGameBridge';

/** Game Bridge message log + SendMessage sandbox */
export default function BridgePanel() {
  const [objectName, setObjectName] = useState('WebService');
  const [methodName, setMethodName] = useState('SetData');
  const [data, setData] = useState('{}');
  const [log, setLog] = useState<string[]>([]);

  let bridge: ReturnType<typeof useGameBridge> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    bridge = useGameBridge();
  } catch {
    // Bridge not mounted yet
  }

  const send = () => {
    if (!bridge) {
      setLog((l) => [`[${new Date().toISOString()}] Bridge not ready`, ...l]);
      return;
    }
    bridge.sendMessage(objectName, methodName, data);
    setLog((l) => [
      `[${new Date().toISOString()}] → ${objectName}.${methodName}(${data})`,
      ...l,
    ]);
  };

  return (
    <div className="space-y-3">
      {!bridge && (
        <p className="text-yellow-400">⚠ Game bridge not active</p>
      )}
      <div className="space-y-1">
        <input
          className="w-full rounded bg-white/10 px-2 py-1 text-white"
          value={objectName}
          onChange={(e) => setObjectName(e.target.value)}
          placeholder="ObjectName"
        />
        <input
          className="w-full rounded bg-white/10 px-2 py-1 text-white"
          value={methodName}
          onChange={(e) => setMethodName(e.target.value)}
          placeholder="MethodName"
        />
        <textarea
          className="w-full rounded bg-white/10 px-2 py-1 text-white"
          value={data}
          onChange={(e) => setData(e.target.value)}
          rows={2}
          placeholder="JSON data"
        />
        <button
          onClick={send}
          className="w-full rounded bg-white/20 py-1 hover:bg-white/30"
        >
          Send
        </button>
      </div>
      <div className="space-y-1 text-white/50">
        {log.slice(0, 10).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
