'use client';

import { useCapeData } from '@hooks/useCapeData';
import { useInstanceId } from '@hooks/useInstanceId';
import { useSafeNavigation } from '@hooks/useSafeNavigation';
import { getCapeBoolean, buildCopyResolver } from '@utils/getCapeData';
import RegistrationForm from '@components/_modules/RegistrationForm/RegistrationForm';

export default function RegisterPage() {
  const navigate     = useSafeNavigation();
  const { capeData } = useCapeData();
  const instanceId   = useInstanceId('register');
  const t            = buildCopyResolver(capeData, 'register', instanceId);

  const headline = t('headline', 'Register');
  const subline  = t('subline',  '');
  const cta      = t('cta',      'Register');

  const labels = {
    firstName:      t('labelFirstName', 'First name'),
    infix:          t('labelInfix',     'Infix'),
    lastName:       t('labelLastName',  'Last name'),
    email:          t('labelEmail',     'Email'),
    optIn1:         t('optIn1',         'I confirm that I am 18 years of age or older'),
    optIn2:         t('optIn2',         'I accept the {{terms}}'),
    successHeadline:t('successHeadline','You\'re registered!'),
    successBody:    t('successBody',    ''),
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
            showInfix={getCapeBoolean(capeData, `settings.pages.${instanceId}.showInfix`, true)}
            requireOptIns={getCapeBoolean(capeData, `settings.pages.${instanceId}.requireOptIns`, true)}
            onSuccess={() => navigate('{{NEXT_AFTER_REGISTER}}')}
          />
        </section>

        <div aria-hidden className="h-1" />
      </div>
    </div>
  );
}
