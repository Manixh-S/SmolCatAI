import type { CatStats } from "./catState";

type CatAction = "feed" | "pet" | "sleep";

/** Instant canned reactions for care actions, flavoured by current stats. */
const getCatResponse = (action: CatAction, stats: CatStats): string => {
  if (action === "feed") {
    if (stats.hunger >= 75) {
      return "FINALLY! *chomp chomp*";
    }

    return stats.hunger <= 15 ? "*sniff* ...maybe later." : "Yum!";
  }

  if (action === "pet") {
    if (stats.happiness >= 80) {
      return "Purrrr... best human. 😸";
    }

    return stats.happiness <= 30 ? "*cautious purr*" : "Purr...";
  }

  return stats.energy <= 20 ? "Zzz... zzz... zzz..." : "Zzz...";
};

export default getCatResponse;
