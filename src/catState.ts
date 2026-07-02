export type CatStats = {
  hunger: number;
  happiness: number;
  energy: number;
};

export type StoredCatState = CatStats & {
  lastUpdated: number;
};

export const DEFAULT_STATS: CatStats = {
  hunger: 50,
  happiness: 70,
  energy: 60,
};

/**
 * Decay rates per minute. MUST stay in sync with the server copy in
 * api/src/shared/catState.ts (the live tick in useCatState applies the same
 * rates in 10-second increments).
 */
export const DECAY_PER_MINUTE = {
  hunger: 12,
  happiness: 6,
  energy: 6,
} as const;

export const MAX_DECAY_MINUTES = 60;

export const clampStat = (value: number): number => Math.max(0, Math.min(100, value));

const toStat = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? clampStat(value) : fallback;

export const sanitizeStats = (value: Partial<CatStats> | null | undefined): CatStats => ({
  hunger: toStat(value?.hunger, DEFAULT_STATS.hunger),
  happiness: toStat(value?.happiness, DEFAULT_STATS.happiness),
  energy: toStat(value?.energy, DEFAULT_STATS.energy),
});

/** Applies offline decay to a locally stored state. Mirrors the server logic. */
export const applyLocalDecay = (state: StoredCatState, now: number): CatStats => {
  const lastUpdated = Number(state.lastUpdated);
  const safeLastUpdated = Number.isFinite(lastUpdated) ? lastUpdated : now;
  const minutesPassed = Math.min(
    MAX_DECAY_MINUTES,
    Math.max(0, Math.floor((now - safeLastUpdated) / 60000))
  );

  const base = sanitizeStats(state);
  if (minutesPassed === 0) {
    return base;
  }

  return {
    hunger: clampStat(base.hunger + minutesPassed * DECAY_PER_MINUTE.hunger),
    happiness: clampStat(base.happiness - minutesPassed * DECAY_PER_MINUTE.happiness),
    energy: clampStat(base.energy - minutesPassed * DECAY_PER_MINUTE.energy),
  };
};
