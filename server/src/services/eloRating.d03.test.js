"use strict";

const { calculateEloUpdate } = require("./eloRating");

function rating(sessionScore, questionCount = 10, experienceLevel = "Intermediate", currentElo = 1000) {
  return calculateEloUpdate({ currentElo, sessionScore, experienceLevel, questionCount });
}

describe("D-03 approved-implementation ELO boundary and performance regression", () => {
  // At ELO 1000 on Intermediate, the benchmark is 1000 and K is 32 for 10 questions.
  // These fixed expected values check score boundaries rather than duplicating the calculator.
  test.each([
    [0, -16],
    [1, -16],
    [48, -1],
    [49, 0],
    [50, 0],
    [51, 0],
    [52, 1],
    [99, 16],
    [100, 16],
  ])("D03-T02 score %i produces an exact ELO change of %i", (score, expectedChange) => {
    expect(rating(score)).toEqual({
      previousElo: 1000,
      newElo: 1000 + expectedChange,
      eloChange: expectedChange,
    });
  });

  // An interview needs five assigned questions to affect ELO. The length weight
  // grows through twenty questions, which is also the maximum accepted length.
  test.each([
    [1, 0],
    [4, 0],
    [5, 8],
    [6, 10],
    [19, 30],
    [20, 32],
  ])("D03-T02 %i questions and a perfect score produce change %i", (count, expectedChange) => {
    expect(rating(100, count).eloChange).toBe(expectedChange);
  });

  // A 25-point performance is poor, but its effect depends on the approved
  // difficulty benchmark; the display must not assume all low scores lose ELO.
  test.each([
    ["Beginner", -15],
    ["Intermediate", -8],
    ["Experienced", -1],
    ["Veteran", 3],
  ])("D03-T01 25%% performance at %s difficulty produces change %i", (difficulty, expectedChange) => {
    expect(rating(25, 10, difficulty).eloChange).toBe(expectedChange);
  });

  test("D03-T02 zero is the minimum ELO even after a failing Veteran interview", () => {
    expect(rating(0, 20, "Veteran", 0)).toEqual({
      previousElo: 0, newElo: 0, eloChange: 0,
    });
  });

  test("D03-T01 identical inputs are deterministic and do not mutate the caller", () => {
    const input = Object.freeze({
      currentElo: 1210,
      sessionScore: 72,
      experienceLevel: "Experienced",
      questionCount: 15,
    });
    const first = calculateEloUpdate(input);
    expect(calculateEloUpdate(input)).toEqual(first);
    expect(first.eloChange).toBe(first.newElo - first.previousElo);
    expect(input.currentElo).toBe(1210);
  });
});
