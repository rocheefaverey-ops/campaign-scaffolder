// ─── Unity loader & instance ─────────────────────────────────────────────────

/** Callback signature for Unity → JS events. Supports multiple arguments. */
export type UnityEventCallback = (...data: Array<unknown>) => void;

export interface IUnityApplication {
  Quit: () => void;
  SendMessage: (
    gameObjectName: string,
    scriptFunctionName: string,
    data?: string | number
  ) => void;
}

export interface IUnityConfig {
  companyName: string;
  productName: string;
  productVersion: string;
  dataUrl: string;
  frameworkUrl: string;
  streamingAssetsUrl: string;
  codeUrl: string;
  devicePixelRatio?: number;
  matchWebGLToCanvasSize?: boolean;
  cacheControl?: (url: string) => string;
}

export interface IUnityVersion {
  currentVersion: number;
  availableVersions?: Array<number>;
}

// ─── Data payloads ────────────────────────────────────────────────────────────

/**
 * Caller-provided data for setData().
 * UnityGame adds `environment` and `muted` automatically — callers don't need to supply them.
 * Extend per-campaign for game-specific fields (teams, config, etc.).
 */
export interface IUnitySetData {
  translations: Record<string, string>;
  playTutorial?: boolean;
  useMockAPI?: boolean;
  [key: string]: unknown;
}

/** Full data stored internally and sent to Unity via WebService.SetData */
export interface IUnityFullData extends IUnitySetData {
  environment: string;
  muted: boolean;
}

/** Payload sent to Unity via WebService.SetScene */
export interface IUnitySceneLoad {
  sceneKey: string;
  skipPreload?: boolean;
}

// ─── Window augmentation ─────────────────────────────────────────────────────

declare global {
  interface Window {
    createUnityInstance: (
      canvas: HTMLCanvasElement,
      config: IUnityConfig,
      onProgress?: (progress: number) => void
    ) => Promise<IUnityApplication>;
    unityInstance: IUnityApplication | undefined;
    /** Read synchronously by Unity .jslib files */
    muted: boolean;
    /** Unity dispatches events into this map via a .jslib call */
    unityEventMap: Map<string, Array<UnityEventCallback>>;
  }
}
