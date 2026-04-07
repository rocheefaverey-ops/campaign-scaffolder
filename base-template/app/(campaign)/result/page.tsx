'use client';

import { useRouter } from 'next/navigation';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';

export default function ResultPage() {
  const router = useRouter();
  const { score } = useGameContext();

  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h2 className="font-brand text-2xl font-bold">Your score</h2>
        <p className="mt-4 text-6xl font-bold tabular-nums">{score ?? 0}</p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button onClick={() => router.push('{{NEXT_AFTER_RESULT}}')}>
          Continue
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.push('{{PLAY_AGAIN_ROUTE}}')}>
          Play again
        </Button>
      </div>
    </main>
  );
}
