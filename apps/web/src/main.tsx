import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DEFAULT_ECONOMY_CONFIG,
  UPGRADE_IDS,
  applyElapsedTime,
  applyTap,
  buyUpgrade,
  createInitialGameState,
  getDerivedStats,
  getUpgradeCost,
  rehydrateGameState,
  type GameState,
  type UpgradeId
} from '@car-auction/shared';

import './styles.css';

type User = {
  id: string;
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  photoUrl: string | null;
};

type AuthState =
  | { status: 'checking' }
  | { status: 'local'; message: string }
  | { status: 'authenticated'; accessToken: string; user: User }
  | { status: 'error'; message: string };

type OfflineReward = {
  coinsEarned: number;
  elapsedMs: number;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const DEV_INIT_DATA = import.meta.env.VITE_DEV_TELEGRAM_INIT_DATA as string | undefined;
const STORAGE_KEY = 'car-auction-idle-clicker-v1';
const TICK_MS = 1000;

async function authenticate(initData: string) {
  const response = await fetch('/api/v1/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });

  if (!response.ok) {
    throw new Error('Unable to authenticate with Telegram');
  }

  return (await response.json()) as { accessToken: string; user: User };
}

function loadStoredGameState(now = Date.now()): GameState {
  if (typeof window === 'undefined') {
    return createInitialGameState(now, DEFAULT_ECONOMY_CONFIG);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialGameState(now, DEFAULT_ECONOMY_CONFIG);
  }

  try {
    return rehydrateGameState(JSON.parse(raw), now, DEFAULT_ECONOMY_CONFIG);
  } catch {
    return createInitialGameState(now, DEFAULT_ECONOMY_CONFIG);
  }
}

function saveStoredGameState(state: GameState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCoins(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1
    });
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: value < 10 && value % 1 !== 0 ? 1 : 0,
    maximumFractionDigits: 1
  });
}

function formatRate(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1
  });
}

function formatOfflineDuration(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function useAuthState() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;

    async function runAuth() {
      const initData = window.Telegram?.WebApp?.initData || (import.meta.env.DEV ? DEV_INIT_DATA : undefined);

      if (!initData) {
        setAuthState({
          status: 'local',
          message: 'Local progress mode'
        });
        return;
      }

      try {
        const auth = await authenticate(initData);
        if (!cancelled) {
          setAuthState({ status: 'authenticated', ...auth });
        }
      } catch (error) {
        if (!cancelled) {
          setAuthState({
            status: 'error',
            message: error instanceof Error ? `${error.message}. Falling back to local progress.` : 'Falling back to local progress.'
          });
        }
      }
    }

    void runAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  return authState;
}

function App() {
  const authState = useAuthState();
  const [gameState, setGameState] = useState<GameState>(() => loadStoredGameState());
  const [offlineReward, setOfflineReward] = useState<OfflineReward | null>(null);
  const stateRef = useRef(gameState);

  useEffect(() => {
    stateRef.current = gameState;
    saveStoredGameState(gameState);
  }, [gameState]);

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

  const stats = useMemo(() => getDerivedStats(gameState, DEFAULT_ECONOMY_CONFIG), [gameState]);

  const performTap = useCallback(() => {
    setOfflineReward(null);
    commitGameState(applyTap(stateRef.current, DEFAULT_ECONOMY_CONFIG));
  }, [commitGameState]);

  const purchase = useCallback((upgradeId: UpgradeId) => {
    commitGameState(buyUpgrade(stateRef.current, upgradeId, DEFAULT_ECONOMY_CONFIG));
  }, [commitGameState]);

  useEffect(() => {
    window.render_game_to_text = () => {
      const currentState = stateRef.current;
      const currentStats = getDerivedStats(currentState, DEFAULT_ECONOMY_CONFIG);

      return JSON.stringify({
        mode: 'idle-clicker',
        layout: 'mobile-portrait',
        coins: Number(currentState.coins.toFixed(2)),
        coinsPerTap: currentStats.coinsPerTap,
        coinsPerSecond: Number(currentStats.coinsPerSecond.toFixed(2)),
        lastProcessedAt: currentState.lastProcessedAt,
        upgrades: UPGRADE_IDS.map((upgradeId) => ({
          id: upgradeId,
          level: currentState.upgradeLevels[upgradeId],
          cost: getUpgradeCost(currentState, upgradeId, DEFAULT_ECONOMY_CONFIG)
        })),
        offlineReward: offlineReward
          ? {
              coinsEarned: Number(offlineReward.coinsEarned.toFixed(2)),
              elapsedMs: offlineReward.elapsedMs
            }
          : null,
        coordinates: 'UI only; no world coordinates'
      });
    };

    window.advanceTime = (ms: number) => {
      const now = stateRef.current.lastProcessedAt + Math.max(0, Math.floor(ms));
      const result = applyElapsedTime(stateRef.current, now, DEFAULT_ECONOMY_CONFIG);
      commitGameState(result.state);
    };

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [commitGameState, offlineReward]);

  return (
    <main className="app-shell">
      <section className="status-card">
        <div>
          <p className="eyebrow">Dealership cash</p>
          <h1>{formatCoins(gameState.coins)}</h1>
        </div>
        <div className="status-pill-group">
          <span className="status-pill">+{formatCoins(stats.coinsPerTap)} / tap</span>
          <span className="status-pill">+{formatRate(stats.coinsPerSecond)} / sec</span>
        </div>
        <p className="auth-hint">
          {authState.status === 'authenticated'
            ? `Telegram linked as ${authState.user.firstName}`
            : authState.status === 'checking'
              ? 'Checking Telegram session...'
              : authState.message}
        </p>
      </section>

      {offlineReward && (
        <section className="offline-banner" aria-live="polite">
          Back after {formatOfflineDuration(offlineReward.elapsedMs)}: +{formatCoins(offlineReward.coinsEarned)} coins
        </section>
      )}

      <section className="tap-panel">
        <button type="button" className="tap-button" onClick={performTap}>
          <span className="tap-button__label">Tap to sell</span>
          <span className="tap-button__value">+{formatCoins(stats.coinsPerTap)}</span>
        </button>
      </section>

      <section className="upgrades-panel">
        <div className="panel-header">
          <h2>Upgrades</h2>
          <span>First minutes should move fast.</span>
        </div>
        <div className="upgrade-list">
          {UPGRADE_IDS.map((upgradeId) => {
            const upgrade = DEFAULT_ECONOMY_CONFIG.upgrades[upgradeId];
            const cost = getUpgradeCost(gameState, upgradeId, DEFAULT_ECONOMY_CONFIG);
            const level = gameState.upgradeLevels[upgradeId];
            const canBuy = gameState.coins >= cost;

            return (
              <article key={upgradeId} className="upgrade-card">
                <div className="upgrade-copy">
                  <div className="upgrade-title-row">
                    <h3>{upgrade.label}</h3>
                    <span className="upgrade-level">Lv. {level}</span>
                  </div>
                  <p>{upgrade.description}</p>
                  <span className="upgrade-effect">
                    {upgrade.effectLabel} {formatRate(upgrade.effectPerLevel)}
                  </span>
                </div>
                <button
                  type="button"
                  className="upgrade-button"
                  onClick={() => purchase(upgradeId)}
                  disabled={!canBuy}
                >
                  Buy {formatCoins(cost)}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
