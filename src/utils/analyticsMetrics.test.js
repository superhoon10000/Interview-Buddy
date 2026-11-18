//Verifies that averages and charts reflect saved scores correctly, especially when interviews are unfinished or missing valid scores
import { calculateAnalytics } from "./analyticsMetrics";

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
    full("q1", "Quiz Style", 70, "2026-10-01T12:00:00Z"),
    full("q2", "Quiz Style", 90, "2026-10-02T12:00:00Z"),
    full("c1", "Code Style", 60, "2026-10-03T12:00:00Z"),
  ]);

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

  expect(
    metrics.chartSessions.map((session) => session.id)
  ).toEqual(["q1", "q2", "c1"]);
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

test("supports legacy scores and the newest five dates", () => {
  const sessions = Array.from(
    { length: 7 },
    (_, index) => ({
      id: `s${index + 1}`,
      status: "completed",
      mode: "Quiz Style",
      score: `${10 * (index + 1)}%`,
      completedAt:
        `2026-10-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
    })
  ).reverse();

  const metrics = calculateAnalytics(sessions);

  expect(metrics.completedCount).toBe(7);

  expect(
    metrics.chartSessions.map((session) => session.id)
  ).toEqual(["s3", "s4", "s5", "s6", "s7"]);
});

test("returns empty metrics for no history", () => {
  expect(calculateAnalytics([])).toMatchObject({
    completedCount: 0,
    scoredCount: 0,
    averageScore: null,
    strongestMode: null,
    improvementMode: null,
    chartSessions: [],
  });
});

test("lifetime metrics use all sessions, not just the five chart points", () => {
  const records = Array.from({ length: 121 }, (_, index) =>
    full(`full-${index}`, "Quiz Style", index === 120 ? 0 : 100,
      new Date(Date.UTC(2026, 10, 1) + index * 60000).toISOString())
  );
  const metrics = calculateAnalytics(records);
  expect(metrics.completedCount).toBe(121);
  expect(metrics.scoredCount).toBe(121);
  expect(metrics.averageScore).toBe(99);
  expect(metrics.chartSessions).toHaveLength(5);
});
