'use server';

import { fetchData } from '@lib/query/fetch-data';
import Logger from '@lib/logger/logger';
import type { FetchDataResponse } from '@/types/actions/fetch-data';

interface RegisterRequest {
  token: string;
  name: string;
  email: string;
  optin?: boolean;
}

interface RegisterResponse {
  userId: string;
  registered: boolean;
}

export async function register(
  request: RegisterRequest,
): Promise<FetchDataResponse<RegisterResponse>> {
  const { token, ...body } = request;

  const result = await fetchData<RegisterResponse>(
    `${process.env.API_URL}/api/register`,
    {
      method: 'POST',
      authToken: token,
      body,
    },
  );

  Logger.info('register', { success: result.success });
  return result;
}
