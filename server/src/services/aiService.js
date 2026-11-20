// server/src/services/aiService.js

const anthropicProvider = require("./providers/anthropicProvider");
const {
  validateRubric,
  redactReferenceLeaks,
} = require("./evaluationContract");

const { withProviderRetry } = require("./providerRetry");

const PROVIDERS = {
  anthropic: anthropicProvider,
};

// SEC-04:
// A failed network request may still have been billed, so only errors that
// prove the model never ran (429, 529, connection refused) are retried, a
// bounded number of times. See providerRetry.js.
function getActiveProvider() {
  const activeProviderName =
    process.env.AI_PROVIDER || "anthropic";

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
 * Generate one AI evaluation.
 *
 * The caller must already have:
 * 1. Verified session ownership.
 * 2. Verified question assignment.
 * 3. Reserved daily evaluation budget.
 * 4. Created the provider-dispatch marker.
 */
async function generateEvaluation({
  question,
  candidateResponse,
  attemptId,
} = {}) {
  if (!question) {
    throw new Error(
      "Question is required for AI evaluation."
    );
  }

  if (
    !candidateResponse ||
    !String(candidateResponse).trim()
  ) {
    throw new Error(
      "Candidate response is required for AI evaluation."
    );
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

   // Retries only happen for errors that prove the model never ran.
  // Timeouts and other uncertain errors are thrown after one attempt.
  const evaluation = await withProviderRetry(
    () =>
      provider.generateEvaluation({
        question,
        candidateResponse: String(
          candidateResponse
        ).trim(),
        gradingCriteria: question.gradingCriteria,
      }),
    {
      context: {
        question: question.id || "unknown",
        attemptId,
      },
    }
  );

  // CC6.6 / B-SOC-04: never let copied reference-answer text reach the
  // candidate, even if the model ignores the prompt's non-disclosure rule.
  const { evaluation: safeEvaluation, redactedFields } =
    redactReferenceLeaks(evaluation, question.referenceAnswer);

  if (redactedFields > 0) {
    console.warn(
      `[CC6.6] Redacted reference-answer text from ${redactedFields} feedback field(s) for question ${
        question.id || "unknown"
      }.`
    );
  }

  return safeEvaluation;
}

module.exports = {
  generateEvaluation,
};