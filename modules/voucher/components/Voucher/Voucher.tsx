'use client';

import { useGameContext } from '@hooks/useGameContext';

interface Props {
  onClaim?: () => void;
}

/**
 * Voucher — displays the reward code for the player.
 *
 * The voucher code comes from GameContext.voucherCode (set by the end-session action).
 * If no code is present, show a generic reward message until the API returns one.
 */
export default function Voucher({ onClaim }: Props) {
  const { voucherCode } = useGameContext() as { voucherCode?: string };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm opacity-60">Your reward code</p>

      <div className="rounded-xl border-2 border-dashed border-current px-8 py-4">
        <p className="font-brand text-3xl font-bold tracking-widest">
          {voucherCode ?? '——'}
        </p>
      </div>

      <p className="max-w-xs text-center text-xs opacity-50">
        Show this code at the register to redeem your reward.
      </p>

      {onClaim && (
        <button
          onClick={onClaim}
          className="mt-2 rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold"
        >
          Claim reward
        </button>
      )}
    </div>
  );
}
