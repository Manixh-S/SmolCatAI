import { describe, expect, it } from "vitest";
import { applyDecay, buildDefaultState, clampStat, DECAY_PER_MINUTE, MAX_DECAY_MINUTES } from "./catState";

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
    const state = { hunger: 40, happiness: 60, energy: 70, lastUpdated: NOW - 59_000 };
    const result = applyDecay(state, NOW);

    expect(result.hunger).toBe(40);
    expect(result.happiness).toBe(60);
    expect(result.energy).toBe(70);
    expect(result.lastUpdated).toBe(NOW);
  });

  it("applies per-minute decay rates", () => {
    const state = { hunger: 40, happiness: 60, energy: 70, lastUpdated: NOW - 5 * 60_000 };
    const result = applyDecay(state, NOW);

    expect(result.hunger).toBe(40 + 5 * DECAY_PER_MINUTE.hunger);
    expect(result.happiness).toBe(60 - 5 * DECAY_PER_MINUTE.happiness);
    expect(result.energy).toBe(70 - 5 * DECAY_PER_MINUTE.energy);
  });

  it("clamps stats to 0..100", () => {
    const state = { hunger: 90, happiness: 10, energy: 5, lastUpdated: NOW - 10 * 60_000 };
    const result = applyDecay(state, NOW);

    expect(result.hunger).toBe(100);
    expect(result.happiness).toBe(0);
    expect(result.energy).toBe(0);
  });

  it("caps offline decay at MAX_DECAY_MINUTES", () => {
    const overnight = { hunger: 0, happiness: 100, energy: 100, lastUpdated: NOW - 12 * 60 * 60_000 };
    const capped = applyDecay(overnight, NOW);

    expect(capped.hunger).toBe(clampStat(MAX_DECAY_MINUTES * DECAY_PER_MINUTE.hunger));
    expect(capped.happiness).toBe(clampStat(100 - MAX_DECAY_MINUTES * DECAY_PER_MINUTE.happiness));
  });

  it("treats invalid lastUpdated as now", () => {
    const state = { hunger: 40, happiness: 60, energy: 70, lastUpdated: Number.NaN };
    const result = applyDecay(state, NOW);

    expect(result.hunger).toBe(40);
    expect(result.lastUpdated).toBe(NOW);
  });
});

describe("buildDefaultState", () => {
  it("matches the frontend's initial stats", () => {
    const state = buildDefaultState(NOW);
    expect(state).toEqual({ hunger: 50, happiness: 70, energy: 60, lastUpdated: NOW });
  });
});
