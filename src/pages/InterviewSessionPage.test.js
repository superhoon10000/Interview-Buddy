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
 * InterviewSessionPage behavior is what
 * we want to test here.
 *
 * PageLayout itself is tested elsewhere,
 * so mocking it keeps these tests focused
 * on the interview session.
 */
jest.mock(
  "../components/layout/PageLayout",
  () => {
    return function MockPageLayout({
      children,
    }) {
      return (
        <div>
          {children}
        </div>
      );
    };
  }
);


jest.mock("../services", () => ({
  aiService: {
    evaluateAnswer:
      jest.fn(),
  },

  interviewService: {
    getQuestions:
      jest.fn(),

    checkQuizAnswer:
      jest.fn(),
  },
}));


describe(
  "InterviewSessionPage",
  () => {
    const defaultSetupData = {
      id:
        "mock-session-1",

      jobRole:
        "Software Engineer",

      experienceLevel:
        "Intermediate",

      tags: [
        "algorithms",
      ],

      questionCount: 10,
    };


    const quizQuestion = {
      id:
        "quiz-test-001",

      mode:
        "Quiz Style",

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
      id:
        "quiz-test-002",

      mode:
        "Quiz Style",

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


    const codeQuestion = {
      id:
        "code-test-001",

      mode:
        "Code Style",

      prompt:
        "Write a function that reverses an array.",

      options: [],

      topic:
        "Arrays",

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
       * Default question result.
       *
       * Individual tests override this
       * when they need Quiz questions.
       */
      interviewService
        .getQuestions
        .mockResolvedValue([
          codeQuestion,
        ]);


      interviewService
        .checkQuizAnswer
        .mockResolvedValue({
          isCorrect:
            true,

          explanation:
            "A queue processes items in first-in, first-out order.",

          correctAnswer:
            "Queue",
        });


      aiService
        .evaluateAnswer
        .mockResolvedValue({
          score:
            88,

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


    async function loadQuizSession(
      questions = [
        quizQuestion,
      ]
    ) {
      interviewService
        .getQuestions
        .mockResolvedValue(
          questions
        );

      renderPage({
        selectedMode:
          "Quiz Style",
      });

      expect(
        await screen.findByText(
          "Which data structure uses FIFO ordering?"
        )
      ).toBeInTheDocument();
    }


    async function selectQueueAnswer() {
      /*
       * The visible option contains:
       *
       * A
       * Queue
       *
       * so its accessible name may be
       * "A Queue", not simply "Queue".
       *
       * Regex makes the test accurately
       * match the redesigned UI.
       */
      const queueOption =
        screen.getByRole(
          "radio",
          {
            name:
              /queue/i,
          }
        );

      userEvent.click(
        queueOption
      );

      await waitFor(() => {
        expect(
          queueOption
        ).toBeChecked();
      });
    }


    async function submitQuizAnswer() {
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
    }


    test(
      "loads questions using the setup configuration",
      async () => {
        const setupData = {
          ...defaultSetupData,

          questionCount:
            20,
        };

        renderPage({
          selectedMode:
            "Code Style",

          setupData,
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
      "starts the session progress at zero before any question is answered",
      async () => {
        await loadQuizSession([
          quizQuestion,
          secondQuizQuestion,
        ]);


        expect(
          screen.getByText(
            /question\s+1\s+of\s+2/i
          )
        ).toBeInTheDocument();


        expect(
          screen.getByText(
            "0% complete"
          )
        ).toBeInTheDocument();


        const progressBar =
          screen.getByRole(
            "progressbar",
            {
              name:
                "Interview progress",
            }
          );


        expect(
          progressBar
        ).toHaveAttribute(
          "aria-valuenow",
          "0"
        );
      }
    );


    test(
      "does not allow a quiz question to be submitted without an answer",
      async () => {
        await loadQuizSession();


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
      "submits the selected quiz answer through interviewService",
      async () => {
        await loadQuizSession();


        await selectQueueAnswer();


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
            "Correct Answer"
          )
        ).toBeInTheDocument();


        expect(
          screen.getByText(
            /first-in, first-out/i
          )
        ).toBeInTheDocument();
      }
    );


    test(
      "updates progress only after a question has been answered",
      async () => {
        await loadQuizSession([
          quizQuestion,
          secondQuizQuestion,
        ]);


        const progressBar =
          screen.getByRole(
            "progressbar",
            {
              name:
                "Interview progress",
            }
          );


        /*
         * Merely viewing question 1
         * should still be 0%.
         */
        expect(
          progressBar
        ).toHaveAttribute(
          "aria-valuenow",
          "0"
        );


        await selectQueueAnswer();

        await submitQuizAnswer();


        /*
         * One of two questions has now
         * been completed.
         */
        await waitFor(() => {
          expect(
            progressBar
          ).toHaveAttribute(
            "aria-valuenow",
            "50"
          );
        });


        expect(
          screen.getByText(
            "50% complete"
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
            /question\s+2\s+of\s+2/i
          )
        ).toBeInTheDocument();


        /*
         * Simply moving to Question 2
         * should NOT increase progress.
         */
        expect(
          progressBar
        ).toHaveAttribute(
          "aria-valuenow",
          "50"
        );


        expect(
          screen.getByText(
            "50% complete"
          )
        ).toBeInTheDocument();
      }
    );


    test(
      "moves to the next quiz question after the current question is answered",
      async () => {
        await loadQuizSession([
          quizQuestion,
          secondQuizQuestion,
        ]);


        await selectQueueAnswer();

        await submitQuizAnswer();


        expect(
          await screen.findByRole(
            "button",
            {
              name:
                "Next Question",
            }
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
            /question\s+2\s+of\s+2/i
          )
        ).toBeInTheDocument();


        /*
         * The previous answer should be
         * cleared when moving forward.
         */
        expect(
          screen.getByRole(
            "radio",
            {
              name:
                /stack/i,
            }
          )
        ).not.toBeChecked();
      }
    );


    test(
      "generates quiz results from answered questions when the interview ends",
      async () => {
        await loadQuizSession();


        await selectQueueAnswer();

        await submitQuizAnswer();


        /*
         * Wait until the feedback is
         * visible so answeredQuestions
         * has been updated.
         */
        expect(
          await screen.findByText(
            "Correct Answer"
          )
        ).toBeInTheDocument();


        await waitFor(() => {
          expect(
            screen.getByText(
              "1/1"
            )
          ).toBeInTheDocument();
        });


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

            jobRole:
              "Software Engineer",

            experienceLevel:
              "Intermediate",

            tags: [
              "algorithms",
            ],

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
      "shows an error when no matching questions are returned",
      async () => {
        interviewService
          .getQuestions
          .mockResolvedValue(
            []
          );


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
      "allows question loading to be retried after an error",
      async () => {
        interviewService
          .getQuestions
          .mockRejectedValueOnce(
            new Error(
              "Firebase unavailable."
            )
          )
          .mockResolvedValueOnce([
            quizQuestion,
          ]);


        renderPage({
          selectedMode:
            "Quiz Style",
        });


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
            "Which data structure uses FIFO ordering?"
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
      "submits Code Style answers through aiService",
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
            /Score:\s*88\/100/i
          )
        ).toBeInTheDocument();


        expect(
          screen.getByText(
            "Correct approach with a minor explanation gap."
          )
        ).toBeInTheDocument();


        expect(
          screen.getByText(
            "Correct logic"
          )
        ).toBeInTheDocument();
      }
    );


    test(
      "allows an AI answer to be retried when evaluation fails",
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


        expect(
          await screen.findByText(
            "Write a function that reverses an array."
          )
        ).toBeInTheDocument();


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
         * Failed evaluation should not
         * mark the question complete.
         */
        expect(
          screen.getByText(
            "0% complete"
          )
        ).toBeInTheDocument();


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
  }
);