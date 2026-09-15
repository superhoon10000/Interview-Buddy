import React, { useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import FeedbackBox from "../components/interview/FeedbackBox";
import { PAGES } from "../utils/constants";

function InterviewSessionPage({
  currentPage,
  onNavigate,
  selectedMode,
  setupData,
  onEndInterview,
}) {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const correctQuizAnswer = "Queue";

  const hasSubmitted =
    feedbackType === "correct" ||
    feedbackType === "incorrect" ||
    feedbackType === "submitted";

  function getQuestionText() {
    if (selectedMode === "Quiz Style") {
      return "Which data structure uses First In, First Out behavior?";
    }

    if (selectedMode === "Code Style") {
      return "Write a function that checks whether a string is a palindrome.";
    }

    return "Explain the difference between a stack and a queue, and give one real use case for each.";
  }

  function handleSubmit() {
    if (selectedMode === "Quiz Style") {
      if (!selectedAnswer) {
        setFeedbackType("warning");
        setFeedbackMessage("Please select an answer before submitting.");
        setIsCorrect(null);
        return;
      }

      const answerIsCorrect = selectedAnswer === correctQuizAnswer;
      setIsCorrect(answerIsCorrect);
      setFeedbackType(answerIsCorrect ? "correct" : "incorrect");
      setFeedbackMessage(
        answerIsCorrect
          ? "Correct! Queue follows First In, First Out behavior."
          : "Incorrect. The correct answer is Queue."
      );
      return;
    }

    if (!writtenAnswer.trim()) {
      setFeedbackType("warning");
      setFeedbackMessage("Please enter an answer before submitting.");
      return;
    }

    // Generate AI feedback for written answers
    const aiFeedback = generateAIFeedback(selectedMode, writtenAnswer);
    setFeedbackType("ai-feedback");
    setFeedbackMessage(aiFeedback);
  }

  function generateAIFeedback(mode, answer) {
    // Mock AI feedback - in a real implementation, this would call an AI API
    if (mode === "Code Style") {
      if (answer.toLowerCase().includes("palindrome") && answer.toLowerCase().includes("function")) {
        return "Good start! Your function concept is correct. Consider edge cases like empty strings, case sensitivity, and non-alphanumeric characters. Here's a suggested improvement: function isPalindrome(str) { const cleanStr = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); return cleanStr === cleanStr.split('').reverse().join(''); }";
      } else {
        return "Your answer shows understanding of the problem. For a palindrome check, you need to compare the string with its reverse. Try implementing a function that handles case insensitivity and removes punctuation.";
      }
    } else if (mode === "Interview Mode") {
      if ((answer.toLowerCase().includes("stack") && answer.toLowerCase().includes("queue")) && (answer.toLowerCase().includes("lifo") || answer.toLowerCase().includes("fifo"))) {
        return "Excellent explanation! You correctly identified the key differences: Stack is LIFO (Last In, First Out) while Queue is FIFO (First In, First Out). Your use cases are practical. To improve: mention time complexities for operations and when to choose one over the other.";
      } else {
        return "You touched on some good points. Remember: Stack follows LIFO (Last In, First Out) - like a stack of plates. Queue follows FIFO (First In, First Out) - like a line at a store. Try giving specific real-world examples for each.";
      }
    }
    return "Thank you for your answer. Our AI is analyzing your response and will provide detailed feedback shortly.";
  }

  function handleNextQuestion() {
    // Placeholder for future next-question behavior
  }

  function handleEndInterview() {
    if (selectedMode === "Quiz Style") {
      const answerWasSubmitted =
        feedbackType === "correct" || feedbackType === "incorrect";
      const eloChange = !answerWasSubmitted ? "0" : isCorrect ? "+2" : "-2";
      const score = !answerWasSubmitted ? "0%" : isCorrect ? "100%" : "0%";

      onEndInterview({
        mode: selectedMode || "Quiz Style",
        date: "May 4, 2026",
        score,
        questionsAnswered: answerWasSubmitted ? 1 : 0,
        eloChange,
        isCorrect,
        answerSubmitted: answerWasSubmitted,
        feedbackMessage,
        feedbackType,
      });
      return;
    }

    const hasWrittenAnswer = writtenAnswer.trim().length > 0;

    onEndInterview({
      mode: selectedMode || "Interview Mode",
      date: "May 4, 2026",
      score: hasWrittenAnswer ? "100%" : "0%",
      questionsAnswered: hasWrittenAnswer ? 1 : 0,
      eloChange: "0",
      isCorrect: null,
      answerSubmitted: hasWrittenAnswer,
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
        <p><strong>Job Role:</strong> {setupData.jobRole || "Not provided"}</p>
        <p><strong>Experience Level:</strong> {setupData.experienceLevel || "Not provided"}</p>
        <p><strong>Practice Goals:</strong> {setupData.practiceGoals || "Not provided"}</p>
      </div>

      <div className="questionPanel">
        <h2 className="panelTitle">First Question</h2>
        <p className="questionText">{getQuestionText()}</p>
      </div>

      <div className="answerPanel">
        <h2 className="panelTitle">Your Answer</h2>

        {selectedMode === "Quiz Style" ? (
          <div className="quizOptions">
            <label className="quizOption">
              <input
                type="radio"
                name="quizAnswer"
                value="Stack"
                checked={selectedAnswer === "Stack"}
                onChange={(event) => setSelectedAnswer(event.target.value)}
              />
              Stack
            </label>

            <label className="quizOption">
              <input
                type="radio"
                name="quizAnswer"
                value="Queue"
                checked={selectedAnswer === "Queue"}
                onChange={(event) => setSelectedAnswer(event.target.value)}
              />
              Queue
            </label>

            <label className="quizOption">
              <input
                type="radio"
                name="quizAnswer"
                value="Tree"
                checked={selectedAnswer === "Tree"}
                onChange={(event) => setSelectedAnswer(event.target.value)}
              />
              Tree
            </label>

            <label className="quizOption">
              <input
                type="radio"
                name="quizAnswer"
                value="Graph"
                checked={selectedAnswer === "Graph"}
                onChange={(event) => setSelectedAnswer(event.target.value)}
              />
              Graph
            </label>
          </div>
        ) : (
          <textarea
            className="answerBox"
            placeholder="Type your answer here..."
            value={writtenAnswer}
            onChange={(event) => setWrittenAnswer(event.target.value)}
          />
        )}

        <FeedbackBox feedbackType={feedbackType} feedbackMessage={feedbackMessage} />

        <div className="actionRow">
          <button className="secondaryButton" onClick={handleSubmit}>
            Submit
          </button>

          <button
            className="secondaryButton"
            onClick={() => onNavigate(PAGES.DASHBOARD)}
          >
            Back
          </button>

          {hasSubmitted && (
            <button className="secondaryButton" onClick={handleNextQuestion}>
              Next Question
            </button>
          )}

          <button className="primaryButton" onClick={handleEndInterview}>
            End Interview
          </button>
        </div>
      </div>
    </PageLayout>
  );
}

export default InterviewSessionPage;