jest.mock("./providers/anthropicProvider", () => ({
  generateEvaluation: jest.fn(),
}));

const anthropicProvider = require("./providers/anthropicProvider");
const aiService = require("./aiService");

const question = {
  id: "q1",
  mode: "Theoretical Style",
  prompt: "Explain closures.",
  referenceAnswer: "A closure retains access to its lexical scope.",
  gradingCriteria: [
    {
      name: "Accuracy",
      weight: 60,
      description: "Correctly explains lexical scope.",
    },
    {
      name: "Clarity",
      weight: 40,
      description: "Explains the idea clearly.",
    },
  ],
};

describe("aiService.generateEvaluation", () => {
  const originalProvider = process.env.AI_PROVIDER;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_PROVIDER = "anthropic";
  });

  afterAll(() => {
    if (originalProvider === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = originalProvider;
    }
  });

  it("calls the configured provider through the abstraction", async () => {
    const expected = {
      score: 85,
      feedback: "Solid answer.",
      strengths: ["Accurate definition"],
      weaknesses: [],
      suggestions: ["Add an example"],
      criterionResults: [
        {
          name: "Accuracy",
          awardedPoints: 55,
          maxPoints: 60,
          feedback: "Accurate.",
        },
        {
          name: "Clarity",
          awardedPoints: 30,
          maxPoints: 40,
          feedback: "Mostly clear.",
        },
      ],
    };

    anthropicProvider.generateEvaluation.mockResolvedValue(expected);

    const result = await aiService.generateEvaluation({
      question,
      candidateResponse: "A closure is...",
    });

    expect(anthropicProvider.generateEvaluation).toHaveBeenCalledWith({
      question,
      candidateResponse: "A closure is...",
      gradingCriteria: question.gradingCriteria,
    });
    expect(result).toEqual(expected);
  });

  it("rejects a question that does not contain a valid private rubric", async () => {
    await expect(
      aiService.generateEvaluation({
        question: {
          id: "q2",
          prompt: "Test",
          referenceAnswer: "Reference",
          gradingCriteria: [{ name: "Only", weight: 100, description: "x" }],
        },
        candidateResponse: "Answer",
      })
    ).rejects.toThrow("not configured for AI grading");

    expect(anthropicProvider.generateEvaluation).not.toHaveBeenCalled();
  });

  it("throws a clear error for an unknown provider", async () => {
    process.env.AI_PROVIDER = "not-a-real-provider";

    await expect(
      aiService.generateEvaluation({
        question,
        candidateResponse: "test",
      })
    ).rejects.toThrow("Unknown AI_PROVIDER");
  });

  it("propagates provider errors instead of swallowing them", async () => {
    anthropicProvider.generateEvaluation.mockRejectedValue(
      new Error("Anthropic response did not match the expected evaluation shape.")
    );

    await expect(
      aiService.generateEvaluation({
        question,
        candidateResponse: "test",
      })
    ).rejects.toThrow(
      "Anthropic response did not match the expected evaluation shape."
    );
  });
});
