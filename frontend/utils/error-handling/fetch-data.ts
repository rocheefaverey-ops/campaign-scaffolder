import ErrorReporting from './error-reporting';

export const fetchData = async <T>(handler: () => Promise<T>): Promise<T | null> => {
  try {
    return await handler();
  } catch (error) {
    ErrorReporting.reportAny(error);
    return null;
  }
};
