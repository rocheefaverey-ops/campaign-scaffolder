export type UnityLoader = (canvas: HTMLCanvasElement, config: IUnityConfig, callback?: (progress: number) => void) => Promise<IUnityApplication>;
export type UnityEventCallback = (...data: Array<any>) => void;
export type UnityMessageFunction = (objectName: string, methodName: string, data?: string | number) => void;

export interface IUnityApplication {
  Quit: () => void;
  SendMessage: (gameObjectName: string, scriptFunctionName: string, data?: string | number) => void;
}

export interface IUnityVersion {
  currentVersion: number;
  availableVersions: Array<number>;
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
  errorHandler?: (message: string, filename: string, lineno: number) => boolean;
}

export interface IUnityTranslations {
  [key: string]: string;
}
