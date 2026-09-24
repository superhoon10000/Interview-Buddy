import {
  interviewService,
  INTERVIEW_MODES,
} from "./interviewService";

import { historyService } from "./historyService";
import { leaderboardService } from "./leaderboardService";
import { aiService } from "./aiService";

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
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("evaluateAnswer posts the public question id and candidate response", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        evaluation: {
          score: 85,
          feedback: "Good answer.",
          strengths: ["Accurate"],
          weaknesses: [],
          suggestions: ["Add an example"],
          criterionResults: [],
        },
      }),
    });

    const result = await aiService.evaluateAnswer({
      questionId: "theory-stack-queue-001",
      userAnswer: "A stack is LIFO and a queue is FIFO.",
      sessionId: "mock-session-1",
      jobRole: "Software Engineer",
      experienceLevel: "Intermediate",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/evaluate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );

    const request = global.fetch.mock.calls[0][1];
    const body = JSON.parse(request.body);
    expect(body.questionId).toBe("theory-stack-queue-001");
    expect(body.candidateResponse).toBe(
      "A stack is LIFO and a queue is FIFO."
    );
    expect(body).not.toHaveProperty("referenceAnswer");
    expect(body).not.toHaveProperty("gradingCriteria");
    expect(result.score).toBe(85);
  });

  test("evaluateAnswer requires a question id", async () => {
    await expect(
      aiService.evaluateAnswer({
        userAnswer: "User answer",
      })
    ).rejects.toThrow("Question ID is required.");
  });

  test("evaluateAnswer rejects an empty user answer", async () => {
    await expect(
      aiService.evaluateAnswer({
        questionId: "q1",
        userAnswer: "",
      })
    ).rejects.toThrow("User answer is required.");
  });

  test("evaluateAnswer surfaces backend errors", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: "AI evaluation is not configured.",
      }),
    });

    await expect(
      aiService.evaluateAnswer({
        questionId: "q1",
        userAnswer: "Answer",
      })
    ).rejects.toThrow("AI evaluation is not configured.");
  });
});
