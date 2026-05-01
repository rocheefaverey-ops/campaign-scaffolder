export interface IApiResult<T> {
  data: T,
  _debug?: {
    request: {
      method: string;
      url: string;
      data?: object;
    };
    response: {
      status: number;
      data: T | object;
    };
  }
}

export interface IApiError {
  code?: string;
  message?: string;
}
