import { useEffect } from 'react';

interface DesignTokenInjectorProps {
  branding: Record<string, unknown> | null;
}

/**
 * Flows CAPE `settings.branding` into CSS custom properties on :root.
 *
 * Only sets properties CAPE actually provides — missing values fall through
 * to the Livewall defaults in globals.scss. Runs client-side on mount and
 * whenever branding changes, so CAPE tweaks take effect without a rebuild.
 */
export function DesignTokenInjector({ branding }: DesignTokenInjectorProps) {
  useEffect(() => {
    if (!branding) return;

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
  }, [branding]);

  return null;
}
