import React, { useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import { PAGES } from "../utils/constants";
import { interviewService } from "../services";

function InterviewSetupPage({
  currentPage,
  onNavigate,
  selectedMode,
  onStartInterview,
}) {
  const [jobRole, setJobRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [practiceGoals, setPracticeGoals] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isStartingSession, setIsStartingSession] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!jobRole || !experienceLevel || !practiceGoals) {
      setErrorMessage("Please fill in all required fields before starting.");
      return;
    }

    setErrorMessage("");
    setIsStartingSession(true);

    try {
      const session = await interviewService.startSession({
        mode: selectedMode,
        jobRole,
        experienceLevel,
        practiceGoals,
      });

      onStartInterview(session);
    } catch (error) {
      setErrorMessage(
        error.message || "Unable to start the interview session. Please try again."
      );
    } finally {
      setIsStartingSession(false);
    }
  }

  function handleCancel() {
    onNavigate(PAGES.DASHBOARD);
  }

  return (
    <PageLayout
      title="Interview Setup"
      subtitle={`Selected Mode: ${selectedMode || "No mode selected"}`}
      currentPage={currentPage}
      onNavigate={onNavigate}
    >
      <div className="setupPanel">
        <h2 className="panelTitle">Practice Session Details</h2>
        <p className="setupDescription">
          Provide your interview preparation details before starting the session.
        </p>

        <form className="setupForm" onSubmit={handleSubmit}>
          <label className="setupLabel">
            Job Role
            <input
              className="textInput"
              type="text"
              placeholder="Example: Frontend Developer Intern"
              value={jobRole}
              onChange={(event) => setJobRole(event.target.value)}
            />
          </label>

          <label className="setupLabel">
            Experience Level
            <select
              className="textInput"
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value)}
            >
              <option value="">Select experience level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Experienced">Experienced</option>
              <option value="Veteran">Veteran</option>
            </select>
          </label>

          <label className="setupLabel">
            Practice Goals
            <textarea
              className="answerBox compactAnswerBox"
              placeholder="Example: Data structures, behavioral questions, Amazon-style interview prep"
              value={practiceGoals}
              onChange={(event) => setPracticeGoals(event.target.value)}
            />
          </label>

          {errorMessage && <p className="formError">{errorMessage}</p>}

          <div className="actionRow">
            <button
              type="submit"
              className="primaryButton"
              disabled={isStartingSession}
            >
              {isStartingSession ? "Starting Session..." : "Start Session"}
            </button>
            <p> </p>
            <button
              type="button"
              className="secondaryButton"
              onClick={handleCancel}
              disabled={isStartingSession}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

export default InterviewSetupPage;