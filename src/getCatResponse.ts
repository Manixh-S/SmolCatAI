type CatAction = "feed" | "pet" | "sleep";

type CatStats = {
  hunger: number;
  happiness: number;
  energy: number;
};

const getCatResponse = (action: CatAction, _currentStats: CatStats) => {
  if (action === "feed") {
    return "Yum!";
  }

  if (action === "pet") {
    return "Purr...";
  }

  return "Zzz...";
};

export default getCatResponse;
