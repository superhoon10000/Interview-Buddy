import {
  authService,
  interviewService,
  INTERVIEW_MODES,
  historyService,
  leaderboardService,
  aiService,
} from "./index";

describe("authService", () => {
  test("login returns an authenticated user for valid mock credentials", async () => {
    const result = await authService.login({
      username: "daniel",
      password: "password123",
    });

    expect(result.authenticated).toBe(true);
    expect(result.user.username).toBe("daniel");
  });

  test("login rejects missing credentials", async () => {
    await expect(authService.login()).rejects.toThrow(
      "Login credentials are required."
    );

    await expect(
      authService.login({
        username: "daniel",
        password: "",
      })
    ).rejects.toThrow("Username/email and password are required.");
  });

  test("register creates a mock user", async () => {
    const result = await authService.register({
      username: "daniel",
      email: "daniel@example.com",
      password: "password123",
    });

    expect(result.created).toBe(true);
    expect(result.user.username).toBe("daniel");
    expect(result.user.email).toBe("daniel@example.com");
  });

  test("register rejects incomplete registration data", async () => {
    await expect(
      authService.register({
        username: "daniel",
        email: "",
        password: "password123",
      })
    ).rejects.toThrow("Username, email, and password are required.");
  });

  test("logout returns success", async () => {
    const result = await authService.logout();

    expect(result).toEqual({
      success: true,
    });
  });

  test("changePassword succeeds when passwords are different", async () => {
    const result = await authService.changePassword(
      "oldPassword",
      "newPassword"
    );

    expect(result).toEqual({
      success: true,
    });
  });

  test("changePassword rejects using the same password", async () => {
    await expect(
      authService.changePassword("password123", "password123")
    ).rejects.toThrow(
      "New password cannot be the same as the current password."
    );
  });
});

describe("interviewService", () => {
  test("startSession creates an active Quiz Style session", async () => {
    const result = await interviewService.startSession({
      mode: INTERVIEW_MODES.QUIZ,
      jobRole: "Software Engineer",
      experienceLevel: "Intermediate",
      practiceGoals: "Data structures",
    });

    expect(result).toEqual(
      expect.objectContaining({
        mode: "Quiz Style",
        jobRole: "Software Engineer",
        experienceLevel: "Intermediate",
        practiceGoals: "Data structures",
        codingLanguage: null,
        status: "active",
      })
    );

    expect(result.id).toEqual(
      expect.stringContaining("mock-session-")
    );

    expect(result.startedAt).toBeDefined();
  });

  test("startSession supports Code Style and coding language", async () => {
    const result = await interviewService.startSession({
      mode: INTERVIEW_MODES.CODE,
      jobRole: "Backend Developer",
      experienceLevel: "Experienced",
      practiceGoals: "Algorithms",
      codingLanguage: "Java",
    });

    expect(result.mode).toBe("Code Style");
    expect(result.codingLanguage).toBe("Java");
  });

  test("startSession supports Theoretical Style", async () => {
    const result = await interviewService.startSession({
      mode: INTERVIEW_MODES.THEORETICAL,
      jobRole: "Software Engineer",
      experienceLevel: "Beginner",
      practiceGoals: "Computer science concepts",
    });

    expect(result.mode).toBe("Theoretical Style");
    expect(result.status).toBe("active");
  });

  test("startSession rejects an invalid interview mode", async () => {
    await expect(
      interviewService.startSession({
        mode: "Invalid Mode",
        jobRole: "Developer",
        experienceLevel: "Beginner",
        practiceGoals: "Practice",
      })
    ).rejects.toThrow("Invalid interview mode");
  });

  test("startSession requires all setup fields", async () => {
    await expect(
      interviewService.startSession({
        mode: INTERVIEW_MODES.QUIZ,
        jobRole: "",
        experienceLevel: "Beginner",
        practiceGoals: "Practice",
      })
    ).rejects.toThrow(
      "Job role, experience level, and practice goals are required."
    );
  });

  test("getQuestion requires a session ID", async () => {
    await expect(
      interviewService.getQuestion()
    ).rejects.toThrow("Session ID is required.");
  });

  test("submitAnswer accepts a valid answer", async () => {
    const result = await interviewService.submitAnswer(
      "session-1",
      "question-1",
      "My answer"
    );

    expect(result).toEqual({
      success: true,
      sessionId: "session-1",
      questionId: "question-1",
    });
  });

  test("submitAnswer rejects an empty answer", async () => {
    await expect(
      interviewService.submitAnswer(
        "session-1",
        "question-1",
        ""
      )
    ).rejects.toThrow("An answer is required.");
  });

  test("endSession returns a completed session", async () => {
    const result =
      await interviewService.endSession("session-1");

    expect(result.sessionId).toBe("session-1");
    expect(result.status).toBe("completed");
    expect(result.completedAt).toBeDefined();
  });
});

describe("historyService", () => {
  test("getSessions returns prototype session history", async () => {
    const sessions = await historyService.getSessions();

    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);
  });

  test("getSessionById retrieves an existing session", async () => {
    const sessions = await historyService.getSessions();
    const targetSession = sessions[0];

    const result =
      await historyService.getSessionById(targetSession.id);

    expect(result).toEqual(targetSession);
  });

  test("getSessionById returns null for an unknown session", async () => {
    const result =
      await historyService.getSessionById("does-not-exist");

    expect(result).toBeNull();
  });

  test("getSessionById requires a session ID", async () => {
    await expect(
      historyService.getSessionById()
    ).rejects.toThrow("Session ID is required.");
  });

  test("getSessions returns copies instead of the original mock objects", async () => {
    const firstResult = await historyService.getSessions();

    const originalMode = firstResult[0].mode;

    firstResult[0].mode = "Changed Mode";

    const secondResult = await historyService.getSessions();

    expect(secondResult[0].mode).toBe(originalMode);
  });

  test("deleteSession simulates deleting an existing session", async () => {
    const sessions = await historyService.getSessions();

    const result =
      await historyService.deleteSession(sessions[0].id);

    expect(result).toEqual({
      success: true,
      sessionId: sessions[0].id,
      simulated: true,
    });
  });
});

describe("leaderboardService", () => {
  test("global leaderboard is sorted by rank", async () => {
    const leaderboard =
      await leaderboardService.getGlobalLeaderboard();

    const ranks = leaderboard.map((user) => user.rank);
    const sortedRanks = [...ranks].sort((a, b) => a - b);

    expect(ranks).toEqual(sortedRanks);
  });

  test("friends leaderboard is sorted by rank", async () => {
    const leaderboard =
      await leaderboardService.getFriendsLeaderboard();

    const ranks = leaderboard.map((user) => user.rank);
    const sortedRanks = [...ranks].sort((a, b) => a - b);

    expect(ranks).toEqual(sortedRanks);
  });

  test("getUserRanking retrieves an existing user", async () => {
    const leaderboard =
      await leaderboardService.getGlobalLeaderboard();

    const targetUser = leaderboard[0];

    const result =
      await leaderboardService.getUserRanking(
        targetUser.id
      );

    expect(result).toEqual(targetUser);
  });

  test("getUserRanking returns null for an unknown user", async () => {
    const result =
      await leaderboardService.getUserRanking(
        "does-not-exist"
      );

    expect(result).toBeNull();
  });

  test("getUserRanking requires a user ID", async () => {
    await expect(
      leaderboardService.getUserRanking()
    ).rejects.toThrow("User ID is required.");
  });
});

describe("aiService", () => {
  test("evaluateAnswer returns the Sprint 1 placeholder structure", async () => {
    const result = await aiService.evaluateAnswer({
      question: "What is a stack?",
      referenceAnswer: "A LIFO data structure.",
      userAnswer:
        "A stack uses last in, first out ordering.",
    });

    expect(result).toEqual({
      score: null,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      isMock: true,
    });
  });

  test("evaluateAnswer requires a question", async () => {
    await expect(
      aiService.evaluateAnswer({
        referenceAnswer: "Reference answer",
        userAnswer: "User answer",
      })
    ).rejects.toThrow("Question is required.");
  });

  test("evaluateAnswer requires a reference answer", async () => {
    await expect(
      aiService.evaluateAnswer({
        question: "Question",
        userAnswer: "User answer",
      })
    ).rejects.toThrow("Reference answer is required.");
  });

  test("evaluateAnswer rejects an empty user answer", async () => {
    await expect(
      aiService.evaluateAnswer({
        question: "What is a stack?",
        referenceAnswer: "A LIFO data structure.",
        userAnswer: "",
      })
    ).rejects.toThrow("User answer is required.");
  });
});