import React, { useCallback, useEffect, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import FeedbackBox from "../components/interview/FeedbackBox";
import { PAGES } from "../utils/constants";
import { aiService, interviewService } from "../services";

function formatEvaluationFeedback(evaluation) {
  const sections = [`Score: ${evaluation.score}/100`, evaluation.feedback];

  if (evaluation.strengths?.length) {
    sections.push(`Strengths: ${evaluation.strengths.join("; ")}`);
  }

  if (evaluation.weaknesses?.length) {
    sections.push(`Weaknesses: ${evaluation.weaknesses.join("; ")}`);
  }

  if (evaluation.suggestions?.length) {
    sections.push(`Suggestions: ${evaluation.suggestions.join("; ")}`);
  }

  return sections.filter(Boolean).join("\n\n");
}

function InterviewSessionPage({
  currentPage,
  onNavigate,
  selectedMode,
  setupData,
  onEndInterview,
}) {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [answeredQuestions, setAnsweredQuestions] = useState({});

  const currentQuestion = questions[currentQuestionIndex] || null;
  const currentAnswerRecord = currentQuestion
    ? answeredQuestions[currentQuestion.id]
    : null;
  const hasSubmitted = Boolean(currentAnswerRecord?.submitted);
  const hasNextQuestion = currentQuestionIndex < questions.length - 1;

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnsweredQuestions({});

    try {
      const loadedQuestions = await interviewService.getQuestions({
        mode: selectedMode,
        jobRole: setupData.jobRole,
        experienceLevel: setupData.experienceLevel,
        practiceGoals: setupData.practiceGoals,
        limit: 10,
      });

      if (!loadedQuestions.length) {
        throw new Error(
          `No active ${selectedMode || "interview"} questions were returned from Firebase.`
        );
      }

      setQuestions(loadedQuestions);
    } catch (error) {
      setLoadError(
        error.message || "Unable to load interview questions. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedMode,
    setupData.experienceLevel,
    setupData.jobRole,
    setupData.practiceGoals,
  ]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    setSelectedAnswer("");
    setWrittenAnswer("");
    setFeedbackMessage("");
    setFeedbackType("");
  }, [currentQuestionIndex]);

  async function handleSubmit() {
    if (!currentQuestion || isSubmitting) {
      return;
    }

    if (selectedMode === "Quiz Style") {
      if (!selectedAnswer) {
        setFeedbackType("warning");
        setFeedbackMessage("Please select an answer before submitting.");
        return;
      }

      setIsSubmitting(true);

      try {
        const result = await interviewService.checkQuizAnswer(
          currentQuestion.id,
          selectedAnswer
        );

        const quizFeedback =
          result.explanation ||
          (result.isCorrect
            ? "Correct."
            : "That answer is not correct. Review the topic and try another question.");

        setFeedbackType(result.isCorrect ? "correct" : "incorrect");
        setFeedbackMessage(quizFeedback);
        setAnsweredQuestions((previous) => ({
          ...previous,
          [currentQuestion.id]: {
            submitted: true,
            questionId: currentQuestion.id,
            prompt: currentQuestion.prompt,
            userAnswer: selectedAnswer,
            isCorrect: Boolean(result.isCorrect),
            score: result.isCorrect ? 100 : 0,
            feedback: quizFeedback,
          },
        }));
      } catch (error) {
        setFeedbackType("warning");
        setFeedbackMessage(
          error.message || "Unable to check this answer. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (!writtenAnswer.trim()) {
      setFeedbackType("warning");
      setFeedbackMessage("Please enter an answer before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const evaluation = await aiService.evaluateAnswer({
        questionId: currentQuestion.id,
        userAnswer: writtenAnswer,
        sessionId: setupData.id,
        jobRole: setupData.jobRole,
        experienceLevel: setupData.experienceLevel,
      });

      setFeedbackType("ai-feedback");
      setFeedbackMessage(formatEvaluationFeedback(evaluation));
      setAnsweredQuestions((previous) => ({
        ...previous,
        [currentQuestion.id]: {
          submitted: true,
          questionId: currentQuestion.id,
          prompt: currentQuestion.prompt,
          userAnswer: writtenAnswer.trim(),
          isCorrect: null,
          score: evaluation.score,
          feedback: evaluation.feedback,
          strengths: evaluation.strengths || [],
          weaknesses: evaluation.weaknesses || [],
          suggestions: evaluation.suggestions || [],
          criterionResults: evaluation.criterionResults || [],
        },
      }));
    } catch (error) {
      setFeedbackType("warning");
      setFeedbackMessage(
        error.message || "AI evaluation is currently unavailable. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNextQuestion() {
    if (!hasSubmitted || !hasNextQuestion) {
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
  }

  function handleEndInterview() {
    const submittedAnswers = questions
      .map((question) => answeredQuestions[question.id])
      .filter((record) => record?.submitted);
    const questionsAnswered = submittedAnswers.length;

    let score = "0%";
    let eloChange = "0";
    let isCorrect = null;

    if (selectedMode === "Quiz Style") {
      const correctAnswers = submittedAnswers.filter(
        (record) => record.isCorrect === true
      ).length;
      const incorrectAnswers = submittedAnswers.filter(
        (record) => record.isCorrect === false
      ).length;

      const percent = questionsAnswered
        ? Math.round((correctAnswers / questionsAnswered) * 100)
        : 0;
      const eloValue = correctAnswers * 2 - incorrectAnswers * 2;

      score = `${percent}%`;
      eloChange = eloValue > 0 ? `+${eloValue}` : String(eloValue);
      isCorrect =
        questionsAnswered === 1 ? submittedAnswers[0].isCorrect : null;
    } else {
      const aiScores = submittedAnswers
        .map((record) => Number(record.score))
        .filter((value) => Number.isFinite(value));

      const averageScore = aiScores.length
        ? Math.round(
            aiScores.reduce((sum, value) => sum + value, 0) / aiScores.length
          )
        : 0;

      score = `${averageScore}%`;
    }

    const aiFeedback =
      selectedMode === "Quiz Style"
        ? ""
        : submittedAnswers
            .map((record, index) =>
              record.feedback
                ? `Question ${index + 1}: ${record.feedback}`
                : ""
            )
            .filter(Boolean)
            .join("\n\n");

    onEndInterview({
      mode: selectedMode || "Interview Mode",
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      score,
      questionsAnswered,
      eloChange,
      isCorrect,
      answerSubmitted: questionsAnswered > 0,
      feedbackMessage,
      feedbackType,
      aiFeedback,
      perQuestion: submittedAnswers,
      setupData,
    });
  }

  return (
    <PageLayout
      title="Practice Session"
      subtitle={`Mode: ${selectedMode || "Interview Mode"}`}
      currentPage={currentPage}
      onNavigate={onNavigate}
    >
      <div className="sessionInfoPanel">
        <h2 className="panelTitle">Session Setup Summary</h2>
        <p>
          <strong>Job Role:</strong> {setupData.jobRole || "Not provided"}
        </p>
        <p>
          <strong>Experience Level:</strong>{" "}
          {setupData.experienceLevel || "Not provided"}
        </p>
        <p>
          <strong>Practice Goals:</strong>{" "}
          {setupData.practiceGoals || "Not provided"}
        </p>
      </div>

      <div className="questionPanel">
        <h2 className="panelTitle">
          {questions.length > 0
            ? `Question ${currentQuestionIndex + 1} of ${questions.length}`
            : "Interview Question"}
        </h2>

        {isLoading && (
          <p className="questionText">Loading questions from Firebase...</p>
        )}

        {!isLoading && loadError && (
          <>
            <p className="formError">{loadError}</p>
            <button className="secondaryButton" onClick={loadQuestions}>
              Retry Question Load
            </button>
          </>
        )}

        {!isLoading && !loadError && currentQuestion && (
          <>
            <p className="questionText">{currentQuestion.prompt}</p>
            {(currentQuestion.topic || currentQuestion.difficulty) && (
              <p className="setupDescription">
                {currentQuestion.topic && (
                  <>
                    <strong>Topic:</strong> {currentQuestion.topic}
                  </>
                )}
                {currentQuestion.topic && currentQuestion.difficulty && " · "}
                {currentQuestion.difficulty && (
                  <>
                    <strong>Difficulty:</strong> {currentQuestion.difficulty}
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>

      {!isLoading && !loadError && currentQuestion && (
        <div className="answerPanel">
          <h2 className="panelTitle">Your Answer</h2>

          {selectedMode === "Quiz Style" ? (
            <div className="quizOptions">
              {currentQuestion.options?.length > 0 ? (
                currentQuestion.options.map((option) => (
                  <label className="quizOption" key={option}>
                    <input
                      type="radio"
                      name={`quizAnswer-${currentQuestion.id}`}
                      value={option}
                      checked={selectedAnswer === option}
                      onChange={(event) =>
                        setSelectedAnswer(event.target.value)
                      }
                      disabled={hasSubmitted || isSubmitting}
                    />
                    {option}
                  </label>
                ))
              ) : (
                <p className="formError">
                  This quiz question is missing its options in Firebase.
                </p>
              )}
            </div>
          ) : (
            <textarea
              className="answerBox"
              placeholder="Type your answer here..."
              value={writtenAnswer}
              onChange={(event) => setWrittenAnswer(event.target.value)}
              disabled={hasSubmitted || isSubmitting}
            />
          )}

          <FeedbackBox
            feedbackType={feedbackType}
            feedbackMessage={feedbackMessage}
          />

          <div className="actionRow">
            <button
              className="secondaryButton"
              onClick={handleSubmit}
              disabled={hasSubmitted || isSubmitting}
            >
              {isSubmitting
                ? selectedMode === "Quiz Style"
                  ? "Checking..."
                  : "Evaluating..."
                : "Submit"}
            </button>

            <button
              className="secondaryButton"
              onClick={() => onNavigate(PAGES.DASHBOARD)}
              disabled={isSubmitting}
            >
              Back
            </button>

            {hasSubmitted && hasNextQuestion && (
              <button className="secondaryButton" onClick={handleNextQuestion}>
                Next Question
              </button>
            )}

            <button
              className="primaryButton"
              onClick={handleEndInterview}
              disabled={isSubmitting}
            >
              End Interview
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default InterviewSessionPage;
