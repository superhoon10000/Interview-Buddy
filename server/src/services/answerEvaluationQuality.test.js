// CI/CD-24: deterministic AI evaluation regression tests for both Code Style
// and Theoretical Style. Strong, partial and incorrect answers are represented
// by fixed provider responses; these tests verify processing, rubric scores,
// required feedback fields and prompt assembly, NOT live model accuracy.

const mockCreate = jest.fn();

jest.mock(
  "@anthropic-ai/sdk",
  () =>
    jest.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  { virtual: true }
);

jest.mock("../config/aiConfig", () => ({
  getAiConfig: jest.fn(),
}));

const { getAiConfig } = require("../config/aiConfig");
const {
  generateEvaluation,
} = require("./providers/anthropicProvider");

// Shared question and weighted grading rubric.
const question = {
  id: "quality-test-1",
  mode: "Theoretical Style",
  topic: "Application Security",
  difficulty: "Beginner",
  prompt:
    "What is the difference between authentication and authorization?",
  referenceAnswer:
    "Authentication verifies user identity. Authorization determines what resources and actions an authenticated user is permitted to access.",
  gradingCriteria: [
    {
      name: "Technical Accuracy",
      weight: 60,
      description:
        "Correctly distinguishes identity verification from permission checking.",
    },
    {
      name: "Completeness",
      weight: 40,
      description:
        "Clearly explains both concepts and provides a relevant example.",
    },
  ],
};

// Mock a structured response from Anthropic.
function mockEvaluation({
  scoreAccuracy,
  scoreCompleteness,
  feedback,
  strengths,
  weaknesses,
  suggestions,
}) {
  mockCreate.mockResolvedValue({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          feedback,
          strengths,
          weaknesses,
          suggestions,
          criterionResults: [
            {
              name: "Technical Accuracy",
              awardedPoints: scoreAccuracy,
              feedback: feedback,
            },
            {
              name: "Completeness",
              awardedPoints: scoreCompleteness,
              feedback: feedback,
            },
          ],
        }),
      },
    ],
  });
}

// Regression contract shared by both AI-graded interview modes. Scores are
// deterministic here because the provider response is mocked; model accuracy
// is a separate, controlled live-AI testing activity.
function expectStructuredEvaluation(result, expectedCriteria) {
  expect(Number.isInteger(result.score)).toBe(true);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
  expect(typeof result.feedback).toBe("string");
  expect(result.feedback.trim().length).toBeGreaterThan(0);
  for (const field of ["strengths", "weaknesses", "suggestions"]) {
    expect(Array.isArray(result[field])).toBe(true);
    expect(result[field].every((item) => typeof item === "string")).toBe(true);
  }
  expect(result.criterionResults).toHaveLength(expectedCriteria.length);
  result.criterionResults.forEach((criterion, index) => {
    expect(criterion.name).toBe(expectedCriteria[index].name);
    expect(criterion.maxPoints).toBe(expectedCriteria[index].weight);
    expect(typeof criterion.awardedPoints).toBe("number");
    expect(criterion.awardedPoints).toBeGreaterThanOrEqual(0);
    expect(criterion.awardedPoints).toBeLessThanOrEqual(criterion.maxPoints);
    expect(typeof criterion.feedback).toBe("string");
    expect(criterion.feedback.trim().length).toBeGreaterThan(0);
  });
  expect(result.score).toBe(Math.round(result.criterionResults.reduce(
    (sum, criterion) => sum + criterion.awardedPoints, 0
  )));
}

describe("AI Evaluation - Answer Quality Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getAiConfig.mockResolvedValue({
      anthropicApiKey: "test-key",
    });
  });

  test("Strong response receives a high-quality evaluation", async () => {
    const candidateResponse = `
      Authentication verifies the identity of a user.
      Authorization determines what resources and
      actions that user is allowed to access.

      For example, logging into an application
      authenticates a user, while checking whether
      they can access an admin dashboard is authorization.
    `;

    mockEvaluation({
      scoreAccuracy: 58,
      scoreCompleteness: 37,
      feedback:
        "Excellent answer demonstrating strong understanding.",
      strengths: [
        "Correctly distinguishes authentication and authorization.",
        "Provides a clear real-world example.",
      ],
      weaknesses: [],
      suggestions: [
        "Could mention role-based access control.",
      ],
    });

    const result = await generateEvaluation({
      question,
      candidateResponse,
      gradingCriteria: question.gradingCriteria,
    });

    expectStructuredEvaluation(result, question.gradingCriteria);
    expect(result.score).toBe(96);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.feedback).toContain("Excellent");
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.criterionResults).toHaveLength(2);

    expect(result.criterionResults[0].awardedPoints).toBe(60);
    expect(result.criterionResults[1].awardedPoints).toBe(36);

    expect(mockCreate).toHaveBeenCalledTimes(1);

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;

    expect(prompt).toContain(candidateResponse.trim());
    expect(prompt).toContain(question.referenceAnswer);
  });

  test("Partial response receives an intermediate evaluation", async () => {
    const candidateResponse = `
      Authentication is when a user logs into a system
      using their username and password.

      Authorization is related to security and
      controlling access to information.
    `;

    mockEvaluation({
      scoreAccuracy: 35,
      scoreCompleteness: 20,
      feedback:
        "Partially correct but missing important details.",
      strengths: [
        "Recognizes authentication involves identity verification.",
      ],
      weaknesses: [
        "Does not clearly explain authorization.",
        "Missing a practical example.",
      ],
      suggestions: [
        "Explain how permissions differ from identity verification.",
      ],
    });

    const result = await generateEvaluation({
      question,
      candidateResponse,
      gradingCriteria: question.gradingCriteria,
    });

    expectStructuredEvaluation(result, question.gradingCriteria);
    expect(result.score).toBe(56);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(80);

    expect(result.feedback).toContain("Partially correct");
    expect(result.weaknesses.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);

    expect(result.criterionResults[0].awardedPoints).toBe(36);
    expect(result.criterionResults[1].awardedPoints).toBe(20);

    expect(mockCreate).toHaveBeenCalledTimes(1);

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;

    expect(prompt).toContain(candidateResponse.trim());
  });

  test("Incorrect response receives a low-quality evaluation", async () => {
    const candidateResponse = `
      Authentication determines which files a
      user can access.

      Authorization checks whether their username
      and password are correct.

      They are basically the same process.
    `;

    mockEvaluation({
      scoreAccuracy: 5,
      scoreCompleteness: 0,
      feedback:
        "Incorrect answer containing major conceptual errors.",
      strengths: [],
      weaknesses: [
        "Reverses the definitions of authentication and authorization.",
        "Incorrectly claims both processes are identical.",
      ],
      suggestions: [
        "Review identity verification and access control concepts.",
      ],
    });

    const result = await generateEvaluation({
      question,
      candidateResponse,
      gradingCriteria: question.gradingCriteria,
    });

    expectStructuredEvaluation(result, question.gradingCriteria);
    expect(result.score).toBe(6);
    expect(result.score).toBeLessThan(40);

    expect(result.feedback).toContain("Incorrect");
    expect(result.weaknesses.length).toBeGreaterThan(0);
    expect(result.strengths).toHaveLength(0);

    expect(result.criterionResults[0].awardedPoints).toBe(6);
    expect(result.criterionResults[1].awardedPoints).toBe(0);

    expect(mockCreate).toHaveBeenCalledTimes(1);

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;

    expect(prompt).toContain(candidateResponse.trim());
  });
});

// The second AI-graded mode must obey the same output contract. Code is
// evaluated as text, not executed; the mock controls the returned rubric points.
const codeQuestion = {
  id: "quality-code-1",
  mode: "Code Style",
  topic: "Algorithms",
  difficulty: "Beginner",
  prompt: "Write a JavaScript function that returns the largest number in a nonempty array.",
  referenceAnswer: "Iterate through all items, tracking and returning the maximum value.",
  gradingCriteria: [
    { name: "Correctness", weight: 70, description: "Returns the maximum value correctly." },
    { name: "Edge Cases", weight: 30, description: "Handles negative numbers and singleton arrays." },
  ],
};

describe("AI Evaluation - Code Style Answer Quality Regression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAiConfig.mockResolvedValue({ anthropicApiKey: "test-key" });
  });

  test.each([
    {
      category: "strong",
      answer: "function maximum(a) { let max = a[0]; for (const n of a) max = Math.max(max, n); return max; }",
      awarded: [63, 27],
      expectedScore: 90,
    },
    {
      category: "partial",
      answer: "function maximum(a) { let max = 0; for (const n of a) if (n > max) max = n; return max; }",
      awarded: [35, 15],
      expectedScore: 50,
    },
    {
      category: "incorrect",
      answer: "function maximum(a) { return a[0]; }",
      awarded: [7, 0],
      expectedScore: 7,
    },
  ])("$category Code Style response preserves score and feedback contract", async ({
    category, answer, awarded, expectedScore,
  }) => {
    mockCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          feedback: `${category} code response evaluation`,
          strengths: category === "incorrect" ? [] : ["Includes a relevant code attempt."],
          weaknesses: category === "strong" ? [] : ["Does not handle all input arrays."],
          suggestions: ["Review input edge cases."],
          criterionResults: codeQuestion.gradingCriteria.map((criterion, index) => ({
            name: criterion.name,
            awardedPoints: awarded[index],
            feedback: `${category} assessment of ${criterion.name}`,
          })),
        }),
      }],
    });

    const result = await generateEvaluation({
      question: codeQuestion,
      candidateResponse: answer,
      gradingCriteria: codeQuestion.gradingCriteria,
    });
    expectStructuredEvaluation(result, codeQuestion.gradingCriteria);
    expect(result.score).toBe(expectedScore);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const prompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("Code Style");
    expect(prompt).toContain(answer);
    expect(prompt).toContain(codeQuestion.referenceAnswer);
  });
});
