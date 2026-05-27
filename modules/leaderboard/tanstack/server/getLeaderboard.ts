import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { IApiResult } from '~/interfaces/api/IApiResult.ts';
import { useAppSession } from '~/server/api/Session.ts';

const LeaderboardSchema = z.object({
  type:   z.enum(['daily', 'weekly', 'total']).default('total'),
  offset: z.number().int().nonneg().default(0),
  limit:  z.number().int().positive().default(100),
});

export type LeaderboardInput = z.infer<typeof LeaderboardSchema>;

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isYou?: boolean;
  isCurrentPlayer?: boolean;
}

const NAMES = [
  'Sanne', 'Milan', 'Yara', 'Daan', 'Fenna', 'Bram', 'Noor', 'Liam',
  'Isa', 'Bo', 'Jules', 'Nina', 'Sem', 'Liv', 'Tess', 'Owen',
];

function buildMockLeaderboard(type: LeaderboardInput['type'], offset: number, limit: number) {
  const total = 48;
  const baseScore = type === 'daily' ? 12840 : type === 'weekly' ? 48620 : 184320;
  const entries: LeaderboardEntry[] = [];

  for (let index = offset; index < Math.min(total, offset + limit); index += 1) {
    const rank = index + 1;
    entries.push({
      rank,
      name: NAMES[index % NAMES.length],
      score: Math.max(120, baseScore - index * (type === 'daily' ? 315 : type === 'weekly' ? 610 : 1840)),
      isYou: rank === 18,
      isCurrentPlayer: rank === 18,
    });
  }

  return {
    entries,
    personalBest: {
      rank: 18,
      name: 'You',
      score: type === 'daily' ? 7420 : type === 'weekly' ? 31880 : 132640,
      isYou: true,
      isCurrentPlayer: true,
    },
    total,
  };
}

export const getLeaderboardRequest = createServerFn({ method: 'POST' })
  .inputValidator(LeaderboardSchema)
  .handler(async ({ data }): Promise<IApiResult<any>> => {
    const session     = await useAppSession();
    const token       = session.data.accessToken;
    const { type, offset, limit } = data;

    const params = new URLSearchParams({
      type,
      offset: String(offset),
      limit:  String(limit),
    });

    if (!process.env.API_URL || process.env.API_MOCK === 'true') {
      return { data: buildMockLeaderboard(type, offset, limit) };
    }

    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res  = await fetch(`${process.env.API_URL}/api/leaderboard/${type}?${params}`, { headers });
      if (!res.ok) return { data: buildMockLeaderboard(type, offset, limit) };
      const json = await res.json();
      return json?.data ? json : { data: json };
    } catch {
      return { data: buildMockLeaderboard(type, offset, limit) };
    }
  });
