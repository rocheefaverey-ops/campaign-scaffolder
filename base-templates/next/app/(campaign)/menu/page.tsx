'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { useSafeNavigation } from '@hooks/useSafeNavigation';
import { getCapeText, getCapeImage, getCapeBoolean } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

/**
 * Catalog of menu items. The wizard's MENU_ITEMS schema mirrors this list;
 * keep them in sync. Each item has a default label that CAPE can override
 * via `copy.menu.{id}` and a default visibility that CAPE can override via
 * `settings.menu.show{Id}` (capitalised).
 */
type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'dark' | 'danger';

type MenuItem = {
  id:     string;
  label:  string;
  target: string;
  kind:   ButtonVariant;
  defaultEnabled: boolean;
  externalUrlPath?: string;
  requiresRoute?: string;
};

const AVAILABLE_CAMPAIGN_ROUTES = new Set<string>(
  '/video|/intro-video|/loading-video|/ad-video|/landing|/onboarding|/video-2|/gameplay|/result'.split('|').filter(Boolean),
);

const MENU_ITEMS: MenuItem[] = [
  { id: 'home',        label: 'Home',           target: '/landing',     kind: '{{MENU_VARIANT_HOME}}' as ButtonVariant,        defaultEnabled: true  },
  { id: 'resume',      label: 'Resume game',    target: '/gameplay',    kind: '{{MENU_VARIANT_RESUME}}' as ButtonVariant,      defaultEnabled: true  },
  { id: 'howToPlay',   label: 'How to play',    target: '/onboarding',  kind: '{{MENU_VARIANT_HOWTOPLAY}}' as ButtonVariant,   defaultEnabled: true  },
  { id: 'leaderboard', label: 'Leaderboard',    target: '/leaderboard', kind: '{{MENU_VARIANT_LEADERBOARD}}' as ButtonVariant, defaultEnabled: false },
  { id: 'voucher',     label: 'My voucher',     target: '/voucher',     kind: '{{MENU_VARIANT_VOUCHER}}' as ButtonVariant,     defaultEnabled: false },
  { id: 'terms',       label: 'Terms',          target: '/terms',       kind: '{{MENU_VARIANT_TERMS}}' as ButtonVariant,       defaultEnabled: true,  externalUrlPath: 'general.legal.termsUrl' },
  { id: 'privacy',     label: 'Privacy',        target: '/privacy',     kind: '{{MENU_VARIANT_PRIVACY}}' as ButtonVariant,     defaultEnabled: false, externalUrlPath: 'general.legal.privacyUrl' },
  { id: 'faq',         label: 'FAQ',            target: '/faq',         kind: '{{MENU_VARIANT_FAQ}}' as ButtonVariant,         defaultEnabled: false, requiresRoute: '/faq' },
  { id: 'leave',       label: 'Leave campaign', target: '/',            kind: '{{MENU_VARIANT_LEAVE}}' as ButtonVariant,       defaultEnabled: false },
];

function flagKey(id: string): string {
  return `settings.menu.show${id[0].toUpperCase()}${id.slice(1)}`;
}

export default function MenuPage() {
  const router       = useRouter();
  const navigate     = useSafeNavigation();
  const { capeData } = useCapeData();

  const logoUrl  = getCapeImage(capeData, 'general.header.logo')
                || getCapeImage(capeData, 'general.landing.logo')
                || '/assets/logo-livewall-wordmark.svg';

  // Filter to enabled items, keep MENU_ITEMS' canonical order.
  const visible = MENU_ITEMS.filter(item =>
    getCapeBoolean(capeData, flagKey(item.id), item.defaultEnabled) &&
    isMenuItemAvailable(capeData, item),
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
              const target = getMenuTarget(capeData, item);
              return (
                <Button
                  key={item.id}
                  variant={item.kind}
                  size={item.kind === 'tertiary' ? 'sm' : 'md'}
                  className="w-full"
                  onClick={() => navigate(target)}
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

function isMenuItemAvailable(capeData: Record<string, unknown> | null, item: MenuItem): boolean {
  const externalTarget = item.externalUrlPath ? getCapeText(capeData, item.externalUrlPath) : '';
  if (externalTarget) return true;

  const requiredRoute = item.requiresRoute ?? item.target;
  if (!requiredRoute.startsWith('/') || requiredRoute === '/') return true;

  return AVAILABLE_CAMPAIGN_ROUTES.has(requiredRoute);
}

function getMenuTarget(capeData: Record<string, unknown> | null, item: MenuItem): string {
  if (item.externalUrlPath) {
    const externalTarget = getCapeText(capeData, item.externalUrlPath);
    if (externalTarget) return externalTarget;
  }

  return item.target;
}
