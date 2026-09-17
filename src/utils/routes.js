import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PAGES } from "./constants";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";
import InterviewSetupPage from "../pages/InterviewSetupPage";
import InterviewSessionPage from "../pages/InterviewSessionPage";
import SessionResultsPage from "../pages/SessionResultsPage";
import SettingsPage from "../pages/SettingsPage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import HistoryPage from "../pages/HistoryPage";
import LeaderboardPage from "../pages/LeaderboardPage";
import AnalyticsPage from "../pages/AnalyticsPage";

function AppRoutes({
  currentPage,
  onNavigate,
  onSelectMode,
  onStartInterview,
  onEndInterview,
  onAccountDeleted,
  loginMessage,
  selectedMode,
  setupData,
  sessionResult,
}) {
  const commonProps = {
    currentPage,
    onNavigate,
  };

  return (
    <Routes>
      {/* Base URL redirects to login */}
      <Route
        path="/"
        element={<Navigate to={PAGES.LOGIN} replace />}
      />

      {/* Login */}
      <Route
        path={PAGES.LOGIN}
        element={
          <LoginPage
            onLogin={() => onNavigate(PAGES.DASHBOARD)}
            onGoToRegister={() => onNavigate(PAGES.REGISTER)}
            loginMessage={loginMessage}
          />
        }
      />

      {/* Register */}
      <Route
        path={PAGES.REGISTER}
        element={
          <RegisterPage
            onRegister={() => onNavigate(PAGES.DASHBOARD)}
            onGoToLogin={() => onNavigate(PAGES.LOGIN)}
          />
        }
      />

      {/* Dashboard */}
      <Route
        path={PAGES.DASHBOARD}
        element={
          <DashboardPage
            {...commonProps}
            onSelectMode={onSelectMode}
          />
        }
      />

      {/* Interview Setup */}
      <Route
        path={PAGES.INTERVIEW_SETUP}
        element={
          <InterviewSetupPage
            {...commonProps}
            selectedMode={selectedMode}
            onStartInterview={onStartInterview}
          />
        }
      />

      {/* Active Interview Session */}
      <Route
        path={PAGES.INTERVIEW}
        element={
          <InterviewSessionPage
            {...commonProps}
            selectedMode={selectedMode}
            setupData={setupData}
            onEndInterview={onEndInterview}
          />
        }
      />

      {/* Session Results */}
      <Route
        path={PAGES.SESSION_RESULTS}
        element={
          <SessionResultsPage
            {...commonProps}
            sessionResult={sessionResult}
          />
        }
      />

      {/* History */}
      <Route
        path={PAGES.HISTORY}
        element={<HistoryPage {...commonProps} />}
      />

      {/* Leaderboard */}
      <Route
        path={PAGES.LEADERBOARD}
        element={<LeaderboardPage {...commonProps} />}
      />

      {/* Analytics */}
      <Route
        path={PAGES.ANALYTICS}
        element={<AnalyticsPage {...commonProps} />}
      />

      {/* Settings */}
      <Route
        path={PAGES.SETTINGS}
        element={
          <SettingsPage
            {...commonProps}
            onAccountDeleted={onAccountDeleted}
          />
        }
      />

      {/* Change Password */}
      <Route
        path={PAGES.CHANGE_PASSWORD}
        element={
          <ChangePasswordPage
            onBackToSettings={() => onNavigate(PAGES.SETTINGS)}
          />
        }
      />

      {/* Temporary fallback until we add the 404 page */}
      <Route
        path="*"
        element={<Navigate to={PAGES.DASHBOARD} replace />}
      />
    </Routes>
  );
}

export default AppRoutes;