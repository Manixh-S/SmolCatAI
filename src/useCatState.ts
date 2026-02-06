import { useCallback, useEffect, useState } from "react";

type CatStats = {
  hunger: number;
  happiness: number;
  energy: number;
};

const clampStat = (value: number) => Math.max(0, Math.min(100, value));

export const useCatState = () => {
  const [stats, setStats] = useState<CatStats>({
    hunger: 50,
    happiness: 70,
    energy: 60,
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStats((prev) => ({
        hunger: clampStat(prev.hunger - 2),
        happiness: clampStat(prev.happiness - 1),
        energy: clampStat(prev.energy - 1),
      }));
    }, 10_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const feed = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      hunger: clampStat(prev.hunger + 15),
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
      hunger: clampStat(prev.hunger - 5),
    }));
  }, []);

  return {
    stats,
    feed,
    pet,
    sleep,
  };
};
