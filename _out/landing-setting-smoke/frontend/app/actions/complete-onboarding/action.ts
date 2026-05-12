'use server';

import { fetchData } from '@lib/query/fetch-data';
import Logger from '@lib/logger/logger';
import type { FetchDataResponse } from '@/types/actions/fetch-data';

interface CompleteOnboardingRequest {
  token: string;
}

export async function completeOnboarding(
  request: CompleteOnboardingRequest,
): Promise<FetchDataResponse<null>> {
  const result = await fetchData<null>(
    `${process.env.API_URL}/api/onboarding/complete`,
    {
      method: 'POST',
      authToken: request.token,
    },
  );

  Logger.info('completeOnboarding', { success: result.success });

  return result;
}
