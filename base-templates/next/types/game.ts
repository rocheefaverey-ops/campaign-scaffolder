export type Platform = 'ios' | 'android' | 'desktop';

export type CampaignStatus = 'upcoming' | 'active' | 'past';

export interface GameState {
  // Auth
  token: string | null;
  userId: string | null;

  // User
  userName: string;
  alreadyRegistered: boolean;

  // Session
  sessionId: string | null;

  // Score
  score: number;
  highscore: number;
  rank: number | null;

  // Flow
  loading: boolean;
  gameIsReady: boolean;
  onboardingCompleted: boolean;
  campaignStatus: CampaignStatus | null;

  // Device
  platform: Platform;
  isMuted: boolean;
}

export interface GameActions {
  setToken: (token: string) => void;
  setUserId: (id: string) => void;
  setUserName: (name: string) => void;
  setAlreadyRegistered: (v: boolean) => void;
  setSessionId: (id: string) => void;
  setScore: (score: number) => void;
  setHighscore: (score: number) => void;
  setRank: (rank: number) => void;
  setLoading: (v: boolean) => void;
  setGameIsReady: (v: boolean) => void;
  setOnboardingCompleted: (v: boolean) => void;
  setCampaignStatus: (status: CampaignStatus) => void;
  setIsMuted: (v: boolean) => void;
  reset: () => void;
}

export type GameContextValue = GameState & GameActions;
