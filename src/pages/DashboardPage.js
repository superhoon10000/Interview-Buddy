import React from "react";
import PageLayout from "../components/layout/PageLayout";
import PracticeModeCard from "../components/dashboard/PracticeModeCard";

function DashboardPage({ currentPage, onNavigate, onSelectMode }) {
  return (
    <PageLayout
      title="Dashboard"
      subtitle="Choose a preparation mode to get started."
      currentPage={currentPage}
      onNavigate={onNavigate}
    >
      <div className="dashboardGrid">
        <PracticeModeCard
          title="Quiz Style"
          description="Practice multiple choice interview questions with a simple question and answer format."
          onOpen={() => onSelectMode("Quiz Style")}
        />

        <PracticeModeCard
          title="Code Style"
          description="Practice technical coding prompts with a code box and written solution space."
          onOpen={() => onSelectMode("Code Style")}
        />

        <PracticeModeCard
          title="Theoretical Style"
          description="Practice open response interview questions and longer conceptual explanations."
          onOpen={() => onSelectMode("Theoretical Style")}
        />
      </div>

      <div className="dashboardMiniGrid">
        <div className="smallPanel" onClick={() => onNavigate("history")}>
          <h3>History</h3>
          <p>View past interview sessions.</p>
        </div>

        <div className="smallPanel" onClick={() => onNavigate("leaderboard")}>
          <h3>Leaderboard</h3>
          <p>See your ranking against other users.</p>
        </div>

        <div className="smallPanel" onClick={() => onNavigate("analytics")}>
          <h3>Analytics</h3>
          <p>Review progress and performance.</p>
        </div>
      </div>

      <div className="largePanel">
        <h2 className="panelTitle">Quick Overview</h2>
        <p>
          Select a mode, fill out your interview setup details, and then begin
          a database-backed session flow that retrieves interview questions through the Interview Buddy application API.
        </p>
      </div>
    </PageLayout>
  );
}

export default DashboardPage;