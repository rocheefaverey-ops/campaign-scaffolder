'use client';

import { useRouter } from 'next/navigation';
import Voucher from '@components/_modules/Voucher/Voucher';
import Button from '@components/_core/Button/Button';

export default function VoucherPage() {
  const router = useRouter();

  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <h1 className="font-brand text-2xl font-bold">You won!</h1>

      <Voucher />

      <Button variant="ghost" size="sm" onClick={() => router.push('{{NEXT_AFTER_VOUCHER}}')}>
        Done
      </Button>
    </main>
  );
}
