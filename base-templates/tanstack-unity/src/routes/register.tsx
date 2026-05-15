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

  const countryOptions = { NL: 'Netherlands', BE: 'Belgium', DE: 'Germany', FR: 'France', UK: 'United Kingdom', US: 'United States' };

  // TODO: Make cape fields for password
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
      type: 'password',
      name: 'password',
      label: 'Password',
      error: 'Please enter a valid password',
      placeholder: '...',
      validator: z.string().min(8).max(255),
      defaultValue: '',
      bottomLink: {
        label: 'Forgot password?',
        link: 'https://google.nl',
      },
    },
    {
      type: 'password',
      name: 'repeatPassword',
      label: 'Repeat Password',
      error: 'Please enter a valid password',
      placeholder: '...',
      validator: z.string().min(8).max(255),
      defaultValue: '',
      linkTo: 'password',
    },
    {
      type: 'select',
      name: 'country',
      label: copy.country.label,
      error: copy.country.error,
      options: countryOptions,
      validator: z.string().refine((val) => val in countryOptions),
      placeholder: '-',
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
    {
      type: 'checkbox',
      name: 'optInTwo',
      label: copy.optInTwo.label,
      validator: z.boolean(),
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
        router.navigate({ to: '/launch' });
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
      <StyledButton linkOptions={{ to: '/launch' }} marginTop={8} alternate>Back</StyledButton>
    </PageContainer>
  );
}
