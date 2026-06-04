import { create } from 'zustand';
import type { IUnityGameResult } from '~/interfaces/unity/IUnity.ts';

interface IUnityStore {
  result: IUnityGameResult;
  setResult: (result: string) => void;
}

const BEST_SCORE_KEY = 'unity-best-score';

function readNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const score = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(score)) return score;
  }
  return undefined;
}

function readStoredBestScore(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  return readNumber(window.localStorage.getItem(BEST_SCORE_KEY));
}

function writeStoredBestScore(score: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BEST_SCORE_KEY, String(score));
}

export const useUnityStore = create<IUnityStore>((set) => ({
  result: {
    playTime: 0,
    highScore: readStoredBestScore(),
  },
  setResult: (result: string) => {
    try {
      const parsedResult = JSON.parse(result);
      const score = readNumber(parsedResult.score, parsedResult.playerScore, parsedResult.points) ?? 0;
      const payloadBest = readNumber(parsedResult.highScore, parsedResult.highscore, parsedResult.bestScore);

      // Rebuild the result object, to make sure all fields are present
      set((state) => {
        const previousBest = readStoredBestScore() ?? state.result.highScore ?? 0;
        const highScore = Math.max(previousBest, payloadBest ?? 0, score);
        writeStoredBestScore(highScore);

        return {
          result: {
            playTime: parsedResult.playTime ?? 0,
            score,
            highScore,
            rank: parsedResult.rank,
            collectedTokens: parsedResult.collectedTokens,
            distance: parsedResult.distance,
            lapsCompleted: parsedResult.lapsCompleted,
            voucherCode: parsedResult.voucherCode,
            payload: parsedResult.payload,
          },
        };
      });
    } catch (e) {
      console.error('Failed to parse Unity result payload:', e);
    }
  },
}));
