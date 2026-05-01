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
  const subline  = getCapeText(capeData, 'copy.leaderboard.subline',  '');
  const kicker   = getCapeText(capeData, 'copy.leaderboard.kicker',   'Ranking');
  const ctaDone  = getCapeText(capeData, 'copy.leaderboard.ctaDone',  'Done');

  return (
    <div className="campaign-screen">
      <div className="campaign-image-wash" />

      <div className="campaign-shell">
        <section className="campaign-stack" style={{ animation: 'fadeIn 0.4s ease both' }}>
          <p className="campaign-kicker">{kicker}</p>
          <h1 className="campaign-title campaign-title--compact">{headline}</h1>
          {subline && <p className="campaign-copy">{subline}</p>}
        </section>

        <section
          className="campaign-panel campaign-panel--strong flex-1 min-h-0 p-3 sm:p-4"
          style={{ animation: 'fadeIn 0.4s 0.1s ease both' }}
        >
          <Leaderboard />
        </section>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.4s 0.2s ease both' }}>
          <Button className="w-full" size="lg" onClick={() => router.push('{{NEXT_AFTER_LEADERBOARD}}')}>
            {ctaDone}
          </Button>
        </div>
      </div>
    </div>
  );
}
