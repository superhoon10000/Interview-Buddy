/**
 * React-facing AI evaluation service facade.
 *
 * The real AI processing engine is intentionally deferred to Sprint 2.
 * This module establishes the contract the React application will call later.
 */
export const aiService = {
  async evaluateAnswer({ question, referenceAnswer, userAnswer } = {}) {
    if (!question) {
      throw new Error("Question is required.");
    }

    if (!referenceAnswer) {
      throw new Error("Reference answer is required.");
    }

    if (!userAnswer || !String(userAnswer).trim()) {
      throw new Error("User answer is required.");
    }

    // Sprint 1 placeholder only. Sprint 2 replaces this with the selected
    // LLM/Ollama-backed evaluation pipeline and structured response validation.
    return {
      score: null,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      isMock: true,
    };
  },
};