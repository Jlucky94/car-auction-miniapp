export type AuthoritativeState = {
  balance: number;
};

export function createInitialState(): AuthoritativeState {
  return {
    balance: 0
  };
}

export function applyClick(state: AuthoritativeState): AuthoritativeState {
  return {
    ...state,
    balance: state.balance + 1
  };
}
