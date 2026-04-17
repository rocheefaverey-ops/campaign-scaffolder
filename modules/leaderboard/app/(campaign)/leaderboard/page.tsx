'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText } from '@utils/getCapeData';
import Leaderboard from '@components/_modules/Leaderboard/Leaderboard';
import Button from '@components/_core/Button/Button';

export default function LeaderboardPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

  const headline = getCapeText(capeData, 'copy.leaderboard.headline', 'Leaderboard');
  const ctaDone  = getCapeText(capeData, 'copy.leaderboard.ctaDone',  'Done');

  return (
    <main className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-brand text-2xl font-bold">{headline}</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push('{{NEXT_AFTER_LEADERBOARD}}')}>
          {ctaDone}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Leaderboard />
      </div>
    </main>
  );
}
