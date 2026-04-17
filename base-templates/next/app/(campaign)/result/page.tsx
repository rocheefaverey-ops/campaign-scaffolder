'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeImage } from '@utils/getCapeData';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';

export default function ResultPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();
  const { score, rank, userName } = useGameContext();

  const bgUrl      = getCapeImage(capeData, 'general.result.background');
  const title      = getCapeText(capeData,  'copy.result.title',      '[copy.result.title]');
  const scoreLabel = getCapeText(capeData,  'copy.result.scoreLabel', '[copy.result.scoreLabel]');
  const rankLabel  = getCapeText(capeData,  'copy.result.rankLabel',  '[copy.result.rankLabel]');
  const ctaLabel   = getCapeText(capeData,  'copy.result.ctaLabel',   '[copy.result.ctaLabel]');
  const retryLabel = getCapeText(capeData,  'copy.result.retryLabel', '[copy.result.retryLabel]');

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">

      {/* Background image with overlay */}
      {bgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" aria-hidden />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Content area — center score display */}
      <div className="relative flex h-full flex-col items-center justify-center px-6 py-12">

        {/* Title + player name */}
        <div
          className="flex flex-col items-center gap-1 text-center"
          style={{ animation: 'fadeIn 0.4s ease both' }}
        >
          <p className="text-sm font-semibold uppercase tracking-widest opacity-50">{title}</p>
          {userName && (
            <p className="text-lg font-bold opacity-80">{userName}</p>
          )}
        </div>

        {/* Score + rank */}
        <div
          className="mt-12 flex flex-col items-center gap-5"
          style={{ animation: 'fadeIn 0.4s 0.1s ease both' }}
        >
          {/* Score number */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-50">{scoreLabel}</p>
            <p
              className="text-8xl font-black tabular-nums leading-none"
              style={{ color: 'var(--color-primary)' }}
            >
              {(score ?? 0).toLocaleString()}
            </p>
          </div>

          {/* Rank badge (shown only when rank is known) */}
          {rank != null && (
            <div
              className="flex items-center gap-3 rounded-full px-5 py-2"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest opacity-50">
                {rankLabel}
              </span>
              <span className="text-lg font-black" style={{ color: 'var(--color-primary)' }}>
                #{rank}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTAs — absolute positioning following HaasF1 pattern */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full flex flex-col gap-6 items-center px-6 pb-8 pt-20"
        style={{ animation: 'fadeIn 0.4s 0.25s ease both' }}
      >
        <Button
          className="w-full"
          size="lg"
          onClick={() => router.push('{{NEXT_AFTER_RESULT}}')}
        >
          {ctaLabel}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('{{PLAY_AGAIN_ROUTE}}')}
        >
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}
