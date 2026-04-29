import { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from 'next/dist/server/api-utils';
import ErrorReporting from './error-reporting';
import Logger from './logger';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | ('GET' | 'POST' | 'PUT' | 'DELETE')[];
type ApiHandler<T> = (req: NextApiRequest, res: NextApiResponse) => Promise<T>;

const isError = (exception: unknown): exception is Error => exception instanceof Error;
const getExceptionStatus = (exception: unknown) => (exception instanceof ApiError ? exception.statusCode : 500);
const getExceptionStack = (exception: unknown) => (isError(exception) ? exception.stack : undefined);

/**
 * Exception handler
 * This is used for the APIs to handle exceptions and http status codes
 * @param handler
 * @param method
 * @param encrypted
 */
const withExceptionHandler =
  <T>(handler: ApiHandler<T>, method: ApiMethod, encrypted?: boolean) =>
  async (req: NextApiRequest, res: NextApiResponse): Promise<T | void> => {
    try {
      const requestMethod = req.method && req.method !== 'OPTIONS' ? req.method : req.headers['access-control-request-method'];

      if ((!Array.isArray(method) && requestMethod !== method) || (Array.isArray(method) && !method.find((methodItem) => requestMethod === methodItem))) {
        return res.status(405).send({ message: `Only ${method} requests allowed` });
      }

      const data = await handler(req, res);

      if (!data || typeof data === 'string') {
        throw new ApiError(500, `Internal Server Error`);
      }

      // Convert output to base64 to hide data
      if (encrypted) {
        const rawData: string = Buffer.from(JSON.stringify(data)).toString('base64');
        return res.status(200).send(rawData);
      }
      // Regular JSON request

      return res.status(200).json(data);
    } catch (exception) {
      const { url } = req;
      const statusCode = getExceptionStatus(exception);
      const stack = getExceptionStack(exception);

      // This is the context being logged
      ErrorReporting.reportAny(exception, req);

      // If we are able to retrieve the stack, we add it to the debugging logs
      if (stack) {
        Logger.debug(stack);
      }

      const timestamp = new Date().toISOString();

      // Return just enough information without leaking any data
      const responseBody = {
        statusCode,
        timestamp,
        path: url
      };
      return res.status(statusCode).send(responseBody);
    }
  };

export { withExceptionHandler };
