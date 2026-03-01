import { describe, expect, it } from "vitest";

import { applyClick, createInitialState } from "./index";

describe("shared domain state", () => {
  it("createInitialState returns zero balance", () => {
    expect(createInitialState()).toEqual({ balance: 0 });
  });

  it("applyClick increments balance", () => {
    expect(applyClick({ balance: 3 })).toEqual({ balance: 4 });
  });
});
