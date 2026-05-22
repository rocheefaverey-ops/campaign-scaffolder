import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

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
    flags: {
      showHome: showHome.asBoolean(true),
      showResume: showResume.asBoolean(false),
      showHowToPlay: showHowToPlay.asBoolean(true),
      showLeaderboard: showLeaderboard.asBoolean(false),
      showVoucher: showVoucher.asBoolean(false),
      showTerms: showTerms.asBoolean(true),
      showPrivacy: showPrivacy.asBoolean(false),
      showFaq: showFaq.asBoolean(false),
      showLeave: showLeave.asBoolean(false),
    },
  };
}
