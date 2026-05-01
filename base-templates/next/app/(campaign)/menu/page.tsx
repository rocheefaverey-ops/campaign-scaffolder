'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeImage, getCapeBoolean } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

/**
 * Catalog of menu items. The wizard's MENU_ITEMS schema mirrors this list;
 * keep them in sync. Each item has a default label that CAPE can override
 * via `copy.menu.{id}` and a default visibility that CAPE can override via
 * `settings.menu.show{Id}` (capitalised).
 */
type MenuItem = {
  id:     string;
  label:  string;
  target: string;
  kind:   'primary' | 'secondary' | 'ghost';
  defaultEnabled: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'home',        label: 'Home',           target: '/landing',     kind: 'primary',   defaultEnabled: true  },
  { id: 'resume',      label: 'Resume game',    target: '/gameplay',    kind: 'secondary', defaultEnabled: true  },
  { id: 'howToPlay',   label: 'How to play',    target: '/onboarding',  kind: 'secondary', defaultEnabled: true  },
  { id: 'leaderboard', label: 'Leaderboard',    target: '/leaderboard', kind: 'secondary', defaultEnabled: false },
  { id: 'voucher',     label: 'My voucher',     target: '/voucher',     kind: 'secondary', defaultEnabled: false },
  { id: 'terms',       label: 'Terms',          target: '/terms',       kind: 'ghost',     defaultEnabled: true  },
  { id: 'privacy',     label: 'Privacy',        target: '/privacy',     kind: 'ghost',     defaultEnabled: false },
  { id: 'faq',         label: 'FAQ',            target: '/faq',         kind: 'ghost',     defaultEnabled: false },
  { id: 'leave',       label: 'Leave campaign', target: '/',            kind: 'ghost',     defaultEnabled: false },
];

function flagKey(id: string): string {
  return `settings.menu.show${id[0].toUpperCase()}${id.slice(1)}`;
}

export default function MenuPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

  const logoUrl  = getCapeImage(capeData, 'general.header.logo')
                || getCapeImage(capeData, 'general.landing.logo')
                || '/assets/logo-livewall-wordmark.svg';

  // Filter to enabled items, keep MENU_ITEMS' canonical order.
  const visible = MENU_ITEMS.filter(item =>
    getCapeBoolean(capeData, flagKey(item.id), item.defaultEnabled),
  );

  return (
    <div className="campaign-screen">
      <div className="campaign-shell">
        <div className="flex items-center justify-between" style={{ animation: 'fadeIn 0.3s ease both' }}>
          <div className="w-11" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
          <button className="campaign-close" onClick={() => router.back()} aria-label="Close menu">
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="campaign-panel campaign-panel--strong p-5 sm:p-6" style={{ animation: 'fadeIn 0.3s 0.05s ease both' }}>
          <div className="campaign-actions">
            {visible.length === 0 && (
              <p className="campaign-copy text-center" style={{ padding: '12px 0' }}>
                No menu items configured.
              </p>
            )}
            {visible.map(item => {
              const label = getCapeText(capeData, `copy.menu.${item.id}`, item.label);
              return (
                <Button
                  key={item.id}
                  variant={item.kind === 'primary' ? 'primary' : item.kind === 'secondary' ? 'secondary' : 'ghost'}
                  size={item.kind === 'ghost' ? 'sm' : 'md'}
                  className="w-full"
                  onClick={() => router.push(item.target)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="campaign-stack items-center opacity-50" style={{ animation: 'fadeIn 0.3s 0.1s ease both' }}>
          <div className="divider w-20" />
          <p className="campaign-kicker">Powered by Livewall</p>
        </div>
      </div>
    </div>
  );
}
