'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** Total countdown duration in seconds. */
  durationSec: number;
  /** Called once when the timer hits zero. */
  onExpire?:   () => void;
  /** Pause the countdown without unmounting (e.g. tutorial/pause overlay). */
  paused?:     boolean;
}

/**
 * Top-of-screen countdown overlay. Engine-agnostic — reads CAPE-driven
 * `settings.pages.game.timerSec` and `timerEnabled` at the page level, then
 * mounts this. The visual treatment matches the hero-page DNA: frosted ink
 * pill on the top edge with a lime accent stroke as time runs out.
 *
 * Engine modules (Unity / Phaser / R3F) can either:
 *   1. Replace gameplay/page.tsx and skip this entirely (engine handles its
 *      own timer), or
 *   2. Mount this and call onExpire to trigger their own end-of-game flow.
 */
export default function GameTimer({ durationSec, onExpire, paused = false }: Props) {
  const [remaining, setRemaining] = useState(durationSec);

  useEffect(() => {
    setRemaining(durationSec);
  }, [durationSec]);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) { onExpire?.(); return; }
    const t = window.setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [remaining, paused, onExpire]);

  // Color shifts to lime urgency in the last 25% of the run.
  const danger = remaining <= Math.max(5, Math.floor(durationSec * 0.25));

  return (
    <div className="game-timer" data-danger={danger || undefined} aria-live="polite">
      <span className="game-timer__label">Time</span>
      <span className="game-timer__value tabular-nums">{formatClock(remaining)}</span>
    </div>
  );
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
