'use server';

import { fetchData } from '@lib/query/fetch-data';
import Logger from '@lib/logger/logger';
import type {
  LeaderboardRequest,
  LeaderboardResult,
} from '@/types/actions/leaderboard';

export async function getLeaderboard(
  request: LeaderboardRequest = {},
): Promise<LeaderboardResult> {
  const { type = 'total', offset = 0, limit = 10, token } = request;

  const params = new URLSearchParams({
    type,
    offset: String(offset),
    limit: String(limit),
  });

  const result = await fetchData<LeaderboardResult['data']>(
    `${process.env.API_URL}/api/leaderboard?${params}`,
    { authToken: token },
  );

  Logger.info('getLeaderboard', { success: result.success, type });
  return result as LeaderboardResult;
}
