import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

export async function loadLeaderboardData(language: string) {
  const [copy, background, logo] = await Promise.all([
    getCapeCopy(language, [
      ['leaderboard', 'title'],
      ['leaderboard', 'subline'],
      ['leaderboard', 'tabWeekly'],
      ['leaderboard', 'tabMonthly'],
      ['leaderboard', 'tabTotal'],
      ['leaderboard', 'loading'],
      ['leaderboard', 'empty'],
      ['leaderboard', 'buttonPlayAgain'],
      ['leaderboard', 'buttonHome'],
    ]),
    getCapeProperty({ type: 'general', path: ['leaderboard', 'background'] }),
    getCapeProperty({ type: 'general', path: ['leaderboard', 'logo'] }),
  ]);

  const [title, subline, tabWeekly, tabMonthly, tabTotal, loading, empty, buttonPlayAgain, buttonHome] = copy;

  return {
    copy: {
      title: title || 'Leaderboard',
      subline: subline || '',
      tabWeekly: tabWeekly || 'Weekly',
      tabMonthly: tabMonthly || 'Monthly',
      tabTotal: tabTotal || 'All-time',
      loading: loading || 'Loading...',
      empty: empty || 'No entries yet',
      buttonPlayAgain: buttonPlayAgain || 'Play again',
      buttonHome: buttonHome || 'Home',
    },
    backgroundUrl: background.asFile()?.url ?? null,
    logoUrl: logo.asFile()?.url ?? null,
  };
}
