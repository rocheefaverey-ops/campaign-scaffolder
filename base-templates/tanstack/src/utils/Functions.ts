import { createIsomorphicFn, createServerFn } from '@tanstack/react-start';
import { getRequest, getRequestHeader } from '@tanstack/react-start/server';
import type { PlatformType } from '~/utils/Constants.ts';
import type { IUnityVersion } from '~/interfaces/unity/IUnityApplication.ts';
import { extractBaseUrl, parsePlatform } from '~/utils/Helper.ts';

/**
 * Get base URL for Unity
 */
export const getUnityEnvironment = createServerFn().handler(async () => {
  // When UNITY_BASE_URL is empty and no UNITY_VERSION fallback, Unity is not configured.
  // Return url:'' so callers can skip loader injection and initialization.
  if (!process.env.UNITY_BASE_URL?.trim() && !process.env.UNITY_VERSION?.trim()) {
    return { url: '', isLocal: false };
  }

  let url = `${process.env.UNITY_BASE_URL}/`;
  let isLocal = false;

  // Retrieve version JSON
  try {
    const response = await fetch(`${url}${process.env.UNITY_GAME_NAME}/version.json`);

    // Check if fetch was successful
    if (!response.ok) {
      throw new Error(`Failed to fetch version.json: ${response.status} ${response.statusText}`);
    }

    // Parse JSON and build URL
    const versionJson: IUnityVersion = await response.json();
    url += `${process.env.UNITY_GAME_NAME}/`;
    url += `V${versionJson.currentVersion}/`;
  } catch (e) {
    if (process.env.UNITY_VERSION) {
      // version.json not present on CDN — use hardcoded version from env
      url += `${process.env.UNITY_GAME_NAME}/`;
      url += `${process.env.UNITY_VERSION}/`;
    } else {
      console.warn('Falling back to local game hosting, because:', e);
      isLocal = true;
    }
  }

  // Apply device filter
  url += `${getPlatform()}/`;
  return { url, isLocal };
});

/**
 * Get current url of the website, handy for e.g. QR codes
 */
export const getBaseUrl = createIsomorphicFn()
  .server(() => {
    const req = getRequest();
    return extractBaseUrl(req.url);
  })
  .client(() => {
    return window.location.origin;
  });

/**
 * Get current platform (android, ios, desktop)
 */
export const getPlatform = createIsomorphicFn()
  .server((): PlatformType => {
    const header = getRequestHeader('user-agent') || '';
    return parsePlatform(header);
  })
  .client((): PlatformType => {
    return parsePlatform(navigator.userAgent);
  });
