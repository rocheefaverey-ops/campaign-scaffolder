'use client';

import { useRouter } from 'next/navigation';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';

export default function OnboardingPage() {
  const router = useRouter();
  const { setLoading } = useGameContext();

  const handleStart = async () => {
    setLoading(true);
    // TODO: call complete-onboarding action, then navigate
    router.push('/gameplay');
  };

  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold font-brand">Welcome</h1>
      <p className="max-w-sm text-center opacity-70">
        Introduce the campaign here. Replace this with CAPE-driven copy.
      </p>
      <Button onClick={handleStart}>Start</Button>
    </main>
  );
}
