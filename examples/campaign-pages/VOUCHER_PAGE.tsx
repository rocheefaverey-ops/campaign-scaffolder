'use client';

import { useState } from 'react';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeImage } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

/**
 * Example Voucher Page
 * Displays QR code and voucher code for rewards
 */
export default function VoucherPage() {
  const { capeData } = useCapeData();
  const [copied, setCopied] = useState(false);

  const title = getCapeText(capeData, 'general.voucher.title', 'You won!');
  const subtitle = getCapeText(capeData, 'general.voucher.subtitle', 'Here is your reward');
  const voucherCode = 'LIVEWALL-2024-ABC123';
  const ctaLabel = getCapeText(capeData, 'general.voucher.ctaLabel', 'Continue');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(voucherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <h1 className="text-3xl font-black text-white">{title}</h1>
        {subtitle && (
          <p className="max-w-[260px] text-sm leading-relaxed opacity-60">{subtitle}</p>
        )}
      </div>

      {/* QR Code & Voucher */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center justify-center">
        {/* QR Code Placeholder */}
        <div
          className="mb-8 h-48 w-48 rounded-lg bg-white p-4"
          style={{ animation: 'scaleIn 0.4s ease both' }}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <rect width="100" height="100" fill="white" />
            <rect x="10" y="10" width="30" height="30" fill="black" />
            <rect x="10" y="60" width="30" height="30" fill="black" />
            <rect x="60" y="10" width="30" height="30" fill="black" />
            <rect x="30" y="30" width="10" height="10" fill="black" />
            <rect x="30" y="70" width="10" height="10" fill="black" />
            <rect x="50" y="40" width="20" height="20" fill="black" />
          </svg>
        </div>

        {/* Voucher Code */}
        <div className="w-full max-w-xs rounded-lg bg-white/5 p-4 border border-white/10">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-2">
            Voucher Code
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-lg font-mono font-bold text-white break-all">
              {voucherCode}
            </code>
            <button
              onClick={handleCopyCode}
              className="shrink-0 px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <p className="mt-6 max-w-xs text-center text-xs opacity-60">
          Show this code at checkout or use the QR code to redeem your reward
        </p>
      </div>

      {/* CTA */}
      <div className="px-6 pb-8 pt-4">
        <Button className="w-full" size="lg">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
