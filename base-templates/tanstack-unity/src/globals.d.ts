import type { IUnityApplication, UnityEventCallback, UnityLoader } from '~/interfaces/unity/IUnityApplication.ts';

declare global {
  interface Window {
    // Tracking
    dataLayer?: Array<Record<string, unknown>>;

    // Unity
    createUnityInstance: UnityLoader;
    unityEventMap: Map<string, Array<UnityEventCallback>>;
    unityInstance: IUnityApplication;
  }
}
