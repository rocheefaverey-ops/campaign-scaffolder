'use client';

import { useEffect } from 'react';
import type { ICapeData } from '@lib/cape/cape.types';

interface DesignTokenInjectorProps {
  capeData: ICapeData | null;
}

/**
 * [module: design-tokens]
 * Reads branding values from CAPE and injects them as CSS custom properties at runtime.
 * This means brand colours and fonts don't require a rebuild when CAPE config changes.
 *
 * Mount once in providers.tsx or the root layout (client-side only).
 */
export default function DesignTokenInjector({ capeData }: DesignTokenInjectorProps) {
  useEffect(() => {
    if (!capeData?.settings?.branding) return;

    const { themeColor, primaryColor, secondaryColor, accentColor, fontFamily } =
      capeData.settings.branding;

    const tokens: Record<string, string> = {};

    if (primaryColor) tokens['--color-primary'] = primaryColor;
    if (secondaryColor) tokens['--color-secondary'] = secondaryColor;
    if (accentColor) tokens['--color-accent'] = accentColor;
    if (themeColor) tokens['--color-theme'] = themeColor;
    if (fontFamily) tokens['--font-brand'] = fontFamily;

    const css = Object.entries(tokens)
      .map(([k, v]) => `${k}: ${v};`)
      .join(' ');

    if (!css) return;

    let styleEl = document.getElementById('cape-design-tokens') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'cape-design-tokens';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `:root { ${css} }`;
  }, [capeData]);

  return null;
}
