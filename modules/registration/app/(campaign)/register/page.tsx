'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeBoolean } from '@utils/getCapeData';
import RegistrationForm from '@components/_modules/RegistrationForm/RegistrationForm';

export default function RegisterPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

  const headline = getCapeText(capeData, 'copy.register.headline', 'Register');
  const subline  = getCapeText(capeData, 'copy.register.subline',  '');
  const cta      = getCapeText(capeData, 'copy.register.cta',      'Register');

  const labels = {
    firstName:      getCapeText(capeData, 'copy.register.labelFirstName', 'First name'),
    infix:          getCapeText(capeData, 'copy.register.labelInfix',     'Infix'),
    lastName:       getCapeText(capeData, 'copy.register.labelLastName',  'Last name'),
    email:          getCapeText(capeData, 'copy.register.labelEmail',     'Email'),
    optIn1:         getCapeText(capeData, 'copy.register.optIn1',         'I confirm that I am 18 years of age or older'),
    optIn2:         getCapeText(capeData, 'copy.register.optIn2',         'I accept the {{terms}}'),
    successHeadline:getCapeText(capeData, 'copy.register.successHeadline','You\'re registered!'),
    successBody:    getCapeText(capeData, 'copy.register.successBody',    ''),
    cta,
  };

  return (
    <div className="campaign-screen">
      <div className="campaign-image-wash" />

      <div className="campaign-shell no-scrollbar overflow-y-auto">
        <section className="campaign-stack" style={{ animation: 'fadeIn 0.4s ease both' }}>
          <p className="campaign-kicker">Register</p>
          <h1 className="campaign-title campaign-title--compact">{headline}</h1>
          {subline && <p className="campaign-copy">{subline}</p>}
        </section>

        <section
          className="campaign-panel campaign-panel--strong p-6 sm:p-7"
          style={{ animation: 'fadeIn 0.4s 0.1s ease both' }}
        >
          <RegistrationForm
            labels={labels}
            showInfix={getCapeBoolean(capeData, 'settings.pages.register.showInfix', true)}
            requireOptIns={getCapeBoolean(capeData, 'settings.pages.register.requireOptIns', true)}
            onSuccess={() => router.push('{{NEXT_AFTER_REGISTER}}')}
          />
        </section>

        <div aria-hidden className="h-1" />
      </div>
    </div>
  );
}
