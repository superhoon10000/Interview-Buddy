/**
 * Display-only ELO badges. The top three GLOBAL leaderboard ranks override
 * ELO tiers, regardless of the rating itself. Everyone else uses the
 * existing regular ELO progression. No ELO or rank data is changed here.
 *
 * The backend uses competition ranking for ties (1, 1, 3), so players
 * sharing a global rank also share its badge.
 */
export const ELO_BADGE_TIERS = Object.freeze([
  { minElo: 0, name: "Bum", image: "Coding Toward a Brighter Tomorrow.png" },
  { minElo: 1000, name: "Graduate", image: "Cheerful Graduate Mascot Badge.png" },
  { minElo: 1020, name: "Janitor", image: "Cheerful Janitor Mascot Badge.png"  },
  { minElo: 1040, name: "Unpaid Intern", image: "Unpaid Intern Buddy Badge.png" },
  { minElo: 1060, name: "Paid Intern", image: "Paid Intern Money Maker.png" },
  { minElo: 1080, name: "Junior Developer", image: "Cheerful Junior Developer Mascot Badge.png" },
  { minElo: 1100, name: "Senior Developer", image: "Senior Developer Mascot Badge.png" },
]);

export const GLOBAL_TOP_THREE_BADGES = Object.freeze({
  1: { name: "NVIDIA", image: "NPICIA Capybara Tech Badge.png" },
  2: { name: "Bill Gates", image: "Minisofty Capybara Innovation Badge.png" },
  3: { name: "Meta", image: "Capyark’s Neta Office Badge.png" },
});

/** Returns null if no valid ELO has been supplied by the backend. */
export function getEloRankBadge(elo, globalRank = null) {
  if (typeof elo !== "number" || !Number.isFinite(elo) || elo < 0) return null;

  const special = Number.isInteger(globalRank)
    ? GLOBAL_TOP_THREE_BADGES[globalRank]
    : null;
  const tier = special || [...ELO_BADGE_TIERS]
    .reverse()
    .find(({ minElo }) => elo >= minElo);

  return tier ? { ...tier, src: `/${encodeURIComponent(tier.image)}` } : null;
}
