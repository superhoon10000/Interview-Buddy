import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InterviewSessionPage from "./InterviewSessionPage";
import { aiService, interviewService } from "../services";
import { PAGES } from "../utils/constants";

jest.mock("../services", () => ({
  aiService: {
    evaluateAnswer: jest.fn(),
  },
  interviewService: {
    getQuestions: jest.fn(),
    checkQuizAnswer: jest.fn(),
  },
}));

describe("InterviewSessionPage AI evaluation", () => {
  const setupData = {
    id: "mock-session-1",
    jobRole: "Software Engineer",
    experienceLevel: "Intermediate",
    practiceGoals: "Algorithms",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    interviewService.getQuestions.mockResolvedValue([
      {
        id: "code-test-001",
        mode: "Code Style",
        prompt: "Write a function that reverses an array.",
        options: [],
        topic: "Arrays",
        difficulty: "Beginner",
      },
    ]);
    aiService.evaluateAnswer.mockResolvedValue({
      score: 88,
      feedback: "Correct approach with a minor explanation gap.",
      strengths: ["Correct logic"],
      weaknesses: ["Brief explanation"],
      suggestions: ["Mention complexity"],
      criterionResults: [
        {
          name: "Correctness",
          awardedPoints: 53,
          maxPoints: 60,
          feedback: "Correct.",
        },
      ],
    });
  });

  test("submits Code Style answers through aiService and stores structured results", async () => {
    const onEndInterview = jest.fn();

    render(
      <InterviewSessionPage
        currentPage={PAGES.INTERVIEW}
        onNavigate={jest.fn()}
        selectedMode="Code Style"
        setupData={setupData}
        onEndInterview={onEndInterview}
      />
    );

    expect(
      await screen.findByText("Write a function that reverses an array.")
    ).toBeInTheDocument();

    userEvent.type(
      screen.getByPlaceholderText("Type your answer here..."),
      "reverse the array with a loop"
    );
    userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(aiService.evaluateAnswer).toHaveBeenCalledWith({
        questionId: "code-test-001",
        userAnswer: "reverse the array with a loop",
        sessionId: "mock-session-1",
        jobRole: "Software Engineer",
        experienceLevel: "Intermediate",
      });
    });

    expect(await screen.findByText(/Score: 88\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Correct logic/)).toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: "End Interview" }));

    expect(onEndInterview).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "Code Style",
        score: "88%",
        questionsAnswered: 1,
        perQuestion: [
          expect.objectContaining({
            questionId: "code-test-001",
            score: 88,
            feedback: "Correct approach with a minor explanation gap.",
          }),
        ],
      })
    );
  });
});
