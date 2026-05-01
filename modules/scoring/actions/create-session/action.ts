'use server';

import { fetchData } from '@lib/query/fetch-data';
import Logger from '@lib/logger/logger';
import type { CreateSessionRequest, CreateSessionResult } from '@/types/actions/session';

export async function createSession(
  request: CreateSessionRequest,
): Promise<CreateSessionResult> {
  const result = await fetchData<CreateSessionResult['data']>(
    `${process.env.API_URL}/api/sessions/create`,
    {
      method: 'POST',
      authToken: request.token,
      body: { startTime: new Date().toISOString() },
    },
  );

  Logger.info('createSession', { success: result.success });
  return result as CreateSessionResult;
}
