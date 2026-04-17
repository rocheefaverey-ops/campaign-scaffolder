'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText } from '@utils/getCapeData';
import RegistrationForm from '@components/_modules/RegistrationForm/RegistrationForm';

export default function RegisterPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

  const headline = getCapeText(capeData, 'copy.register.headline', 'Register');
  const subline  = getCapeText(capeData, 'copy.register.subline',  '');

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-8">
      <div className="text-center">
        <h1 className="font-brand text-2xl font-bold">{headline}</h1>
        {subline && (
          <p className="mt-2 text-sm opacity-60">{subline}</p>
        )}
      </div>

      <RegistrationForm onSuccess={() => router.push('{{NEXT_AFTER_REGISTER}}')} />
    </main>
  );
}
