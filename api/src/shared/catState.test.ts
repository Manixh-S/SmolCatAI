import { describe, expect, it } from "vitest";
import {
  applyDecay,
  buildDefaultState,
  clampStat,
  DECAY_PER_MINUTE,
  MAX_DECAY_MINUTES,
  normalizeStoredState,
} from "./catState";

const NOW = 1_750_000_000_000;

describe("clampStat", () => {
  it("clamps into 0..100", () => {
    expect(clampStat(-5)).toBe(0);
    expect(clampStat(50)).toBe(50);
    expect(clampStat(150)).toBe(100);
  });
});

describe("applyDecay", () => {
  it("returns unchanged stats when no full minute has passed", () => {
    const state = { fullness: 40, happiness: 60, energy: 70, lastUpdated: NOW - 59_000 };
    const result = applyDecay(state, NOW);

    expect(result.fullness).toBe(40);
    expect(result.happiness).toBe(60);
    expect(result.energy).toBe(70);
    expect(result.lastUpdated).toBe(NOW);
  });

  it("applies per-minute decay rates (all stats fall)", () => {
    const state = { fullness: 90, happiness: 60, energy: 70, lastUpdated: NOW - 5 * 60_000 };
    const result = applyDecay(state, NOW);

    expect(result.fullness).toBe(90 - 5 * DECAY_PER_MINUTE.fullness);
    expect(result.happiness).toBe(60 - 5 * DECAY_PER_MINUTE.happiness);
    expect(result.energy).toBe(70 - 5 * DECAY_PER_MINUTE.energy);
  });

  it("clamps stats to 0..100", () => {
    const state = { fullness: 10, happiness: 10, energy: 5, lastUpdated: NOW - 10 * 60_000 };
    const result = applyDecay(state, NOW);

    expect(result.fullness).toBe(0);
    expect(result.happiness).toBe(0);
    expect(result.energy).toBe(0);
  });

  it("caps offline decay at MAX_DECAY_MINUTES", () => {
    const overnight = { fullness: 100, happiness: 100, energy: 100, lastUpdated: NOW - 12 * 60 * 60_000 };
    const capped = applyDecay(overnight, NOW);

    expect(capped.fullness).toBe(clampStat(100 - MAX_DECAY_MINUTES * DECAY_PER_MINUTE.fullness));
    expect(capped.happiness).toBe(clampStat(100 - MAX_DECAY_MINUTES * DECAY_PER_MINUTE.happiness));
  });

  it("treats invalid lastUpdated as now", () => {
    const state = { fullness: 40, happiness: 60, energy: 70, lastUpdated: Number.NaN };
    const result = applyDecay(state, NOW);

    expect(result.fullness).toBe(40);
    expect(result.lastUpdated).toBe(NOW);
  });
});

describe("normalizeStoredState", () => {
  it("passes through new-schema entities", () => {
    const state = normalizeStoredState(
      { fullness: 80, happiness: 60, energy: 40, lastUpdated: NOW - 1000 },
      NOW
    );

    expect(state).toEqual({ fullness: 80, happiness: 60, energy: 40, lastUpdated: NOW - 1000 });
  });

  it("converts legacy hunger rows to fullness", () => {
    const state = normalizeStoredState(
      { hunger: 30, happiness: 60, energy: 40, lastUpdated: NOW - 1000 },
      NOW
    );

    expect(state.fullness).toBe(70);
  });

  it("prefers fullness when both fields exist", () => {
    const state = normalizeStoredState(
      { fullness: 55, hunger: 30, happiness: 60, energy: 40, lastUpdated: NOW },
      NOW
    );

    expect(state.fullness).toBe(55);
  });

  it("falls back to the default fullness when neither field is valid", () => {
    const state = normalizeStoredState({ happiness: 60, energy: 40, lastUpdated: NOW }, NOW);

    expect(state.fullness).toBe(buildDefaultState(NOW).fullness);
  });
});

describe("buildDefaultState", () => {
  it("matches the frontend's initial stats", () => {
    const state = buildDefaultState(NOW);
    expect(state).toEqual({ fullness: 50, happiness: 70, energy: 60, lastUpdated: NOW });
  });
});
