'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/app/actions/register/action';
import { useGameContext } from '@hooks/useGameContext';
import FormFields from './FormFields';
import Button from '@components/_core/Button/Button';

export default function RegistrationForm() {
  const router = useRouter();
  const { token, setUserName, setAlreadyRegistered } = useGameContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    const result = await register({ token: token!, name, email });

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setUserName(name);
    setAlreadyRegistered(true);
    router.push('/result');
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <FormFields />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering…' : 'Register'}
      </Button>
    </form>
  );
}
