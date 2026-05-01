import { createServerFn, createServerOnlyFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { HttpMethodType } from '~/utils/Constants.ts';
import type { IApiError, IApiResult } from '~/interfaces/api/IApiResult.ts';
import { HttpMethodList } from '~/utils/Constants.ts';
import { useAppSession } from '~/server/api/Session.ts';
import { ApiError } from '~/server/api/ApiError.ts';
import ErrorReporting from '~/utils/gcp/ErrorReporting.ts';
import { isProduction, sleep } from '~/utils/Helper.ts';

interface IRequestOptions {
  noRefresh?: boolean;
  noAuth?: boolean;
}

/**
 * Custom request function, meant for server-only usage
 * This is a wrapper around the request function, allowing it to be used as a server function
 * It also validates the input using Zod
 */
const CustomRequestSchema = z.object({
  method: z.enum(HttpMethodList),
  path: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const customRequest = createServerFn({ method: 'POST' })
  .inputValidator(CustomRequestSchema)
  .handler(async ({ data }): Promise<IApiResult<object>> => await request(data.method, data.path, data.data));


/**
 * Request function, meant for server-only usage
 * This handles the requests to the URL
 * @param method request method used (get, post, etc)
 * @param path path to the API endpoint (without the base URL)
 * @param data data to send to the API
 * @param options additional options for the request
 */
export const request = createServerOnlyFn(async <T = object>(method: HttpMethodType, path: string, data?: Record<string, unknown>, options?: IRequestOptions): Promise<IApiResult<T>> => {
  const session = await useAppSession();
  const isGet = method === 'GET';
  const url = new URL(`${process.env.API_URL}/api/${path}`);

  // Build query parameters for GET requests
  if (isGet && data) {
    Object.entries(data).forEach(([key, value]) =>
      url.searchParams.append(key, String(value))
    );
  }

  // Build headers
  const headers: HeadersInit = {
    ...((!options?.noAuth && session.data.accessToken) && { 'Authorization': `Bearer ${session.data.accessToken}` }),
    ...((!isGet && data) && { 'Content-Type': 'application/json' }),
  };

  const response = await fetch(url, {
    method,
    headers,

    // Non-GET requests body handling
    ...((!isGet && data) && { body: JSON.stringify(data) }),
  });

  // Check if the response is good
  const parsedData: T = await response.json();
  if (response.ok) {
    return {
      data: parsedData,
      ...(!isProduction() && {
        _debug: {
          request: {
            url: url.toString(),
            method,
            data,
          },
          response: {
            status: response.status,
            data: parsedData,
          },
        },
      }),
    };
  }

  // Handle errors
  const errorData = parsedData as IApiError;
  if (response.status === 403 && errorData.code === 'AUTHORIZATION_EXPIRED') {
    await handleExpiry(!options?.noRefresh);
    return request<T>(method, path, data, { ...options, noRefresh: true }); // Make sure noRefresh is set, to prevent potential infinite loops
  } else {
    const error = new ApiError(response.status, errorData.code, response.statusText);

    // Report error when it's a server error (5xx)
    if (response.status >= 500) {
      ErrorReporting.report(error);
    }
    throw error;
  }
});

function handleExpiry(refresh: boolean) {
  if (!refresh) {
    throw new ApiError(403, 'REFRESH_FAILED', 'Access forbidden after refresh attempt');
  }

  // TODO: Replace the following with your own refresh logic, e.g. calling a refresh token endpoint and updating the session
  console.warn('Access token expired, attempting to refresh...');
  return sleep(100);
}
