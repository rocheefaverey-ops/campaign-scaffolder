'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { GameContextValue, GameState, CampaignStatus, Platform } from '@/types/game';
import type { ICapeData } from '@lib/cape/cape.types';
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
  loading: true,
  gameIsReady: false,
  onboardingCompleted: false,
  campaignStatus: null,
  platform: 'desktop',
  isMuted: false,
};

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: ReactNode;
  capeData: ICapeData | null;
  platform: Platform;
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

  const value: GameContextValue = {
    ...state,
    setToken: (v) => set('token', v),
    setUserId: (v) => set('userId', v),
    setUserName: (v) => set('userName', v),
    setAlreadyRegistered: (v) => set('alreadyRegistered', v),
    setSessionId: (v) => set('sessionId', v),
    setScore: (v) => set('score', v),
    setHighscore: (v) => set('highscore', v),
    setRank: (v) => set('rank', v),
    setLoading: (v) => set('loading', v),
    setGameIsReady: (v) => set('gameIsReady', v),
    setOnboardingCompleted: (v) => set('onboardingCompleted', v),
    setCampaignStatus: (v) => set('campaignStatus', v as CampaignStatus),
    setIsMuted: (v) => set('isMuted', v),
    reset,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within <GameProvider>');
  return ctx;
}
