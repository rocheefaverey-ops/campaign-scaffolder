'use client';

import { useEffect } from 'react';

interface DesignTokenInjectorProps {
  capeData: Record<string, unknown> | null;
}

/**
 * Flows CAPE `settings.branding` into CSS custom properties on :root.
 *
 * Only sets properties that CAPE actually provides — missing values fall
 * through to the defaults in globals.css (the Livewall house palette).
 *
 * Runs client-side on mount and whenever capeData changes, so CAPE tweaks
 * take effect without a rebuild.
 */
export default function DesignTokenInjector({ capeData }: DesignTokenInjectorProps) {
  useEffect(() => {
    if (!capeData) return;

    const branding = ((capeData.settings as Record<string, unknown> | undefined)?.branding ??
      {}) as Record<string, unknown>;

    const root = document.documentElement.style;

    const set = (prop: string, value: unknown) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        root.setProperty(prop, value.trim());
      }
    };

    set('--color-primary',   branding.primaryColor);
    set('--color-secondary', branding.secondaryColor);
    set('--color-tertiary',  branding.tertiaryColor ?? branding.accentColor);
    set('--color-statusRed', branding.errorColor);
    set('--color-theme',     branding.themeColor);

    set('--default-font-family', branding.fontFamily);
    set('--display-font-family', branding.displayFontFamily);
  }, [capeData]);

  return null;
}
