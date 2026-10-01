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
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_PROVIDER = "anthropic";
    process.env.NODE_ENV = "test";
  });

  afterAll(() => {
    if (originalProvider === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = originalProvider;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
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

    expect(anthropicProvider.generateEvaluation).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });

  it("rejects a question that does not contain a valid private rubric", async () => {
    await expect(
      aiService.generateEvaluation({
        question: {
          id: "q2",
          prompt: "Test",
          referenceAnswer: "Reference",
          gradingCriteria: [
            {
              name: "Only",
              weight: 100,
              description: "x",
            },
          ],
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

    expect(anthropicProvider.generateEvaluation).not.toHaveBeenCalled();
  });

  it("retries once after a provider failure and then succeeds", async () => {
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

    const temporaryError = new Error("Temporary provider failure");
    temporaryError.statusCode = 503;

    anthropicProvider.generateEvaluation
      .mockRejectedValueOnce(temporaryError)
      .mockResolvedValueOnce(expected);

    const result = await aiService.generateEvaluation({
      question,
      candidateResponse: "test",
    });

    expect(anthropicProvider.generateEvaluation).toHaveBeenCalledTimes(2);
    expect(result).toEqual(expected);
  });

  it("retries twice after failures and succeeds on the third attempt", async () => {
    const expected = {
      score: 80,
      feedback: "Good answer.",
      strengths: ["Good understanding"],
      weaknesses: ["Needs more detail"],
      suggestions: ["Add an example"],
      criterionResults: [
        {
          name: "Accuracy",
          awardedPoints: 50,
          maxPoints: 60,
          feedback: "Mostly accurate.",
        },
        {
          name: "Clarity",
          awardedPoints: 30,
          maxPoints: 40,
          feedback: "Clear.",
        },
      ],
    };

    const firstError = new Error("First temporary failure");
    firstError.statusCode = 503;

    const secondError = new Error("Second temporary failure");
    secondError.statusCode = 502;

    anthropicProvider.generateEvaluation
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError)
      .mockResolvedValueOnce(expected);

    const result = await aiService.generateEvaluation({
      question,
      candidateResponse: "test",
    });

    expect(anthropicProvider.generateEvaluation).toHaveBeenCalledTimes(3);
    expect(result).toEqual(expected);
  });

  it("returns a safe error after the initial attempt and two retries fail", async () => {
    const providerError = new Error("Anthropic service unavailable");
    providerError.statusCode = 503;

    anthropicProvider.generateEvaluation.mockRejectedValue(providerError);

    await expect(
      aiService.generateEvaluation({
        question,
        candidateResponse: "test",
      })
    ).rejects.toThrow(
      "AI evaluation is currently unavailable. Please try again."
    );

    expect(anthropicProvider.generateEvaluation).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable configuration errors", async () => {
    const configurationError = new Error(
      "Anthropic API key is missing."
    );

    configurationError.statusCode = 500;

    anthropicProvider.generateEvaluation.mockRejectedValue(
      configurationError
    );

    await expect(
      aiService.generateEvaluation({
        question,
        candidateResponse: "test",
      })
    ).rejects.toThrow("Anthropic API key is missing.");

    expect(anthropicProvider.generateEvaluation).toHaveBeenCalledTimes(1);
  });
});