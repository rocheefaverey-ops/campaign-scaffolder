'use client';

import { useState } from 'react';
import StatePanel from './panels/StatePanel';
import ActionsPanel from './panels/ActionsPanel';
import BridgePanel from './panels/BridgePanel';

type ActivePanel = 'state' | 'actions' | 'bridge';

const isVisible =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === 'true';

/**
 * Dev-only floating panel.
 * Gated behind env check — zero JS shipped to production.
 */
export default function DevTools() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ActivePanel>('state');

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-mono text-xs">
      {open && (
        <div className="mb-2 w-80 rounded-lg border border-white/20 bg-black/90 text-white shadow-2xl backdrop-blur-sm">
          {/* Tab bar */}
          <div className="flex border-b border-white/10">
            {(['state', 'actions', 'bridge'] as ActivePanel[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`flex-1 py-2 capitalize transition-colors ${
                  active === tab
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="max-h-96 overflow-y-auto p-3">
            {active === 'state' && <StatePanel />}
            {active === 'actions' && <ActionsPanel />}
            {active === 'bridge' && <BridgePanel />}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/80 text-white shadow-lg ring-1 ring-white/20 hover:bg-black"
        title="Toggle DevTools"
      >
        {open ? '✕' : '⚙'}
      </button>
    </div>
  );
}
