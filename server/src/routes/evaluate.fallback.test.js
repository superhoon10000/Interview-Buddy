// Fallback behavior of POST /api/evaluate when grading fails
// (see EVALUATION_RETRY_FALLBACK.md).
//
//   retryable (model never ran)  -> release the question, 503 AI_TEMPORARILY_UNAVAILABLE
//   uncertain / fatal            -> lock for review,      503 EVALUATION_REVIEW_REQUIRED
//
// No failure ever returns a placeholder score.

jest.mock("../services/aiService", () => ({
  generateEvaluation: jest.fn(),
}));

const Anthropic = require("@anthropic-ai/sdk");
const aiService = require("../services/aiService");
const createEvaluateRouter = require("./evaluate");

const QUESTION_ID = "code-test-001";
const SESSION_ID = "session-1";
const USER_ID = "test-user";
const ATTEMPT_ID = "test-attempt-id";

const question = {
  id: QUESTION_ID,
  mode: "Code Style",
  prompt: "Write a function.",
  referenceAnswer: "Private reference answer.",
  gradingCriteria: [
    { name: "Accuracy", weight: 60, description: "Accurate." },
    { name: "Clarity", weight: 40, description: "Clear." },
  ],
  active: true,
};

// What withProviderRetry throws once it gives up.
function failedAfterRetries(classification, extra = {}) {
  return Object.assign(new Error("provider failed"), {
    classification,
    attempts: 3,
    ...extra,
  });
}

function getPostHandler(router) {
  const layer = router.stack.find(
    (entry) => entry.route && entry.route.path === "/" && entry.route.methods.post
  );
  return layer.route.stack[0].handle;
}

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

describe("POST /api/evaluate fallback on provider failure", () => {
  let evaluationRepository;
  let handler;

  function buildHandler(repository = evaluationRepository) {
    const router = createEvaluateRouter({
      questionRepository: { findById: jest.fn().mockResolvedValue(question) },
      evaluationRepository: repository,
      sessionRepository: {
        findById: jest.fn().mockResolvedValue({
          id: SESSION_ID,
          userId: USER_ID,
          status: "active",
          mode: "Code Style",
          assignmentStatus: "assigned",
          assignedQuestionIds: [QUESTION_ID],
        }),
      },
    });
    return getPostHandler(router);
  }

  async function submit() {
    const req = {
      user: { uid: USER_ID },
      body: {
        requestId: "request-1",
        questionId: QUESTION_ID,
        candidateResponse: "function answer() {}",
        metadata: { sessionId: SESSION_ID },
      },
    };
    const res = createResponse();
    const next = jest.fn();
    await handler(req, res, next);
    return { res, next };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    evaluationRepository = {
      reserveEvaluation: jest
        .fn()
        .mockResolvedValue({ kind: "reserved", attemptId: ATTEMPT_ID }),
      completeReservedEvaluation: jest.fn().mockResolvedValue(undefined),
      failReservedEvaluation: jest.fn().mockResolvedValue(true),
      failUndeliveredEvaluation: jest.fn().mockResolvedValue(true),
      markProviderStarted: jest.fn().mockResolvedValue(true),
      markUncertainEvaluation: jest.fn().mockResolvedValue(true),
    };
    handler = buildHandler();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("retries exhausted (model never ran): releases the question and asks the user to try again", async () => {
    aiService.generateEvaluation.mockRejectedValue(
      failedAfterRetries("retryable", { retryAfterSeconds: 4 })
    );

    const { res, next } = await submit();

    expect(res.statusCode).toBe(503);
    expect(res.payload).toEqual({
      error:
        "The AI grader is busy right now. Your answer was not graded. Please try again shortly.",
      code: "AI_TEMPORARILY_UNAVAILABLE",
      retryAfterSeconds: 4,
      requestId: "request-1",
    });
    expect(evaluationRepository.failUndeliveredEvaluation).toHaveBeenCalledWith({
      userId: USER_ID,
      sessionId: SESSION_ID,
      questionId: QUESTION_ID,
      attemptId: ATTEMPT_ID,
    });
    expect(evaluationRepository.markUncertainEvaluation).not.toHaveBeenCalled();
    expect(evaluationRepository.completeReservedEvaluation).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("defaults retryAfterSeconds when the error has none", async () => {
    aiService.generateEvaluation.mockRejectedValue(failedAfterRetries("retryable"));

    const { res } = await submit();

    expect(res.payload.retryAfterSeconds).toBe(5);
  });

  test("classifies a raw SDK error the route receives directly", async () => {
    const overloaded = Anthropic.APIError.generate(
      529,
      { type: "error", error: { type: "overloaded_error" } },
      "overloaded",
      new Headers()
    );
    aiService.generateEvaluation.mockRejectedValue(overloaded);

    const { res } = await submit();

    expect(res.payload.code).toBe("AI_TEMPORARILY_UNAVAILABLE");
  });

  test.each([
    ["timeout", failedAfterRetries("uncertain", { attempts: 1 })],
    ["invalid model output", new Error("AI evaluation response was not valid JSON.")],
    ["bad API key", failedAfterRetries("fatal", { attempts: 1 })],
  ])("%s: locks the question for review (may have been billed)", async (_label, error) => {
    aiService.generateEvaluation.mockRejectedValue(error);

    const { res } = await submit();

    expect(res.statusCode).toBe(503);
    expect(res.payload.code).toBe("EVALUATION_REVIEW_REQUIRED");
    expect(evaluationRepository.markUncertainEvaluation).toHaveBeenCalledTimes(1);
    expect(evaluationRepository.failUndeliveredEvaluation).not.toHaveBeenCalled();
  });

  test("fails closed for review if the question cannot be released", async () => {
    evaluationRepository.failUndeliveredEvaluation.mockResolvedValue(false);
    aiService.generateEvaluation.mockRejectedValue(failedAfterRetries("retryable"));

    const { res } = await submit();

    expect(res.payload.code).toBe("EVALUATION_REVIEW_REQUIRED");
    expect(evaluationRepository.markUncertainEvaluation).toHaveBeenCalledTimes(1);
  });

  test("fails closed for review if releasing throws", async () => {
    evaluationRepository.failUndeliveredEvaluation.mockRejectedValue(
      new Error("Firestore unavailable")
    );
    aiService.generateEvaluation.mockRejectedValue(failedAfterRetries("retryable"));

    const { res } = await submit();

    expect(res.payload.code).toBe("EVALUATION_REVIEW_REQUIRED");
  });

  test("fails closed for review with a repository that has no release method", async () => {
    const { failUndeliveredEvaluation: _unused, ...legacyRepository } =
      evaluationRepository;
    handler = buildHandler(legacyRepository);
    aiService.generateEvaluation.mockRejectedValue(failedAfterRetries("retryable"));

    const { res } = await submit();

    expect(res.payload.code).toBe("EVALUATION_REVIEW_REQUIRED");
  });

  test("never returns a placeholder score on failure", async () => {
    for (const error of [
      failedAfterRetries("retryable"),
      failedAfterRetries("uncertain"),
    ]) {
      aiService.generateEvaluation.mockRejectedValueOnce(error);
      const { res } = await submit();
      expect(res.payload).not.toHaveProperty("evaluation");
      expect(res.payload).not.toHaveProperty("score");
    }
  });

  test("logs why grading failed without logging the answer", async () => {
    aiService.generateEvaluation.mockRejectedValue(failedAfterRetries("retryable"));

    await submit();

    const logged = console.warn.mock.calls.flat().join("\n");
    expect(logged).toContain(
      `[ai-eval] question=${QUESTION_ID} attemptId=${ATTEMPT_ID} failed classification=retryable attempts=3`
    );
    expect(logged).not.toContain("function answer() {}");
  });
});

