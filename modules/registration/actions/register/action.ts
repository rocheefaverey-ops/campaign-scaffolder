'use server';

import { fetchData } from '@lib/query/fetch-data';
import Logger from '@lib/logger/logger';
import type { FetchDataResponse } from '@/types/actions/fetch-data';

export interface RegisterRequest {
  token: string;
  firstName: string;
  infix?: string;
  lastName: string;
  email: string;
  optin18: boolean;
  optinTerms: boolean;
  optinPrivacy: boolean;
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
    `${process.env.API_URL}/api/users/register`,
    { method: 'PUT', authToken: token, body },
  );

  Logger.info('register', { success: result.success });
  return result;
}
