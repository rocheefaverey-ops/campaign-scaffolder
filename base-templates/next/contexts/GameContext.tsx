'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { GameContextValue, GameState, CampaignStatus, Platform } from '@/types/game';
import { getStorage, setStorage } from '@utils/storage';

const STORAGE_KEY = 'campaign-state';

const defaultState: GameState = {
  token: null,
  userId: null,
  userName: '',
  alreadyRegistered: false,
  sessionId: null,
  score: 0,
  highscore: 0,
  rank: null,
  loading: false,
  gameIsReady: false,
  onboardingCompleted: false,
  campaignStatus: null,
  platform: 'desktop',
  isMuted: false,
};

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: ReactNode;
  platform: Platform;
  nonce?: string;
}

export function GameProvider({ children, platform }: GameProviderProps) {
  const [state, setState] = useState<GameState>(() => {
    // Rehydrate persisted fields from storage on mount
    const stored = getStorage<Partial<GameState>>(STORAGE_KEY);
    return {
      ...defaultState,
      platform,
      token: stored?.token ?? null,
      userId: stored?.userId ?? null,
      userName: stored?.userName ?? '',
      alreadyRegistered: stored?.alreadyRegistered ?? false,
      onboardingCompleted: stored?.onboardingCompleted ?? false,
      highscore: stored?.highscore ?? 0,
      isMuted: stored?.isMuted ?? false,
    };
  });

  // Persist key fields to storage whenever they change
  useEffect(() => {
    setStorage(STORAGE_KEY, {
      token: state.token,
      userId: state.userId,
      userName: state.userName,
      alreadyRegistered: state.alreadyRegistered,
      onboardingCompleted: state.onboardingCompleted,
      highscore: state.highscore,
      isMuted: state.isMuted,
    });
  }, [
    state.token,
    state.userId,
    state.userName,
    state.alreadyRegistered,
    state.onboardingCompleted,
    state.highscore,
    state.isMuted,
  ]);

  const set = useCallback(
    <K extends keyof GameState>(key: K, value: GameState[K]) =>
      setState((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const reset = useCallback(() => {
    setState({ ...defaultState, platform });
    setStorage(STORAGE_KEY, null);
  }, [platform]);

  // Stable setter functions via useCallback with empty deps
  const setters = useMemo(
    () => ({
      setToken: (v: string | null) => set('token', v),
      setUserId: (v: string | null) => set('userId', v),
      setUserName: (v: string) => set('userName', v),
      setAlreadyRegistered: (v: boolean) => set('alreadyRegistered', v),
      setSessionId: (v: string | null) => set('sessionId', v),
      setScore: (v: number) => set('score', v),
      setHighscore: (v: number) => set('highscore', v),
      setRank: (v: number | null) => set('rank', v),
      setLoading: (v: boolean) => set('loading', v),
      setGameIsReady: (v: boolean) => set('gameIsReady', v),
      setOnboardingCompleted: (v: boolean) => set('onboardingCompleted', v),
      setCampaignStatus: (v: CampaignStatus) => set('campaignStatus', v),
      setIsMuted: (v: boolean) => set('isMuted', v),
      reset,
    }),
    [set, reset],
  );

  const value: GameContextValue = useMemo(
    () => ({
      ...state,
      ...setters,
    }),
    [state, setters],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within <GameProvider>');
  return ctx;
}
