import React, { useState } from "react";
import "./App.css";

import { PAGES } from "./utils/constants";
import { renderPage } from "./utils/routes";

function App() {
  //State variables
  const [currentPage, setCurrentPage] = useState(PAGES.LOGIN);
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
  // UC15 — banner shown on the login page after account deletion.
  const [loginMessage, setLoginMessage] = useState("");

  //Handler functions
  function handleNavigate(pageName) {
    // Any navigation away from login clears the one-shot banner so it
    // doesn't reappear if the user logs in and then logs out.
    if (pageName !== PAGES.LOGIN) {
      setLoginMessage("");
    }
    setCurrentPage(pageName);
  }

  function handleAccountDeleted() {
    // UC15 happy path — clear sensitive state, set the success banner,
    // and route back to the public login page.
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
    setCurrentPage(PAGES.LOGIN);
  }

  function handleSelectMode(modeName) {
    setSelectedMode(modeName);
    setCurrentPage(PAGES.INTERVIEW_SETUP);
  }

  function handleStartInterview(formData) {
    setSetupData(formData);
    setCurrentPage(PAGES.INTERVIEW);
  }

  function handleEndInterview(resultData) {
    setSessionResult(resultData);
    setCurrentPage(PAGES.SESSION_RESULTS);
  }

  //References route.js to build page
  return renderPage({
    currentPage,
    onNavigate: handleNavigate,
    onSelectMode: handleSelectMode,
    onStartInterview: handleStartInterview,
    onEndInterview: handleEndInterview,
    onAccountDeleted: handleAccountDeleted,
    loginMessage,
    selectedMode,
    setupData,
    sessionResult,
  });
}

export default App;
