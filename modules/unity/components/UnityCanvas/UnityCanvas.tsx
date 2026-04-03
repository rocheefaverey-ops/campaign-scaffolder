'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GameBridgeContext } from '@hooks/useGameBridge';
import { UnityGameBridgeAdapter } from '@lib/game-bridge/unity-adapter';
import { BRIDGE_EVENTS } from '@lib/game-bridge/game-bridge.events';
import {
  UnityNavigationType,
  UnityTrackingType,
  type IGameResult,
  type IUnityNavigation,
  type IUnityTracking,
  type IUnityApiRequest,
  type IUnityApiResponse,
} from '@lib/game-bridge/game-bridge.types';
import { useGameContext } from '@hooks/useGameContext';
import UnityLoader from './UnityLoader';

interface UnityCanvasProps {
  /** Called when fullBoot() resolves — Unity is ready, game hasn't started yet */
  onReady?: () => void;
  /** Called with parsed IGameResult when Unity fires the 'end' event */
  onEnd?: (result: IGameResult) => void;
  /** Data to push into Unity via setData() before loadScene() */
  unityData: Parameters<UnityGameBridgeAdapter['setData']>[0];
  /** Scene to load. Defaults to 'game' */
  sceneKey?: string;
  className?: string;
}

export default function UnityCanvas({
  onReady,
  onEnd,
  unityData,
  sceneKey = 'game',
  className,
}: UnityCanvasProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setLoading } = useGameContext();
  const [loadProgress, setLoadProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Adapter lives in a ref so its identity is stable across renders
  const adapterRef = useRef<UnityGameBridgeAdapter | null>(null);
  // Expose to context consumers via state (triggers re-render once set)
  const [adapterForContext, setAdapterForContext] =
    useState<UnityGameBridgeAdapter | null>(null);

  const boot = useCallback(async () => {
    if (!canvasRef.current) return;

    const adapter = new UnityGameBridgeAdapter(canvasRef.current);
    adapterRef.current = adapter;

    // Wire up progress → loader bar
    adapter.on(BRIDGE_EVENTS.LOADING, (p: number) =>
      setLoadProgress(Math.round(p * 100)),
    );

    // Cross-boundary event handlers
    adapter.on<string>(BRIDGE_EVENTS.END, (raw) => {
      const result: IGameResult = tryParse(raw);
      onEnd?.(result);
    });

    adapter.on<string>(BRIDGE_EVENTS.NAVIGATION, (raw) => {
      const nav: IUnityNavigation = tryParse(raw);
      handleNavigation(nav, router);
    });

    adapter.on<string>(BRIDGE_EVENTS.TRACKING, (raw) => {
      const tracking: IUnityTracking = tryParse(raw);
      handleTracking(tracking);
    });

    adapter.on<string>(BRIDGE_EVENTS.API_REQUEST, async (raw) => {
      const req: IUnityApiRequest = tryParse(raw);
      const response = await proxyApiRequest(req);
      adapter.sendMessage('APIService', 'ProcessResponse', JSON.stringify(response));
    });

    // Push data and boot
    adapter.setData(unityData);
    adapter.setTargetScene(sceneKey);

    // Make adapter available in context before boot so DevTools can show state
    setAdapterForContext(adapter);
    setLoading(true);

    await adapter.fullBoot();

    setIsVisible(true);
    setLoading(false);
    onReady?.();
  }, [unityData, sceneKey, onEnd, onReady, router, setLoading]);

  useEffect(() => {
    boot();
    return () => adapterRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync muted state whenever it changes after boot
  const { isMuted } = useGameContext();
  useEffect(() => {
    if (!adapterRef.current || !isVisible) return;
    adapterRef.current.setData({ ...unityData, muted: isMuted });
  }, [isMuted, isVisible, unityData]);

  return (
    <GameBridgeContext.Provider value={adapterForContext}>
      <div className={`relative h-full w-full ${className ?? ''}`}>
        {!isVisible && <UnityLoader progress={loadProgress} />}
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ visibility: isVisible ? 'visible' : 'hidden' }}
        />
      </div>
    </GameBridgeContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Event handlers (keep outside component to avoid stale closures)
// ─────────────────────────────────────────────────────────────────────────────

function handleNavigation(nav: IUnityNavigation, router: ReturnType<typeof useRouter>) {
  switch (nav.type) {
    case UnityNavigationType.INTERNAL_URL:
      if (nav.target) router.push(nav.target);
      break;
    case UnityNavigationType.EXTERNAL_URL:
      if (nav.target) window.open(nav.target, '_blank', 'noopener,noreferrer');
      break;
    case UnityNavigationType.TERMS:
      // TODO: replace with CAPE terms URL
      window.open('/terms', '_blank', 'noopener,noreferrer');
      break;
  }
}

function handleTracking(tracking: IUnityTracking) {
  // Push to dataLayer — replace with your GTM/analytics setup
  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
  if (!dataLayer) return;

  if (tracking.type === UnityTrackingType.EVENT) {
    dataLayer.push({ event: tracking.name, ...tracking.data });
  } else if (tracking.type === UnityTrackingType.VIEW) {
    dataLayer.push({ event: 'pageview', pageName: tracking.name, ...tracking.data });
  }
}

async function proxyApiRequest(
  req: IUnityApiRequest,
): Promise<IUnityApiResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${req.path}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      ...(req.data ? { body: JSON.stringify(req.data) } : {}),
    });
    const data = await res.json();
    return { success: res.ok, uuid: req.uuid, data };
  } catch (err) {
    return { success: false, uuid: req.uuid, data: { error: String(err) } };
  }
}

function tryParse<T>(raw: string): T {
  try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
}
