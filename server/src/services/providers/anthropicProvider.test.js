const mockCreate = jest.fn();

jest.mock(
  "@anthropic-ai/sdk",
  () =>
    jest.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  { virtual: true }
);

const { generateEvaluation } = require("./anthropicProvider");

const question = {
  id: "q1",
  mode: "Code Style",
  prompt: "Write a function.",
  referenceAnswer: "A correct implementation with an explanation.",
  gradingCriteria: [
    {
      name: "Correctness",
      weight: 60,
      description: "The solution is correct.",
    },
    {
      name: "Explanation",
      weight: 40,
      description: "The solution is explained clearly.",
    },
  ],
};

describe("anthropicProvider.generateEvaluation", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it("returns structured feedback and calculates score from rubric points", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            feedback: "Good answer.",
            strengths: ["Correct approach"],
            weaknesses: ["Could explain more"],
            suggestions: ["Discuss complexity"],
            criterionResults: [
              {
                name: "Correctness",
                awardedPoints: 55,
                feedback: "Mostly correct.",
              },
              {
                name: "Explanation",
                awardedPoints: 30,
                feedback: "Clear but brief.",
              },
            ],
          }),
        },
      ],
    });

    const result = await generateEvaluation({
      question,
      candidateResponse: "candidate answer",
      gradingCriteria: question.gradingCriteria,
    });

    expect(result.score).toBe(85);
    expect(result.feedback).toBe("Good answer.");
    expect(result.criterionResults).toEqual([
      {
        name: "Correctness",
        awardedPoints: 55,
        maxPoints: 60,
        feedback: "Mostly correct.",
      },
      {
        name: "Explanation",
        awardedPoints: 30,
        maxPoints: 40,
        feedback: "Clear but brief.",
      },
    ]);
  });

  it("handles JSON wrapped in markdown code fences", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '```json\n{"feedback":"Decent.","strengths":[],"weaknesses":[],"suggestions":[],"criterionResults":[{"name":"Correctness","awardedPoints":40,"feedback":"ok"},{"name":"Explanation","awardedPoints":20,"feedback":"ok"}]}\n```',
        },
      ],
    });

    const result = await generateEvaluation({
      question,
      candidateResponse: "test",
      gradingCriteria: question.gradingCriteria,
    });

    expect(result.score).toBe(60);
  });

  it("throws when a criterion award exceeds its configured weight", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            feedback: "Invalid",
            strengths: [],
            weaknesses: [],
            suggestions: [],
            criterionResults: [
              {
                name: "Correctness",
                awardedPoints: 80,
                feedback: "too high",
              },
              {
                name: "Explanation",
                awardedPoints: 20,
                feedback: "ok",
              },
            ],
          }),
        },
      ],
    });

    await expect(
      generateEvaluation({
        question,
        candidateResponse: "test",
        gradingCriteria: question.gradingCriteria,
      })
    ).rejects.toThrow("did not match the expected evaluation shape");
  });

  it("requires the server-side Anthropic key", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(
      generateEvaluation({
        question,
        candidateResponse: "test",
        gradingCriteria: question.gradingCriteria,
      })
    ).rejects.toThrow("ANTHROPIC_API_KEY");
  });
});
