//Verifies that averages and charts reflect saved scores correctly, especially when interviews are unfinished or missing valid scores
import {
  calculateAnalytics,
  getAnalyticsWindow,
} from "./analyticsMetrics";

//Predictable test data window
const TEST_WINDOW = getAnalyticsWindow(
  new Date(2026, 10, 18, 12)
);

const full = (id, mode, score, completedAt) => ({
  id,
  status: "completed",
  mode,
  completedAt,
  result: {
    completionStatus: "completed",
    score,
  },
});

test("computes summary and mode statistics", () => {
  const metrics = calculateAnalytics([
    full("q1", "Quiz Style", 70, "2026-11-01T12:00:00Z"),
    full("q2", "Quiz Style", 90, "2026-11-02T12:00:00Z"),
    full("c1", "Code Style", 60, "2026-11-03T12:00:00Z"),
  ], TEST_WINDOW);

  expect(metrics.completedCount).toBe(3);
  expect(metrics.scoredCount).toBe(3);
  expect(metrics.averageScore).toBe(73);

  expect(metrics.strongestMode).toBe("Quiz Style");
  expect(metrics.improvementMode).toBe("Code Style");

  expect(metrics.byMode[0]).toMatchObject({
    sessions: 2,
    averageScore: 80,
    bestScore: 90,
  });

  expect(metrics.chartDays).toHaveLength(30);

  const activeDays = metrics.chartDays.filter(
    (day) => day.count > 0
  );

  expect(
    activeDays.map((day) => day.averageScore)
  ).toEqual([70, 90, 60]);
});

test("excludes partial and abandoned sessions", () => {
  const metrics = calculateAnalytics([
    full("q1", "Quiz Style", 80, "2026-10-01T12:00:00Z"),
    {
      id: "partial",
      status: "completed",
      mode: "Quiz Style",
      result: {
        completionStatus: "partial",
        score: 0,
      },
    },
    {
      id: "abandoned",
      status: "completed",
      mode: "Quiz Style",
      result: {
        completionStatus: "abandoned",
        score: 0,
      },
    },
    {
      id: "active",
      status: "active",
      mode: "Quiz Style",
      result: { score: 100 },
    },
  ]);

  expect(metrics.completedCount).toBe(1);
  expect(metrics.averageScore).toBe(80);
  expect(metrics.excludedCount).toBe(3);
});

test("includes zero but excludes invalid scores", () => {
  const metrics = calculateAnalytics([
    full("zero", "Code Style", 0, "2026-10-01T12:00:00Z"),
    full("missing", "Code Style", null, "2026-10-02T12:00:00Z"),
    full("invalid", "Code Style", 150, "2026-10-03T12:00:00Z"),
  ]);

  expect(metrics.completedCount).toBe(3);
  expect(metrics.scoredCount).toBe(1);
  expect(metrics.averageScore).toBe(0);
  expect(metrics.byMode[1].bestScore).toBe(0);
});

test("supports legacy scores across the 30-day chart", () => {
  const sessions = Array.from(
    { length: 7 },
    (_, index) => ({
      id: `s${index + 1}`,
      status: "completed",
      mode: "Quiz Style",
      score: `${10 * (index + 1)}%`,
      completedAt:
        `2026-11-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
    })
  ).reverse();

  const metrics = calculateAnalytics(sessions, TEST_WINDOW);

  expect(metrics.completedCount).toBe(7);

  expect(metrics.chartDays).toHaveLength(30);

  const scoredDays = metrics.chartDays.filter(
    (day) => day.count > 0
  );

  expect(scoredDays).toHaveLength(7);

  expect(
    scoredDays.map((day) => day.averageScore)
  ).toEqual([10, 20, 30, 40, 50, 60, 70]);
});

test("returns empty metrics for no history", () => {
  const metrics = calculateAnalytics([], TEST_WINDOW);

  expect(metrics).toMatchObject({
    completedCount: 0,
    scoredCount: 0,
    averageScore: null,
    strongestMode: null,
    improvementMode: null,
  });

  // Even without interviews, display all 30 dates.
  expect(metrics.chartDays).toHaveLength(30);

  // Every date must be marked as missing data.
  expect(
    metrics.chartDays.every(
      (day) =>
        day.count === 0 &&
        day.averageScore === null
    )
  ).toBe(true);
});

test("lifetime metrics use all sessions, not just the five chart points", () => {
  const records = Array.from({ length: 121 }, (_, index) =>
    full(`full-${index}`, "Quiz Style", index === 120 ? 0 : 100,
      new Date(Date.UTC(2026, 10, 1) + index * 60000).toISOString())
  );
  const metrics = calculateAnalytics(records, TEST_WINDOW);
  expect(metrics.completedCount).toBe(121);
  expect(metrics.scoredCount).toBe(121);
  expect(metrics.averageScore).toBe(99);
  expect(metrics.chartDays).toHaveLength(30);

  const activeDays = metrics.chartDays.filter(
    (day) => day.count > 0
  );

  expect(activeDays).toHaveLength(1);

  expect(activeDays[0]).toMatchObject({
    count: 121,
    averageScore: 99,
  });
});

//Makes sure old interviews are in lifetime but not 30 day chart
test("older interviews count toward lifetime stats but not the 30-day chart", () => {
  const window = getAnalyticsWindow(
    new Date(2026, 10, 18, 12)
  );

  const sessions = [
    {
      id: "older",
      status: "completed",
      mode: "Quiz Style",
      completedAt: new Date(2026, 9, 17, 12).toISOString(),
      result: {
        score: 80,
        completionStatus: "completed",
      },
    },
    {
      id: "recent",
      status: "completed",
      mode: "Code Style",
      completedAt: new Date(2026, 10, 18, 12).toISOString(),
      result: {
        score: 60,
        completionStatus: "completed",
      },
    },
  ];

  const metrics = calculateAnalytics(sessions, window);

  // Lifetime statistics include BOTH interviews.
  expect(metrics.completedCount).toBe(2);
  expect(metrics.scoredCount).toBe(2);
  expect(metrics.averageScore).toBe(70);

  // The chart only covers the 30-day window.
  expect(metrics.chartDays).toHaveLength(30);

  expect(
    metrics.chartDays.reduce(
      (total, day) => total + day.count,
      0
    )
  ).toBe(1);

  // Today contains the recent interview.
  expect(metrics.chartDays[29]).toMatchObject({
    count: 1,
    averageScore: 60,
  });

  // Missing dates are preserved.
  expect(metrics.chartDays[0]).toMatchObject({
    count: 0,
    averageScore: null,
  });
});
