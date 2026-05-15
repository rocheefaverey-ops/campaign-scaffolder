import type { IUnityTranslations } from '~/interfaces/unity/IUnityApplication.ts';
import type { HttpMethodType, UnityNavigationType, UnityTrackingType } from '~/utils/Constants.ts';

/**
 * Interface for loading a Unity scene - holds all information necessary to load a scene
 * Scene key value must be provided by Unity devs
 */
export interface IUnitySceneLoad {
  skipPreload?: boolean;
  sceneKey: string;
}

/**
 * Interface for Unity input data - this must be provided at least once before scenes can be loaded
 * Can be expanded as needed, but translations and environment are required
 */
export interface IUnityBaseInput {
  useMockAPI?: boolean;
  environment: string;
}
export interface IUnityInput {
  translations: IUnityTranslations;
}
export type IUnityFullInput = IUnityBaseInput & IUnityInput;

/**
 * Interfaces needed for API requests via Unity
 */
export interface IUnityApiBase {
  uuid: string;
}

export interface IUnityApiRequest extends IUnityApiBase {
  method: HttpMethodType;
  path: string;
  data?: Record<string, unknown>;
}

export interface IUnityApiResponse<T> extends IUnityApiBase {
  success: boolean;
  data: T;
}

export interface IUnityApiError {
  code: string;
  message: string;
}

/**
 * Interfaces for navigation and tracking events from Unity
 */
export interface IUnityNavigation {
  type: UnityNavigationType;
  target?: string;
}

export interface IUnityTracking {
  type: UnityTrackingType;
  name: string;
  data?: Record<string, unknown>;
}

/**
 * Interface for when a Unity game session ends - holds all information necessary for the API and score screen
 * Can be customized as needed, although for GP these fields would need to be standardized (partially)
 */
export interface IUnityGameResult {
  playTime: number;
}
