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
