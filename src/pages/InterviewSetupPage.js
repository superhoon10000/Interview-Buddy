import React, {
  useEffect,
  useState,
} from "react";

import PageLayout from "../components/layout/PageLayout";
import { PAGES } from "../utils/constants";
import { interviewService } from "../services";

const DEFAULT_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 20;

function formatOptionLabel(value) {
  return String(value || "")
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function getModeDetails(mode) {
  switch (mode) {
    case "Quiz Style":
      return {
        icon: "▣",
        title: "Quiz Style",
        description:
          "Quick-fire multiple choice interview questions.",
      };

    case "Code Style":
      return {
        icon: "‹›",
        title: "Code Style",
        description:
          "Practice coding questions and technical solutions.",
      };

    case "Theoretical Style":
      return {
        icon: "◎",
        title: "Theoretical Style",
        description:
          "Practice explaining technical concepts in depth.",
      };

    default:
      return {
        icon: "?",
        title: "No Mode Selected",
        description:
          "Return to the dashboard and choose a practice mode.",
      };
  }
}

function InterviewSetupPage({
  currentPage,
  onNavigate,
  selectedMode,
  onStartInterview,
}) {
  const [
    jobRole,
    setJobRole,
  ] = useState("");

  const [
    jobRoleQuery,
    setJobRoleQuery,
  ] = useState("");

  const [
    isJobRoleDropdownOpen,
    setIsJobRoleDropdownOpen,
  ] = useState(false);

  const [
    experienceLevel,
    setExperienceLevel,
  ] = useState("");

  const [
    selectedPracticeGoals,
    setSelectedPracticeGoals,
  ] = useState([]);

  const [
    questionCount,
    setQuestionCount,
  ] = useState(
    DEFAULT_QUESTION_COUNT
  );

  const [
    setupOptions,
    setSetupOptions,
  ] = useState({
    jobRoles: [],
    experienceLevels: [],
    tags: [],
  });

  const [
    isLoadingOptions,
    setIsLoadingOptions,
  ] = useState(true);

  const [
    optionsError,
    setOptionsError,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isStartingSession,
    setIsStartingSession,
  ] = useState(false);

  const modeDetails =
    getModeDetails(selectedMode);

  useEffect(() => {
    let isCurrent = true;

    async function loadSetupOptions() {
      if (!selectedMode) {
        if (isCurrent) {
          setSetupOptions({
            jobRoles: [],
            experienceLevels: [],
            tags: [],
          });

          setOptionsError(
            "Select an interview mode before configuring a session."
          );

          setIsLoadingOptions(false);
        }

        return;
      }

      setIsLoadingOptions(true);
      setOptionsError("");

      try {
        const options =
          await interviewService.getSetupOptions(
            selectedMode,
            {
              jobRole,
              experienceLevel,
            }
          );

        if (isCurrent) {
          setSetupOptions(options);
        }
      } catch (error) {
        if (isCurrent) {
          setSetupOptions({
            jobRoles: [],
            experienceLevels: [],
            tags: [],
          });

          setOptionsError(
            error.message ||
              "Unable to load interview setup options from Firebase."
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoadingOptions(false);
        }
      }
    }

    loadSetupOptions();

    return () => {
      isCurrent = false;
    };
  }, [
    selectedMode,
    jobRole,
    experienceLevel,
  ]);

  const filteredJobRoles =
    setupOptions.jobRoles.filter(
      (role) =>
        role
          .toLowerCase()
          .includes(
            jobRoleQuery
              .trim()
              .toLowerCase()
          )
    );

  function handleJobRoleChange(
    event
  ) {
    setJobRoleQuery(
      event.target.value
    );

    /*
     * Once the user begins typing again,
     * the previous valid selection is cleared.
     *
     * This prevents somebody from typing an
     * arbitrary value that does not exist in
     * Firebase and submitting it.
     */
    setJobRole("");

    setIsJobRoleDropdownOpen(true);
    setErrorMessage("");
  }

  function handleJobRoleSelect(role) {
    const displayRole =
      formatOptionLabel(role);

    setJobRole(displayRole);
    setJobRoleQuery(displayRole);

    /*
    * Experience levels and practice
    * goals depend on the selected role.
    *
    * Reset them whenever the user
    * changes roles so stale selections
    * cannot create an invalid session.
    */
    setExperienceLevel("");
    setSelectedPracticeGoals([]);

    setIsJobRoleDropdownOpen(false);
    setErrorMessage("");
  }

  function handleJobRoleKeyDown(
    event
  ) {
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

      handleJobRoleSelect(
        filteredJobRoles[0]
      );
    }
  }

  function handleJobRoleBlur() {
    /*
     * Give a dropdown option's click event
     * time to fire before closing the menu.
     */
    window.setTimeout(() => {
      setIsJobRoleDropdownOpen(false);
    }, 100);
  }

  function togglePracticeGoal(tag) {
    setSelectedPracticeGoals(
      (currentGoals) =>
        currentGoals.includes(tag)
          ? currentGoals.filter(
              (goal) =>
                goal !== tag
            )
          : [
              ...currentGoals,
              tag,
            ]
    );

    setErrorMessage("");
  }

  function decreaseQuestionCount() {
    setQuestionCount(
      (currentCount) =>
        Math.max(
          1,
          Number(currentCount) - 1
        )
    );

    setErrorMessage("");
  }

  function increaseQuestionCount() {
    setQuestionCount(
      (currentCount) =>
        Math.min(
          MAX_QUESTION_COUNT,
          Number(currentCount) + 1
        )
    );

    setErrorMessage("");
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !jobRole ||
      !experienceLevel ||
      selectedPracticeGoals.length ===
        0
    ) {
      setErrorMessage(
        "Please fill in all required fields before starting."
      );

      return;
    }

    const parsedQuestionCount =
      Number(questionCount);

    if (
      !Number.isInteger(
        parsedQuestionCount
      ) ||
      parsedQuestionCount < 1 ||
      parsedQuestionCount >
        MAX_QUESTION_COUNT
    ) {
      setErrorMessage(
        `Please choose between 1 and ${MAX_QUESTION_COUNT} questions.`
      );

      return;
    }

    setErrorMessage("");
    setIsStartingSession(true);

    try {
      const session =
        await interviewService.startSession(
          {
            mode: selectedMode,
            jobRole,
            experienceLevel,
            tags: selectedPracticeGoals,
            questionCount:
              parsedQuestionCount,
          }
        );

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
    onNavigate(
      PAGES.DASHBOARD
    );
  }

  return (
    <PageLayout
      title="Interview Setup"
      subtitle={`Selected Mode: ${
        selectedMode ||
        "No mode selected"
      }`}
      currentPage={currentPage}
      onNavigate={onNavigate}
    >
      <div className="interviewSetupShell">
        {/* Main setup form */}
        <section className="setupMainCard ib-card">
          <div className="setupCardHeader">
            <div>
              <span className="ib-eyebrow">
                New Practice Session
              </span>

              <h2>
                Configure your interview
              </h2>

              <p>
                Customize the session
                before you begin.
              </p>
            </div>
          </div>

          {/* Selected interview mode */}
          <div className="setupSection">
            <div className="setupSectionHeading">
              <div>
                <span className="setupSectionLabel">
                  Interview Mode
                </span>

                <p>
                  You selected this mode
                  from the dashboard.
                </p>
              </div>

              <button
                type="button"
                className="setupChangeModeButton"
                onClick={handleCancel}
                disabled={
                  isStartingSession
                }
              >
                Change Mode
              </button>
            </div>

            <div className="selectedModeCard">
              <div
                className="selectedModeIcon"
                aria-hidden="true"
              >
                {modeDetails.icon}
              </div>

              <div>
                <strong>
                  {modeDetails.title}
                </strong>

                <span>
                  {
                    modeDetails.description
                  }
                </span>
              </div>

              <span className="selectedModeStatus">
                Selected
              </span>
            </div>
          </div>

          {isLoadingOptions && (
            <div
              className="setupStatusMessage"
              role="status"
            >
              <span
                className="setupStatusDot"
                aria-hidden="true"
              />

              Loading available setup
              options from Firebase...
            </div>
          )}

          {optionsError && (
            <div
              className="setupErrorMessage"
              role="alert"
            >
              {optionsError}
            </div>
          )}

          <form
            className="setupForm"
            onSubmit={handleSubmit}
          >
            {/* Role + Experience */}
            <div className="setupFormGrid">
              <div className="setupField">
                <label
                  className="setupFieldLabel"
                  htmlFor="jobRole"
                >
                  Job Role
                </label>

                <div className="jobRoleCombobox">
                  <input
                    id="jobRole"
                    className="ib-input"
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={
                      isJobRoleDropdownOpen
                    }
                    aria-controls="jobRoleOptions"
                    placeholder="Search job roles"
                    value={jobRoleQuery}
                    autoComplete="off"
                    disabled={
                      isLoadingOptions ||
                      Boolean(
                        optionsError
                      )
                    }
                    onChange={
                      handleJobRoleChange
                    }
                    onFocus={() =>
                      setIsJobRoleDropdownOpen(
                        true
                      )
                    }
                    onBlur={
                      handleJobRoleBlur
                    }
                    onKeyDown={
                      handleJobRoleKeyDown
                    }
                  />

                  {isJobRoleDropdownOpen &&
                    !isLoadingOptions &&
                    !optionsError && (
                      <div
                        id="jobRoleOptions"
                        className="jobRoleDropdown"
                        role="listbox"
                        aria-label="Available job roles"
                      >
                        {filteredJobRoles.length >
                        0 ? (
                          filteredJobRoles.map(
                            (role) => (
                              <button
                                key={
                                  role
                                }
                                type="button"
                                className="jobRoleOption"
                                role="option"
                                aria-selected={
                                  jobRole.toLowerCase() ===
                                  formatOptionLabel(
                                    role
                                  ).toLowerCase()
                                }
                                onMouseDown={(
                                  event
                                ) =>
                                  event.preventDefault()
                                }
                                onClick={() =>
                                  handleJobRoleSelect(
                                    role
                                  )
                                }
                              >
                                {formatOptionLabel(
                                  role
                                )}
                              </button>
                            )
                          )
                        ) : (
                          <p className="jobRoleEmpty">
                            No matching job
                            roles found.
                          </p>
                        )}
                      </div>
                    )}
                </div>

                <span className="setupFieldHint">
                  Start typing to filter
                  roles stored in
                  Firebase.
                </span>
              </div>

              <div className="setupField">
                <label
                  className="setupFieldLabel"
                  htmlFor="experienceLevel"
                >
                  Experience Level
                </label>

                <select
                  id="experienceLevel"
                  className="ib-select"
                  value={
                    experienceLevel
                  }
                  disabled={
                    isLoadingOptions ||
                    Boolean(optionsError)
                  }
                  onChange={(event) => {
                    setExperienceLevel(
                      event.target.value
                    );

                    /*
                    * Available practice goals depend
                    * on both role and experience.
                    */
                    setSelectedPracticeGoals([]);

                    setErrorMessage("");
                  }}
                >
                  <option value="">
                    Select experience
                    level
                  </option>

                  {setupOptions.experienceLevels.map(
                    (level) => (
                      <option
                        key={level}
                        value={level}
                      >
                        {formatOptionLabel(
                          level
                        )}
                      </option>
                    )
                  )}
                </select>

                <span className="setupFieldHint">
                  Questions are filtered
                  for this experience
                  level.
                </span>
              </div>
            </div>

            {/* Practice goals */}
            <fieldset
              className="practiceGoalFieldset setupSection"
              disabled={
                isLoadingOptions ||
                Boolean(optionsError) ||
                !jobRole ||
                !experienceLevel
              }
            >
              <div className="setupSectionHeading">
                <div>
                  <legend className="setupSectionLabel">
                    Practice Goals
                  </legend>

                  <p>
                    {!jobRole
                      ? "Select a job role first."
                      : !experienceLevel
                        ? "Select an experience level to see available topics."
                        : "Choose one or more topics available for this session."}
                  </p>
                </div>

                <span className="practiceGoalCount">
                  {
                    selectedPracticeGoals.length
                  }{" "}
                  selected
                </span>
              </div>

              <div className="practiceGoalSelector">
                {setupOptions.tags.map(
                  (tag) => {
                    const isSelected =
                      selectedPracticeGoals.includes(
                        tag
                      );

                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`practiceGoalPill${
                          isSelected
                            ? " selected"
                            : ""
                        }`}
                        aria-pressed={
                          isSelected
                        }
                        onClick={() =>
                          togglePracticeGoal(
                            tag
                          )
                        }
                      >
                        {isSelected && (
                          <span
                            className="practiceGoalCheck"
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        )}

                        {formatOptionLabel(
                          tag
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              <p
                className="selectionSummary"
                aria-live="polite"
              >
                {selectedPracticeGoals.length ===
                0
                  ? "No practice goals selected yet."
                  : `${selectedPracticeGoals.length} practice goal${
                      selectedPracticeGoals.length ===
                      1
                        ? ""
                        : "s"
                    } selected.`}
              </p>
            </fieldset>

            {/* Question count */}
            <div className="setupSection questionSection">
              <div className="setupSectionHeading">
                <div>
                  <label
                    className="setupSectionLabel"
                    htmlFor="questionCount"
                  >
                    Number of Questions
                  </label>

                  <p>
                    Choose the length of
                    this practice session.
                  </p>
                </div>
              </div>

              <div className="questionCountControl">
                <button
                  type="button"
                  className="questionCountButton"
                  aria-label="Decrease question count"
                  onClick={
                    decreaseQuestionCount
                  }
                  disabled={
                    Number(
                      questionCount
                    ) <= 1
                  }
                >
                  −
                </button>

                <input
                  id="questionCount"
                  className="questionCountInput"
                  type="number"
                  min="1"
                  max={
                    MAX_QUESTION_COUNT
                  }
                  step="1"
                  value={questionCount}
                  onChange={(event) => {
                    setQuestionCount(
                      event.target.value
                    );

                    setErrorMessage(
                      ""
                    );
                  }}
                />

                <button
                  type="button"
                  className="questionCountButton"
                  aria-label="Increase question count"
                  onClick={
                    increaseQuestionCount
                  }
                  disabled={
                    Number(
                      questionCount
                    ) >=
                    MAX_QUESTION_COUNT
                  }
                >
                  +
                </button>

                <span className="questionCountLimit">
                  1–
                  {
                    MAX_QUESTION_COUNT
                  }{" "}
                  questions
                </span>
              </div>
            </div>

            {errorMessage && (
              <div
                className="setupErrorMessage"
                role="alert"
              >
                {errorMessage}
              </div>
            )}

            <div className="setupActionRow">
              <button
                type="button"
                className="ib-button ib-button--secondary"
                onClick={handleCancel}
                disabled={
                  isStartingSession
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="ib-button ib-button--primary setupStartButton"
                disabled={
                  isStartingSession ||
                  isLoadingOptions ||
                  Boolean(
                    optionsError
                  )
                }
              >
                {isStartingSession
                  ? "Starting Session..."
                  : "Start Session"}

                {!isStartingSession && (
                  <span
                    aria-hidden="true"
                  >
                    →
                  </span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Session summary */}
        <aside className="setupSummaryCard ib-card">
          <span className="ib-eyebrow">
            Session Summary
          </span>

          <h2>
            Your Practice Session
          </h2>

          <p className="setupSummaryIntro">
            Review your current
            configuration before
            starting.
          </p>

          <div className="setupSummaryList">
            <div className="setupSummaryItem">
              <span>Mode</span>

              <strong>
                {modeDetails.title}
              </strong>
            </div>

            <div className="setupSummaryItem">
              <span>Job Role</span>

              <strong>
                {jobRole ||
                  "Not selected"}
              </strong>
            </div>

            <div className="setupSummaryItem">
              <span>
                Experience
              </span>

              <strong>
                {experienceLevel
                  ? formatOptionLabel(
                      experienceLevel
                    )
                  : "Not selected"}
              </strong>
            </div>

            <div className="setupSummaryItem">
              <span>
                Practice Goals
              </span>

              <strong>
                {
                  selectedPracticeGoals.length
                }
              </strong>
            </div>

            <div className="setupSummaryItem">
              <span>
                Questions
              </span>

              <strong>
                {questionCount}
              </strong>
            </div>
          </div>

          <div className="setupSummaryNote">
            <span
              className="setupSummaryNoteIcon"
              aria-hidden="true"
            >
              ✓
            </span>

            <p>
              Questions will be
              selected using the role,
              experience level, and
              practice goals you choose.
            </p>
          </div>
        </aside>
      </div>
    </PageLayout>
  );
}

export default InterviewSetupPage;