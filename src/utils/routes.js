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

//Routing given page and state, returns element to render
export function renderPage({
    currentPage,
    onNavigate,
    onSelectMode,
    onStartInterview,
    onEndInterview,
    onAccountDeleted,
    loginMessage,
    selectedMode,
    setupData,
    sessionResult
}) {
    const commonProps = { currentPage, onNavigate };

    switch (currentPage) {
      case PAGES.LOGIN:
        return (
          <LoginPage
            onLogin={() => onNavigate(PAGES.DASHBOARD)}
            onGoToRegister={() => onNavigate(PAGES.REGISTER)}
            loginMessage={loginMessage}
          />
        );
      case PAGES.REGISTER:
        return (
          <RegisterPage
            onRegister={() => onNavigate(PAGES.DASHBOARD)}
            onGoToLogin={() => onNavigate(PAGES.LOGIN)}
          />
        );
      case PAGES.DASHBOARD:
        return <DashboardPage {...commonProps} onSelectMode={onSelectMode} />;
      case PAGES.INTERVIEW_SETUP:
        return (
          <InterviewSetupPage
            {...commonProps}
            selectedMode={selectedMode}
            onStartInterview={onStartInterview}
          />
        );
      case PAGES.INTERVIEW:
        return (
          <InterviewSessionPage
            {...commonProps}
            selectedMode={selectedMode}
            setupData={setupData}
            onEndInterview={onEndInterview}
          />
        );
      case PAGES.SESSION_RESULTS:
        return <SessionResultsPage {...commonProps} sessionResult={sessionResult} />;
      case PAGES.SETTINGS:
        return <SettingsPage {...commonProps} onAccountDeleted={onAccountDeleted} />;
      case PAGES.CHANGE_PASSWORD:
        return (
          <ChangePasswordPage
            onBackToSettings={() => onNavigate(PAGES.SETTINGS)}
          />
        );
      case PAGES.HISTORY:
        return <HistoryPage {...commonProps} />;
      case PAGES.LEADERBOARD:
        return <LeaderboardPage {...commonProps} />;
      case PAGES.ANALYTICS:
        return <AnalyticsPage {...commonProps} />;

      //Fallback to dashboard, same as previous setup
      default:
        return <DashboardPage {...commonProps} onSelectMode={onSelectMode} />;
    }
}