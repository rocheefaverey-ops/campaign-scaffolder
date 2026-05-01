/**
 * Global type augmentations.
 * Extend as needed per campaign.
 */
declare global {
  interface Window {
    /** Unity WebGL instance — set by the Unity loader script */
    unityInstance?: {
      SendMessage(objectName: string, methodName: string, value?: string): void;
      SetFullscreen(enabled: boolean): void;
      Quit(): Promise<void>;
    };

    /** Muted state read by Unity .jslib files */
    muted?: boolean;

    /** Internal GameBridge event dispatcher (set by UnityGameBridgeAdapter) */
    __bridgeDispatch?: (event: string, data: string) => void;
  }
}

export {};
