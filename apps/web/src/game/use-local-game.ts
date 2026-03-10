import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ECONOMY_CONFIG,
  UPGRADE_IDS,
  applyElapsedTime,
  applyTap,
  buyUpgrade,
  getCoins,
  getDerivedStats,
  getUpgradeViews,
  type GameState,
  type UpgradeId
} from '@car-auction/shared';

import { createLocalGameStateStorage, type GameStateStorage } from './local-game-storage';

export type OfflineReward = {
  coinsEarned: number;
  elapsedMs: number;
};

export type UseLocalGameResult = {
  gameState: GameState;
  coins: number;
  stats: ReturnType<typeof getDerivedStats>;
  upgradeViews: ReturnType<typeof getUpgradeViews>;
  offlineReward: OfflineReward | null;
  performTap: () => void;
  purchase: (upgradeId: UpgradeId) => void;
  advanceByMs: (ms: number) => void;
};

const TICK_MS = 1000;

export function useLocalGame(storage: GameStateStorage = createLocalGameStateStorage()): UseLocalGameResult {
  const [gameState, setGameState] = useState<GameState>(() => storage.load());
  const [offlineReward, setOfflineReward] = useState<OfflineReward | null>(null);
  const stateRef = useRef(gameState);

  useEffect(() => {
    stateRef.current = gameState;
    storage.save(gameState);
  }, [gameState, storage]);

  const commitGameState = useCallback((nextState: GameState) => {
    stateRef.current = nextState;
    setGameState(nextState);
  }, []);

  const processElapsed = useCallback((now: number, announceOfflineReward: boolean) => {
    const result = applyElapsedTime(stateRef.current, now, DEFAULT_ECONOMY_CONFIG);
    if (result.actualElapsedMs <= 0) {
      return;
    }

    commitGameState(result.state);

    if (announceOfflineReward) {
      if (result.coinsEarned > 0 && result.actualElapsedMs > TICK_MS * 2) {
        setOfflineReward({
          coinsEarned: result.coinsEarned,
          elapsedMs: result.appliedElapsedMs
        });
      } else {
        setOfflineReward(null);
      }
    }
  }, [commitGameState]);

  useEffect(() => {
    processElapsed(Date.now(), true);

    const interval = window.setInterval(() => {
      processElapsed(Date.now(), false);
    }, TICK_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        processElapsed(Date.now(), true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [processElapsed]);

  const performTap = useCallback(() => {
    setOfflineReward(null);
    commitGameState(applyTap(stateRef.current, DEFAULT_ECONOMY_CONFIG));
  }, [commitGameState]);

  const purchase = useCallback((upgradeId: UpgradeId) => {
    commitGameState(buyUpgrade(stateRef.current, upgradeId, DEFAULT_ECONOMY_CONFIG));
  }, [commitGameState]);

  const advanceByMs = useCallback((ms: number) => {
    const now = stateRef.current.meta.lastProcessedAt + Math.max(0, Math.floor(ms));
    const result = applyElapsedTime(stateRef.current, now, DEFAULT_ECONOMY_CONFIG);
    commitGameState(result.state);
  }, [commitGameState]);

  const stats = useMemo(() => getDerivedStats(gameState, DEFAULT_ECONOMY_CONFIG), [gameState]);
  const upgradeViews = useMemo(() => getUpgradeViews(gameState, DEFAULT_ECONOMY_CONFIG), [gameState]);

  return {
    gameState,
    coins: getCoins(gameState),
    stats,
    upgradeViews,
    offlineReward,
    performTap,
    purchase,
    advanceByMs
  };
}

export { UPGRADE_IDS };
