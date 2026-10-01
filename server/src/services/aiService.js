// server/src/services/aiService.js
//
// Provider-independent AI evaluation abstraction. Routes and other application
// code depend on this module rather than importing a provider SDK directly.

const anthropicProvider = require("./providers/anthropicProvider");
const { validateRubric } = require("./evaluationContract");

const PROVIDERS = {
  anthropic: anthropicProvider,
  // openai: require("./providers/openaiProvider"),
  // ollama: require("./providers/ollamaProvider"),
};

const MAX_RETRIES = 2;

// Use no delay during automated tests so the test suite stays fast.
const RETRY_DELAY_MS =
  process.env.NODE_ENV === "test" ? 0 : 500;

function getActiveProvider() {
  const activeProviderName = process.env.AI_PROVIDER || "anthropic";
  const provider = PROVIDERS[activeProviderName];

  if (!provider) {
    throw new Error(
      `Unknown AI_PROVIDER "${activeProviderName}". Available: ${Object.keys(
        PROVIDERS
      ).join(", ")}`
    );
  }

  return provider;
}

/**
 * Wait before making another AI request.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine whether an AI-provider error is worth retrying.
 *
 * Retry:
 * - rate limits
 * - temporary provider/server failures
 * - malformed AI responses
 * - network-type failures without a status code
 *
 * Do not retry known configuration problems.
 *
 * @param {Error} error
 * @returns {boolean}
 */
function isRetryableError(error) {
  const message = String(error?.message || "");

  // These are configuration problems, so retrying will not fix them.
  if (
    message.includes("AI configuration was not found") ||
    message.includes("Anthropic API key is missing")
  ) {
    return false;
  }

  const status = error?.statusCode || error?.status;

  // Network-type errors may not have an HTTP status.
  if (!status) {
    return true;
  }

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

/**
 * Call the configured AI provider and retry up to two times
 * after the initial request fails.
 *
 * Total maximum attempts:
 * 1 initial attempt + 2 retries = 3 attempts.
 *
 * @param {Object} provider
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function generateWithRetry(provider, params) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await provider.generateEvaluation(params);
    } catch (error) {
      lastError = error;

      const retriesRemaining = MAX_RETRIES - attempt;

      console.warn(
        `AI evaluation attempt ${attempt + 1} failed: ${error.message}`
      );

      // Stop immediately if the error should not be retried.
      if (!isRetryableError(error)) {
        throw error;
      }

      // Stop after the final allowed attempt.
      if (retriesRemaining <= 0) {
        break;
      }

      // Simple increasing delay:
      // first retry = 500 ms
      // second retry = 1000 ms
      const delay = RETRY_DELAY_MS * (attempt + 1);

      await wait(delay);
    }
  }

  const error = new Error(
    "AI evaluation is currently unavailable. Please try again."
  );

  error.statusCode = lastError?.statusCode || lastError?.status || 502;
  error.cause = lastError;

  throw error;
}

/**
 * Evaluate one interview response through the configured provider.
 *
 * The question object comes from the server-side repository and may contain
 * private grading fields. Those fields never need to be sent to the browser.
 *
 * @param {Object} params
 * @param {Object} params.question
 * @param {string} params.candidateResponse
 * @returns {Promise<{
 *   score: number,
 *   feedback: string,
 *   strengths: string[],
 *   weaknesses: string[],
 *   suggestions: string[],
 *   criterionResults: Array
 * }>}
 */
async function generateEvaluation({ question, candidateResponse } = {}) {
  if (!question) {
    throw new Error("Question is required for AI evaluation.");
  }

  if (!candidateResponse || !String(candidateResponse).trim()) {
    throw new Error("Candidate response is required for AI evaluation.");
  }

  const rubricError = validateRubric(question);

  if (rubricError) {
    const error = new Error(
      `Question ${
        question.id || "unknown"
      } is not configured for AI grading: ${rubricError}`
    );

    error.statusCode = 500;
    throw error;
  }

  const provider = getActiveProvider();

  return generateWithRetry(provider, {
    question,
    candidateResponse: String(candidateResponse).trim(),
    gradingCriteria: question.gradingCriteria,
  });
}

module.exports = {
  generateEvaluation,
};