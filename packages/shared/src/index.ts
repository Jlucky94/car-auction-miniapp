export type PlayerState = {
  balance: number;
};

export function createInitialState(): PlayerState {
  return {
    balance: 0
  };
}

export function applyClick(state: PlayerState): PlayerState {
  return {
    ...state,
    balance: state.balance + 1
  };
}

export const UPGRADE_IDS = ['tap-power', 'passive-income'] as const;

export type UpgradeId = (typeof UPGRADE_IDS)[number];

export type UpgradeConfig = {
  id: UpgradeId;
  label: string;
  description: string;
  effectLabel: string;
  baseCost: number;
  costMultiplier: number;
  effectPerLevel: number;
};

export type EconomyConfig = {
  startingCoins: number;
  baseCoinsPerTap: number;
  baseCoinsPerSecond: number;
  offlineCapMs: number;
  upgrades: Record<UpgradeId, UpgradeConfig>;
};

export type GameState = {
  coins: number;
  upgradeLevels: Record<UpgradeId, number>;
  lastProcessedAt: number;
};

export type DerivedStats = {
  coinsPerTap: number;
  coinsPerSecond: number;
};

export type ElapsedTimeResult = {
  state: GameState;
  actualElapsedMs: number;
  appliedElapsedMs: number;
  coinsEarned: number;
};

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  startingCoins: 0,
  baseCoinsPerTap: 1,
  baseCoinsPerSecond: 0,
  offlineCapMs: 1000 * 60 * 60 * 3,
  upgrades: {
    'tap-power': {
      id: 'tap-power',
      label: 'Sales Training',
      description: 'Make every tap feel stronger.',
      effectLabel: '+tap',
      baseCost: 8,
      costMultiplier: 1.65,
      effectPerLevel: 1
    },
    'passive-income': {
      id: 'passive-income',
      label: 'Lot Traffic',
      description: 'Bring in a steady stream of buyers.',
      effectLabel: '+/sec',
      baseCost: 15,
      costMultiplier: 1.7,
      effectPerLevel: 0.6
    }
  }
};

function createEmptyUpgradeLevels(): Record<UpgradeId, number> {
  return {
    'tap-power': 0,
    'passive-income': 0
  };
}

function sanitizeLevel(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function sanitizeCoins(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, value);
}

function sanitizeTimestamp(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

export function createInitialGameState(
  now = Date.now(),
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): GameState {
  return {
    coins: config.startingCoins,
    upgradeLevels: createEmptyUpgradeLevels(),
    lastProcessedAt: now
  };
}

export function rehydrateGameState(
  raw: unknown,
  now = Date.now(),
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): GameState {
  if (!raw || typeof raw !== 'object') {
    return createInitialGameState(now, config);
  }

  const candidate = raw as Partial<GameState> & {
    upgradeLevels?: Partial<Record<UpgradeId, number>>;
  };

  return {
    coins: sanitizeCoins(candidate.coins, config.startingCoins),
    upgradeLevels: {
      'tap-power': sanitizeLevel(candidate.upgradeLevels?.['tap-power']),
      'passive-income': sanitizeLevel(candidate.upgradeLevels?.['passive-income'])
    },
    lastProcessedAt: sanitizeTimestamp(candidate.lastProcessedAt, now)
  };
}

export function getDerivedStats(
  state: GameState,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): DerivedStats {
  return {
    coinsPerTap:
      config.baseCoinsPerTap +
      state.upgradeLevels['tap-power'] * config.upgrades['tap-power'].effectPerLevel,
    coinsPerSecond:
      config.baseCoinsPerSecond +
      state.upgradeLevels['passive-income'] * config.upgrades['passive-income'].effectPerLevel
  };
}

export function getUpgradeCost(
  state: GameState,
  upgradeId: UpgradeId,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): number {
  const upgrade = config.upgrades[upgradeId];
  const level = state.upgradeLevels[upgradeId];
  const cost = upgrade.baseCost * Math.pow(upgrade.costMultiplier, level);

  return Math.max(upgrade.baseCost, Math.round(cost));
}

export function canAffordUpgrade(
  state: GameState,
  upgradeId: UpgradeId,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): boolean {
  return state.coins >= getUpgradeCost(state, upgradeId, config);
}

export function applyTap(
  state: GameState,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): GameState {
  const { coinsPerTap } = getDerivedStats(state, config);

  return {
    ...state,
    coins: state.coins + coinsPerTap
  };
}

export function buyUpgrade(
  state: GameState,
  upgradeId: UpgradeId,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): GameState {
  const cost = getUpgradeCost(state, upgradeId, config);
  if (state.coins < cost) {
    return state;
  }

  return {
    ...state,
    coins: state.coins - cost,
    upgradeLevels: {
      ...state.upgradeLevels,
      [upgradeId]: state.upgradeLevels[upgradeId] + 1
    }
  };
}

export function applyElapsedTime(
  state: GameState,
  now: number,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): ElapsedTimeResult {
  const safeNow = Math.max(state.lastProcessedAt, Math.floor(now));
  const actualElapsedMs = Math.max(0, safeNow - state.lastProcessedAt);
  const appliedElapsedMs = Math.min(actualElapsedMs, config.offlineCapMs);
  const { coinsPerSecond } = getDerivedStats(state, config);
  const coinsEarned = (appliedElapsedMs / 1000) * coinsPerSecond;

  return {
    state: {
      ...state,
      coins: state.coins + coinsEarned,
      lastProcessedAt: safeNow
    },
    actualElapsedMs,
    appliedElapsedMs,
    coinsEarned
  };
}

export function getUpgradeEffect(
  upgradeId: UpgradeId,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): number {
  return config.upgrades[upgradeId].effectPerLevel;
}
