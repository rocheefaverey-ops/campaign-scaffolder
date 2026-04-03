'use client';

import { useGameContext } from '@hooks/useGameContext';
import QRCode from './QRCode';

interface VoucherProps {
  code?: string;
  description?: string;
}

export default function Voucher({ code, description }: VoucherProps) {
  const { userName, score } = useGameContext();

  const voucherCode = code ?? `CAMPAIGN-${score}-${Date.now().toString(36).toUpperCase()}`;

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/20 bg-white/5 p-8">
      <p className="text-lg font-brand font-bold">
        {userName ? `Well done, ${userName}!` : 'Your reward'}
      </p>

      {description && (
        <p className="text-center text-sm opacity-70">{description}</p>
      )}

      <QRCode value={voucherCode} size={160} />

      <div className="rounded-lg bg-white/10 px-6 py-3 font-mono text-xl tracking-widest">
        {voucherCode}
      </div>

      <p className="text-center text-xs opacity-40">
        Show this code at the point of sale to redeem your reward.
      </p>
    </div>
  );
}
