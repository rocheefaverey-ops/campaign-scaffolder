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
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res  = await fetch(`${process.env.API_URL}/api/leaderboard/${type}?${params}`, { headers });
    const json = await res.json();
    return json;
  });
