//Page retrieves interview history and current ELO
//If leaderboard service is unavailable, will still display interview stats
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import PageLayout from "../components/layout/PageLayout";
import AnalyticsStatCard from "../components/analytics/AnalyticsStatCard";
import PerformanceBreakdown from "../components/analytics/PerformanceBreakdown";
import ProgressChart from "../components/analytics/ProgressChart";
import LoadingState from "../components/state/LoadingState";
import ErrorState from "../components/state/ErrorState";

import { useAuth } from "../context/AuthContext";
import { analyticsService } from "../services/analyticsService";
import { leaderboardService } from "../services/leaderboardService";
import { calculateAnalytics } from "../utils/analyticsMetrics";

const INITIAL = {
  uid: null,
  status: "loading",
  sessions: [],
  ranking: null,
  error: "",
};

function AnalyticsPage({ currentPage, onNavigate }) {
  const { user } = useAuth();
  const uid = user?.uid || null;

  const [state, setState] = useState(INITIAL);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setState({
      ...INITIAL,
      uid,
    });

    Promise.allSettled([
      analyticsService.getCompletedSessions(),
      leaderboardService.getUserRanking(),
    ]).then(([historyResult, rankingResult]) => {
      if (!active) return;

      if (historyResult.status === "rejected") {
        setState({
          ...INITIAL,
          uid,
          status: "error",
          error:
            historyResult.reason?.message ||
            "Unable to load analytics.",
        });

        return;
      }

      setState({
        uid,
        status: "success",
        sessions: historyResult.value,
        ranking:
          rankingResult.status === "fulfilled"
            ? rankingResult.value
            : null,
        error: "",
      });
    });

    return () => {
      active = false;
    };
  }, [uid, retry]);

  const metrics = useMemo(
    () => calculateAnalytics(state.sessions),
    [state.sessions]
  );

  // Prevent showing one account's metrics
  // while another account's data is loading.
  const status =
    state.uid !== uid ? "loading" : state.status;

  const cards = [
    {
      id: "completed",
      label: "Interviews Completed",
      value: String(metrics.completedCount),
      description: "Fully completed interview sessions.",
    },
    {
      id: "average",
      label: "Average Score",
      value:
        metrics.averageScore == null
          ? "—"
          : `${metrics.averageScore}%`,
      description:
        `Across ${metrics.scoredCount} fully completed, scored interviews.`,
    },
    {
      id: "elo",
      label: "Current ELO",
      value: state.ranking?.elo ?? "—",
      description:
        "Current rating from your leaderboard profile, if available.",
    },
    {
      id: "strongest",
      label: "Strongest Mode",
      value: metrics.strongestMode || "—",
      description:
        "Practice mode with the highest average saved score.",
    },
  ];

  return (
    <PageLayout
      title="Analytics"
      subtitle="Track your real interview performance over time."
      currentPage={currentPage}
      onNavigate={onNavigate}
    >
      {status === "loading" && (
        <LoadingState
          message="Loading your interview analytics..."
        />
      )}

      {status === "error" && (
        <ErrorState
          title="Analytics could not be loaded"
          message={state.error}
          retry={() => setRetry((value) => value + 1)}
        />
      )}

      {status === "success" && (
        <>
          <div className="analyticsGrid">
            {cards.map((item) => (
              <AnalyticsStatCard
                key={item.id}
                {...item}
              />
            ))}
          </div>

          {metrics.completedCount === 0 ? (
            <div className="largePanel">
              <h2 className="panelTitle">
                No completed interviews yet
              </h2>
              <p>
                Finish every question in an interview
                to begin tracking your performance.
              </p>
            </div>
          ) : (
            <>
              <div className="largePanel">
                <h2 className="panelTitle">
                  Progress Over Time
                </h2>

                <ProgressChart
                  sessions={metrics.chartSessions}
                />
              </div>

              <div className="largePanel">
                <h2 className="panelTitle">
                  Performance Breakdown
                </h2>

                <PerformanceBreakdown
                  byMode={metrics.byMode}
                  strongestMode={metrics.strongestMode}
                  improvementMode={metrics.improvementMode}
                />
              </div>
            </>
          )}

          <p className="analyticsFootnote">
            Scores come from saved interview results.
            Partially finished and abandoned interviews
            are excluded from performance statistics.

            {metrics.excludedCount > 0 &&
              ` ${metrics.excludedCount} ended interview(s) excluded.`}

            {metrics.completedCount > metrics.scoredCount &&
              " Some older interviews have no valid saved score."}
          </p>
        </>
      )}
    </PageLayout>
  );
}

export default AnalyticsPage;
