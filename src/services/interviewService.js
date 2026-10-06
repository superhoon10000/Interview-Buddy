import { auth } from "../config/firebase";

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

async function getIdToken() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Authenticated Firebase user is required.");
  }

  return user.getIdToken();
}

function validateMode(mode) {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(
      `Invalid interview mode: ${mode || "none"}`
    );
  }
}

function normalizeTags(value) {
  const values = Array.isArray(value) ? value : [value];

  return [
    ...new Set(
      values
        .flatMap((entry) => String(entry || "").split(","))
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ];
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
      tags,
      // Kept as a compatibility fallback for older callers/tests.
      practiceGoals,
      codingLanguage,
      questionCount = 10,
    } = configuration;

    validateMode(mode);

    const selectedTags = normalizeTags(tags);
    const normalizedTags = selectedTags.length > 0
      ? selectedTags
      : normalizeTags(practiceGoals);

    if (
      !jobRole ||
      !experienceLevel ||
      normalizedTags.length === 0
    ) {
      throw new Error(
        "Job role, experience level, and at least one tag are required."
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

    // Session persistence can replace this mock object later. The important
    // integration contract is that selected tags stay structured as an array.
    return {
      id: `mock-session-${Date.now()}`,
      mode,
      jobRole,
      experienceLevel,
      tags: normalizedTags,
      // Preserve the old field while other prototype code is still being
      // migrated. New question retrieval uses tags.
      practiceGoals: normalizedTags.join(", "),
      codingLanguage: codingLanguage || null,
      questionCount: normalizedQuestionCount,
      status: "active",
      startedAt: new Date().toISOString(),
    };
  },

  /**
   * Retrieve the available setup values from the backend/Firestore question
   * metadata for the currently selected interview mode.
   */
  async getSetupOptions(mode) {
    validateMode(mode);

    const idToken = await getIdToken();
    const params = new URLSearchParams({ mode });
    const response = await fetch(
      `${API_BASE_URL}/questions/options?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );
    const payload = await readJsonResponse(response);

    return {
      jobRoles: Array.isArray(payload?.jobRoles)
        ? payload.jobRoles
        : [],
      experienceLevels: Array.isArray(payload?.experienceLevels)
        ? payload.experienceLevels
        : [],
      tags: Array.isArray(payload?.tags)
        ? payload.tags
        : [],
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
    tags,
    // Compatibility fallback for sessions created before the tag contract.
    practiceGoals = "",
    limit = 10,
  } = {}) {
    validateMode(mode);

    const selectedTags = normalizeTags(tags);
    const normalizedTags = selectedTags.length > 0
      ? selectedTags
      : normalizeTags(practiceGoals);

    if (!jobRole || !experienceLevel || normalizedTags.length === 0) {
      throw new Error(
        "Job role, experience level, and at least one tag are required."
      );
    }

    const params = new URLSearchParams({
      mode,
      jobRole,
      experienceLevel,
      limit: String(limit),
    });

    normalizedTags.forEach((tag) => {
      params.append("tags", tag);
    });

    const idToken = await getIdToken();
    const response = await fetch(
      `${API_BASE_URL}/questions?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
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

    const idToken = await getIdToken();
    const response = await fetch(
      `${API_BASE_URL}/questions/${encodeURIComponent(
        questionId
      )}/check`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
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
