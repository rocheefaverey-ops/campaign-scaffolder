'use server';

import { fetchData } from '@lib/query/fetch-data';
import Logger from '@lib/logger/logger';
import type {
  LeaderboardData,
  LeaderboardEntry,
  LeaderboardRequest,
  LeaderboardResult,
  LeaderboardType,
} from '@/types/actions/leaderboard';

const NAMES = [
  'Sanne', 'Milan', 'Yara', 'Daan', 'Fenna', 'Bram', 'Noor', 'Liam',
  'Isa', 'Bo', 'Jules', 'Nina', 'Sem', 'Liv', 'Tess', 'Owen',
];

function buildMockLeaderboard(
  type: LeaderboardType,
  offset: number,
  limit: number,
): LeaderboardData {
  const total = 48;
  const baseScore = type === 'daily' ? 12840 : type === 'weekly' ? 48620 : 184320;
  const entries: LeaderboardEntry[] = [];

  for (let index = Math.max(0, offset); index < Math.min(total, offset + limit); index += 1) {
    const rank = index + 1;
    entries.push({
      rank,
      name: NAMES[index % NAMES.length],
      score: Math.max(120, baseScore - index * (type === 'daily' ? 315 : type === 'weekly' ? 610 : 1840)),
      isCurrentPlayer: rank === 18,
    });
  }

  return {
    entries,
    personalBest: {
      rank: 18,
      name: 'You',
      score: type === 'daily' ? 7420 : type === 'weekly' ? 31880 : 132640,
      isCurrentPlayer: true,
    },
    total,
  };
}

export async function getLeaderboard(
  request: LeaderboardRequest = {},
): Promise<LeaderboardResult> {
  const { type = 'total', offset = 0, limit = 100, token } = request;

  if (!process.env.API_URL || process.env.API_MOCK === 'true') {
    return {
      success: true,
      data: buildMockLeaderboard(type, offset, limit),
      error: null,
    };
  }

  const params = new URLSearchParams({
    type,
    offset: String(offset),
    limit: String(limit),
  });

  const result = await fetchData<LeaderboardResult['data']>(
    `${process.env.API_URL}/api/leaderboard/${type}?${params}`,
    { authToken: token },
  );

  Logger.info('getLeaderboard', { success: result.success, type, offset });
  if (result.success && result.data) return result as LeaderboardResult;

  return {
    success: true,
    data: buildMockLeaderboard(type, offset, limit),
    error: result.error ?? null,
  };
}
