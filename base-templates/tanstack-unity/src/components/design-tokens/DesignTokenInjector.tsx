import { useEffect } from 'react';

interface DesignTokenInjectorProps {
  branding: Record<string, unknown> | null;
}

/**
 * Flows CAPE `settings.branding` into CSS custom properties on :root.
 *
 * Only sets properties CAPE actually provides — missing values fall through
 * to the Livewall defaults in globals.css. Runs client-side on mount and
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

    // Surface + text tokens — backfilled to match the Next templates so
    // CAPE-driven background/ink/on-dark text actually flows through on
    // TanStack campaigns instead of staying on the neutral defaults.
    set('--surface-base', branding.backgroundColor ?? branding.tertiaryColor);
    set('--surface-ink', branding.secondaryColor);
    set('--surface-lime', branding.primaryColor);
    set('--text-primary', branding.textColor ?? branding.secondaryColor);
    set('--text-inverse', branding.onDarkText);

    set('--default-font-family', branding.fontFamily);
    set('--display-font-family', branding.displayFontFamily);
  }, [branding]);

  return null;
}
