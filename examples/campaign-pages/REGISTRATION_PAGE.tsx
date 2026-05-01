'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

/**
 * Example Registration Page
 * 
 * Features:
 * - Form validation (name, email, optional marketing opt-in)
 * - Error states
 * - Loading state
 * - CAPE data integration
 */
export default function RegistrationPage() {
  const router = useRouter();
  const { capeData } = useCapeData();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    acceptTerms: false,
    acceptMarketing: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = getCapeText(capeData, 'general.register.title', 'Register');
  const subtitle = getCapeText(capeData, 'general.register.subtitle', 'Join the game');
  const ctaLabel = getCapeText(capeData, 'general.register.ctaLabel', 'Play');
  const fieldNameLabel = getCapeText(capeData, 'general.register.fieldName', 'Your name');
  const fieldEmailLabel = getCapeText(capeData, 'general.register.fieldEmail', 'Email address');
  const checkboxTerms = getCapeText(capeData, 'general.register.checkboxTerms', 'I accept the terms');
  const checkboxMarketing = getCapeText(capeData, 'general.register.checkboxMarketing', 'Send me updates');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.acceptTerms) {
      newErrors.terms = 'You must accept the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Call server action to save registration
      // const response = await submitRegistration(formData);
      // Store user data in context
      router.push('/gameplay');
    } catch (error) {
      setErrors({ form: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex flex-col items-center gap-2 px-6 py-8 text-center"
        style={{ animation: 'fadeIn 0.4s ease both' }}
      >
        <h1 className="text-3xl font-black text-white">{title}</h1>
        {subtitle && (
          <p className="max-w-[260px] text-sm leading-relaxed opacity-60">{subtitle}</p>
        )}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="no-scrollbar flex-1 overflow-y-auto px-6 pb-8"
        style={{ animation: 'fadeIn 0.4s 0.1s ease both' }}
      >
        {/* Form error */}
        {errors.form && (
          <div className="mb-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
            {errors.form}
          </div>
        )}

        {/* Name field */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-white mb-2">
            {fieldNameLabel}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full"
            placeholder="John Doe"
            disabled={isSubmitting}
          />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
        </div>

        {/* Email field */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-white mb-2">
            {fieldEmailLabel}
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full"
            placeholder="john@example.com"
            disabled={isSubmitting}
          />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              disabled={isSubmitting}
              className="mt-1"
            />
            <span className="text-sm">{checkboxTerms}</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.acceptMarketing}
              onChange={(e) => setFormData({ ...formData, acceptMarketing: e.target.checked })}
              disabled={isSubmitting}
              className="mt-1"
            />
            <span className="text-sm">{checkboxMarketing}</span>
          </label>
        </div>

        {errors.terms && <p className="text-xs text-red-400 mb-4">{errors.terms}</p>}
      </form>

      {/* CTA */}
      <div
        className="px-6 pb-8 pt-4"
        style={{ animation: 'fadeIn 0.4s 0.3s ease both' }}
      >
        <Button
          className="w-full"
          size="lg"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Submitting...' : ctaLabel}
        </Button>
      </div>
    </div>
  );
}
