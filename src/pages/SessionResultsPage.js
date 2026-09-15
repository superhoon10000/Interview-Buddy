import React from "react";
import PageLayout from "../components/layout/PageLayout";
import FeedbackBox from "../components/interview/FeedbackBox";
import { PAGES } from "../utils/constants";

// UC14 — View Session Results
// Mock per-question breakdown that the Analytics Engine would normally
// produce. This stays in this file so the page renders correctly whether
// the user just finished a session OR jumped in from chat history (UC4 link).
const FALLBACK_QUESTION_BREAKDOWN = [
  {
    id: 1,
    prompt: "What is the time complexity of binary search?",
    userAnswer: "O(log n)",
    correctAnswer: "O(log n)",
    isCorrect: true,
    score: 100,
  },
  {
    id: 2,
    prompt: "Explain the difference between TCP and UDP.",
    userAnswer:
      "TCP is connection-based and reliable, UDP is connectionless and faster.",
    correctAnswer:
      "TCP guarantees ordered delivery; UDP is faster but lossy.",
    isCorrect: true,
    score: 90,
  },
  {
    id: 3,
    prompt: "Reverse a singly linked list.",
    userAnswer: "Iterative pointer-swap solution.",
    correctAnswer: "Iterative or recursive pointer reversal.",
    isCorrect: true,
    score: 85,
  },
  {
    id: 4,
    prompt: "What is a deadlock and how do you prevent it?",
    userAnswer: "When two threads wait on each other.",
    correctAnswer:
      "Mutual exclusion + hold-and-wait + no-preemption + circular wait.",
    isCorrect: false,
    score: 55,
  },
];

const FALLBACK_AI_FEEDBACK =
  "Strong recall on algorithmic complexity and networking basics. " +
  "Communication was clear and concise. To improve, review operating " +
  "systems concepts (especially deadlock conditions) and practice " +
  "explaining your reasoning out loud before writing code.";

function SessionResultsPage({
  currentPage,
  onNavigate,
  sessionResult,
  onRetrySession,
}) {
  // Extension #2a — guard against missing session data.
  if (!sessionResult) {
    return (
      <PageLayout
        title="Session Results"
        subtitle="Unable to load session results."
        currentPage={currentPage}
        onNavigate={onNavigate}
      >
        <div className="resultSummaryCard">
          <p style={{ color: "#9f1c1c", marginBottom: "16px" }}>
            Unable to load session results. Please try again later.
          </p>
          <button
            className="primaryButton"
            onClick={() => onNavigate(PAGES.DASHBOARD)}
          >
            Return to Home
          </button>
        </div>
      </PageLayout>
    );
  }

  // Pull values defensively. Any field can be missing depending on
  // whether the page was reached from a live session or from history.
  const mode = sessionResult.mode || "Quiz Style";
  const date = sessionResult.date || "May 4, 2026";
  const score = sessionResult.score || "0%";
  const eloChange = sessionResult.eloChange || "0";
  const breakdown =
    sessionResult.perQuestion && sessionResult.perQuestion.length > 0
      ? sessionResult.perQuestion
      : FALLBACK_QUESTION_BREAKDOWN;
  const questionsAnswered =
    sessionResult.questionsAnswered != null && sessionResult.questionsAnswered > 0
      ? sessionResult.questionsAnswered
      : breakdown.length;

  // Extension #4a — analytics engine failure means we got a session but
  // no per-question detail. Surface that gracefully instead of crashing.
  const analyticsAvailable = breakdown && breakdown.length > 0;

  // Extension #5a — LLM may not have returned feedback. We honour that
  // by showing a neutral note instead of hiding the section.
  const aiFeedback =
    sessionResult.aiFeedback ||
    sessionResult.feedbackMessage ||
    FALLBACK_AI_FEEDBACK;
  const aiFeedbackAvailable = Boolean(aiFeedback);

  function handleStartNewSession() {
    // Step 8 happy path — go back to the dashboard so the user can
    // pick a fresh practice mode.
    onNavigate(PAGES.DASHBOARD);
  }

  function handleReturnHome() {
    onNavigate(PAGES.DASHBOARD);
  }

  function handleRetrySession() {
    // Extension 7a — same setup as the completed session.
    if (onRetrySession) {
      onRetrySession(sessionResult);
    } else {
      onNavigate(PAGES.INTERVIEW_SETUP);
    }
  }

  return (
    <PageLayout
      title="Session Results"
      subtitle="Detailed breakdown of your most recent practice session."
      currentPage={currentPage}
      onNavigate={onNavigate}
    >
      {/* Headline summary card — Step 6 outputs */}
      <div className="resultSummaryCard">
        <div className="resultSummaryTop">
          <h2>{mode}</h2>
          <span className="resultSummaryScore">{score}</span>
        </div>

        <p className="resultMeta">Date: {date}</p>
        <p className="resultMeta">Questions Attempted: {questionsAnswered}</p>
        <p className="resultMeta">ELO Change: {eloChange}</p>

        {sessionResult.feedbackMessage && (
          <FeedbackBox
            feedbackType={sessionResult.feedbackType}
            feedbackMessage={sessionResult.feedbackMessage}
          />
        )}
      </div>

      {/* Per-question breakdown — the Analytics Engine output */}
      <div className="resultSummaryCard" style={{ marginTop: "20px" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "14px" }}>
          Per-Question Breakdown
        </h2>

        {!analyticsAvailable ? (
          <p style={{ color: "#8a5a00" }}>
            Detailed analytics are temporarily unavailable. Showing summary
            score only.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {breakdown.map((q, idx) => (
              <div
                key={q.id ?? idx}
                style={{
                  border: "2px solid #e5ebf2",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  background: "#fbfcfe",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "10px",
                    marginBottom: "8px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1rem",
                      color: "#1f2937",
                      margin: 0,
                    }}
                  >
                    Question {idx + 1}
                  </h3>
                  <span
                    style={{
                      fontWeight: 700,
                      color: q.isCorrect ? "#1f6b3d" : "#9f1c1c",
                    }}
                  >
                    {q.isCorrect ? "Correct" : "Incorrect"}
                    {q.score != null && ` · ${q.score}%`}
                  </span>
                </div>
                <p style={{ color: "#2f3542", marginBottom: "8px" }}>
                  <strong>Prompt:</strong> {q.prompt}
                </p>
                {q.userAnswer && (
                  <p style={{ color: "#415064", marginBottom: "6px" }}>
                    <strong>Your answer:</strong> {q.userAnswer}
                  </p>
                )}
                {q.correctAnswer && (
                  <p style={{ color: "#415064" }}>
                    <strong>Reference answer:</strong> {q.correctAnswer}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI feedback summary — LLM output (Step 5/6) */}
      <div className="resultSummaryCard" style={{ marginTop: "20px" }}>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "10px" }}>
          AI Feedback Summary
        </h2>
        {aiFeedbackAvailable ? (
          <div className="quizFeedback ai-feedback">
            <p>{aiFeedback}</p>
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
            AI feedback is unavailable for this session.
          </p>
        )}
      </div>

      {/* Step 8 actions */}
      <div className="actionRow resultActionRow" style={{ gap: "10px" }}>
        <button className="primaryButton" onClick={handleStartNewSession}>
          Start new Session
        </button>
        <button className="secondaryButton" onClick={handleReturnHome}>
          Return to Home
        </button>
        <button className="secondaryButton" onClick={handleRetrySession}>
          Retry Session
        </button>
      </div>
    </PageLayout>
  );
}

export default SessionResultsPage;
