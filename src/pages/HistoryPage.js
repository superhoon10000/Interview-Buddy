import React, { useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import mockSessions from "../data/mockSessions";
import { PAGES } from "../utils/constants";

function HistoryPage({ currentPage, onNavigate }) {
  const [expandedId, setExpandedId] = useState(null);

  function toggleExpand(id) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <PageLayout
      title="Chat History"
      subtitle="Review and revisit your previous interview sessions."
      currentPage={currentPage}
      onNavigate={onNavigate}
    >
      <div className="historyList">
        {mockSessions.map((session) => (
          <div className="historyCard" key={session.id}>
            <div className="historyCardTop">
              <h2>{session.mode}</h2>
              <span className="historyScore">{session.score}</span>
            </div>

            <p className="historyMeta">Date: {session.date}</p>
            <p className="historyMeta">Questions Answered: {session.questionsAnswered}</p>
            <p className="historyMeta">ELO Change: {session.eloChange}</p>

            {expandedId === session.id && (
              <div className="sessionDetail">
                <hr />
                <h3>Session Summary</h3>
                <p><strong>Mode:</strong> {session.mode}</p>
                <p><strong>Date:</strong> {session.date}</p>
                <p><strong>Score:</strong> {session.score}</p>
                <p><strong>Questions Answered:</strong> {session.questionsAnswered}</p>
                <p><strong>ELO Change:</strong> {session.eloChange}</p>
                {session.summary && (
                  <p><strong>Notes:</strong> {session.summary}</p>
                )}
                <button
                  className="secondaryButton"
                  style={{ marginTop: "10px" }}
                  onClick={() => onNavigate(PAGES.INTERVIEW)}
                >
                  Resume Session
                </button>
              </div>
            )}

            <div className="actionRow">
              <button
                className="secondaryButton"
                onClick={() => toggleExpand(session.id)}
              >
                {expandedId === session.id ? "Close" : "View"}
              </button>
              <button
                className="secondaryButton"
                onClick={() => onNavigate(PAGES.INTERVIEW)}
              >
                Resume
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}

export default HistoryPage;