import { createFileRoute, useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import styles from './register.module.scss';
import type { IFormData } from '~/interfaces/form/IFormData.ts';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { DynamicForm } from '~/components/forms/DynamicForm.tsx';
import { isProduction, sleep } from '~/utils/Helper.ts';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadRegisterData } from '~/loaders/RegisterLoader.ts';

export const Route = createFileRoute('/register')({
  component: Register,
  loader: async ({ context }) => await loadRegisterData(context.language),
});


function Register() {
  const { copy } = Route.useLoaderData();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [error, setError] = useState<string>('');

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
        router.navigate({ to: '/landing' });
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
      <StyledButton linkOptions={{ to: '/result' }} marginTop={8} alternate>Back</StyledButton>
    </PageContainer>
  );
}
