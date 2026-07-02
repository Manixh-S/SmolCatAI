export type CatStats = {
  fullness: number;
  happiness: number;
  energy: number;
};

export type StoredCatState = Partial<CatStats> & {
  /** Legacy field from the old schema (high = starving); converted on load. */
  hunger?: number;
  lastUpdated: number;
};

export const DEFAULT_STATS: CatStats = {
  fullness: 50,
  happiness: 70,
  energy: 60,
};

/**
 * Decay rates per minute (all stats fall over time; high = good for every
 * stat). MUST stay in sync with the server copy in api/src/shared/catState.ts
 * (the live tick in useCatState applies the same rates in 10-second
 * increments).
 */
export const DECAY_PER_MINUTE = {
  fullness: 12,
  happiness: 6,
  energy: 6,
} as const;

export const MAX_DECAY_MINUTES = 60;

export const clampStat = (value: number): number => Math.max(0, Math.min(100, value));

const toStat = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? clampStat(value) : fallback;

/**
 * Normalizes loosely typed stats (server responses, localStorage). Converts
 * the legacy `hunger` field (high = starving) to `fullness` (high = fed) so
 * previously saved cats survive the schema change.
 */
export const sanitizeStats = (
  value: (Partial<CatStats> & { hunger?: number }) | null | undefined
): CatStats => {
  const legacyFullness =
    typeof value?.hunger === "number" && Number.isFinite(value.hunger)
      ? 100 - value.hunger
      : DEFAULT_STATS.fullness;

  return {
    fullness: toStat(value?.fullness, clampStat(legacyFullness)),
    happiness: toStat(value?.happiness, DEFAULT_STATS.happiness),
    energy: toStat(value?.energy, DEFAULT_STATS.energy),
  };
};

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
    fullness: clampStat(base.fullness - minutesPassed * DECAY_PER_MINUTE.fullness),
    happiness: clampStat(base.happiness - minutesPassed * DECAY_PER_MINUTE.happiness),
    energy: clampStat(base.energy - minutesPassed * DECAY_PER_MINUTE.energy),
  };
};
