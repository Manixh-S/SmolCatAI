export type CatStats = {
  hunger: number;
  happiness: number;
  energy: number;
};

export type CatState = CatStats & {
  lastUpdated: number;
};

/**
 * Decay rates per minute. These MUST stay in sync with the client tick in
 * `src/useCatState.ts` (every 10s: hunger +2, happiness -1, energy -1),
 * so that state restored from the server feels continuous with live play.
 */
export const DECAY_PER_MINUTE = {
  hunger: 12,
  happiness: 6,
  energy: 6,
} as const;

/**
 * Cap on how much offline time is applied as decay. Without this, a cat
 * left overnight always comes back fully starved and miserable.
 */
export const MAX_DECAY_MINUTES = 60;

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const clampStat = (value: number): number => clamp(value, 0, 100);

export const buildDefaultState = (now: number = Date.now()): CatState => ({
  hunger: 50,
  happiness: 70,
  energy: 60,
  lastUpdated: now,
});

/**
 * Applies time-based decay to a stored cat state. Pure function so it can
 * be unit tested. `lastUpdated` is always advanced to `now`.
 */
export const applyDecay = (state: CatState, now: number): CatState => {
  const lastUpdated = Number(state.lastUpdated);
  const safeLastUpdated = Number.isFinite(lastUpdated) ? lastUpdated : now;
  const minutesPassed = Math.min(
    MAX_DECAY_MINUTES,
    Math.max(0, Math.floor((now - safeLastUpdated) / 60000))
  );

  if (minutesPassed === 0) {
    return { ...state, lastUpdated: now };
  }

  return {
    hunger: clampStat(state.hunger + minutesPassed * DECAY_PER_MINUTE.hunger),
    happiness: clampStat(state.happiness - minutesPassed * DECAY_PER_MINUTE.happiness),
    energy: clampStat(state.energy - minutesPassed * DECAY_PER_MINUTE.energy),
    lastUpdated: now,
  };
};
