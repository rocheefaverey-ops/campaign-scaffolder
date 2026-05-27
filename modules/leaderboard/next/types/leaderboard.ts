export type LeaderboardType = 'daily' | 'weekly' | 'total';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isCurrentPlayer?: boolean;
}

export interface LeaderboardRequest {
  type?: LeaderboardType;
  offset?: number;
  limit?: number;
  token?: string;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  personalBest: LeaderboardEntry | null;
  total: number;
}

export interface LeaderboardResult {
  success: boolean;
  data: LeaderboardData | null;
  error?: string | null;
}
