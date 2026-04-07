'use server';

import { fetchData } from '@lib/query/fetch-data';
import Logger from '@lib/logger/logger';
import InfoLogging from '../info-logging/action';
import type {
  AuthenticateRequest,
  AuthenticateResponse,
  AuthenticateResult,
} from '@/types/actions/authenticate';

export async function authenticate(
  request: AuthenticateRequest,
): Promise<AuthenticateResult> {
  const result = await fetchData<AuthenticateResponse>(
    `${process.env.API_URL}/api/authenticate`,
    {
      method: 'POST',
      body: request,
    },
  );

  await InfoLogging({
    key: 'authenticate',
    value: { success: result.success, userId: result.data?.userId },
  });

  Logger.info('authenticate', {
    success: result.success,
    userId: result.data?.userId,
  });

  return result;
}
