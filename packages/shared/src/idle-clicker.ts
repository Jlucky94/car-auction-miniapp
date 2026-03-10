export const UPGRADE_IDS = [
  'tap-power',
  'lot-traffic',
  'showroom',
  'ad-campaign',
  'finance-office'
] as const;

export const GAME_STATE_VERSION = 3;

export type UpgradeId = (typeof UPGRADE_IDS)[number];
export type UpgradeCategory = 'tap' | 'passive' | 'tap-multiplier' | 'passive-multiplier' | 'global-multiplier';
export type UpgradeEffectType = 'tap-add' | 'passive-add' | 'tap-multiplier' | 'passive-multiplier' | 'global-multiplier';

export type UnlockRequirement =
  | { type: 'always' }
  | { type: 'total-levels'; value: number }
  | { type: 'upgrade-level'; upgradeId: UpgradeId; value: number };

export type UpgradeConfig = {
  id: UpgradeId;
  category: UpgradeCategory;
  label: string;
  shortLabel: string;
  description: string;
  effectLabel: string;
  effectType: UpgradeEffectType;
  baseCost: number;
  costMultiplier: number;
  effectPerLevel: number;
  unlockRequirement: UnlockRequirement;
};

export type MilestoneReward = {
  tapMultiplier?: number;
  passiveMultiplier?: number;
  globalMultiplier?: number;
};

export type MilestoneDefinition = {
  id: string;
  title: string;
  description: string;
  requirement: UnlockRequirement;
  reward: MilestoneReward;
};

export type EconomyConfig = {
  startingCoins: number;
  baseCoinsPerTap: number;
  baseCoinsPerSecond: number;
  offlineCapMs: number;
  upgrades: Record<UpgradeId, UpgradeConfig>;
  milestones: MilestoneDefinition[];
};

export type GameMetaState = {
  version: number;
  lastProcessedAt: number;
};

export type GameResourceState = {
  coins: number;
};

export type GameUpgradeState = {
  levels: Record<UpgradeId, number>;
};

export type GameState = {
  meta: GameMetaState;
  resources: GameResourceState;
  upgrades: GameUpgradeState;
};

export type LegacyGameState = {
  coins: number;
  upgradeLevels: Partial<Record<UpgradeId | 'passive-income', number>>;
  lastProcessedAt: number;
};

export type MilestoneState = {
  activeMilestones: MilestoneDefinition[];
  tapMultiplierBonus: number;
  passiveMultiplierBonus: number;
  globalMultiplierBonus: number;
};

export type DerivedStats = {
  baseCoinsPerTap: number;
  baseCoinsPerSecond: number;
  tapMultiplier: number;
  passiveMultiplier: number;
  globalMultiplier: number;
  coinsPerTap: number;
  coinsPerSecond: number;
  totalUpgradeLevels: number;
  activeMilestones: MilestoneDefinition[];
};

export type UpgradeView = {
  id: UpgradeId;
  label: string;
  shortLabel: string;
  category: UpgradeCategory;
  description: string;
  effectLabel: string;
  effectPerLevel: number;
  level: number;
  cost: number;
  canAfford: boolean;
  missingCoins: number;
  affordability: number;
  tapsToAfford: number;
  unlocked: boolean;
  unlockHint: string | null;
  boostSummary: string;
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
      category: 'tap',
      label: 'Sales Training',
      shortLabel: 'Tap',
      description: 'Train the crew to close deals faster with each tap.',
      effectLabel: '+tap',
      effectType: 'tap-add',
      baseCost: 5,
      costMultiplier: 1.48,
      effectPerLevel: 1,
      unlockRequirement: { type: 'always' }
    },
    'lot-traffic': {
      id: 'lot-traffic',
      category: 'passive',
      label: 'Lot Traffic',
      shortLabel: 'Idle',
      description: 'Bring more walk-in buyers to the dealership lot.',
      effectLabel: '+/sec',
      effectType: 'passive-add',
      baseCost: 7,
      costMultiplier: 1.52,
      effectPerLevel: 0.7,
      unlockRequirement: { type: 'always' }
    },
    showroom: {
      id: 'showroom',
      category: 'tap-multiplier',
      label: 'Showroom Shine',
      shortLabel: 'Tap x',
      description: 'Premium presentation increases the value of active selling.',
      effectLabel: 'x tap',
      effectType: 'tap-multiplier',
      baseCost: 15,
      costMultiplier: 1.6,
      effectPerLevel: 0.25,
      unlockRequirement: { type: 'total-levels', value: 2 }
    },
    'ad-campaign': {
      id: 'ad-campaign',
      category: 'passive-multiplier',
      label: 'Ad Campaign',
      shortLabel: 'Idle x',
      description: 'Advertising compounds your passive flow of buyers.',
      effectLabel: 'x idle',
      effectType: 'passive-multiplier',
      baseCost: 18,
      costMultiplier: 1.62,
      effectPerLevel: 0.3,
      unlockRequirement: { type: 'upgrade-level', upgradeId: 'lot-traffic', value: 2 }
    },
    'finance-office': {
      id: 'finance-office',
      category: 'global-multiplier',
      label: 'Finance Office',
      shortLabel: 'Profit x',
      description: 'Better financing lifts every part of the business.',
      effectLabel: 'x all',
      effectType: 'global-multiplier',
      baseCost: 28,
      costMultiplier: 1.68,
      effectPerLevel: 0.18,
      unlockRequirement: { type: 'total-levels', value: 5 }
    }
  },
  milestones: [
    {
      id: 'sales-streak',
      title: 'Sales Streak',
      description: 'Reach Sales Training level 3 to boost all profits.',
      requirement: { type: 'upgrade-level', upgradeId: 'tap-power', value: 3 },
      reward: { globalMultiplier: 0.1 }
    },
    {
      id: 'street-buzz',
      title: 'Street Buzz',
      description: 'Reach Lot Traffic level 3 to boost idle profits.',
      requirement: { type: 'upgrade-level', upgradeId: 'lot-traffic', value: 3 },
      reward: { passiveMultiplier: 0.15 }
    },
    {
      id: 'dealer-reputation',
      title: 'Dealer Reputation',
      description: 'Reach 6 total upgrade levels to boost active and idle profits.',
      requirement: { type: 'total-levels', value: 6 },
      reward: { tapMultiplier: 0.12, passiveMultiplier: 0.12 }
    }
  ]
};

function createEmptyUpgradeLevels(): Record<UpgradeId, number> {
  return {
    'tap-power': 0,
    'lot-traffic': 0,
    showroom: 0,
    'ad-campaign': 0,
    'finance-office': 0
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

function isLegacyGameState(raw: unknown): raw is Partial<LegacyGameState> {
  return (
    raw !== null &&
    typeof raw === 'object' &&
    ('coins' in raw || 'upgradeLevels' in raw || 'lastProcessedAt' in raw)
  );
}

function formatUnlockRequirement(requirement: UnlockRequirement, config: EconomyConfig): string | null {
  switch (requirement.type) {
    case 'always':
      return null;
    case 'total-levels':
      return `Unlock at ${requirement.value} total levels`;
    case 'upgrade-level':
      return `Unlock at ${config.upgrades[requirement.upgradeId].label} Lv. ${requirement.value}`;
  }
}

function getMultiplierBoostSummary(config: UpgradeConfig): string {
  switch (config.effectType) {
    case 'tap-add':
      return `Adds ${config.effectPerLevel} coins to every tap`;
    case 'passive-add':
      return `Adds ${config.effectPerLevel.toFixed(1)} coins each second`;
    case 'tap-multiplier':
      return `Boosts tap income by ${Math.round(config.effectPerLevel * 100)}% per level`;
    case 'passive-multiplier':
      return `Boosts passive income by ${Math.round(config.effectPerLevel * 100)}% per level`;
    case 'global-multiplier':
      return `Boosts all profit by ${Math.round(config.effectPerLevel * 100)}% per level`;
  }
}

export function createInitialGameState(
  now = Date.now(),
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): GameState {
  return {
    meta: {
      version: GAME_STATE_VERSION,
      lastProcessedAt: now
    },
    resources: {
      coins: config.startingCoins
    },
    upgrades: {
      levels: createEmptyUpgradeLevels()
    }
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

  if (isLegacyGameState(raw)) {
    return {
      meta: {
        version: GAME_STATE_VERSION,
        lastProcessedAt: sanitizeTimestamp(raw.lastProcessedAt, now)
      },
      resources: {
        coins: sanitizeCoins(raw.coins, config.startingCoins)
      },
      upgrades: {
        levels: {
          'tap-power': sanitizeLevel(raw.upgradeLevels?.['tap-power']),
          'lot-traffic': sanitizeLevel(raw.upgradeLevels?.['lot-traffic'] ?? raw.upgradeLevels?.['passive-income']),
          showroom: sanitizeLevel(raw.upgradeLevels?.showroom),
          'ad-campaign': sanitizeLevel(raw.upgradeLevels?.['ad-campaign']),
          'finance-office': sanitizeLevel(raw.upgradeLevels?.['finance-office'])
        }
      }
    };
  }

  const candidate = raw as Partial<GameState> & {
    meta?: Partial<GameMetaState>;
    resources?: Partial<GameResourceState>;
    upgrades?: { levels?: Partial<Record<UpgradeId, number>> };
  };

  return {
    meta: {
      version: GAME_STATE_VERSION,
      lastProcessedAt: sanitizeTimestamp(candidate.meta?.lastProcessedAt, now)
    },
    resources: {
      coins: sanitizeCoins(candidate.resources?.coins, config.startingCoins)
    },
    upgrades: {
      levels: {
        'tap-power': sanitizeLevel(candidate.upgrades?.levels?.['tap-power']),
        'lot-traffic': sanitizeLevel(candidate.upgrades?.levels?.['lot-traffic']),
        showroom: sanitizeLevel(candidate.upgrades?.levels?.showroom),
        'ad-campaign': sanitizeLevel(candidate.upgrades?.levels?.['ad-campaign']),
        'finance-office': sanitizeLevel(candidate.upgrades?.levels?.['finance-office'])
      }
    }
  };
}

export function toLegacyGameState(state: GameState): LegacyGameState {
  return {
    coins: state.resources.coins,
    upgradeLevels: state.upgrades.levels,
    lastProcessedAt: state.meta.lastProcessedAt
  };
}

export function getUpgradeLevel(state: GameState, upgradeId: UpgradeId): number {
  return state.upgrades.levels[upgradeId];
}

export function getCoins(state: GameState): number {
  return state.resources.coins;
}

export function getTotalUpgradeLevels(state: GameState): number {
  return UPGRADE_IDS.reduce((total, upgradeId) => total + getUpgradeLevel(state, upgradeId), 0);
}

export function isUnlockRequirementMet(
  state: GameState,
  requirement: UnlockRequirement,
  _config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): boolean {
  switch (requirement.type) {
    case 'always':
      return true;
    case 'total-levels':
      return getTotalUpgradeLevels(state) >= requirement.value;
    case 'upgrade-level':
      return getUpgradeLevel(state, requirement.upgradeId) >= requirement.value;
  }
}

export function isUpgradeUnlocked(
  state: GameState,
  upgradeId: UpgradeId,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): boolean {
  return isUnlockRequirementMet(state, config.upgrades[upgradeId].unlockRequirement, config);
}

export function getUnlockedMilestones(
  state: GameState,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): MilestoneDefinition[] {
  return config.milestones.filter((milestone) => isUnlockRequirementMet(state, milestone.requirement, config));
}

export function getMilestoneState(
  state: GameState,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): MilestoneState {
  return getUnlockedMilestones(state, config).reduce<MilestoneState>(
    (accumulator, milestone) => ({
      activeMilestones: [...accumulator.activeMilestones, milestone],
      tapMultiplierBonus: accumulator.tapMultiplierBonus + (milestone.reward.tapMultiplier ?? 0),
      passiveMultiplierBonus: accumulator.passiveMultiplierBonus + (milestone.reward.passiveMultiplier ?? 0),
      globalMultiplierBonus: accumulator.globalMultiplierBonus + (milestone.reward.globalMultiplier ?? 0)
    }),
    {
      activeMilestones: [],
      tapMultiplierBonus: 0,
      passiveMultiplierBonus: 0,
      globalMultiplierBonus: 0
    }
  );
}

export function getDerivedStats(
  state: GameState,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): DerivedStats {
  const milestoneState = getMilestoneState(state, config);

  const additiveTap = UPGRADE_IDS.reduce((total, upgradeId) => {
    const upgrade = config.upgrades[upgradeId];
    return upgrade.effectType === 'tap-add' ? total + getUpgradeLevel(state, upgradeId) * upgrade.effectPerLevel : total;
  }, config.baseCoinsPerTap);

  const additivePassive = UPGRADE_IDS.reduce((total, upgradeId) => {
    const upgrade = config.upgrades[upgradeId];
    return upgrade.effectType === 'passive-add' ? total + getUpgradeLevel(state, upgradeId) * upgrade.effectPerLevel : total;
  }, config.baseCoinsPerSecond);

  const tapMultiplier =
    1 +
    UPGRADE_IDS.reduce((total, upgradeId) => {
      const upgrade = config.upgrades[upgradeId];
      return upgrade.effectType === 'tap-multiplier' ? total + getUpgradeLevel(state, upgradeId) * upgrade.effectPerLevel : total;
    }, milestoneState.tapMultiplierBonus);

  const passiveMultiplier =
    1 +
    UPGRADE_IDS.reduce((total, upgradeId) => {
      const upgrade = config.upgrades[upgradeId];
      return upgrade.effectType === 'passive-multiplier'
        ? total + getUpgradeLevel(state, upgradeId) * upgrade.effectPerLevel
        : total;
    }, milestoneState.passiveMultiplierBonus);

  const globalMultiplier =
    1 +
    UPGRADE_IDS.reduce((total, upgradeId) => {
      const upgrade = config.upgrades[upgradeId];
      return upgrade.effectType === 'global-multiplier'
        ? total + getUpgradeLevel(state, upgradeId) * upgrade.effectPerLevel
        : total;
    }, milestoneState.globalMultiplierBonus);

  return {
    baseCoinsPerTap: additiveTap,
    baseCoinsPerSecond: additivePassive,
    tapMultiplier,
    passiveMultiplier,
    globalMultiplier,
    coinsPerTap: additiveTap * tapMultiplier * globalMultiplier,
    coinsPerSecond: additivePassive * passiveMultiplier * globalMultiplier,
    totalUpgradeLevels: getTotalUpgradeLevels(state),
    activeMilestones: milestoneState.activeMilestones
  };
}

export function getUpgradeCost(
  state: GameState,
  upgradeId: UpgradeId,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): number {
  const upgrade = config.upgrades[upgradeId];
  const level = getUpgradeLevel(state, upgradeId);
  const cost = upgrade.baseCost * Math.pow(upgrade.costMultiplier, level);

  return Math.max(upgrade.baseCost, Math.round(cost));
}

export function canAffordUpgrade(
  state: GameState,
  upgradeId: UpgradeId,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): boolean {
  return isUpgradeUnlocked(state, upgradeId, config) && getCoins(state) >= getUpgradeCost(state, upgradeId, config);
}

export function getUpgradeView(
  state: GameState,
  upgradeId: UpgradeId,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): UpgradeView {
  const upgrade = config.upgrades[upgradeId];
  const cost = getUpgradeCost(state, upgradeId, config);
  const coins = getCoins(state);
  const missingCoins = Math.max(0, cost - coins);
  const { coinsPerTap } = getDerivedStats(state, config);
  const unlocked = isUpgradeUnlocked(state, upgradeId, config);

  return {
    id: upgrade.id,
    label: upgrade.label,
    shortLabel: upgrade.shortLabel,
    category: upgrade.category,
    description: upgrade.description,
    effectLabel: upgrade.effectLabel,
    effectPerLevel: upgrade.effectPerLevel,
    level: getUpgradeLevel(state, upgradeId),
    cost,
    canAfford: unlocked && missingCoins === 0,
    missingCoins,
    affordability: unlocked && cost !== 0 ? Math.min(1, coins / cost) : 0,
    tapsToAfford: !unlocked || coinsPerTap <= 0 ? 0 : Math.ceil(missingCoins / coinsPerTap),
    unlocked,
    unlockHint: unlocked ? null : formatUnlockRequirement(upgrade.unlockRequirement, config),
    boostSummary: getMultiplierBoostSummary(upgrade)
  };
}

export function getUpgradeViews(
  state: GameState,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): UpgradeView[] {
  return UPGRADE_IDS.map((upgradeId) => getUpgradeView(state, upgradeId, config));
}

export function applyTap(
  state: GameState,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): GameState {
  const { coinsPerTap } = getDerivedStats(state, config);

  return {
    ...state,
    resources: {
      ...state.resources,
      coins: state.resources.coins + coinsPerTap
    }
  };
}

export function buyUpgrade(
  state: GameState,
  upgradeId: UpgradeId,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): GameState {
  if (!isUpgradeUnlocked(state, upgradeId, config)) {
    return state;
  }

  const cost = getUpgradeCost(state, upgradeId, config);
  if (getCoins(state) < cost) {
    return state;
  }

  return {
    ...state,
    resources: {
      ...state.resources,
      coins: state.resources.coins - cost
    },
    upgrades: {
      ...state.upgrades,
      levels: {
        ...state.upgrades.levels,
        [upgradeId]: state.upgrades.levels[upgradeId] + 1
      }
    }
  };
}

export function applyElapsedTime(
  state: GameState,
  now: number,
  config: EconomyConfig = DEFAULT_ECONOMY_CONFIG
): ElapsedTimeResult {
  const safeNow = Math.max(state.meta.lastProcessedAt, Math.floor(now));
  const actualElapsedMs = Math.max(0, safeNow - state.meta.lastProcessedAt);
  const appliedElapsedMs = Math.min(actualElapsedMs, config.offlineCapMs);
  const { coinsPerSecond } = getDerivedStats(state, config);
  const coinsEarned = (appliedElapsedMs / 1000) * coinsPerSecond;

  return {
    state: {
      ...state,
      meta: {
        ...state.meta,
        lastProcessedAt: safeNow
      },
      resources: {
        ...state.resources,
        coins: state.resources.coins + coinsEarned
      }
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
