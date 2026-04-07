import type { ICapeData } from '@lib/cape/cape.types';
import { getCapeFont } from '@lib/cape/cape.utils';

interface FontInjectorProps {
  capeData: ICapeData | null;
  nonce: string;
}

/**
 * Server Component — injects @font-face rules from CAPE into <head>.
 * Runs at the root layout level so fonts are available before first paint.
 * Uses nonce so the inline <style> tag passes CSP.
 */
export default function FontInjector({ capeData, nonce }: FontInjectorProps) {
  const brandFonts = getCapeFont(capeData, 'fontBrand');
  const condensedFonts = getCapeFont(capeData, 'fontCondensedBlack');
  const lightFonts = getCapeFont(capeData, 'fontLight');

  const allFonts = [
    ...brandFonts.map((f) => ({ file: f, variable: '--font-brand', family: 'BrandFont' })),
    ...condensedFonts.map((f) => ({ file: f, variable: '--font-brand-condensed', family: 'BrandFontCondensed' })),
    ...lightFonts.map((f) => ({ file: f, variable: '--font-brand-light', family: 'BrandFontLight' })),
  ];

  if (allFonts.length === 0) return null;

  const fontFaces = allFonts
    .map(
      ({ file, family }) =>
        `@font-face { font-family: '${family}'; src: url('${file.url}') format('${file.type.replace('font/', '')}'); font-display: swap; }`,
    )
    .join('\n');

  const cssVars = [
    brandFonts.length > 0 ? `--font-brand: 'BrandFont', sans-serif;` : '',
    condensedFonts.length > 0 ? `--font-brand-condensed: 'BrandFontCondensed', sans-serif;` : '',
    lightFonts.length > 0 ? `--font-brand-light: 'BrandFontLight', sans-serif;` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <style
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: `${fontFaces}\n:root { ${cssVars} }` }}
    />
  );
}
