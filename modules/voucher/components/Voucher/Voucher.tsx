'use client';

import { useGameContext } from '@hooks/useGameContext';

interface Props {
  onClaim?:    () => void;
  /** Render a QR code linking to the voucher code. Default true. */
  showQr?:     boolean;
  /** Truncate / pad the displayed code to this many characters. 0 = use as-is. Default 0. */
  codeLength?: number;
}

/**
 * Voucher — displays the reward code for the player.
 *
 * The voucher code comes from GameContext.voucherCode (set by the end-session action).
 * If no code is present, show a generic reward message until the API returns one.
 *
 * QR rendering uses the public api.qrserver.com endpoint so the scaffolder
 * works out of the box without a JS dependency. For production, swap the
 * <img> for a self-hosted lib (e.g. `qrcode`) or your own renderer.
 */
export default function Voucher({ onClaim, showQr = true, codeLength = 0 }: Props) {
  const { voucherCode } = useGameContext() as { voucherCode?: string };

  // Display-side formatting: if codeLength is set and the actual code is
  // shorter, pad with em-dashes; if longer, truncate. Underlying voucherCode
  // (used for redemption / QR) is NEVER mutated.
  const display = formatCode(voucherCode, codeLength);
  const qrUrl   = voucherCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(voucherCode)}`
    : null;

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="campaign-kicker">Your reward code</p>

      <div
        className="rounded-2xl px-8 py-5"
        style={{
          background: 'var(--color-primary)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-lime)',
        }}
      >
        <p className="text-3xl font-black tracking-[0.24em] tabular-nums">{display}</p>
      </div>

      {showQr && qrUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl}
          alt={`QR code for voucher ${voucherCode}`}
          width={140}
          height={140}
          className="rounded-xl bg-white p-2"
        />
      )}

      <p className="max-w-xs text-center text-sm text-[var(--text-secondary)]">
        Show this code at the register to redeem your reward.
      </p>

      {onClaim && (
        <button
          onClick={onClaim}
          className="btn-ink mt-2 rounded-full px-8 py-3 text-sm font-bold uppercase tracking-wider"
        >
          Claim reward
        </button>
      )}
    </div>
  );
}

function formatCode(code: string | undefined, len: number): string {
  if (!code) return '——';
  if (!len || len <= 0) return code;
  if (code.length === len) return code;
  if (code.length > len)  return code.slice(0, len);
  return code.padEnd(len, '—');
}
