export const HttpMethodList = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethodType = (typeof HttpMethodList)[number];

export type PlatformType = 'android' | 'ios' | 'desktop';

export enum UnityNavigationType {
  INTERNAL_URL,
  EXTERNAL_URL,
  TERMS,
}

export enum UnityTrackingType {
  VIEW,
  EVENT,
}
