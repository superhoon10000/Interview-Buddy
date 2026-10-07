import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PageLayout from "../components/layout/PageLayout";

import CodeEditor from "../components/interview/CodeEditor";

import {
  aiService,
  interviewService,
} from "../services";

function getModeDetails(mode) {
  switch (mode) {
    case "Quiz Style":
      return {
        icon: "▣",
        label: "Quiz Style",
        description:
          "Multiple choice technical interview practice.",
      };

    case "Code Style":
      return {
        icon: "‹›",
        label: "Code Style",
        description:
          "Coding and technical solution practice.",
      };

    case "Theoretical Style":
      return {
        icon: "◎",
        label: "Theoretical Style",
        description:
          "Technical concept explanation practice.",
      };

    default:
      return {
        icon: "?",
        label:
          mode || "Interview",
        description:
          "Technical interview practice.",
      };
  }
}

function calculateAverageScore(
  answers
) {
  if (!answers.length) {
    return 0;
  }

  const total =
    answers.reduce(
      (sum, answer) =>
        sum +
        Number(
          answer.score || 0
        ),
      0
    );

  return Math.round(
    total / answers.length
  );
}

function calculateEloChange(
  score
) {
  if (score >= 70) {
    return "+2";
  }

  if (score >= 50) {
    return "+1";
  }

  return "-2";
}

function InterviewSessionPage({
  currentPage,
  onNavigate,
  selectedMode,
  setupData,
  onEndInterview,
}) {
  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [
    currentQuestionIndex,
    setCurrentQuestionIndex,
  ] = useState(0);

  const [
    isLoadingQuestions,
    setIsLoadingQuestions,
  ] = useState(true);

  const [
    questionLoadError,
    setQuestionLoadError,
  ] = useState("");

  const [
    selectedQuizAnswer,
    setSelectedQuizAnswer,
  ] = useState("");

  const [
    writtenAnswer,
    setWrittenAnswer,
  ] = useState("");

  const [
    codeLanguage,
    setCodeLanguage,
  ] = useState(
    "python"
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    submissionError,
    setSubmissionError,
  ] = useState("");

  const [
    evaluationResult,
    setEvaluationResult,
  ] = useState(null);

  const [
    answeredQuestions,
    setAnsweredQuestions,
  ] = useState([]);

  const modeDetails =
    getModeDetails(
      selectedMode
    );

  const currentQuestion =
    questions[
      currentQuestionIndex
    ] || null;

  const isQuiz =
    selectedMode ===
    "Quiz Style";

  const isCode =
    selectedMode ===
    "Code Style";

  const isTheoretical =
    selectedMode ===
    "Theoretical Style";

  const questionCount =
    questions.length;

  const currentQuestionNumber =
    questionCount > 0
      ? currentQuestionIndex + 1
      : 0;

  /*
  * Session progress should represent
  * completed questions, not the question
  * currently being viewed.
  *
  * Example:
  * 0 of 10 answered = 0%
  * 1 of 10 answered = 10%
  * 5 of 10 answered = 50%
  */
  const progressPercent =
    questionCount > 0
      ? Math.round(
          (answeredQuestions.length /
            questionCount) *
            100
        )
      : 0;

  const currentAverageScore =
    useMemo(
      () =>
        calculateAverageScore(
          answeredQuestions
        ),
      [answeredQuestions]
    );

  const loadQuestions =
    useCallback(
      async () => {
        if (!selectedMode) {
          setQuestions([]);
          setQuestionLoadError(
            "No interview mode was selected."
          );
          setIsLoadingQuestions(
            false
          );
          return;
        }

        setIsLoadingQuestions(
          true
        );

        setQuestionLoadError(
          ""
        );

        try {
          const loadedQuestions =
            await interviewService.getQuestions(
              {
                mode:
                  selectedMode,

                jobRole:
                  setupData?.jobRole ||
                  "",

                experienceLevel:
                  setupData?.experienceLevel ||
                  "",

                tags:
                  setupData?.tags ||
                  [],

                limit:
                  Number(
                    setupData?.questionCount ||
                    10
                  ),
              }
            );

          const normalizedQuestions =
            Array.isArray(
              loadedQuestions
            )
              ? loadedQuestions
              : [];

          if (
            normalizedQuestions.length ===
            0
          ) {
            setQuestions([]);

            setQuestionLoadError(
              `No active ${selectedMode} questions were returned from Firebase.`
            );

            return;
          }

          setQuestions(
            normalizedQuestions
          );

          setCurrentQuestionIndex(
            0
          );
        } catch (error) {
          setQuestions([]);

          setQuestionLoadError(
            error.message ||
              "Unable to load interview questions."
          );
        } finally {
          setIsLoadingQuestions(
            false
          );
        }
      },
      [
        selectedMode,
        setupData,
      ]
    );

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  function resetQuestionState() {
    setSelectedQuizAnswer(
      ""
    );

    setWrittenAnswer("");

    setSubmissionError("");

    setEvaluationResult(
      null
    );

    setIsSubmitting(
      false
    );
  }

  async function handleSubmit() {
    if (
      !currentQuestion ||
      isSubmitting ||
      evaluationResult
    ) {
      return;
    }

    setSubmissionError(
      ""
    );

    if (
      isQuiz &&
      !selectedQuizAnswer
    ) {
      setSubmissionError(
        "Please select an answer before submitting."
      );

      return;
    }

    if (
      !isQuiz &&
      !writtenAnswer.trim()
    ) {
      setSubmissionError(
        "Please enter an answer before submitting."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      if (isQuiz) {
        const result =
          await interviewService.checkQuizAnswer(
            currentQuestion.id,
            selectedQuizAnswer
          );

        const normalizedResult = {
          type: "quiz",

          isCorrect:
            Boolean(
              result?.isCorrect
            ),

          score:
            result?.isCorrect
              ? 100
              : 0,

          explanation:
            result?.explanation ||
            "",

          correctAnswer:
            result?.correctAnswer ||
            "",
        };

        setEvaluationResult(
          normalizedResult
        );

        setAnsweredQuestions(
          (currentAnswers) => [
            ...currentAnswers,

            {
              questionId:
                currentQuestion.id,

              question:
                currentQuestion.prompt,

              userAnswer:
                selectedQuizAnswer,

              isCorrect:
                normalizedResult.isCorrect,

              score:
                normalizedResult.score,

              feedback:
                normalizedResult.explanation,

              correctAnswer:
                normalizedResult.correctAnswer,
            },
          ]
        );

        return;
      }

      const result =
        await aiService.evaluateAnswer(
          {
            questionId:
              currentQuestion.id,

            userAnswer:
              writtenAnswer.trim(),

            sessionId:
              setupData?.id ||
              "",

            jobRole:
              setupData?.jobRole ||
              "",

            experienceLevel:
              setupData?.experienceLevel ||
              "",
          }
        );

      const normalizedResult = {
        type: "ai",

        score:
          Number(
            result?.score || 0
          ),

        feedback:
          result?.feedback ||
          "",

        strengths:
          Array.isArray(
            result?.strengths
          )
            ? result.strengths
            : [],

        weaknesses:
          Array.isArray(
            result?.weaknesses
          )
            ? result.weaknesses
            : [],

        suggestions:
          Array.isArray(
            result?.suggestions
          )
            ? result.suggestions
            : [],

        criterionResults:
          Array.isArray(
            result?.criterionResults
          )
            ? result.criterionResults
            : [],
      };

      setEvaluationResult(
        normalizedResult
      );

      setAnsweredQuestions(
        (currentAnswers) => [
          ...currentAnswers,

          {
            questionId:
              currentQuestion.id,

            question:
              currentQuestion.prompt,

            userAnswer:
              writtenAnswer.trim(),

            score:
              normalizedResult.score,

            isCorrect:
              normalizedResult.score >=
              70,

            feedback:
              normalizedResult.feedback,

            strengths:
              normalizedResult.strengths,

            weaknesses:
              normalizedResult.weaknesses,

            suggestions:
              normalizedResult.suggestions,

            criterionResults:
              normalizedResult.criterionResults,
          },
        ]
      );
    } catch (error) {
      setSubmissionError(
        error.message ||
          "Unable to evaluate your answer. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNextQuestion() {
    if (
      currentQuestionIndex >=
      questions.length - 1
    ) {
      return;
    }

    resetQuestionState();

    setCurrentQuestionIndex(
      (currentIndex) =>
        currentIndex + 1
    );
  }

  function handleEndInterview() {
    const averageScore =
      calculateAverageScore(
        answeredQuestions
      );

    const lastAnswer =
      answeredQuestions[
        answeredQuestions.length -
          1
      ];

    onEndInterview({
      mode:
        selectedMode,

      score:
        `${averageScore}%`,

      questionsAnswered:
        answeredQuestions.length,

      eloChange:
        calculateEloChange(
          averageScore
        ),

      isCorrect:
        Boolean(
          lastAnswer?.isCorrect
        ),

      answerSubmitted:
        answeredQuestions.length >
        0,

      perQuestion:
        answeredQuestions,

      jobRole:
        setupData?.jobRole ||
        "",

      experienceLevel:
        setupData?.experienceLevel ||
        "",

      tags:
        setupData?.tags ||
        [],
    });
  }

  function renderQuizAnswerArea() {
    const options =
      Array.isArray(
        currentQuestion?.options
      )
        ? currentQuestion.options
        : [];

    return (
      <div className="sessionQuizOptions">
        {options.map(
          (
            option,
            index
          ) => {
            const optionId =
              `quiz-option-${index}`;

            const isSelected =
              selectedQuizAnswer ===
              option;

            return (
              <label
                key={
                  option
                }
                htmlFor={
                  optionId
                }
                className={`sessionQuizOption${
                  isSelected
                    ? " selected"
                    : ""
                }`}
              >
                <input
                  id={
                    optionId
                  }
                  type="radio"
                  name="quizAnswer"
                  value={
                    option
                  }
                  checked={
                    isSelected
                  }
                  disabled={
                    Boolean(
                      evaluationResult
                    ) ||
                    isSubmitting
                  }
                  onChange={() => {
                    setSelectedQuizAnswer(
                      option
                    );

                    setSubmissionError(
                      ""
                    );
                  }}
                />

                <span className="sessionQuizOptionLetter">
                  {String.fromCharCode(
                    65 +
                      index
                  )}
                </span>

                <span className="sessionQuizOptionText">
                  {option}
                </span>
              </label>
            );
          }
        )}
      </div>
    );
  }

  function renderWrittenAnswerArea() {
    const trimmedAnswer =
      writtenAnswer.trim();

    const wordCount =
      trimmedAnswer
        ? trimmedAnswer
            .split(/\s+/)
            .length
        : 0;

    const lineCount =
      writtenAnswer
        ? writtenAnswer
            .split("\n")
            .length
        : 0;


    function handleWrittenAnswerChange(
      nextValue
    ) {
      setWrittenAnswer(
        nextValue
      );

      setSubmissionError(
        ""
      );
    }


    return (
      <div className="sessionWrittenResponse">
        <div className="sessionResponseHeading">
          <div>
            <label
              className="sessionResponseLabel"
              htmlFor={
                isTheoretical
                  ? "interviewAnswer"
                  : undefined
              }
            >
              Your Response
            </label>


            {isTheoretical && (
              <p className="sessionResponseDescription">
                Answer as if you were
                explaining the concept
                directly to an interviewer.
              </p>
            )}


            {isCode && (
              <p className="sessionResponseDescription">
                Explain your approach and
                provide code or pseudocode
                as you would during a
                technical interview.
              </p>
            )}
          </div>


          {isTheoretical && (
            <span className="sessionResponseTypeBadge">
              Written Response
            </span>
          )}


          {isCode && (
            <span className="sessionResponseTypeBadge">
              Code Response
            </span>
          )}
        </div>


        {/* =========================
            THEORETICAL GUIDANCE
            ========================= */}

        {isTheoretical && (
          <div className="sessionAnswerGuidance">
            <div className="sessionGuidanceItem">
              <span className="sessionGuidanceNumber">
                1
              </span>

              <div>
                <strong>
                  Define the concept
                </strong>

                <span>
                  Start with a clear and
                  direct explanation.
                </span>
              </div>
            </div>


            <div className="sessionGuidanceItem">
              <span className="sessionGuidanceNumber">
                2
              </span>

              <div>
                <strong>
                  Explain your reasoning
                </strong>

                <span>
                  Describe why it works or
                  why it matters.
                </span>
              </div>
            </div>


            <div className="sessionGuidanceItem">
              <span className="sessionGuidanceNumber">
                3
              </span>

              <div>
                <strong>
                  Add context
                </strong>

                <span>
                  Use an example, tradeoff,
                  or use case when helpful.
                </span>
              </div>
            </div>
          </div>
        )}


        {/* =========================
            CODE GUIDANCE
            ========================= */}

        {isCode && (
          <div className="sessionCodeGuidance">
            <div className="sessionCodeGuidanceItem">
              <strong>
                Approach
              </strong>

              <span>
                Briefly explain how you plan
                to solve the problem.
              </span>
            </div>


            <div className="sessionCodeGuidanceItem">
              <strong>
                Implementation
              </strong>

              <span>
                Write code or clear
                pseudocode for your
                solution.
              </span>
            </div>


            <div className="sessionCodeGuidanceItem">
              <strong>
                Complexity
              </strong>

              <span>
                Include time and space
                complexity when relevant.
              </span>
            </div>
          </div>
        )}


        {/* =========================
            CODE EDITOR
            ========================= */}

        {isCode && (
          <div className="sessionCodeEditor">
            <div className="sessionCodeEditorHeader">
              <div
                className="sessionCodeWindowDots"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </div>

              <span>
                Interview Solution
              </span>

              <select
                className="sessionCodeLanguageSelect"
                aria-label="Programming Language"
                value={
                  codeLanguage
                }
                disabled={
                  Boolean(
                    evaluationResult
                  ) ||
                  isSubmitting
                }
                onChange={(event) => {
                  setCodeLanguage(
                    event.target.value
                  );
                }}
              >
                <option value="python">
                  Python
                </option>

                <option value="javascript">
                  JavaScript
                </option>

                <option value="java">
                  Java
                </option>

                <option value="cpp">
                  C++
                </option>
              </select>
            </div>


            <CodeEditor
              value={
                writtenAnswer
              }

              language={
                codeLanguage
              }

              ariaLabel="Your Response"

              disabled={
                Boolean(
                  evaluationResult
                ) ||
                isSubmitting
              }

              onChange={
                handleWrittenAnswerChange
              }
            />
          </div>
        )}


        {/* =========================
            THEORETICAL TEXTAREA
            ========================= */}

        {isTheoretical && (
          <textarea
            id="interviewAnswer"

            className="sessionAnswerTextarea sessionAnswerTextarea--theoretical"

            placeholder="Explain your answer clearly. Include the main concept, your reasoning, and an example when relevant."

            value={
              writtenAnswer
            }

            disabled={
              Boolean(
                evaluationResult
              ) ||
              isSubmitting
            }

            onChange={(event) => {
              handleWrittenAnswerChange(
                event.target.value
              );
            }}
          />
        )}


        {/* =========================
            RESPONSE STATISTICS
            ========================= */}

        <div className="sessionResponseMeta">
          <div className="sessionResponseStats">
            {isTheoretical && (
              <span>
                {wordCount}{" "}
                {wordCount === 1
                  ? "word"
                  : "words"}
              </span>
            )}


            {isCode && (
              <span>
                {lineCount}{" "}
                {lineCount === 1
                  ? "line"
                  : "lines"}
              </span>
            )}


            <span>
              {writtenAnswer.length}{" "}
              characters
            </span>
          </div>


          {isCode && (
            <span>
              AI evaluates your response;
              code is not executed.
            </span>
          )}


          {isTheoretical && (
            <span>
              Focus on clarity,
              accuracy, and explanation.
            </span>
          )}
        </div>
      </div>
    );
  }

  function renderQuizFeedback() {
    if (
      !evaluationResult ||
      evaluationResult.type !==
        "quiz"
    ) {
      return null;
    }

    return (
      <section
        className={`sessionFeedbackCard ${
          evaluationResult.isCorrect
            ? "sessionFeedbackCard--success"
            : "sessionFeedbackCard--error"
        }`}
        aria-live="polite"
      >
        <div className="sessionFeedbackHeading">
          <div className="sessionFeedbackIcon">
            {evaluationResult.isCorrect
              ? "✓"
              : "×"}
          </div>

          <div>
            <span className="ib-eyebrow">
              Answer Feedback
            </span>

            <h3>
              {evaluationResult.isCorrect
                ? "Correct Answer"
                : "Incorrect Answer"}
            </h3>
          </div>
        </div>

        {evaluationResult.explanation && (
          <p className="sessionFeedbackText">
            {
              evaluationResult.explanation
            }
          </p>
        )}

        {!evaluationResult.isCorrect &&
          evaluationResult.correctAnswer && (
            <div className="sessionCorrectAnswer">
              <span>
                Correct answer
              </span>

              <strong>
                {
                  evaluationResult.correctAnswer
                }
              </strong>
            </div>
          )}
      </section>
    );
  }

  function renderAiFeedback() {
    if (
      !evaluationResult ||
      evaluationResult.type !==
        "ai"
    ) {
      return null;
    }

    return (
      <section
        className="sessionFeedbackCard"
        aria-live="polite"
      >
        <div className="sessionAiScoreRow">
          <div>
            <span className="ib-eyebrow">
              AI Evaluation
            </span>

            <h3>
              Response Feedback
            </h3>
          </div>

          <div className="sessionAiScore">
            Score:{" "}
            {
              evaluationResult.score
            }
            /100
          </div>
        </div>

        {evaluationResult.feedback && (
          <p className="sessionFeedbackText">
            {
              evaluationResult.feedback
            }
          </p>
        )}

        {evaluationResult.strengths.length >
          0 && (
          <div className="sessionFeedbackGroup">
            <h4>
              Strengths
            </h4>

            <ul>
              {evaluationResult.strengths.map(
                (
                  strength
                ) => (
                  <li
                    key={
                      strength
                    }
                  >
                    {
                      strength
                    }
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        {evaluationResult.weaknesses.length >
          0 && (
          <div className="sessionFeedbackGroup">
            <h4>
              Areas to Improve
            </h4>

            <ul>
              {evaluationResult.weaknesses.map(
                (
                  weakness
                ) => (
                  <li
                    key={
                      weakness
                    }
                  >
                    {
                      weakness
                    }
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        {evaluationResult.suggestions.length >
          0 && (
          <div className="sessionFeedbackGroup">
            <h4>
              Suggestions
            </h4>

            <ul>
              {evaluationResult.suggestions.map(
                (
                  suggestion
                ) => (
                  <li
                    key={
                      suggestion
                    }
                  >
                    {
                      suggestion
                    }
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        {evaluationResult.criterionResults.length >
          0 && (
          <div className="sessionCriteria">
            {evaluationResult.criterionResults.map(
              (
                criterion,
                index
              ) => (
                <div
                  key={
                    criterion.name ||
                    index
                  }
                  className="sessionCriterion"
                >
                  <div className="sessionCriterionHeader">
                    <strong>
                      {
                        criterion.name
                      }
                    </strong>

                    <span>
                      {
                        criterion.awardedPoints
                      }
                      /
                      {
                        criterion.maxPoints
                      }
                    </span>
                  </div>

                  {criterion.feedback && (
                    <p>
                      {
                        criterion.feedback
                      }
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </section>
    );
  }

  if (
    isLoadingQuestions
  ) {
    return (
      <PageLayout
        title="Interview Session"
        subtitle="Preparing your practice session."
        currentPage={
          currentPage
        }
        onNavigate={
          onNavigate
        }
      >
        <div
          className="sessionLoadingCard ib-card"
          role="status"
        >
          <div className="sessionLoadingSpinner" />

          <h2>
            Loading interview
            questions
          </h2>

          <p>
            Finding questions
            that match your role,
            experience level, and
            practice goals.
          </p>
        </div>
      </PageLayout>
    );
  }

  if (
    questionLoadError
  ) {
    return (
      <PageLayout
        title="Interview Session"
        subtitle="We could not start your session."
        currentPage={
          currentPage
        }
        onNavigate={
          onNavigate
        }
      >
        <div className="sessionErrorCard ib-card">
          <div className="sessionErrorIcon">
            !
          </div>

          <div>
            <h2>
              Questions could
              not be loaded
            </h2>

            <p>
              {
                questionLoadError
              }
            </p>
          </div>

          <button
            type="button"
            className="ib-button ib-button--primary"
            onClick={
              loadQuestions
            }
          >
            Retry Question Load
          </button>
        </div>
      </PageLayout>
    );
  }

  if (
    !currentQuestion
  ) {
    return null;
  }

  return (
    <PageLayout
      title="Interview Session"
      subtitle={`${modeDetails.label} practice session`}
      currentPage={
        currentPage
      }
      onNavigate={
        onNavigate
      }
    >
      <div className="interviewSessionShell">
        <section className="sessionMainColumn">
          {/* Session progress */}
          <div className="sessionProgressCard ib-card">
            <div className="sessionProgressTop">
              <div className="sessionModeIdentity">
                <div
                  className="sessionModeIcon"
                  aria-hidden="true"
                >
                  {
                    modeDetails.icon
                  }
                </div>

                <div>
                  <span className="sessionStatusBadge">
                    Active Session
                  </span>

                  <h2>
                    {
                      modeDetails.label
                    }
                  </h2>

                  <p>
                    {
                      modeDetails.description
                    }
                  </p>
                </div>
              </div>

              <div className="sessionQuestionPosition">
                <strong>
                  Question{" "}
                  {
                    currentQuestionNumber
                  }{" "}
                  of{" "}
                  {
                    questionCount
                  }
                </strong>

                <span>
                  {
                    progressPercent
                  }
                  % complete
                </span>
              </div>
            </div>

            <div
              className="ib-progress-track"
              role="progressbar"
              aria-label="Interview progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={
                progressPercent
              }
            >
              <div
                className="ib-progress-fill"
                style={{
                  width:
                    `${progressPercent}%`,
                }}
              />
            </div>
          </div>

          {/* Question */}
          <article className="sessionQuestionCard ib-card">
            <div className="sessionQuestionHeader">
              <div>
                <span className="ib-eyebrow">
                  Question{" "}
                  {
                    currentQuestionNumber
                  }
                </span>

                <h2>
                  Interview
                  Question
                </h2>
              </div>

              {currentQuestion.difficulty && (
                <span className="sessionDifficultyBadge">
                  {
                    currentQuestion.difficulty
                  }
                </span>
              )}
            </div>

            <p className="sessionQuestionPrompt">
              {
                currentQuestion.prompt
              }
            </p>

            {currentQuestion.topic && (
              <div className="sessionQuestionTopic">
                <span>
                  Topic
                </span>

                <strong>
                  {
                    currentQuestion.topic
                  }
                </strong>
              </div>
            )}

            <div className="sessionAnswerArea">
              {isQuiz
                ? renderQuizAnswerArea()
                : renderWrittenAnswerArea()}
            </div>

            {submissionError && (
              <div
                className="sessionSubmissionError"
                role="alert"
              >
                {
                  submissionError
                }
              </div>
            )}

            {renderQuizFeedback()}

            {renderAiFeedback()}

            <div className="sessionQuestionActions">
              <button
                type="button"
                className="ib-button ib-button--secondary"
                onClick={
                  handleEndInterview
                }
                disabled={
                  isSubmitting
                }
              >
                End Interview
              </button>

              <div className="sessionPrimaryActions">
                {!evaluationResult && (
                  <button
                    type="button"
                    className="ib-button ib-button--primary"
                    onClick={
                      handleSubmit
                    }
                    disabled={
                      isSubmitting
                    }
                  >
                    {isSubmitting
                      ? "Evaluating..."
                      : "Submit"}
                  </button>
                )}

                {evaluationResult &&
                  currentQuestionIndex <
                    questions.length -
                      1 && (
                    <button
                      type="button"
                      className="ib-button ib-button--primary"
                      onClick={
                        handleNextQuestion
                      }
                    >
                      Next Question
                    </button>
                  )}

                {evaluationResult &&
                  currentQuestionIndex ===
                    questions.length -
                      1 && (
                    <button
                      type="button"
                      className="ib-button ib-button--primary"
                      onClick={
                        handleEndInterview
                      }
                    >
                      Finish Session
                    </button>
                  )}
              </div>
            </div>
          </article>
        </section>

        {/* Right-side session summary */}
        <aside className="sessionSideColumn">
          <section className="sessionPerformanceCard ib-card">
            <span className="ib-eyebrow">
              Performance
            </span>

            <h2>
              Session Progress
            </h2>

            <div className="sessionMetricGrid">
              <div className="sessionMetric">
                <span>
                  Answered
                </span>

                <strong>
                  {
                    answeredQuestions.length
                  }
                  /
                  {
                    questionCount
                  }
                </strong>
              </div>

              <div className="sessionMetric">
                <span>
                  Score
                </span>

                <strong>
                  {
                    currentAverageScore
                  }
                  %
                </strong>
              </div>
            </div>

            <div className="sessionDetailList">
              <div className="sessionDetailItem">
                <span>
                  Mode
                </span>

                <strong>
                  {
                    modeDetails.label
                  }
                </strong>
              </div>

              <div className="sessionDetailItem">
                <span>
                  Role
                </span>

                <strong>
                  {setupData?.jobRole ||
                    "—"}
                </strong>
              </div>

              <div className="sessionDetailItem">
                <span>
                  Experience
                </span>

                <strong>
                  {setupData?.experienceLevel ||
                    "—"}
                </strong>
              </div>
            </div>
          </section>

          <section className="sessionFocusCard ib-card">
            <span className="ib-eyebrow">
              Practice Focus
            </span>

            <div className="sessionFocusTags">
              {Array.isArray(
                setupData?.tags
              ) &&
              setupData.tags.length >
                0 ? (
                setupData.tags.map(
                  (tag) => (
                    <span
                      key={
                        tag
                      }
                      className="sessionFocusTag"
                    >
                      {
                        tag
                      }
                    </span>
                  )
                )
              ) : (
                <p>
                  No practice goals
                  selected.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </PageLayout>
  );
}

export default InterviewSessionPage;