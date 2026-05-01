'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/app/actions/register/action';
import { useGameContext } from '@hooks/useGameContext';
import FormInput from './FormInput';
import Optin from './Optin';
import Button from '@components/_core/Button/Button';

// ─── Validation helpers ────────────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function required(v: string) { return v.trim().length > 0 ? null : 'This field is required'; }
function validEmail(v: string) { return EMAIL_RE.test(v) ? null : 'Enter a valid email address'; }

// ─── Form state ────────────────────────────────────────────────────────────

interface FormValues {
  firstName: string;
  infix: string;
  lastName: string;
  email: string;
  optin18: boolean;
  optinTerms: boolean;
  optinPrivacy: boolean;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL: FormValues = {
  firstName: '',
  infix: '',
  lastName: '',
  email: '',
  optin18: false,
  optinTerms: false,
  optinPrivacy: false,
};

function validate(values: FormValues, requireOptIns: boolean): FormErrors {
  const errors: FormErrors = {};
  const firstName = required(values.firstName);
  if (firstName) errors.firstName = firstName;
  const lastName = required(values.lastName);
  if (lastName) errors.lastName = lastName;
  const email = required(values.email) ?? validEmail(values.email);
  if (email) errors.email = email;
  if (requireOptIns) {
    if (!values.optin18) errors.optin18 = 'You must confirm you are 18 or older';
    if (!values.optinTerms) errors.optinTerms = 'You must accept the terms';
    if (!values.optinPrivacy) errors.optinPrivacy = 'You must accept the privacy policy';
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────

interface Labels {
  firstName?:       string;
  infix?:           string;
  lastName?:        string;
  email?:           string;
  optIn1?:          string;
  optIn2?:          string;
  cta?:             string;
  successHeadline?: string;
  successBody?:     string;
}

interface Props {
  labels?:        Labels;
  /** Hide the Dutch "infix" field (e.g. "van", "de"). Default true. */
  showInfix?:     boolean;
  /** When true (default) all 3 opt-ins are required to submit. Set false to make them advisory. */
  requireOptIns?: boolean;
  onSuccess?:     () => void;
}

export default function RegistrationForm({ labels = {}, showInfix = true, requireOptIns = true, onSuccess }: Props) {
  const router = useRouter();
  const { token, setUserName, setAlreadyRegistered } = useGameContext();

  const [values, setValues] = useState<FormValues>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (submitted) setErrors(validate(next, requireOptIns));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(values, requireOptIns);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsSubmitting(true);
    setServerError(null);

    const result = await register({
      token: token!,
      firstName: values.firstName,
      infix: values.infix || undefined,
      lastName: values.lastName,
      email: values.email,
      optin18: values.optin18,
      optinTerms: values.optinTerms,
      optinPrivacy: values.optinPrivacy,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setUserName(`${values.firstName} ${values.lastName}`.trim());
    setAlreadyRegistered(true);
    if (onSuccess) onSuccess();
    else router.push('{{NEXT_AFTER_REGISTER}}');
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-sm flex-col gap-5">

      {/* Name row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <FormInput
            label={labels.firstName ?? 'First name'}
            name="firstName"
            autoComplete="given-name"
            required
            value={values.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            error={errors.firstName}
            showValid={submitted && !errors.firstName && !!values.firstName}
          />
        </div>
        {showInfix && (
          <div className="w-20">
            <FormInput
              label={labels.infix ?? 'Infix'}
              name="infix"
              autoComplete="additional-name"
              placeholder="van"
              value={values.infix}
              onChange={(e) => setField('infix', e.target.value)}
            />
          </div>
        )}
      </div>

      <FormInput
        label={labels.lastName ?? 'Last name'}
        name="lastName"
        autoComplete="family-name"
        required
        value={values.lastName}
        onChange={(e) => setField('lastName', e.target.value)}
        error={errors.lastName}
        showValid={submitted && !errors.lastName && !!values.lastName}
      />

      <FormInput
        label={labels.email ?? 'Email'}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={values.email}
        onChange={(e) => setField('email', e.target.value)}
        error={errors.email}
        showValid={submitted && !errors.email && EMAIL_RE.test(values.email)}
      />

      <div className="flex flex-col gap-3">
        <Optin
          id="optin18"
          name="optin18"
          label={labels.optIn1 ?? 'I confirm that I am 18 years of age or older'}
          required={requireOptIns}
          checked={values.optin18}
          onChange={(v) => setField('optin18', v)}
          error={errors.optin18}
        />

        <Optin
          id="optinTerms"
          name="optinTerms"
          label={labels.optIn2 ?? 'I accept the {{terms}}'}
          links={[{ placeholder: '{{terms}}', url: '/terms', label: 'Terms & Conditions' }]}
          required={requireOptIns}
          checked={values.optinTerms}
          onChange={(v) => setField('optinTerms', v)}
          error={errors.optinTerms}
        />

        <Optin
          id="optinPrivacy"
          name="optinPrivacy"
          label="I have read and accept the {{privacy}}"
          links={[{ placeholder: '{{privacy}}', url: '/privacy', label: 'Privacy Policy' }]}
          required={requireOptIns}
          checked={values.optinPrivacy}
          onChange={(v) => setField('optinPrivacy', v)}
          error={errors.optinPrivacy}
        />
      </div>

      {serverError && (
        <p
          className="rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--color-statusRed) 10%, transparent)',
            color: 'var(--color-statusRed)',
            border: '1px solid color-mix(in srgb, var(--color-statusRed) 28%, transparent)',
          }}
          role="alert"
        >
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? 'Registering…' : (labels.cta ?? 'Register')}
      </Button>
    </form>
  );
}
