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

export function calculateAnalytics(sessions) {
  const allSessions = Array.isArray(sessions)
    ? sessions
    : [];

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

  // Five most recent dated, scored interviews.
  const chartSessions = scored
    .filter((session) => session.completedAt)
    .sort(
      (a, b) =>
        a.completedAt.getTime() -
        b.completedAt.getTime()
    )
    .slice(-5);

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

    chartSessions,

    excludedCount:
      allSessions.length - completed.length,
  };
}
