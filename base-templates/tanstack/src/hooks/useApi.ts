import { useServerFn } from '@tanstack/react-start';

type AwaitedData<T> =
  T extends (...args: Array<never>) => Promise<infer R>
    ? R extends { data: infer D } ? D : never
    : never;

export function useApi<T extends Parameters<typeof useServerFn>[0]>(serverFn: T) {
  const callFn = useServerFn(serverFn);

  return async (...params: Parameters<typeof callFn>): Promise<AwaitedData<T>> => {
    const result = await callFn(...params);

    if (!result) {
      console.warn('[API] No result returned from server function!');
      return null as AwaitedData<T>;
    }

    if (result._debug) {
      console.info(`[API] Request: ${result._debug.request.method} ${result._debug.request.url}\n${JSON.stringify(result._debug.request.data)}`);
      console.info(`[API] Response:\n${JSON.stringify(result.data)}`);
    }

    return result.data as AwaitedData<T>;
  };
}
