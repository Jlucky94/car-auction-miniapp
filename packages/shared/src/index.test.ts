import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ECONOMY_CONFIG,
  applyClick,
  applyElapsedTime,
  applyTap,
  buyUpgrade,
  canAffordUpgrade,
  createInitialGameState,
  createInitialState,
  getDerivedStats,
  getUpgradeCost,
  rehydrateGameState
} from './index';

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
      coins: 0,
      upgradeLevels: {
        'tap-power': 0,
        'passive-income': 0
      },
      lastProcessedAt: 1000
    });
  });

  it('rehydrateGameState sanitizes invalid input', () => {
    expect(rehydrateGameState({ coins: -5, upgradeLevels: { 'tap-power': 1.8 } }, 5000)).toEqual({
      coins: 0,
      upgradeLevels: {
        'tap-power': 1,
        'passive-income': 0
      },
      lastProcessedAt: 5000
    });
  });

  it('derives tap and passive stats from upgrade levels', () => {
    const stats = getDerivedStats({
      coins: 0,
      lastProcessedAt: 0,
      upgradeLevels: {
        'tap-power': 2,
        'passive-income': 3
      }
    });

    expect(stats.coinsPerTap).toBe(3);
    expect(stats.coinsPerSecond).toBeCloseTo(1.8);
  });

  it('applyTap adds derived tap power to coins', () => {
    const nextState = applyTap({
      coins: 4,
      lastProcessedAt: 0,
      upgradeLevels: {
        'tap-power': 2,
        'passive-income': 0
      }
    });

    expect(nextState.coins).toBe(7);
  });

  it('upgrade cost scales per level', () => {
    const baseState = createInitialGameState(0);
    const levelOneState = {
      ...baseState,
      upgradeLevels: {
        ...baseState.upgradeLevels,
        'tap-power': 1
      }
    };

    expect(getUpgradeCost(baseState, 'tap-power')).toBe(8);
    expect(getUpgradeCost(levelOneState, 'tap-power')).toBe(13);
  });

  it('buyUpgrade rejects insufficient funds', () => {
    const state = createInitialGameState(0);
    expect(buyUpgrade(state, 'passive-income')).toBe(state);
    expect(canAffordUpgrade(state, 'passive-income')).toBe(false);
  });

  it('buyUpgrade updates coins, level, and derived stats', () => {
    const startingState = {
      ...createInitialGameState(0),
      coins: 20
    };

    const nextState = buyUpgrade(startingState, 'passive-income');

    expect(nextState).toEqual({
      coins: 5,
      lastProcessedAt: 0,
      upgradeLevels: {
        'tap-power': 0,
        'passive-income': 1
      }
    });
    expect(getDerivedStats(nextState).coinsPerSecond).toBe(0.6);
  });

  it('applyElapsedTime grants passive income based on elapsed time', () => {
    const result = applyElapsedTime(
      {
        coins: 10,
        lastProcessedAt: 1000,
        upgradeLevels: {
          'tap-power': 0,
          'passive-income': 2
        }
      },
      6000
    );

    expect(result.actualElapsedMs).toBe(5000);
    expect(result.appliedElapsedMs).toBe(5000);
    expect(result.coinsEarned).toBe(6);
    expect(result.state.coins).toBe(16);
    expect(result.state.lastProcessedAt).toBe(6000);
  });

  it('applyElapsedTime respects the offline cap', () => {
    const state = {
      coins: 0,
      lastProcessedAt: 0,
      upgradeLevels: {
        'tap-power': 0,
        'passive-income': 1
      }
    };

    const result = applyElapsedTime(state, DEFAULT_ECONOMY_CONFIG.offlineCapMs + 60000);

    expect(result.actualElapsedMs).toBe(DEFAULT_ECONOMY_CONFIG.offlineCapMs + 60000);
    expect(result.appliedElapsedMs).toBe(DEFAULT_ECONOMY_CONFIG.offlineCapMs);
    expect(result.coinsEarned).toBe((DEFAULT_ECONOMY_CONFIG.offlineCapMs / 1000) * 0.6);
  });
});
