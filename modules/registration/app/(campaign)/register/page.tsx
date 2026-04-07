'use client';

import { useRouter } from 'next/navigation';
import RegistrationForm from '@components/_modules/RegistrationForm/RegistrationForm';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-8">
      <div className="text-center">
        <h1 className="font-brand text-2xl font-bold">Register to save your score</h1>
        <p className="mt-2 text-sm opacity-60">
          Fill in your details to appear on the leaderboard.
        </p>
      </div>

      <RegistrationForm onSuccess={() => router.push('{{NEXT_AFTER_REGISTER}}')} />
    </main>
  );
}
