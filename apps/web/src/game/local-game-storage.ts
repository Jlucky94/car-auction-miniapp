import {
  DEFAULT_ECONOMY_CONFIG,
  createInitialGameState,
  rehydrateGameState,
  type GameState
} from '@car-auction/shared';

export interface GameStateStorage {
  load(now?: number): GameState;
  save(state: GameState): void;
}

export const LOCAL_STORAGE_KEY = 'car-auction-idle-clicker-v1';

export function createLocalGameStateStorage(storageKey = LOCAL_STORAGE_KEY): GameStateStorage {
  return {
    load(now = Date.now()) {
      if (typeof window === 'undefined') {
        return createInitialGameState(now, DEFAULT_ECONOMY_CONFIG);
      }

      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return createInitialGameState(now, DEFAULT_ECONOMY_CONFIG);
      }

      try {
        return rehydrateGameState(JSON.parse(raw), now, DEFAULT_ECONOMY_CONFIG);
      } catch {
        return createInitialGameState(now, DEFAULT_ECONOMY_CONFIG);
      }
    },
    save(state: GameState) {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    }
  };
}
