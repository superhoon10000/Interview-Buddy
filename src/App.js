import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./App.css";

import { PAGES } from "./utils/constants";
import AppRoutes from "./utils/routes";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // The URL now determines which page is active.
  const currentPage = location.pathname;

  const [selectedMode, setSelectedMode] = useState("");

  const [setupData, setSetupData] = useState({
    jobRole: "",
    experienceLevel: "",
    practiceGoals: "",
  });

  const [sessionResult, setSessionResult] = useState({
    mode: "Quiz Style",
    date: "May 4, 2026",
    score: "0%",
    questionsAnswered: 0,
    eloChange: "0",
    isCorrect: null,
    answerSubmitted: false,
  });

  // Banner shown on the login page after account deletion.
  const [loginMessage, setLoginMessage] = useState("");

  // Clear the login banner when leaving the login page.
  // This also works when using browser Back/Forward buttons.
  useEffect(() => {
    if (currentPage !== PAGES.LOGIN) {
      setLoginMessage("");
    }
  }, [currentPage]);

  function handleNavigate(path) {
    navigate(path);
  }

  function handleAccountDeleted() {
    setSessionResult({
      mode: "Quiz Style",
      date: "May 4, 2026",
      score: "0%",
      questionsAnswered: 0,
      eloChange: "0",
      isCorrect: null,
      answerSubmitted: false,
    });

    setSelectedMode("");
    setLoginMessage("Your account has been successfully deleted.");

    navigate(PAGES.LOGIN, { replace: true });
  }

  function handleSelectMode(modeName) {
    setSelectedMode(modeName);
    navigate(PAGES.INTERVIEW_SETUP);
  }

  function handleStartInterview(sessionData) {
    setSetupData(sessionData);
    navigate(PAGES.INTERVIEW);
  }

  function handleEndInterview(resultData) {
    setSessionResult(resultData);
    navigate(PAGES.SESSION_RESULTS);
  }

  return (
    <AppRoutes
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onSelectMode={handleSelectMode}
      onStartInterview={handleStartInterview}
      onEndInterview={handleEndInterview}
      onAccountDeleted={handleAccountDeleted}
      loginMessage={loginMessage}
      selectedMode={selectedMode}
      setupData={setupData}
      sessionResult={sessionResult}
    />
  );
}

export default App;