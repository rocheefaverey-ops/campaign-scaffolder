import { create } from 'zustand';
import type { IUnityGameResult } from '~/interfaces/unity/IUnity.ts';

interface IUnityStore {
  result: IUnityGameResult;
  setResult: (result: string) => void;
}

export const useUnityStore = create<IUnityStore>((set) => ({
  result: {
    playTime: 0,
  },
  setResult: (result: string) => {
    try {
      const parsedResult = JSON.parse(result);

      // Rebuild the result object, to make sure all fields are present
      const newResult: IUnityGameResult = {
        playTime: parsedResult.playTime ?? 0,
      };

      // Update the store
      set({ result: newResult });
    } catch (e) {
      console.error('Failed to parse Unity result payload:', e);
    }
  },
}));
