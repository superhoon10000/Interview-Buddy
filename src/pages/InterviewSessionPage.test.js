import React from "react";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InterviewSessionPage from "./InterviewSessionPage";
import {
  aiService,
  interviewService,
} from "../services";
import { PAGES } from "../utils/constants";

/*
 * These tests are focused on InterviewSessionPage.
 *
 * We do not need authentication/sidebar behavior here,
 * so PageLayout is replaced with a simple wrapper.
 */
jest.mock(
  "../components/layout/PageLayout",
  () => {
    return function MockPageLayout({
      children,
    }) {
      return <div>{children}</div>;
    };
  }
);

jest.mock("../services", () => ({
  aiService: {
    evaluateAnswer: jest.fn(),
  },

  interviewService: {
    getQuestions: jest.fn(),
    checkQuizAnswer: jest.fn(),
  },
}));

describe("InterviewSessionPage", () => {
  const defaultSetupData = {
    id: "mock-session-1",

    jobRole:
      "Software Engineer",

    experienceLevel:
      "Intermediate",

    tags: [
      "algorithms",
    ],

    questionCount: 10,
  };

  const codeQuestion = {
    id: "code-test-001",

    mode: "Code Style",

    prompt:
      "Write a function that reverses an array.",

    options: [],

    topic: "Arrays",

    difficulty:
      "Beginner",
  };

  const quizQuestion = {
    id: "quiz-test-001",

    mode: "Quiz Style",

    prompt:
      "Which data structure uses FIFO ordering?",

    options: [
      "Queue",
      "Stack",
      "Tree",
      "Heap",
    ],

    topic:
      "Data Structures",

    difficulty:
      "Beginner",
  };

  const secondQuizQuestion = {
    id: "quiz-test-002",

    mode: "Quiz Style",

    prompt:
      "Which data structure uses LIFO ordering?",

    options: [
      "Queue",
      "Stack",
      "Graph",
      "Tree",
    ],

    topic:
      "Data Structures",

    difficulty:
      "Beginner",
  };

  let onNavigate;
  let onEndInterview;

  beforeEach(() => {
    jest.clearAllMocks();

    onNavigate =
      jest.fn();

    onEndInterview =
      jest.fn();

    /*
     * Default test behavior is Code Style.
     *
     * Individual Quiz tests override this.
     */
    interviewService
      .getQuestions
      .mockResolvedValue([
        codeQuestion,
      ]);

    interviewService
      .checkQuizAnswer
      .mockResolvedValue({
        isCorrect: true,

        explanation:
          "A queue processes items in first-in, first-out order.",
      });

    aiService
      .evaluateAnswer
      .mockResolvedValue({
        score: 88,

        feedback:
          "Correct approach with a minor explanation gap.",

        strengths: [
          "Correct logic",
        ],

        weaknesses: [
          "Brief explanation",
        ],

        suggestions: [
          "Mention complexity",
        ],

        criterionResults: [
          {
            name:
              "Correctness",

            awardedPoints:
              53,

            maxPoints:
              60,

            feedback:
              "Correct.",
          },
        ],
      });
  });

  function renderPage({
    selectedMode =
      "Code Style",

    setupData =
      defaultSetupData,

    endInterview =
      onEndInterview,

    navigate =
      onNavigate,
  } = {}) {
    render(
      <InterviewSessionPage
        currentPage={
          PAGES.INTERVIEW
        }
        onNavigate={
          navigate
        }
        selectedMode={
          selectedMode
        }
        setupData={
          setupData
        }
        onEndInterview={
          endInterview
        }
      />
    );
  }

  test(
    "uses the question count selected on the setup page when loading questions",
    async () => {
      const setupWithQuestionCount = {
        ...defaultSetupData,

        questionCount: 20,
      };

      renderPage({
        setupData:
          setupWithQuestionCount,
      });

      expect(
        await screen.findByText(
          "Write a function that reverses an array."
        )
      ).toBeInTheDocument();

      expect(
        interviewService
          .getQuestions
      ).toHaveBeenCalledWith({
        mode:
          "Code Style",

        jobRole:
          "Software Engineer",

        experienceLevel:
          "Intermediate",

        tags: [
          "algorithms",
        ],

        limit: 20,
      });
    }
  );

  test(
    "shows an error when no matching questions are returned",
    async () => {
      interviewService
        .getQuestions
        .mockResolvedValue([]);

      renderPage({
        selectedMode:
          "Quiz Style",
      });

      expect(
        await screen.findByText(
          "No active Quiz Style questions were returned from Firebase."
        )
      ).toBeInTheDocument();

      expect(
        screen.getByRole(
          "button",
          {
            name:
              "Retry Question Load",
          }
        )
      ).toBeInTheDocument();
    }
  );

  test(
    "allows the user to retry loading questions after an error",
    async () => {
      interviewService
        .getQuestions
        .mockRejectedValueOnce(
          new Error(
            "Firebase unavailable."
          )
        )
        .mockResolvedValueOnce([
          codeQuestion,
        ]);

      renderPage();

      expect(
        await screen.findByText(
          "Firebase unavailable."
        )
      ).toBeInTheDocument();

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Retry Question Load",
          }
        )
      );

      expect(
        await screen.findByText(
          "Write a function that reverses an array."
        )
      ).toBeInTheDocument();

      expect(
        interviewService
          .getQuestions
      ).toHaveBeenCalledTimes(
        2
      );
    }
  );

  test(
    "requires a Quiz Style answer before submitting",
    async () => {
      interviewService
        .getQuestions
        .mockResolvedValue([
          quizQuestion,
        ]);

      renderPage({
        selectedMode:
          "Quiz Style",
      });

      expect(
        await screen.findByText(
          "Which data structure uses FIFO ordering?"
        )
      ).toBeInTheDocument();

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Submit",
          }
        )
      );

      expect(
        screen.getByText(
          "Please select an answer before submitting."
        )
      ).toBeInTheDocument();

      expect(
        interviewService
          .checkQuizAnswer
      ).not.toHaveBeenCalled();
    }
  );

  test(
    "submits Quiz Style answers through interviewService",
    async () => {
      interviewService
        .getQuestions
        .mockResolvedValue([
          quizQuestion,
        ]);

      interviewService
        .checkQuizAnswer
        .mockResolvedValue({
          isCorrect: true,

          explanation:
            "A queue uses FIFO ordering.",
        });

      renderPage({
        selectedMode:
          "Quiz Style",
      });

      expect(
        await screen.findByText(
          "Which data structure uses FIFO ordering?"
        )
      ).toBeInTheDocument();

      userEvent.click(
        screen.getByRole(
          "radio",
          {
            name:
              "Queue",
          }
        )
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Submit",
          }
        )
      );

      await waitFor(() => {
        expect(
          interviewService
            .checkQuizAnswer
        ).toHaveBeenCalledWith(
          "quiz-test-001",
          "Queue"
        );
      });

      expect(
        await screen.findByText(
          "A queue uses FIFO ordering."
        )
      ).toBeInTheDocument();
    }
  );

  test(
    "allows the user to move to the next question after submitting",
    async () => {
      interviewService
        .getQuestions
        .mockResolvedValue([
          quizQuestion,
          secondQuizQuestion,
        ]);

      renderPage({
        selectedMode:
          "Quiz Style",
      });

      expect(
        await screen.findByText(
          "Which data structure uses FIFO ordering?"
        )
      ).toBeInTheDocument();

      userEvent.click(
        screen.getByRole(
          "radio",
          {
            name:
              "Queue",
          }
        )
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Submit",
          }
        )
      );

      expect(
        await screen.findByText(
          /first-in, first-out/i
        )
      ).toBeInTheDocument();

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Next Question",
          }
        )
      );

      expect(
        screen.getByText(
          "Which data structure uses LIFO ordering?"
        )
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          "Question 2 of 2"
        )
      ).toBeInTheDocument();
    }
  );

  test(
    "calculates Quiz Style results when the interview ends",
    async () => {
      interviewService
        .getQuestions
        .mockResolvedValue([
          quizQuestion,
        ]);

      interviewService
        .checkQuizAnswer
        .mockResolvedValue({
          isCorrect: true,

          explanation:
            "A queue uses FIFO ordering.",
        });

      renderPage({
        selectedMode:
          "Quiz Style",
      });

      await screen.findByText(
        "Which data structure uses FIFO ordering?"
      );

      userEvent.click(
        screen.getByRole(
          "radio",
          {
            name:
              "Queue",
          }
        )
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Submit",
          }
        )
      );

      await waitFor(() => {
        expect(
          interviewService
            .checkQuizAnswer
        ).toHaveBeenCalled();
      });

      /*
       * Waiting for the feedback ensures the
       * answeredQuestions state has updated
       * before ending the interview.
       */
      await screen.findByText(
        "A queue uses FIFO ordering."
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "End Interview",
          }
        )
      );

      expect(
        onEndInterview
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          mode:
            "Quiz Style",

          score:
            "100%",

          questionsAnswered:
            1,

          eloChange:
            "+2",

          isCorrect:
            true,

          answerSubmitted:
            true,

          perQuestion: [
            expect.objectContaining({
              questionId:
                "quiz-test-001",

              userAnswer:
                "Queue",

              isCorrect:
                true,

              score:
                100,
            }),
          ],
        })
      );
    }
  );

  test(
    "submits Code Style answers through aiService and stores structured results",
    async () => {
      renderPage({
        selectedMode:
          "Code Style",
      });

      expect(
        await screen.findByText(
          "Write a function that reverses an array."
        )
      ).toBeInTheDocument();

      expect(
        interviewService
          .getQuestions
      ).toHaveBeenCalledWith({
        mode:
          "Code Style",

        jobRole:
          "Software Engineer",

        experienceLevel:
          "Intermediate",

        tags: [
          "algorithms",
        ],

        limit: 10,
      });

      userEvent.type(
        screen.getByPlaceholderText(
          "Type your answer here..."
        ),
        "reverse the array with a loop"
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Submit",
          }
        )
      );

      await waitFor(() => {
        expect(
          aiService
            .evaluateAnswer
        ).toHaveBeenCalledWith({
          questionId:
            "code-test-001",

          userAnswer:
            "reverse the array with a loop",

          sessionId:
            "mock-session-1",

          jobRole:
            "Software Engineer",

          experienceLevel:
            "Intermediate",
        });
      });

      expect(
        await screen.findByText(
          /Score: 88\/100/
        )
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          /Correct logic/
        )
      ).toBeInTheDocument();

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "End Interview",
          }
        )
      );

      expect(
        onEndInterview
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          mode:
            "Code Style",

          score:
            "88%",

          questionsAnswered:
            1,

          perQuestion: [
            expect.objectContaining({
              questionId:
                "code-test-001",

              score: 88,

              feedback:
                "Correct approach with a minor explanation gap.",
            }),
          ],
        })
      );
    }
  );

  test(
    "shows an AI evaluation error without marking the question as submitted",
    async () => {
      aiService
        .evaluateAnswer
        .mockRejectedValue(
          new Error(
            "AI evaluation unavailable."
          )
        );

      renderPage({
        selectedMode:
          "Code Style",
      });

      await screen.findByText(
        "Write a function that reverses an array."
      );

      userEvent.type(
        screen.getByPlaceholderText(
          "Type your answer here..."
        ),
        "my attempted answer"
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Submit",
          }
        )
      );

      expect(
        await screen.findByText(
          "AI evaluation unavailable."
        )
      ).toBeInTheDocument();

      /*
       * Because evaluation failed, Submit should
       * become available again so the user can retry.
       */
      expect(
        screen.getByRole(
          "button",
          {
            name:
              "Submit",
          }
        )
      ).toBeEnabled();

      expect(
        screen.queryByRole(
          "button",
          {
            name:
              "Next Question",
          }
        )
      ).not.toBeInTheDocument();
    }
  );
});