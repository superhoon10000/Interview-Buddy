import React, { useCallback, useEffect, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import FeedbackBox from "../components/interview/FeedbackBox";
import { PAGES } from "../utils/constants";
import { interviewService } from "../services";

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

        setFeedbackType(result.isCorrect ? "correct" : "incorrect");
        setFeedbackMessage(
          result.explanation ||
            (result.isCorrect
              ? "Correct."
              : "That answer is not correct. Try another question when ready.")
        );
        setAnsweredQuestions((previous) => ({
          ...previous,
          [currentQuestion.id]: {
            submitted: true,
            isCorrect: Boolean(result.isCorrect),
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

    // AI evaluation remains behind aiService for the later AI integration
    // sprint. For now, this confirms the response to the Firebase-loaded
    // question without duplicating AI behavior in the database service.
    setFeedbackType("ai-feedback");
    setFeedbackMessage(
      generatePrototypeFeedback(selectedMode, writtenAnswer, currentQuestion)
    );
    setAnsweredQuestions((previous) => ({
      ...previous,
      [currentQuestion.id]: {
        submitted: true,
        isCorrect: null,
      },
    }));
  }

  function generatePrototypeFeedback(mode, answer, question) {
    const normalizedAnswer = answer.toLowerCase();

    // Preserve the updated prototype's existing mock feedback for its two
    // original demo questions when those same prompts are loaded from
    // Firebase. Other database questions receive a neutral placeholder until
    // aiService is connected to the real AI processing layer.
    if (
      mode === "Code Style" &&
      (question.id === "code-palindrome-001" ||
        question.prompt.toLowerCase().includes("palindrome"))
    ) {
      if (
        normalizedAnswer.includes("palindrome") &&
        normalizedAnswer.includes("function")
      ) {
        return "Good start! Your function concept is correct. Consider edge cases like empty strings, case sensitivity, and non-alphanumeric characters. Here's a suggested improvement: function isPalindrome(str) { const cleanStr = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); return cleanStr === cleanStr.split('').reverse().join(''); }";
      }

      return "Your answer shows understanding of the problem. For a palindrome check, you need to compare the string with its reverse. Try implementing a function that handles case insensitivity and removes punctuation.";
    }

    if (
      mode === "Theoretical Style" &&
      (question.id === "theory-stack-queue-001" ||
        (question.prompt.toLowerCase().includes("stack") &&
          question.prompt.toLowerCase().includes("queue")))
    ) {
      if (
        normalizedAnswer.includes("stack") &&
        normalizedAnswer.includes("queue") &&
        (normalizedAnswer.includes("lifo") || normalizedAnswer.includes("fifo"))
      ) {
        return "Excellent explanation! You correctly identified the key differences: Stack is LIFO (Last In, First Out) while Queue is FIFO (First In, First Out). Your use cases are practical. To improve: mention time complexities for operations and when to choose one over the other.";
      }

      return "You touched on some good points. Remember: Stack follows LIFO (Last In, First Out) - like a stack of plates. Queue follows FIFO (First In, First Out) - like a line at a store. Try giving specific real-world examples for each.";
    }

    return "Your answer was recorded for this Firebase-loaded prompt. Detailed AI evaluation for database questions will be handled through the existing aiService when the AI processing layer is connected.";
  }

  function handleNextQuestion() {
    if (!hasSubmitted || !hasNextQuestion) {
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
  }

  function handleEndInterview() {
    const submittedAnswers = Object.values(answeredQuestions).filter(
      (record) => record.submitted
    );
    const questionsAnswered = submittedAnswers.length;

    let score = questionsAnswered > 0 ? "100%" : "0%";
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
    }

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
              disabled={hasSubmitted}
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
              {isSubmitting ? "Checking..." : "Submit"}
            </button>

            <button
              className="secondaryButton"
              onClick={() => onNavigate(PAGES.DASHBOARD)}
            >
              Back
            </button>

            {hasSubmitted && hasNextQuestion && (
              <button className="secondaryButton" onClick={handleNextQuestion}>
                Next Question
              </button>
            )}

            <button className="primaryButton" onClick={handleEndInterview}>
              End Interview
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default InterviewSessionPage;
