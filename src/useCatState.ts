import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyLocalDecay,
  clampStat,
  DEFAULT_STATS,
  sanitizeStats,
  type CatStats,
  type StoredCatState,
} from "./catState";

const STORAGE_KEY = "smolcat.stats";
const TICK_MS = 10_000;
const SYNC_DEBOUNCE_MS = 3_000;

const loadStoredStats = (): CatStats => {
  if (typeof window === "undefined") {
    return DEFAULT_STATS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STATS;
    }

    const parsed = JSON.parse(raw) as StoredCatState;
    return applyLocalDecay(parsed, Date.now());
  } catch {
    return DEFAULT_STATS;
  }
};

/**
 * Owns the cat's stats. Stats always persist to localStorage (so a refresh
 * no longer resets the cat) and, for signed-in users, sync with the API:
 * loaded once from GET /api/getCat, then saved (debounced) to
 * POST /api/updateCat on every change.
 */
export const useCatState = (isAuthenticated: boolean) => {
  const [stats, setStats] = useState<CatStats>(loadStoredStats);
  const serverLoadedRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  // Live decay tick. Rates mirror DECAY_PER_MINUTE in catState.ts.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStats((prev) => ({
        fullness: clampStat(prev.fullness - 2),
        happiness: clampStat(prev.happiness - 1),
        energy: clampStat(prev.energy - 1),
      }));
    }, TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // Load server state once for signed-in users. Server state wins over
  // local state because it survives across devices.
  useEffect(() => {
    if (!isAuthenticated || serverLoadedRef.current) {
      return;
    }

    let isMounted = true;

    const loadServerState = async () => {
      try {
        const response = await fetch("/api/getCat");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as Partial<CatStats>;
        if (isMounted) {
          setStats(sanitizeStats(data));
        }
      } catch {
        // Offline or local dev without the API; local state is fine.
      } finally {
        if (isMounted) {
          serverLoadedRef.current = true;
        }
      }
    };

    loadServerState();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Persist every change locally; debounce server sync for signed-in users.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored: StoredCatState = { ...stats, lastUpdated: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    // Do not push local state to the server before the initial server load,
    // otherwise a stale browser could clobber the saved cat.
    if (!isAuthenticated || !serverLoadedRef.current) {
      return;
    }

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      fetch("/api/updateCat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      }).catch(() => {
        // Best-effort sync; local state remains authoritative for the UI.
      });
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [stats, isAuthenticated]);

  const feed = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      fullness: clampStat(prev.fullness + 15),
    }));
  }, []);

  const pet = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      happiness: clampStat(prev.happiness + 12),
    }));
  }, []);

  const sleep = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      energy: clampStat(prev.energy + 20),
      fullness: clampStat(prev.fullness + 5),
    }));
  }, []);

  return {
    stats,
    feed,
    pet,
    sleep,
  };
};
