import type { StyledButtonVariant } from '~/components/buttons/StyledButton.tsx';
import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

const ALLOWED_VARIANTS: ReadonlyArray<StyledButtonVariant> = ['primary', 'secondary', 'tertiary', 'dark', 'danger'];

function coerceVariant(value: string | null | undefined, fallback: StyledButtonVariant): StyledButtonVariant {
  if (!value) return fallback;
  const lower = value.toLowerCase() as StyledButtonVariant;
  return ALLOWED_VARIANTS.includes(lower) ? lower : fallback;
}

function tokenBoolean(value: string, fallback: boolean): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export async function loadMenuData(language: string) {
  const [
    copy,
    logo,
    landingLogo,
    termsUrl,
    privacyUrl,
    showHome,
    showResume,
    showHowToPlay,
    showLeaderboard,
    showVoucher,
    showTerms,
    showPrivacy,
    showFaq,
    showLeave,
    variantHome,
    variantResume,
    variantHowToPlay,
    variantLeaderboard,
    variantVoucher,
    variantTerms,
    variantPrivacy,
    variantFaq,
    variantLeave,
  ] = await Promise.all([
    getCapeCopy(language, [
      ['menu', 'headline'],
      ['menu', 'home'],
      ['menu', 'resume'],
      ['menu', 'howToPlay'],
      ['menu', 'leaderboard'],
      ['menu', 'voucher'],
      ['menu', 'terms'],
      ['menu', 'privacy'],
      ['menu', 'faq'],
      ['menu', 'leave'],
    ]),
    getCapeProperty({ type: 'general', path: ['header', 'logo'] }),
    getCapeProperty({ type: 'general', path: ['landing', 'logo'] }),
    getCapeProperty({ type: 'general', path: ['legal', 'termsUrl', 'value'] }),
    getCapeProperty({ type: 'general', path: ['legal', 'privacyUrl', 'value'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'showHome'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'showResume'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'showHowToPlay'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'showLeaderboard'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'showVoucher'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'showTerms'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'showPrivacy'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'showFaq'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'showLeave'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'variantHome'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'variantResume'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'variantHowToPlay'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'variantLeaderboard'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'variantVoucher'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'variantTerms'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'variantPrivacy'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'variantFaq'] }),
    getCapeProperty({ type: 'settings', path: ['menu', 'variantLeave'] }),
  ]);

  const [headline, home, resume, howToPlay, leaderboard, voucher, terms, privacy, faq, leave] = copy;

  return {
    copy: {
      headline: headline || 'Menu',
      home: home || 'Home',
      resume: resume || 'Resume game',
      howToPlay: howToPlay || 'How to play',
      leaderboard: leaderboard || 'Leaderboard',
      voucher: voucher || 'My voucher',
      terms: terms || 'Terms',
      privacy: privacy || 'Privacy',
      faq: faq || 'FAQ',
      leave: leave || 'Leave campaign',
    },
    logoUrl: logo.asFile()?.url ?? landingLogo.asFile()?.url ?? null,
    links: {
      termsUrl: termsUrl.asString(),
      privacyUrl: privacyUrl.asString(),
    },
    // Defaults are seeded by the CLI from the wizard's menuItemsEnabled.
    // CAPE values still override at runtime.
    flags: {
      showHome:        showHome.asBoolean(tokenBoolean('{{MENU_SHOW_HOME}}', true)),
      showResume:      showResume.asBoolean(tokenBoolean('{{MENU_SHOW_RESUME}}', false)),
      showHowToPlay:   showHowToPlay.asBoolean(tokenBoolean('{{MENU_SHOW_HOWTOPLAY}}', true)),
      showLeaderboard: showLeaderboard.asBoolean(tokenBoolean('{{MENU_SHOW_LEADERBOARD}}', false)),
      showVoucher:     showVoucher.asBoolean(tokenBoolean('{{MENU_SHOW_VOUCHER}}', false)),
      showTerms:       showTerms.asBoolean(tokenBoolean('{{MENU_SHOW_TERMS}}', true)),
      showPrivacy:     showPrivacy.asBoolean(tokenBoolean('{{MENU_SHOW_PRIVACY}}', true)),
      showFaq:         showFaq.asBoolean(tokenBoolean('{{MENU_SHOW_FAQ}}', false)),
      showLeave:       showLeave.asBoolean(tokenBoolean('{{MENU_SHOW_LEAVE}}', true)),
    },
    // Per-item button variant. Defaults reflect the agency house style:
    // navigation items are secondary (ink), informational links are
    // tertiary (outlined), Leave campaign is danger.
    variants: {
      home:        coerceVariant(variantHome.asString(),        'secondary'),
      resume:      coerceVariant(variantResume.asString(),      'secondary'),
      howToPlay:   coerceVariant(variantHowToPlay.asString(),   'primary'),
      leaderboard: coerceVariant(variantLeaderboard.asString(), 'primary'),
      voucher:     coerceVariant(variantVoucher.asString(),     'primary'),
      terms:       coerceVariant(variantTerms.asString(),       'tertiary'),
      privacy:     coerceVariant(variantPrivacy.asString(),     'tertiary'),
      faq:         coerceVariant(variantFaq.asString(),         'tertiary'),
      leave:       coerceVariant(variantLeave.asString(),       'danger'),
    },
  };
}
