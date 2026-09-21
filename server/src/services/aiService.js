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
      `Question ${question.id || "unknown"} is not configured for AI grading: ${rubricError}`
    );
    error.statusCode = 500;
    throw error;
  }

  return getActiveProvider().generateEvaluation({
    question,
    candidateResponse: String(candidateResponse).trim(),
    gradingCriteria: question.gradingCriteria,
  });
}

module.exports = { generateEvaluation };
