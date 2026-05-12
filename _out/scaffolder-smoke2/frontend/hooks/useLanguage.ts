'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LanguageState {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      currentLanguage: (process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'NL').toUpperCase(),
      setLanguage: (lang) => set({ currentLanguage: lang }),
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'lw-language',
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      skipHydration: true,
    },
  ),
);

if (typeof window !== 'undefined') {
  useLanguageStore.persist.rehydrate();
}

/** Returns available language codes from CAPE settings.languages */
export function getAvailableLanguages(capeData: Record<string, unknown> | null): string[] {
  if (!capeData) return ['NL'];
  const languages = (capeData.settings as Record<string, unknown> | undefined)?.languages;
  if (Array.isArray(languages)) return languages.filter((l): l is string => typeof l === 'string');
  if (typeof languages === 'object' && languages !== null) return Object.keys(languages);
  return ['NL'];
}
