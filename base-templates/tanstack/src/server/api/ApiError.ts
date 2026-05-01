export class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message?: string
  ) {
    super(message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
  }

  static toSimple(error: unknown): { code: string; message: string } {
    if (error instanceof ApiError) {
      return {
        code: error.code ?? 'ApiError',
        message: error.message,
      };
    }
    if (error instanceof Error) {
      return {
        code: error.name,
        message: error.message,
      };
    }
    return {
      code: 'UnknownError',
      message: String(error),
    };
  }
}
