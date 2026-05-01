/**
 * FontInjector — server component for SSR font injection.
 * NOTE: Font injection is handled client-side by CapeDataProvider.injectFonts().
 * This component is kept as a slot for modules that need SSR <head> style injection.
 */

interface FontInjectorProps {
  capeData: Record<string, unknown> | null;
  nonce: string;
}

export default function FontInjector({ capeData, nonce }: FontInjectorProps) {
  if (!capeData || !nonce) return null;
  return null;
}
