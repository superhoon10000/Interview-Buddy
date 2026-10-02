import React, { useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import { PAGES } from "../utils/constants";
import { interviewService } from "../services";
import {
  mockJobRoles,
  mockPracticeGoalTags,
} from "../data/mockInterviewSetup";

const DEFAULT_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 20;

function formatOptionLabel(value) {
  return String(value || "")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function InterviewSetupPage({
  currentPage,
  onNavigate,
  selectedMode,
  onStartInterview,
}) {
  const [jobRole, setJobRole] = useState("");
  const [jobRoleQuery, setJobRoleQuery] = useState("");
  const [isJobRoleDropdownOpen, setIsJobRoleDropdownOpen] = useState(false);

  const [experienceLevel, setExperienceLevel] = useState("");

  const [selectedPracticeGoals, setSelectedPracticeGoals] = useState([]);

  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);

  const [errorMessage, setErrorMessage] = useState("");
  const [isStartingSession, setIsStartingSession] = useState(false);

  const filteredJobRoles = mockJobRoles.filter((role) =>
    role.toLowerCase().includes(jobRoleQuery.trim().toLowerCase())
  );

  function handleJobRoleChange(event) {
    setJobRoleQuery(event.target.value);

    // Typing anything after making a selection invalidates the
    // previous selection until another valid role is chosen.
    setJobRole("");

    setIsJobRoleDropdownOpen(true);
    setErrorMessage("");
  }

  function handleJobRoleSelect(role) {
    const displayRole = formatOptionLabel(role);

    setJobRole(displayRole);
    setJobRoleQuery(displayRole);
    setIsJobRoleDropdownOpen(false);
    setErrorMessage("");
  }

  function handleJobRoleKeyDown(event) {
    if (event.key === "Escape") {
      setIsJobRoleDropdownOpen(false);
      return;
    }

    if (
      event.key === "Enter" &&
      isJobRoleDropdownOpen &&
      filteredJobRoles.length > 0
    ) {
      event.preventDefault();
      handleJobRoleSelect(filteredJobRoles[0]);
    }
  }

  function handleJobRoleBlur() {
    // Allows clicking a dropdown option before the dropdown closes.
    window.setTimeout(() => {
      setIsJobRoleDropdownOpen(false);
    }, 100);
  }

  function togglePracticeGoal(tag) {
    setSelectedPracticeGoals((currentGoals) =>
      currentGoals.includes(tag)
        ? currentGoals.filter((goal) => goal !== tag)
        : [...currentGoals, tag]
    );

    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !jobRole ||
      !experienceLevel ||
      selectedPracticeGoals.length === 0
    ) {
      setErrorMessage(
        "Please fill in all required fields before starting."
      );

      return;
    }

    const parsedQuestionCount = Number(questionCount);

    if (
      !Number.isInteger(parsedQuestionCount) ||
      parsedQuestionCount < 1 ||
      parsedQuestionCount > MAX_QUESTION_COUNT
    ) {
      setErrorMessage(
        `Please choose between 1 and ${MAX_QUESTION_COUNT} questions.`
      );

      return;
    }

    setErrorMessage("");
    setIsStartingSession(true);

    try {
      const session = await interviewService.startSession({
        mode: selectedMode,
        jobRole,
        experienceLevel,

        // Existing backend logic expects practiceGoals as text,
        // so selected tags are joined before being passed along.
        practiceGoals: selectedPracticeGoals.join(", "),

        questionCount: parsedQuestionCount,
      });

      onStartInterview(session);
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Unable to start the interview session. Please try again."
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
        <h2 className="panelTitle">
          Practice Session Details
        </h2>

        <p className="setupDescription">
          Choose a supported role, the topics you want to practice,
          and how many questions you want in this session.
        </p>

        <form
          className="setupForm"
          onSubmit={handleSubmit}
        >
          <div className="setupLabel">
            <label htmlFor="jobRole">
              Job Role
            </label>

            <div className="jobRoleCombobox">
              <input
                id="jobRole"
                className="textInput"
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isJobRoleDropdownOpen}
                aria-controls="jobRoleOptions"
                placeholder="Search available job roles"
                value={jobRoleQuery}
                autoComplete="off"
                onChange={handleJobRoleChange}
                onFocus={() =>
                  setIsJobRoleDropdownOpen(true)
                }
                onBlur={handleJobRoleBlur}
                onKeyDown={handleJobRoleKeyDown}
              />

              {isJobRoleDropdownOpen && (
                <div
                  id="jobRoleOptions"
                  className="jobRoleDropdown"
                  role="listbox"
                  aria-label="Available job roles"
                >
                  {filteredJobRoles.length > 0 ? (
                    filteredJobRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className="jobRoleOption"
                        role="option"
                        aria-selected={
                          jobRole.toLowerCase() ===
                          formatOptionLabel(role).toLowerCase()
                        }
                        onMouseDown={(event) =>
                          event.preventDefault()
                        }
                        onClick={() =>
                          handleJobRoleSelect(role)
                        }
                      >
                        {formatOptionLabel(role)}
                      </button>
                    ))
                  ) : (
                    <p className="jobRoleEmpty">
                      No matching job roles found.
                    </p>
                  )}
                </div>
              )}
            </div>

            <span className="fieldHint">
              Start typing to filter the list. Only a role
              from the available options can be used.
            </span>
          </div>

          <label className="setupLabel">
            Experience Level

            <select
              className="textInput"
              value={experienceLevel}
              onChange={(event) => {
                setExperienceLevel(event.target.value);
                setErrorMessage("");
              }}
            >
              <option value="">
                Select experience level
              </option>

              <option value="Beginner">
                Beginner
              </option>

              <option value="Intermediate">
                Intermediate
              </option>

              <option value="Experienced">
                Experienced
              </option>

              <option value="Veteran">
                Veteran
              </option>
            </select>
          </label>

          <fieldset className="practiceGoalFieldset">
            <legend>
              Practice Goals
            </legend>

            <p className="fieldHint">
              Select one or more question tags to focus this
              interview.
            </p>

            <div className="practiceGoalSelector">
              {mockPracticeGoalTags.map((tag) => {
                const isSelected =
                  selectedPracticeGoals.includes(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    className={`practiceGoalPill${
                      isSelected ? " selected" : ""
                    }`}
                    aria-pressed={isSelected}
                    onClick={() =>
                      togglePracticeGoal(tag)
                    }
                  >
                    {formatOptionLabel(tag)}
                  </button>
                );
              })}
            </div>

            <p
              className="selectionSummary"
              aria-live="polite"
            >
              {selectedPracticeGoals.length === 0
                ? "No practice goals selected yet."
                : `${selectedPracticeGoals.length} practice goal${
                    selectedPracticeGoals.length === 1
                      ? ""
                      : "s"
                  } selected.`}
            </p>
          </fieldset>

          <div className="setupLabel questionCountField">
            <label htmlFor="questionCount">
              Number of Questions
            </label>

            <div className="questionCountControl">
              <input
                id="questionCount"
                className="textInput questionCountInput"
                type="number"
                min="1"
                max={MAX_QUESTION_COUNT}
                step="1"
                value={questionCount}
                onChange={(event) => {
                  setQuestionCount(event.target.value);
                  setErrorMessage("");
                }}
              />

              <span className="questionCountLimit">
                Maximum: {MAX_QUESTION_COUNT}
              </span>
            </div>
          </div>

          {errorMessage && (
            <p
              className="formError"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div className="actionRow setupActionRow">
            <button
              type="submit"
              className="primaryButton"
              disabled={isStartingSession}
            >
              {isStartingSession
                ? "Starting Session..."
                : "Start Session"}
            </button>

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