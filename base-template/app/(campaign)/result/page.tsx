'use client';

import { useRouter } from 'next/navigation';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';

export default function ResultPage() {
  const router = useRouter();
  const { score, sessionId } = useGameContext();

  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <h2 className="text-2xl font-bold font-brand">Your score</h2>
      <p className="text-6xl font-bold">{score ?? 0}</p>

      {/* TODO: wire up /register or /leaderboard modules here */}
      <Button onClick={() => router.push('/onboarding')} variant="secondary">
        Play again
      </Button>
    </main>
  );
}
