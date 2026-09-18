// server/src/services/aiService.js
//
// This is THE abstraction. Route files (like evaluate.js) should only ever
// talk to this file — never import a provider's SDK directly. That's what
// "call sites depend only on abstraction" means in the Jira ticket.
//
// To add a new provider later (OpenAI, Ollama):
//   1. Create server/src/services/providers/openaiProvider.js implementing
//      the same generateEvaluation({...}) -> { score, feedback } contract.
//   2. Add it to the PROVIDERS map below.
//   3. Nothing in evaluate.js (or any other call site) needs to change.

const anthropicProvider = require('./providers/anthropicProvider');

const PROVIDERS = {
  anthropic: anthropicProvider,
  // openai: require('./providers/openaiProvider'),
  // ollama: require('./providers/ollamaProvider'),
};

// Which provider to use by default. Reading this from an env variable means
// you can switch providers for the whole app without changing any code —
// just change AI_PROVIDER in .env.
const activeProviderName = process.env.AI_PROVIDER || 'anthropic';

/**
 * The single function the rest of the app should call.
 * It has NO idea, and callers have no need to know, which underlying
 * provider actually handles the request.
 *
 * @param {Object} params
 * @param {{ id: string, text: string }} params.question
 * @param {string} params.candidateResponse
 * @param {string[]} [params.gradingCriteria]
 * @returns {Promise<{ score: number, feedback: string }>}
 */
async function generateEvaluation(params) {
  const provider = PROVIDERS[activeProviderName];

  if (!provider) {
    throw new Error(
      `Unknown AI_PROVIDER "${activeProviderName}". Available: ${Object.keys(PROVIDERS).join(', ')}`
    );
  }

  return provider.generateEvaluation(params);
}

module.exports = { generateEvaluation };