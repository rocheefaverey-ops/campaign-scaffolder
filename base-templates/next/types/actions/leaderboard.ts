import type { FetchDataResponse } from './fetch-data';

export type LeaderboardType = 'total' | 'daily' | 'weekly' | 'monthly';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isCurrentPlayer?: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  personalBest?: LeaderboardEntry;
  total: number;
}

export interface LeaderboardRequest {
  type?: LeaderboardType;
  offset?: number;
  limit?: number;
  token?: string;
}

export type LeaderboardResult = FetchDataResponse<LeaderboardResponse>;
