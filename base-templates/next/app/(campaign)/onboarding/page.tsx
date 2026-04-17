'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

const STEP_PATHS = [
  { title: 'copy.onboarding.step1Title', body: 'copy.onboarding.step1Body' },
  { title: 'copy.onboarding.step2Title', body: 'copy.onboarding.step2Body' },
  { title: 'copy.onboarding.step3Title', body: 'copy.onboarding.step3Body' },
];

const DEFAULT_STEPS = [
  { title: 'Step one',   body: 'Replace with instruction step one from CAPE.' },
  { title: 'Step two',   body: 'Replace with instruction step two from CAPE.' },
  { title: 'Step three', body: 'Replace with instruction step three from CAPE.' },
];

export default function OnboardingPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

  const title    = getCapeText(capeData, 'copy.onboarding.title',    '[copy.onboarding.title]');
  const subtitle = getCapeText(capeData, 'copy.onboarding.subtitle', '');
  const ctaLabel = getCapeText(capeData, 'copy.onboarding.ctaLabel', '[copy.onboarding.ctaLabel]');

  const steps = STEP_PATHS.map((paths, i) => ({
    title: getCapeText(capeData, paths.title, DEFAULT_STEPS[i].title),
    body:  getCapeText(capeData, paths.body,  DEFAULT_STEPS[i].body),
  }));

  return (
    <div className="flex h-full flex-col">

      {/* Scrollable content area */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-4 pt-8">

        {/* Page heading */}
        <div
          className="mb-8 flex flex-col items-center gap-2 text-center"
          style={{ animation: 'fadeIn 0.4s ease both' }}
        >
          <h1 className="text-3xl font-black text-white">{title}</h1>
          {subtitle && (
            <p className="max-w-[260px] text-sm leading-relaxed opacity-60">{subtitle}</p>
          )}
        </div>

        {/* Instruction steps */}
        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl p-4"
              style={{
                background: 'rgba(255,255,255,0.06)',
                animation: `fadeIn 0.4s ${0.1 + i * 0.08}s ease both`,
              }}
            >
              {/* Step number bubble */}
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {i + 1}
              </span>

              {/* Step copy */}
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-white">{step.title}</p>
                <p className="text-sm leading-relaxed opacity-60">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky CTA pinned to bottom — HaasF1 pattern */}
      <div
        className="flex flex-col gap-6 items-center px-6 pb-8 pt-20"
        style={{ animation: 'fadeIn 0.4s 0.4s ease both' }}
      >
        <Button
          className="w-full"
          size="lg"
          onClick={() => router.push('{{NEXT_AFTER_ONBOARDING}}')}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
