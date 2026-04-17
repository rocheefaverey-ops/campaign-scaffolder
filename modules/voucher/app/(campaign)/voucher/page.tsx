'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText } from '@utils/getCapeData';
import Voucher from '@components/_modules/Voucher/Voucher';
import Button from '@components/_core/Button/Button';

export default function VoucherPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

  const headline = getCapeText(capeData, 'copy.voucher.headline', 'Your voucher');
  const ctaLabel = getCapeText(capeData, 'copy.voucher.cta',      'Done');

  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <h1 className="font-brand text-2xl font-bold">{headline}</h1>

      <Voucher />

      <Button variant="ghost" size="sm" onClick={() => router.push('{{NEXT_AFTER_VOUCHER}}')}>
        {ctaLabel}
      </Button>
    </main>
  );
}
