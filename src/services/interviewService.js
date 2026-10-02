/**
 * React-facing interview/session service facade.
 *
 * The page layer calls this service instead of talking directly to Firebase.
 * Database access stays behind the Express application layer, which lets the
 * frontend keep the same service contract as authentication, history, AI, and
 * leaderboard features are implemented.
 */

export const INTERVIEW_MODES = Object.freeze({
  QUIZ: "Quiz Style",
  CODE: "Code Style",
  THEORETICAL: "Theoretical Style",
});

const VALID_MODES = Object.values(INTERVIEW_MODES);

const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL ||
  "http://localhost:5001/api"
).replace(/\/$/, "");

function validateMode(mode) {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(
      `Invalid interview mode: ${mode || "none"}`
    );
  }
}

async function readJsonResponse(response) {
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    // Leave payload as null so the caller still
    // receives a useful HTTP error.
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Interview service request failed (${response.status}).`;

    throw new Error(message);
  }

  return payload;
}

export const interviewService = {
  async startSession(configuration) {
    if (!configuration) {
      throw new Error(
        "Interview configuration is required."
      );
    }

    const {
      mode,
      jobRole,
      experienceLevel,
      practiceGoals,
      codingLanguage,
      questionCount = 10,
    } = configuration;

    validateMode(mode);

    if (
      !jobRole ||
      !experienceLevel ||
      !practiceGoals
    ) {
      throw new Error(
        "Job role, experience level, and practice goals are required."
      );
    }

    const normalizedQuestionCount =
      Number(questionCount);

    if (
      !Number.isInteger(normalizedQuestionCount) ||
      normalizedQuestionCount < 1 ||
      normalizedQuestionCount > 20
    ) {
      throw new Error(
        "Question count must be an integer between 1 and 20."
      );
    }

    // Temporary mock session.
    // Backend persistence can replace this later.
    return {
      id: `mock-session-${Date.now()}`,
      mode,
      jobRole,
      experienceLevel,
      practiceGoals,
      codingLanguage: codingLanguage || null,
      questionCount: normalizedQuestionCount,
      status: "active",
      startedAt: new Date().toISOString(),
    };
  },

  /**
   * Retrieve interview questions through the backend.
   * The browser does not connect directly to Firestore.
   */
  async getQuestions({
    mode,
    jobRole = "",
    experienceLevel = "",
    practiceGoals = "",
    limit = 10,
  } = {}) {
    validateMode(mode);

    const params = new URLSearchParams({
      mode,
      jobRole,
      experienceLevel,
      practiceGoals,
      limit: String(limit),
    });

    const response = await fetch(
      `${API_BASE_URL}/questions?${params.toString()}`
    );

    const payload =
      await readJsonResponse(response);

    return Array.isArray(payload?.questions)
      ? payload.questions
      : [];
  },

  /**
   * Validate a Quiz Style answer on the server.
   */
  async checkQuizAnswer(questionId, answer) {
    if (!questionId) {
      throw new Error(
        "Question ID is required."
      );
    }

    if (!answer || !String(answer).trim()) {
      throw new Error(
        "An answer is required."
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/questions/${encodeURIComponent(
        questionId
      )}/check`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer,
        }),
      }
    );

    return readJsonResponse(response);
  },

  /**
   * Retained for the service contract established by
   * the prototype.
   */
  async getQuestion(sessionId) {
    if (!sessionId) {
      throw new Error(
        "Session ID is required."
      );
    }

    return null;
  },

  async submitAnswer(
    sessionId,
    questionId,
    answer
  ) {
    if (!sessionId || !questionId) {
      throw new Error(
        "Session ID and question ID are required."
      );
    }

    if (
      answer === undefined ||
      answer === null ||
      String(answer).trim() === ""
    ) {
      throw new Error(
        "An answer is required."
      );
    }

    return {
      success: true,
      sessionId,
      questionId,
    };
  },

  async endSession(sessionId) {
    if (!sessionId) {
      throw new Error(
        "Session ID is required."
      );
    }

    return {
      sessionId,
      status: "completed",
      completedAt: new Date().toISOString(),
    };
  },
};