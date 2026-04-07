'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLanguageStore } from '@hooks/useLanguage';

interface CapeDataContextValue {
  capeData: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  currentLanguage: string;
}

const CapeDataContext = createContext<CapeDataContextValue>({
  capeData: null,
  loading: true,
  error: null,
  currentLanguage: 'NL',
});

export function useCapeData() {
  return useContext(CapeDataContext);
}

interface CapeDataProviderProps {
  children: ReactNode;
  initialData?: Record<string, unknown> | null;
}

/**
 * Dynamically inject @font-face rules from CAPE branding settings.
 * Sets --default-font-family CSS variable on :root.
 */
function injectFonts(capeData: Record<string, unknown>) {
  const branding = ((capeData?.settings as Record<string, unknown>)?.branding as Record<string, unknown>) ?? {};

  const condensedBlack = (branding.fontCondensedBlack as Array<{ url?: string }> | undefined)?.[0]?.url;
  const light          = (branding.fontLight          as Array<{ url?: string }> | undefined)?.[0]?.url;
  const tertiary       = (branding.fontTertiary        as Array<{ url?: string }> | undefined)?.[0]?.url;

  const hasFontFiles = !!(condensedBlack || light || tertiary);
  const fontFamily   = (branding.fontFamily as string) ||
    (hasFontFiles ? "'BrandFont', 'Helvetica Neue', Arial, sans-serif" : "'Helvetica Neue', Arial, sans-serif");

  document.documentElement.style.setProperty('--default-font-family', fontFamily);

  const rules: string[] = [];
  if (condensedBlack) rules.push(`@font-face { font-family: 'BrandFont'; font-weight: 900; font-display: swap; src: url('${condensedBlack}'); }`);
  if (light)          rules.push(`@font-face { font-family: 'BrandFont'; font-weight: 300; font-display: swap; src: url('${light}'); }`);
  if (tertiary)       rules.push(`@font-face { font-family: 'BrandFont'; font-weight: 400; font-style: italic; font-display: swap; src: url('${tertiary}'); }`);

  if (!rules.length) return;

  const id = 'cape-brand-fonts';
  document.getElementById(id)?.remove();
  const style = document.createElement('style');
  style.id = id;
  style.textContent = rules.join('\n');
  document.head.appendChild(style);
}

/**
 * CAPE published JSON wraps the campaign data in nested `data` layers.
 * This unwraps to the innermost object containing actual campaign keys.
 */
function unwrapCapeData(raw: Record<string, unknown>): Record<string, unknown> {
  let current = raw;
  const campaignKeys = ['settings', 'general', 'shared', 'pageSetup'];
  for (let i = 0; i < 10; i++) {
    if (campaignKeys.some(k => k in current)) return current;
    if (current.data && typeof current.data === 'object' && !Array.isArray(current.data)) {
      current = current.data as Record<string, unknown>;
    } else break;
  }
  return current;
}

export function CapeDataProvider({ children, initialData }: CapeDataProviderProps) {
  const { currentLanguage } = useLanguageStore();
  const [capeData, setCapeData] = useState<Record<string, unknown> | null>(
    initialData ? unwrapCapeData(initialData) : null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      injectFonts(unwrapCapeData(initialData));
      return;
    }

    const baseUrl    = process.env.NEXT_PUBLIC_CAPE_URL;
    const campaignId = process.env.NEXT_PUBLIC_CAPE_DEFAULT_ID;
    const market     = (process.env.NEXT_PUBLIC_CAPE_DEFAULT_MARKET ?? 'NL').toUpperCase();

    if (!baseUrl || !campaignId) {
      setError('CAPE environment variables not configured');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${baseUrl}/${campaignId}_${market}.json`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data: Record<string, unknown>) => {
        const unwrapped = unwrapCapeData(data);
        setCapeData(unwrapped);
        injectFonts(unwrapped);
        setLoading(false);
      })
      .catch(async () => {
        try {
          // Fallback to bundled cape.json for local dev / offline
          const fallback = await import('./cape.json');
          const unwrapped = unwrapCapeData(fallback.default as Record<string, unknown>);
          setCapeData(unwrapped);
          injectFonts(unwrapped);
        } catch {
          setError('Failed to load CAPE data');
        }
        setLoading(false);
      });
  }, [initialData]);

  return (
    <CapeDataContext.Provider value={{ capeData, loading, error, currentLanguage }}>
      {children}
    </CapeDataContext.Provider>
  );
}
