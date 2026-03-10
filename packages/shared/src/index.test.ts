import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ECONOMY_CONFIG,
  GAME_STATE_VERSION,
  UPGRADE_IDS,
  applyClick,
  applyElapsedTime,
  applyTap,
  buyUpgrade,
  canAffordUpgrade,
  createInitialGameState,
  createInitialState,
  getCoins,
  getDerivedStats,
  getTotalUpgradeLevels,
  getUnlockedMilestones,
  getUpgradeCost,
  getUpgradeView,
  isUpgradeUnlocked,
  rehydrateGameState,
  toLegacyGameState,
  type GameState,
  type UpgradeId
} from './index';

function buyByPriority(state: GameState, priority: UpgradeId[]): GameState {
  let nextState = state;

  while (true) {
    const before = nextState;

    for (const upgradeId of priority) {
      const candidate = buyUpgrade(nextState, upgradeId);
      if (candidate !== nextState) {
        nextState = candidate;
        break;
      }
    }

    if (before === nextState) {
      return nextState;
    }
  }
}

function simulateProgress(seconds: number, tapsPerSecond: number, priority: UpgradeId[]): GameState {
  let state = createInitialGameState(0);
  let now = 0;

  for (let second = 0; second < seconds; second += 1) {
    for (let tap = 0; tap < tapsPerSecond; tap += 1) {
      state = applyTap(state);
      state = buyByPriority(state, priority);
    }

    now += 1000;
    state = applyElapsedTime(state, now).state;
    state = buyByPriority(state, priority);
  }

  return state;
}

describe('legacy shared domain state', () => {
  it('createInitialState returns zero balance', () => {
    expect(createInitialState()).toEqual({ balance: 0 });
  });

  it('applyClick increments balance', () => {
    expect(applyClick({ balance: 3 })).toEqual({ balance: 4 });
  });
});

describe('idle clicker domain state', () => {
  it('createInitialGameState returns default values', () => {
    expect(createInitialGameState(1000)).toEqual({
      meta: {
        version: GAME_STATE_VERSION,
        lastProcessedAt: 1000
      },
      resources: {
        coins: 0
      },
      upgrades: {
        levels: {
          'tap-power': 0,
          'lot-traffic': 0,
          showroom: 0,
          'ad-campaign': 0,
          'finance-office': 0
        }
      }
    });
  });

  it('rehydrateGameState sanitizes invalid nested input', () => {
    expect(
      rehydrateGameState(
        {
          meta: { lastProcessedAt: NaN },
          resources: { coins: -5 },
          upgrades: { levels: { 'tap-power': 1.8 } }
        },
        5000
      )
    ).toEqual({
      meta: {
        version: GAME_STATE_VERSION,
        lastProcessedAt: 5000
      },
      resources: {
        coins: 0
      },
      upgrades: {
        levels: {
          'tap-power': 1,
          'lot-traffic': 0,
          showroom: 0,
          'ad-campaign': 0,
          'finance-office': 0
        }
      }
    });
  });

  it('rehydrateGameState migrates legacy flat state', () => {
    expect(
      rehydrateGameState({
        coins: 9,
        upgradeLevels: {
          'tap-power': 2,
          'passive-income': 1
        },
        lastProcessedAt: 1500
      })
    ).toEqual({
      meta: {
        version: GAME_STATE_VERSION,
        lastProcessedAt: 1500
      },
      resources: {
        coins: 9
      },
      upgrades: {
        levels: {
          'tap-power': 2,
          'lot-traffic': 1,
          showroom: 0,
          'ad-campaign': 0,
          'finance-office': 0
        }
      }
    });
  });

  it('derives layered tap and passive stats from additive and multiplier upgrades', () => {
    const stats = getDerivedStats({
      meta: {
        version: GAME_STATE_VERSION,
        lastProcessedAt: 0
      },
      resources: {
        coins: 0
      },
      upgrades: {
        levels: {
          'tap-power': 2,
          'lot-traffic': 3,
          showroom: 1,
          'ad-campaign': 1,
          'finance-office': 1
        }
      }
    });

    expect(stats.baseCoinsPerTap).toBe(3);
    expect(stats.baseCoinsPerSecond).toBeCloseTo(2.1);
    expect(stats.tapMultiplier).toBeCloseTo(1.37);
    expect(stats.passiveMultiplier).toBeCloseTo(1.57);
    expect(stats.globalMultiplier).toBeCloseTo(1.18);
    expect(stats.coinsPerTap).toBeCloseTo(4.8498);
    expect(stats.coinsPerSecond).toBeCloseTo(3.8905);
  });

  it('milestone bonuses apply correctly', () => {
    const state = {
      meta: { version: GAME_STATE_VERSION, lastProcessedAt: 0 },
      resources: { coins: 0 },
      upgrades: {
        levels: {
          'tap-power': 3,
          'lot-traffic': 3,
          showroom: 0,
          'ad-campaign': 0,
          'finance-office': 0
        }
      }
    };

    const stats = getDerivedStats(state);
    expect(getUnlockedMilestones(state).map((milestone) => milestone.id)).toEqual([
      'sales-streak',
      'street-buzz',
      'dealer-reputation'
    ]);
    expect(stats.globalMultiplier).toBeCloseTo(1.1);
    expect(stats.passiveMultiplier).toBeCloseTo(1.27);
    expect(stats.tapMultiplier).toBeCloseTo(1.12);
  });

  it('applyTap adds derived tap power to coins', () => {
    const nextState = applyTap({
      meta: {
        version: GAME_STATE_VERSION,
        lastProcessedAt: 0
      },
      resources: {
        coins: 4
      },
      upgrades: {
        levels: {
          'tap-power': 2,
          'lot-traffic': 0,
          showroom: 1,
          'ad-campaign': 0,
          'finance-office': 0
        }
      }
    });

    expect(nextState.resources.coins).toBeCloseTo(7.75);
  });

  it('upgrade cost scales per level without early spikes', () => {
    for (const upgradeId of UPGRADE_IDS) {
      const costs = [0, 1, 2, 3].map((level) => {
        const state = createInitialGameState(0);
        state.upgrades.levels[upgradeId] = level;
        return getUpgradeCost(state, upgradeId);
      });

      for (let index = 1; index < costs.length; index += 1) {
        expect(costs[index]).toBeGreaterThan(costs[index - 1]);
        expect(costs[index] / costs[index - 1]).toBeLessThan(1.75);
      }
    }
  });

  it('buyUpgrade rejects insufficient funds or locked upgrades', () => {
    const state = createInitialGameState(0);
    expect(buyUpgrade(state, 'lot-traffic')).toBe(state);
    expect(buyUpgrade(state, 'showroom')).toBe(state);
    expect(canAffordUpgrade(state, 'lot-traffic')).toBe(false);
  });

  it('upgrade unlock thresholds work as intended', () => {
    const baseState = createInitialGameState(0);
    expect(isUpgradeUnlocked(baseState, 'tap-power')).toBe(true);
    expect(isUpgradeUnlocked(baseState, 'lot-traffic')).toBe(true);
    expect(isUpgradeUnlocked(baseState, 'showroom')).toBe(false);
    expect(isUpgradeUnlocked(baseState, 'ad-campaign')).toBe(false);
    expect(isUpgradeUnlocked(baseState, 'finance-office')).toBe(false);

    const unlockedState = {
      ...baseState,
      upgrades: {
        levels: {
          'tap-power': 1,
          'lot-traffic': 2,
          showroom: 0,
          'ad-campaign': 0,
          'finance-office': 2
        }
      }
    };

    expect(isUpgradeUnlocked(unlockedState, 'showroom')).toBe(true);
    expect(isUpgradeUnlocked(unlockedState, 'ad-campaign')).toBe(true);
    expect(isUpgradeUnlocked(unlockedState, 'finance-office')).toBe(true);
  });

  it('buyUpgrade updates coins, level, and derived stats', () => {
    const startingState = {
      ...createInitialGameState(0),
      resources: {
        coins: 20
      },
      upgrades: {
        levels: {
          'tap-power': 0,
          'lot-traffic': 2,
          showroom: 0,
          'ad-campaign': 0,
          'finance-office': 0
        }
      }
    };

    const nextState = buyUpgrade(startingState, 'ad-campaign');

    expect(nextState.resources.coins).toBe(2);
    expect(nextState.upgrades.levels['ad-campaign']).toBe(1);
    expect(getDerivedStats(nextState).coinsPerSecond).toBeCloseTo(1.82);
  });

  it('applyElapsedTime grants passive income based on elapsed time', () => {
    const result = applyElapsedTime(
      {
        meta: {
          version: GAME_STATE_VERSION,
          lastProcessedAt: 1000
        },
        resources: {
          coins: 10
        },
        upgrades: {
          levels: {
            'tap-power': 0,
            'lot-traffic': 2,
            showroom: 0,
            'ad-campaign': 1,
            'finance-office': 0
          }
        }
      },
      6000
    );

    expect(result.actualElapsedMs).toBe(5000);
    expect(result.appliedElapsedMs).toBe(5000);
    expect(result.coinsEarned).toBeCloseTo(9.1);
    expect(result.state.resources.coins).toBeCloseTo(19.1);
    expect(result.state.meta.lastProcessedAt).toBe(6000);
  });

  it('applyElapsedTime respects the offline cap', () => {
    const state = {
      meta: {
        version: GAME_STATE_VERSION,
        lastProcessedAt: 0
      },
      resources: {
        coins: 0
      },
      upgrades: {
        levels: {
          'tap-power': 0,
          'lot-traffic': 1,
          showroom: 0,
          'ad-campaign': 0,
          'finance-office': 0
        }
      }
    };

    const result = applyElapsedTime(state, DEFAULT_ECONOMY_CONFIG.offlineCapMs + 60000);

    expect(result.actualElapsedMs).toBe(DEFAULT_ECONOMY_CONFIG.offlineCapMs + 60000);
    expect(result.appliedElapsedMs).toBe(DEFAULT_ECONOMY_CONFIG.offlineCapMs);
    expect(result.coinsEarned).toBe((DEFAULT_ECONOMY_CONFIG.offlineCapMs / 1000) * 0.7);
  });

  it('builds upgrade views with unlock and affordability hints', () => {
    const state = {
      meta: {
        version: GAME_STATE_VERSION,
        lastProcessedAt: 0
      },
      resources: {
        coins: 4
      },
      upgrades: {
        levels: {
          'tap-power': 0,
          'lot-traffic': 0,
          showroom: 0,
          'ad-campaign': 0,
          'finance-office': 0
        }
      }
    };

    expect(getUpgradeView(state, 'tap-power')).toMatchObject({
      id: 'tap-power',
      cost: 5,
      canAfford: false,
      unlocked: true,
      tapsToAfford: 1
    });

    expect(getUpgradeView(state, 'showroom')).toMatchObject({
      id: 'showroom',
      unlocked: false,
      canAfford: false,
      unlockHint: 'Unlock at 2 total levels'
    });
  });

  it('early upgrades become affordable in expected order', () => {
    let state = createInitialGameState(0);

    for (let i = 0; i < 5; i += 1) {
      state = applyTap(state);
    }
    expect(canAffordUpgrade(state, 'tap-power')).toBe(true);
    expect(canAffordUpgrade(state, 'lot-traffic')).toBe(false);

    state = applyTap(state);
    state = applyTap(state);
    expect(canAffordUpgrade(state, 'lot-traffic')).toBe(true);
  });

  it('tap-focused path remains viable in the first minutes', () => {
    const state = simulateProgress(180, 3, ['tap-power', 'showroom', 'finance-office', 'lot-traffic', 'ad-campaign']);
    const stats = getDerivedStats(state);

    expect(stats.coinsPerTap).toBeGreaterThan(20);
    expect(stats.coinsPerSecond).toBeGreaterThan(8);
    expect(getTotalUpgradeLevels(state)).toBeGreaterThanOrEqual(12);
  });

  it('passive-focused path remains viable in the first minutes', () => {
    const state = simulateProgress(180, 2, ['lot-traffic', 'ad-campaign', 'finance-office', 'tap-power', 'showroom']);
    const stats = getDerivedStats(state);

    expect(stats.coinsPerSecond).toBeGreaterThan(12);
    expect(stats.coinsPerTap).toBeGreaterThan(4);
    expect(getTotalUpgradeLevels(state)).toBeGreaterThanOrEqual(10);
  });

  it('mixed progression does not stall in the first five minutes', () => {
    const state = simulateProgress(300, 3, ['tap-power', 'lot-traffic', 'showroom', 'ad-campaign', 'finance-office']);
    const stats = getDerivedStats(state);

    expect(getCoins(state)).toBeGreaterThanOrEqual(0);
    expect(stats.coinsPerTap).toBeGreaterThan(15);
    expect(stats.coinsPerSecond).toBeGreaterThan(15);
    expect(stats.activeMilestones.length).toBeGreaterThanOrEqual(2);
    expect(stats.totalUpgradeLevels).toBeGreaterThanOrEqual(15);
  });

  it('can convert to the legacy flat shape for adapters', () => {
    const state = createInitialGameState(1234);
    expect(toLegacyGameState(state)).toEqual({
      coins: 0,
      upgradeLevels: {
        'tap-power': 0,
        'lot-traffic': 0,
        showroom: 0,
        'ad-campaign': 0,
        'finance-office': 0
      },
      lastProcessedAt: 1234
    });
  });
});
