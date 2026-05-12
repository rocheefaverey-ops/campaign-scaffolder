/**
 * Global type augmentations.
 * Extend as needed per campaign.
 */
declare global {
  interface Window {
    /** Unity WebGL instance — set by the Unity loader script */
    unityInstance?: unknown;

    /** Muted state read by Unity .jslib files */
    muted?: boolean;

    /** Internal GameBridge event dispatcher (set by UnityGameBridgeAdapter) */
    __bridgeDispatch?: (event: string, data: string) => void;
  }
}

export {};
