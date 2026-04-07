import type { FetchDataResponse } from './fetch-data';

export interface CreateSessionRequest {
  token: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  startedAt: string;
}

export type CreateSessionResult = FetchDataResponse<CreateSessionResponse>;

export interface EndSessionRequest {
  token: string;
  sessionId: string;
  score: number;
  playTime?: number;
  payload?: string;
}

export interface EndSessionResponse {
  rank?: number;
  highscore?: number;
  alreadyRegistered?: boolean;
}

export type EndSessionResult = FetchDataResponse<EndSessionResponse>;
