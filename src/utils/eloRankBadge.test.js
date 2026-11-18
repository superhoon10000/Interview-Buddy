import { ELO_BADGE_TIERS, GLOBAL_TOP_THREE_BADGES, getEloRankBadge } from "./eloRankBadge";

test("unavailable or invalid ELO never invents a rank badge", () => {
  [undefined, null, "2150", NaN, Infinity, -1].forEach((value) => {
    expect(getEloRankBadge(value, 1)).toBeNull();
  });
});

test("selects the regular badge at each ELO boundary", () => {
  ELO_BADGE_TIERS.forEach((tier) => {
    const atBoundary = getEloRankBadge(tier.minElo);
    expect(atBoundary.name).toBe(tier.name);
    expect(atBoundary.src).toBe(`/${encodeURIComponent(tier.image)}`);
  });

  ELO_BADGE_TIERS.slice(0, -1).forEach((tier, index) => {
    const next = ELO_BADGE_TIERS[index + 1];
    expect(getEloRankBadge(next.minElo - 1).name).toBe(tier.name);
  });

  // Company badges are no longer awarded solely for high ELO.
  expect(getEloRankBadge(100000).name).toBe("Senior Developer");
});

test("global ranks 1, 2 and 3 always receive their special badges", () => {
  Object.entries(GLOBAL_TOP_THREE_BADGES).forEach(([rank, special]) => {
    for (const elo of [0, 51, 1200, 9000]) {
      const badge = getEloRankBadge(elo, Number(rank));
      expect(badge.name).toBe(special.name);
      expect(badge.src).toBe(`/${encodeURIComponent(special.image)}`);
    }
  });
});

test("outside global top three, or without a valid rank, ELO decides the badge", () => {
  expect(getEloRankBadge(51, 4).name).toBe("Janitor");
  expect(getEloRankBadge(3000, 5).name).toBe("Senior Developer");
  expect(getEloRankBadge(900, null).name).toBe("Paid Intern");
  expect(getEloRankBadge(1400, "2").name).toBe("Junior Developer");
  expect(getEloRankBadge(1400, 0).name).toBe("Junior Developer");
});
