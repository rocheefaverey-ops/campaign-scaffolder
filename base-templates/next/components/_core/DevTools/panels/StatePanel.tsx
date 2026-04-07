'use client';

import { useGameContext } from '@hooks/useGameContext';

/** Live dump of GameContext state */
export default function StatePanel() {
  const state = useGameContext();

  const displayKeys: Array<keyof typeof state> = [
    'token', 'userId', 'userName', 'alreadyRegistered',
    'sessionId', 'score', 'highscore', 'rank',
    'loading', 'gameIsReady', 'onboardingCompleted',
    'campaignStatus', 'platform', 'isMuted',
  ];

  return (
    <div className="space-y-1">
      {displayKeys.map((key) => {
        const val = state[key];
        return (
          <div key={key} className="flex justify-between gap-2">
            <span className="text-white/50">{key}</span>
            <span className="truncate text-right text-green-400">
              {val === null ? 'null' : String(val)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
