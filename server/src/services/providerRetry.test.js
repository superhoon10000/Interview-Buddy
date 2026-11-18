// Retry/fallback tests for AI provider calls (see EVALUATION_RETRY_FALLBACK.md).
//
// Uses the real Anthropic SDK error classes so classification matches what
// the provider actually throws. Delays are injected, so no test really waits.

const Anthropic = require("@anthropic-ai/sdk");
const {
  PROVIDER_ERROR_CLASSES,
  classifyProviderError,
  getRetryAfterMs,
  withProviderRetry,
} = require("./providerRetry");

const { RETRYABLE, UNCERTAIN, FATAL } = PROVIDER_ERROR_CLASSES;

function apiError(status, headers = {}) {
  return Anthropic.APIError.generate(
    status,
    { type: "error", error: { type: "test_error", message: "test" } },
    "test",
    new Headers(headers)
  );
}

function connectionError(code) {
  return new Anthropic.APIConnectionError({
    cause: Object.assign(new Error("connection failed"), { code }),
  });
}

function timeoutError() {
  return new Anthropic.APIConnectionTimeoutError();
}

function quietLogger() {
  return { info: jest.fn(), warn: jest.fn() };
}

// Run withProviderRetry with injected sleep/logger so tests are instant.
function run(call, options = {}) {
  const sleep = jest.fn().mockResolvedValue(undefined);
  const logger = quietLogger();
  const promise = withProviderRetry(call, {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxTotalDelayMs: 4000,
    random: () => 0,
    sleep,
    logger,
    context: { question: "q-1", attemptId: "a-1" },
    ...options,
  });
  return { promise, sleep, logger };
}

describe("classifyProviderError", () => {
  test.each([
    ["429 rate limited", apiError(429), RETRYABLE],
    ["529 overloaded", apiError(529), RETRYABLE],
    ["connection refused", connectionError("ECONNREFUSED"), RETRYABLE],
    ["DNS failure", connectionError("ENOTFOUND"), RETRYABLE],
    ["timeout", timeoutError(), UNCERTAIN],
    ["connection reset mid-request", connectionError("ECONNRESET"), UNCERTAIN],
    ["500 internal error", apiError(500), UNCERTAIN],
    ["503 unavailable", apiError(503), UNCERTAIN],
    ["invalid model output", new Error("AI evaluation response was not valid JSON."), UNCERTAIN],
    ["400 bad request", apiError(400), FATAL],
    ["401 bad API key", apiError(401), FATAL],
    ["403 forbidden", apiError(403), FATAL],
  ])("%s is %s", (_label, error, expected) => {
    expect(classifyProviderError(error)).toBe(expected);
  });

  test("an app-level statusCode is not mistaken for a provider status", () => {
    const error = Object.assign(new Error("unavailable"), { statusCode: 529 });
    expect(classifyProviderError(error)).toBe(UNCERTAIN);
  });
});

describe("getRetryAfterMs", () => {
  test("reads retry-after seconds from a Headers object", () => {
    expect(getRetryAfterMs(apiError(529, { "retry-after": "2" }))).toBe(2000);
  });

  test("reads retry-after from a plain headers object", () => {
    expect(getRetryAfterMs({ headers: { "retry-after": "1.5" } })).toBe(1500);
  });

  test("returns null when there is no usable header", () => {
    expect(getRetryAfterMs(apiError(529))).toBeNull();
    expect(getRetryAfterMs({ headers: { "retry-after": "soon" } })).toBeNull();
    expect(getRetryAfterMs(new Error("x"))).toBeNull();
  });
});

describe("withProviderRetry: bounded retries", () => {
  test("returns the result without retrying when the first attempt succeeds", async () => {
    const call = jest.fn().mockResolvedValue({ score: 90 });
    const { promise, sleep, logger } = run(call);

    await expect(promise).resolves.toEqual({ score: 90 });
    expect(call).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test("retries an overloaded (529) error and then succeeds", async () => {
    const call = jest
      .fn()
      .mockRejectedValueOnce(apiError(529))
      .mockResolvedValueOnce({ score: 80 });
    const { promise, sleep } = run(call);

    await expect(promise).resolves.toEqual({ score: 80 });
    expect(call).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  test("retries a refused connection and then succeeds", async () => {
    const call = jest
      .fn()
      .mockRejectedValueOnce(connectionError("ECONNREFUSED"))
      .mockResolvedValueOnce({ score: 70 });
    const { promise } = run(call);

    await expect(promise).resolves.toEqual({ score: 70 });
    expect(call).toHaveBeenCalledTimes(2);
  });

  test("stops after the maximum number of attempts", async () => {
    const call = jest.fn().mockRejectedValue(apiError(529));
    const { promise, sleep } = run(call);

    const error = await promise.catch((e) => e);

    expect(call).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(error.classification).toBe(RETRYABLE);
    expect(error.attempts).toBe(3);
    expect(error.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  test("uses exponential backoff between retries", async () => {
    const call = jest.fn().mockRejectedValue(apiError(429));
    const { promise, sleep } = run(call);

    await promise.catch(() => {});

    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500, 1000]);
  });

  test("adds random jitter to the delay", async () => {
    const call = jest
      .fn()
      .mockRejectedValueOnce(apiError(529))
      .mockResolvedValueOnce({ score: 1 });
    const { promise, sleep } = run(call, { random: () => 0.99 });

    await promise;

    // 500ms base + up to half of base as jitter.
    expect(sleep.mock.calls[0][0]).toBeGreaterThan(500);
    expect(sleep.mock.calls[0][0]).toBeLessThan(750);
  });

  test("respects the provider's retry-after header", async () => {
    const call = jest
      .fn()
      .mockRejectedValueOnce(apiError(529, { "retry-after": "2" }))
      .mockResolvedValueOnce({ score: 60 });
    const { promise, sleep } = run(call);

    await promise;

    expect(sleep).toHaveBeenCalledWith(2000);
  });

  test("stops early when the total wait would exceed the cap", async () => {
    const call = jest
      .fn()
      .mockRejectedValue(apiError(529, { "retry-after": "10" }));
    const { promise, sleep } = run(call, { maxTotalDelayMs: 4000 });

    const error = await promise.catch((e) => e);

    expect(call).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(error.classification).toBe(RETRYABLE);
    expect(error.retryAfterSeconds).toBe(10);
  });

  test("maxAttempts of 1 disables retries", async () => {
    const call = jest.fn().mockRejectedValue(apiError(529));
    const { promise } = run(call, { maxAttempts: 1 });

    await promise.catch(() => {});

    expect(call).toHaveBeenCalledTimes(1);
  });
});

describe("withProviderRetry: never retries what may have been billed", () => {
  test.each([
    ["timeout", timeoutError(), UNCERTAIN],
    ["connection reset", connectionError("ECONNRESET"), UNCERTAIN],
    ["500 error", apiError(500), UNCERTAIN],
    ["invalid model output", new Error("not valid JSON"), UNCERTAIN],
    ["400 bad request", apiError(400), FATAL],
    ["401 bad API key", apiError(401), FATAL],
  ])("%s is attempted once and marked %s", async (_label, failure, expected) => {
    const call = jest.fn().mockRejectedValue(failure);
    const { promise, sleep } = run(call);

    const error = await promise.catch((e) => e);

    expect(error).toBe(failure);
    expect(call).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(error.classification).toBe(expected);
    expect(error.attempts).toBe(1);
    expect(error.retryAfterSeconds).toBeUndefined();
  });

  test("a 529 followed by a timeout stops at the timeout", async () => {
    const call = jest
      .fn()
      .mockRejectedValueOnce(apiError(529))
      .mockRejectedValueOnce(timeoutError());
    const { promise } = run(call);

    const error = await promise.catch((e) => e);

    expect(call).toHaveBeenCalledTimes(2);
    expect(error.classification).toBe(UNCERTAIN);
    expect(error.attempts).toBe(2);
  });
});

describe("withProviderRetry: observability", () => {
  test("logs one line per failed attempt with context and outcome", async () => {
    const call = jest
      .fn()
      .mockRejectedValueOnce(apiError(529))
      .mockResolvedValueOnce({ score: 50 });
    const { promise, logger } = run(call);

    await promise;

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toBe(
      "[ai-eval] question=q-1 attemptId=a-1 attempt=1/3 outcome=retryable status=529 retryInMs=500"
    );
    expect(logger.info.mock.calls[0][0]).toBe(
      "[ai-eval] question=q-1 attemptId=a-1 attempt=2/3 outcome=success"
    );
  });

  test("logs giving-up on the final failure", async () => {
    const call = jest.fn().mockRejectedValue(timeoutError());
    const { promise, logger } = run(call);

    await promise.catch(() => {});

    expect(logger.warn.mock.calls[0][0]).toBe(
      "[ai-eval] question=q-1 attemptId=a-1 attempt=1/3 outcome=uncertain error=APIConnectionTimeoutError giving-up"
    );
  });

  test("never logs the candidate answer or the error message text", async () => {
    const secretAnswer = "my private candidate answer";
    const call = jest
      .fn()
      .mockRejectedValue(new Error(`model echoed: ${secretAnswer}`));
    const { promise, logger } = run(call);

    await promise.catch(() => {});

    const logged = [...logger.warn.mock.calls, ...logger.info.mock.calls]
      .flat()
      .join("\n");
    expect(logged).not.toContain(secretAnswer);
  });
});

