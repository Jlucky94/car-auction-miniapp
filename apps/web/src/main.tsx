import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { type UpgradeView } from '@car-auction/shared';

import { createLocalGameStateStorage } from './game/local-game-storage';
import { UPGRADE_IDS, useLocalGame } from './game/use-local-game';
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
const storage = createLocalGameStateStorage();

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
  const [authState, setAuthState] = React.useState<AuthState>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;

    async function runAuth() {
      const initData = window.Telegram?.WebApp?.initData || (import.meta.env.DEV ? DEV_INIT_DATA : undefined);

      if (!initData) {
        setAuthState({ status: 'local', message: 'Local save active' });
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
            message: error instanceof Error ? `${error.message}. Local save active.` : 'Local save active.'
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

function getCategoryLabel(category: UpgradeView['category']): string {
  switch (category) {
    case 'tap':
      return 'Active';
    case 'passive':
      return 'Idle';
    case 'tap-multiplier':
      return 'Tap Boost';
    case 'passive-multiplier':
      return 'Idle Boost';
    case 'global-multiplier':
      return 'All Profit';
  }
}

function getPrimaryUpgrade(upgradeViews: UpgradeView[]): UpgradeView | undefined {
  const unlocked = upgradeViews.filter((upgrade) => upgrade.unlocked);
  const pool = unlocked.length > 0 ? unlocked : upgradeViews;

  return pool.reduce((best, current) => {
    if (!best) {
      return current;
    }

    if (current.canAfford && !best.canAfford) {
      return current;
    }

    if (current.canAfford === best.canAfford) {
      if (current.tapsToAfford < best.tapsToAfford) {
        return current;
      }

      if (current.tapsToAfford === best.tapsToAfford && current.cost < best.cost) {
        return current;
      }
    }

    return best;
  }, pool[0]);
}

function App() {
  const authState = useAuthState();
  const { gameState, coins, stats, upgradeViews, offlineReward, performTap, purchase, advanceByMs } = useLocalGame(storage);

  const primaryUpgrade = React.useMemo(() => {
    return getPrimaryUpgrade(upgradeViews);
  }, [upgradeViews]);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        mode: 'idle-clicker',
        layout: 'mobile-portrait',
        storageMode: 'local-only',
        coins: Number(coins.toFixed(2)),
        coinsPerTap: stats.coinsPerTap,
        coinsPerSecond: Number(stats.coinsPerSecond.toFixed(2)),
        tapMultiplier: Number(stats.tapMultiplier.toFixed(2)),
        passiveMultiplier: Number(stats.passiveMultiplier.toFixed(2)),
        globalMultiplier: Number(stats.globalMultiplier.toFixed(2)),
        lastProcessedAt: gameState.meta.lastProcessedAt,
        upgrades: upgradeViews.map((upgrade: UpgradeView) => ({
          id: upgrade.id,
          level: upgrade.level,
          cost: upgrade.cost,
          canAfford: upgrade.canAfford,
          tapsToAfford: upgrade.tapsToAfford,
          unlocked: upgrade.unlocked
        })),
        milestones: stats.activeMilestones.map((milestone) => milestone.id),
        offlineReward: offlineReward
          ? {
              coinsEarned: Number(offlineReward.coinsEarned.toFixed(2)),
              elapsedMs: offlineReward.elapsedMs
            }
          : null,
        coordinates: 'UI only; no world coordinates'
      });

    window.advanceTime = (ms: number) => {
      advanceByMs(ms);
    };

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [advanceByMs, coins, gameState.meta.lastProcessedAt, offlineReward, stats, upgradeViews]);

  return (
    <main className="app-shell">
      <section className="status-card">
        <div className="status-row">
          <div>
            <p className="eyebrow">Dealership cash</p>
            <h1>{formatCoins(coins)}</h1>
          </div>
          <div className="session-chip">
            {authState.status === 'authenticated' ? 'Telegram session' : 'Local save'}
          </div>
        </div>
        <div className="status-pill-group">
          <span className="status-pill">+{formatCoins(stats.coinsPerTap)} / tap</span>
          <span className="status-pill">+{formatRate(stats.coinsPerSecond)} / sec</span>
          {stats.globalMultiplier > 1 && <span className="status-pill">x{formatRate(stats.globalMultiplier)} all</span>}
        </div>
        <p className="auth-hint">
          {authState.status === 'authenticated'
            ? `Telegram linked as ${authState.user.firstName}`
            : authState.status === 'checking'
              ? 'Checking Telegram session...'
              : authState.message}
        </p>
      </section>

      {primaryUpgrade && (
        <section className="focus-card" aria-live="polite">
          <span className="focus-card__eyebrow">Next target</span>
          <strong>{primaryUpgrade.label}</strong>
          <span>
            {!primaryUpgrade.unlocked
              ? primaryUpgrade.unlockHint
              : primaryUpgrade.canAfford
              ? `Ready now for ${formatCoins(primaryUpgrade.cost)}`
              : `${primaryUpgrade.tapsToAfford} taps left to ${formatCoins(primaryUpgrade.cost)}`}
          </span>
        </section>
      )}

      {stats.activeMilestones.length > 0 && (
        <section className="milestone-card">
          <span className="focus-card__eyebrow">Milestones active</span>
          <div className="milestone-chip-row">
            {stats.activeMilestones.map((milestone) => (
              <span key={milestone.id} className="milestone-chip">
                {milestone.title}
              </span>
            ))}
          </div>
        </section>
      )}

      {offlineReward && (
        <section className="offline-banner" aria-live="polite">
          Back after {formatOfflineDuration(offlineReward.elapsedMs)}: +{formatCoins(offlineReward.coinsEarned)} coins
        </section>
      )}

      <section className="tap-panel">
        <button type="button" className="tap-button" onClick={performTap}>
          <span className="tap-button__label">Tap to sell</span>
          <span className="tap-button__value">+{formatCoins(stats.coinsPerTap)}</span>
          <span className="tap-button__subtle">Fast cash, then automate.</span>
        </button>
      </section>

      <section className="upgrades-panel">
        <div className="panel-header">
          <h2>Upgrades</h2>
          <span>Balanced for quick early momentum.</span>
        </div>
        <div className="upgrade-list">
          {upgradeViews.map((upgrade: UpgradeView) => (
            <article key={upgrade.id} className="upgrade-card">
              <div className="upgrade-copy">
                <div className="upgrade-title-row">
                  <h3>{upgrade.label}</h3>
                  <span className="upgrade-level">Lv. {upgrade.level}</span>
                </div>
                <div className="upgrade-category-row">
                  <span className="upgrade-category">{getCategoryLabel(upgrade.category)}</span>
                  <span className="upgrade-short">{upgrade.shortLabel}</span>
                </div>
                <p>{upgrade.description}</p>
                <div className="upgrade-meta-row">
                  <span className="upgrade-effect">
                    {upgrade.effectLabel} {formatRate(upgrade.effectPerLevel)}
                  </span>
                  <span className="upgrade-affordance">
                    {!upgrade.unlocked ? 'Locked' : upgrade.canAfford ? 'Ready' : `${upgrade.tapsToAfford} taps`}
                  </span>
                </div>
                <p className="upgrade-boost">{upgrade.boostSummary}</p>
                {!upgrade.unlocked && upgrade.unlockHint && <p className="upgrade-lock">{upgrade.unlockHint}</p>}
                <div className="upgrade-progress" aria-hidden="true">
                  <span style={{ width: `${Math.max(8, upgrade.affordability * 100)}%` }} />
                </div>
              </div>
              <button
                type="button"
                className="upgrade-button"
                onClick={() => purchase(upgrade.id)}
                disabled={!upgrade.canAfford}
              >
                {upgrade.unlocked ? `Buy ${formatCoins(upgrade.cost)}` : 'Locked'}
              </button>
            </article>
          ))}
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
