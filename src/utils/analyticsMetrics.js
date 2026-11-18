//Calculates statistics for Analytics page.  Keeping separate makes it easier to test.
//Calcs:
//Number of completed interviews (fully)
//Average score
//Average and best score for each mode
//Strongest and weakest performing modes
//Last five scored interviews for the chart
//Number of partial or abandoned interviews excluded

import {
  getSessionScore,
  parseSessionDate,
} from "./historyResults";

const MODES = [
  "Quiz Style",
  "Code Style",
  "Theoretical Style",
];

/**
 * An ended interview may have been abandoned
 * before all questions were answered.
 *
 * Exclude those interviews from performance
 * statistics.
 */
function isFullyCompleted(session) {
  if (
    !session ||
    (session.status && session.status !== "completed")
  ) {
    return false;
  }

  const completionStatus =
    session.result?.completionStatus ??
    session.completionStatus;

  if (completionStatus === "completed") {
    return true;
  }

  if (completionStatus != null) {
    return false;
  }

  // Support older sessions without completionStatus
  // when they have a valid saved score.
  const legacyScore = getSessionScore(session);

  return (
    legacyScore !== null &&
    legacyScore >= 0 &&
    legacyScore <= 100
  );
}

// Use the last 30 local calendar days, including today.
export function getAnalyticsWindow(now = new Date()) {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 29
  );

  const endExclusive = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  return {
    start,
    endExclusive,
    startDate: start.toISOString(),
    endDate: endExclusive.toISOString(),
  };
}

// Groups interviews by local calendar day.
function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function calculateAnalytics(
  sessions,
  window = getAnalyticsWindow()
) {
  // Only calculate statistics inside the selected window.
  // The exclusive end prevents counting tomorrow's sessions.
  const allSessions = (
    Array.isArray(sessions) ? sessions : []
  ).filter((session) => {
    const date = parseSessionDate(
      session?.completedAt
    );

    return (
      date !== null &&
      date >= window.start &&
      date < window.endExclusive
    );
  });

  const completed = allSessions.filter(
    isFullyCompleted
  );

  const scored = completed.reduce(
    (records, session) => {
      const score = getSessionScore(session);

      if (
        score === null ||
        score < 0 ||
        score > 100
      ) {
        return records;
      }

      records.push({
        id: session.id,
        mode: session.mode,
        score,
        completedAt: parseSessionDate(
          session.completedAt
        ),
      });

      return records;
    },
    []
  );

  // Calculate statistics for each interview mode.
  const byMode = MODES.map((mode) => {
    const scores = scored
      .filter((session) => session.mode === mode)
      .map((session) => session.score);

    return {
      mode,
      sessions: scores.length,

      averageScore: scores.length
        ? Math.round(
            scores.reduce(
              (sum, score) => sum + score,
              0
            ) / scores.length
          )
        : null,

      bestScore: scores.length
        ? Math.max(...scores)
        : null,
    };
  });

  // Rank interview modes by average performance.
  const rankedModes = byMode
    .filter((item) => item.sessions > 0)
    .sort(
      (a, b) =>
        b.averageScore - a.averageScore ||
        MODES.indexOf(a.mode) -
          MODES.indexOf(b.mode)
    );

  // Overall average across saved session scores.
  const totalScore = scored.reduce(
    (sum, session) => sum + session.score,
    0
  );

  // Aggregate scored interviews by calendar day.
  const totalsByDay = new Map();

  for (const session of scored) {
    if (!session.completedAt) continue;

    const key = dayKey(session.completedAt);

    const previous = totalsByDay.get(key) || {
      total: 0,
      count: 0,
    };

    totalsByDay.set(key, {
      total: previous.total + session.score,
      count: previous.count + 1,
    });
  }

  // Generate exactly 30 dates, including days with no data.
  const chartDays = Array.from(
    { length: 30 },
    (_, index) => {
      const date = new Date(
        window.start.getFullYear(),
        window.start.getMonth(),
        window.start.getDate() + index
      );

      const totals = totalsByDay.get(dayKey(date));

      return {
        date,
        count: totals?.count ?? 0,
        averageScore: totals
          ? Math.round(totals.total / totals.count)
          : null,
      };
    }
  );

  return {
    completedCount: completed.length,

    scoredCount: scored.length,

    averageScore: scored.length
      ? Math.round(totalScore / scored.length)
      : null,

    strongestMode:
      rankedModes[0]?.mode || null,

    improvementMode:
      rankedModes.length > 1
        ? rankedModes[rankedModes.length - 1].mode
        : null,

    byMode,

    chartDays,

    excludedCount:
      allSessions.length - completed.length,
  };
}
