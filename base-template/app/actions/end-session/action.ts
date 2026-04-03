'use server';

import { fetchData } from '@lib/query/fetch-data';
import Logger from '@lib/logger/logger';
import type { EndSessionRequest, EndSessionResult } from '@/types/actions/session';

export async function endSession(request: EndSessionRequest): Promise<EndSessionResult> {
  const { token, sessionId, ...body } = request;

  const result = await fetchData<EndSessionResult['data']>(
    `${process.env.API_URL}/api/sessions/${sessionId}/end`,
    {
      method: 'POST',
      authToken: token,
      body,
    },
  );

  Logger.info('endSession', {
    success: result.success,
    sessionId,
    score: request.score,
  });

  return result as EndSessionResult;
}
