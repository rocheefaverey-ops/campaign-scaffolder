'use server';

import { fetchData } from '@lib/query/fetch-data';
import Logger from '@lib/logger/logger';
import type { IUnityApiRequest } from '@lib/game-bridge/game-bridge.types';

/**
 * Generic proxy for Unity-initiated HTTP requests (the `apiRequest` bridge).
 *
 * The Unity game emits an `apiRequest` event carrying an {@link IUnityApiRequest}
 * (method, path, data + a correlation uuid). The frontend forwards it to the
 * campaign backend and echoes the uuid back so the game can match the response.
 * This mirrors the TanStack `customRequest` server fn so both stacks expose the
 * same game-initiated backend bridge.
 *
 * GET requests append `data` as query params; other methods send it as a JSON body.
 */
export async function unityApiRequest(
  request: Omit<IUnityApiRequest, 'uuid'>,
): Promise<{ success: boolean; data: unknown }> {
  const { method, path, data } = request;
  const isGet = method === 'GET';

  const url = new URL(`${process.env.API_URL}/api/${path}`);
  if (isGet && data) {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      url.searchParams.append(key, String(value));
    }
  }

  const result = await fetchData<unknown>(url.toString(), {
    method,
    ...(!isGet && data !== undefined && { body: data }),
  });

  Logger.info('unityApiRequest', { method, path, success: result.success });

  return { success: result.success, data: result.data };
}

export default unityApiRequest;
