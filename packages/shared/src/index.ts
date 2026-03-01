export interface AuthoritativeState {
  balance: number;
  balancePerClick: number;
}

export const createInitialState = (): AuthoritativeState => ({
  balance: 0,
  balancePerClick: 1
});

export const applyClick = (state: AuthoritativeState): AuthoritativeState => ({
  ...state,
  balance: state.balance + state.balancePerClick
});
