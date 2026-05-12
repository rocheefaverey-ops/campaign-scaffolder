'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { UnityGame } from './UnityGame';
import { uLog } from './UnityLogger';
import type { IUnityVersion } from './IUnity';

type Platform = 'android' | 'ios' | 'desktop';

function detectPlatform(userAgent: string): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
}

interface UnityEnvironment {
  /** Full base URL including platform path, e.g. https://cdn.example.com/Game/V3/desktop/ */
  url: string;
  isLocal: boolean;
}

async function resolveUnityEnvironment(
  baseUrl: string,
  gameName: string
): Promise<UnityEnvironment | null> {
  const versionUrl = `${baseUrl}/${gameName}/version.json`;
  uLog.network('Fetching version.json', { url: versionUrl });

  try {
    const res = await fetch(versionUrl);
    if (!res.ok) {
      uLog.error('version.json fetch failed', { status: res.status });
      return null;
    }

    const data: IUnityVersion = await res.json();
    if (!data.currentVersion) {
      uLog.error('version.json missing currentVersion', data);
      return null;
    }

    const platform = detectPlatform(navigator.userAgent);
    uLog.platform('Platform detected', { platform });

    const url = `${baseUrl}/${gameName}/V${data.currentVersion}/${platform}/`;
    uLog.network('Unity environment resolved', { url, version: data.currentVersion });

    return { url, isLocal: false };
  } catch (e) {
    uLog.error('Failed to resolve Unity environment', e);
    return null;
  }
}

interface UnityContainerProps {
  children: React.ReactNode;
}

/**
 * UnityContainer — resolves the Unity build URL from version.json,
 * loads the Unity loader script, then mounts the UnityGame context provider.
 *
 * Place this in the campaign layout so the Unity instance persists across
 * page navigations (video → gameplay → result) without re-initializing.
 *
 * Required env vars:
 *   NEXT_PUBLIC_UNITY_BASE_URL   — CDN root, e.g. https://cdn.lwcf.nl
 *   NEXT_PUBLIC_UNITY_GAME_NAME  — game folder name, e.g. MyGame
 */
export default function UnityContainer({ children }: UnityContainerProps) {
  const [environment, setEnvironment] = useState<UnityEnvironment | null>(null);
  const [loaderUrl, setLoaderUrl] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Step 1: resolve version.json → build URL + platform
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_UNITY_BASE_URL;
    const gameName = process.env.NEXT_PUBLIC_UNITY_GAME_NAME;

    uLog.lifecycle('UnityContainer mounted', { baseUrl, gameName });

    if (!baseUrl || !gameName) {
      uLog.error('Missing NEXT_PUBLIC_UNITY_BASE_URL or NEXT_PUBLIC_UNITY_GAME_NAME');
      return;
    }

    resolveUnityEnvironment(baseUrl, gameName).then((env) => {
      if (!env) {
        uLog.error('Could not resolve Unity environment — Unity will not load');
        return;
      }
      setEnvironment(env);
      setLoaderUrl(`${env.url}Build/Build.loader.js`);
    });

    return () => {
      uLog.lifecycle('UnityContainer unmounted');
    };
  }, []);

  // Step 2: once loader script is ready, render UnityGame provider
  // (UnityGame itself calls createUnityInstance when initializeUnity() is invoked)
  const isReady = scriptReady && environment !== null;

  return (
    <>
      {loaderUrl && (
        <Script
          src={loaderUrl}
          strategy="afterInteractive"
          onLoad={() => {
            uLog.lifecycle('Unity loader script loaded', { loaderUrl });
            setScriptReady(true);
          }}
          onReady={() => {
            uLog.lifecycle('Unity loader script ready', { loaderUrl });
            setScriptReady(true);
          }}
          onError={(e) => {
            uLog.error('Unity loader script failed', { loaderUrl, error: String(e) });
          }}
        />
      )}

      {isReady ? (
        <UnityGame buildBaseUrl={environment.url} isLocal={environment.isLocal}>
          {children}
        </UnityGame>
      ) : (
        // Render children without Unity context while loader resolves
        children
      )}
    </>
  );
}
