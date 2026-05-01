import type { FetchDataResponse } from './fetch-data';

export interface AuthenticateRequest {
  /** CAPE/SSO token passed in from the embedding page */
  token?: string;
  /** Platform identifier (e.g. 'ios' | 'android' | 'desktop') */
  platform?: string;
}

export interface AuthenticateResponse {
  token: string;
  userId: string;
  onboardingCompleted: boolean;
  alreadyRegistered: boolean;
  campaign: {
    status: 'upcoming' | 'active' | 'past';
    startsAt?: string;
    endsAt?: string;
  };
}

export type AuthenticateResult = FetchDataResponse<AuthenticateResponse>;
