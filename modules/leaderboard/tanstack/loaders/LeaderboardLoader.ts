import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadLeaderboardData(language: string) {
  const [headline, subline, kicker, ctaDone, emptyState] = await getCapeCopy(language, [
    ['leaderboard', 'headline'],
    ['leaderboard', 'subline'],
    ['leaderboard', 'kicker'],
    ['leaderboard', 'ctaDone'],
    ['leaderboard', 'emptyState'],
  ]);

  return {
    copy: { headline, subline, kicker, ctaDone, emptyState },
  };
}
