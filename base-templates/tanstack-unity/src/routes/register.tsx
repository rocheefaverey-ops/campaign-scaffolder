import { createFileRoute, useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { useEffect, useState, useTransition } from 'react';
import styles from './register.module.scss';
import type { IFormData } from '~/interfaces/form/IFormData.ts';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { DynamicForm } from '~/components/forms/DynamicForm.tsx';
import { isProduction, sleep } from '~/utils/Helper.ts';
import { loadRegisterData } from '~/loaders/RegisterLoader.ts';

export const Route = createFileRoute('/register')({
  component: Register,
  loader: async ({ context }) => await loadRegisterData(context.language),
});

const REGISTERED_KEY = 'lw_registered_{{CAPE_ID}}';
const FLOW_RULE = '{{FLOW_RULE_REGISTER}}';
const SKIP_ROUTE = '{{FLOW_SKIP_REGISTER}}';
const isRegistered = () => typeof window !== 'undefined' && window.localStorage.getItem(REGISTERED_KEY) === '1';
const markRegistered = () => { try { window.localStorage.setItem(REGISTERED_KEY, '1'); } catch { /* private mode */ } };

function Register() {
  const { copy } = Route.useLoaderData();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [error, setError] = useState<string>('');

  // Skip the registration page once the user has registered for this campaign.
  useEffect(() => {
    if (FLOW_RULE === 'skip-if-registered' && isRegistered()) {
      router.navigate({ to: SKIP_ROUTE as never, replace: true });
    }
  }, []);

  const formData: IFormData = [
    {
      type: 'text',
      name: 'name',
      label: copy.name.label,
      error: copy.name.error,
      placeholder: copy.name.placeholder,
      validator: z.string().min(1).max(255),
      defaultValue: '',
    },
    {
      type: 'email',
      name: 'email',
      label: copy.email.label,
      error: copy.email.error,
      placeholder: copy.email.placeholder,
      validator: z.email().max(255),
      defaultValue: '',
    },
    {
      type: 'checkbox',
      name: 'optInOne',
      label: copy.optInOne.label,
      error: copy.optInOne.error,
      link: copy.optInOne.link,
      validator: z.literal(true),
      defaultValue: false,
    },
  ];

  function processForm(data: Record<string, unknown>) {
    if (!isProduction()) {
      console.info('Form submitted:', data);
    }

    // Simulate form processing and navigation (exception will never happen of course, but this is just to demonstrate error handling)
    startTransition(async () => {
      setError('');

      try {
        await sleep(2000);
        if (FLOW_RULE === 'skip-if-registered') markRegistered();
        router.navigate({ to: '{{NEXT_AFTER_REGISTER}}' as never, replace: true });
      } catch (e) {
        console.error('Error during form submission:', e);
        setError(copy.genericError);
      }
    });
  }

  return (
    <PageContainer className={styles.register}>
      <StyledText type={'title'} alternate>{copy.title}</StyledText>
      <StyledText type={'description'} marginTop={8} alternate>{copy.description}</StyledText>

      <DynamicForm className={styles.form} formData={formData} buttonText={copy.button} errorText={error} loading={isPending} onSubmit={(data) => processForm(data)} />
    </PageContainer>
  );
}
