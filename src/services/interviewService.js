/**
 * React-facing interview/session service facade.
 *
 * This is intentionally not the final server-side Application Layer. During
 * Sprint 1 it defines the interface React will use. Later, these methods can
 * call the backend Application Layer without forcing page components to know
 * about Firebase, AI providers, or session persistence details.
 */

export const INTERVIEW_MODES = Object.freeze({
  QUIZ: "Quiz Style",
  CODE: "Code Style",
  THEORETICAL: "Theoretical Style",
});

const VALID_MODES = Object.values(INTERVIEW_MODES);

function validateMode(mode) {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid interview mode: ${mode || "none"}`);
  }
}

export const interviewService = {
  async startSession(configuration) {
    if (!configuration) {
      throw new Error("Interview configuration is required.");
    }

    const {
      mode,
      jobRole,
      experienceLevel,
      practiceGoals,
      codingLanguage,
    } = configuration;

    validateMode(mode);

    if (!jobRole || !experienceLevel || !practiceGoals) {
      throw new Error(
        "Job role, experience level, and practice goals are required."
      );
    }

    // Sprint 1 mock session. The backend will create/persist this later.
    return {
      id: `mock-session-${Date.now()}`,
      mode,
      jobRole,
      experienceLevel,
      practiceGoals,
      codingLanguage: codingLanguage || null,
      status: "active",
      startedAt: new Date().toISOString(),
    };
  },

  async getQuestion(sessionId) {
    if (!sessionId) {
      throw new Error("Session ID is required.");
    }

    // Question retrieval remains in the current prototype until a workflow is
    // refactored behind this service (Daniel Sprint 1, Task 3).
    return null;
  },

  async submitAnswer(sessionId, questionId, answer) {
    if (!sessionId || !questionId) {
      throw new Error("Session ID and question ID are required.");
    }

    if (
      answer === undefined ||
      answer === null ||
      String(answer).trim() === ""
    ) {
      throw new Error("An answer is required.");
    }

    // Future: forward to the backend, which coordinates AI evaluation/storage.
    return {
      success: true,
      sessionId,
      questionId,
    };
  },

  async endSession(sessionId) {
    if (!sessionId) {
      throw new Error("Session ID is required.");
    }

    // Future: backend persists results and performs scoring/ranking updates.
    return {
      sessionId,
      status: "completed",
      completedAt: new Date().toISOString(),
    };
  },
};