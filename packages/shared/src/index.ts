export interface GameState {
  coins: number;
  coinsPerTap: number;
}

export const createInitialState = (): GameState => ({
  coins: 0,
  coinsPerTap: 1
});

export const tap = (state: GameState): GameState => ({
  ...state,
  coins: state.coins + state.coinsPerTap
});
