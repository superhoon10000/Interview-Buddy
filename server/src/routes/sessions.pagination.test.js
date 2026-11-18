"use strict";

const express = require("express");
const request = require("supertest");
const createSessionRouter = require("./sessions");

function setup() {
  const sessionRepository = {
    createSession: jest.fn().mockResolvedValue({ id: "new-session", status: "active" }),
    listCompletedByUser: jest.fn().mockResolvedValue([]),
    listByUser: jest.fn().mockResolvedValue([]),
    getSessionPage: jest.fn().mockResolvedValue({ sessions: [{ id: "saved-session" }], nextCursor: null }),
  };
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { uid: "owner-1" }; next(); });
  app.use("/api/sessions", createSessionRouter({ sessionRepository }));
  app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));
  return { app, sessionRepository };
}

describe("SEC-05 session history paging and quota admission", () => {
  test("page requests are bounded and scoped to the authenticated UID", async () => {
    const { app, sessionRepository } = setup();
    const res = await request(app).get("/api/sessions?status=completed&pageSize=25&cursor=saved-session");
    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual([{ id: "saved-session" }]);
    expect(sessionRepository.getSessionPage).toHaveBeenCalledWith({
      userId: "owner-1", status: "completed", pageSize: 25, cursor: "saved-session",
    });
    expect(sessionRepository.listCompletedByUser).not.toHaveBeenCalled();
  });

  test.each(["0", "51", "999999", "NaN", "1.5", "-2"]) (
    "rejects invalid page size %s without a Firestore read",
    async (pageSize) => {
      const { app, sessionRepository } = setup();
      const res = await request(app).get(`/api/sessions?pageSize=${encodeURIComponent(pageSize)}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("SESSION_PAGE_SIZE_INVALID");
      expect(sessionRepository.getSessionPage).not.toHaveBeenCalled();
    }
  );

  test("rejects a cursor without pageSize", async () => {
    const { app, sessionRepository } = setup();
    const res = await request(app).get("/api/sessions?cursor=anything");
    expect(res.status).toBe(400);
    expect(sessionRepository.getSessionPage).not.toHaveBeenCalled();
  });

  test("rejects malformed cursor before accessing Firestore", async () => {
    const { app, sessionRepository } = setup();
    const res = await request(app).get("/api/sessions?pageSize=25&cursor=bad%2Fid");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("SESSION_CURSOR_INVALID");
    expect(sessionRepository.getSessionPage).not.toHaveBeenCalled();
  });

  test("quota errors preserve HTTP 429 rather than becoming HTTP 500", async () => {
    const { app, sessionRepository } = setup();
    sessionRepository.createSession.mockRejectedValue(Object.assign(
      new Error("Daily interview session creation limit reached."),
      { statusCode: 429, code: "DAILY_SESSION_LIMIT_EXCEEDED" }
    ));
    const res = await request(app).post("/api/sessions").send({
      mode: "Quiz Style", jobRole: "Engineer", experienceLevel: "Beginner",
      tags: ["arrays"], questionCount: 2,
    });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe("DAILY_SESSION_LIMIT_EXCEEDED");
  });
});


describe("Analytics session-history range and compact summary", () => {
  test("passes a date-only inclusive UTC range and summary view to the user-scoped repository", async () => {
    const { app, sessionRepository } = setup();
    const res = await request(app).get(
      "/api/sessions?status=completed&pageSize=50&startDate=2026-10-01&endDate=2026-10-31&summaryOnly=1"
    );
    expect(res.status).toBe(200);
    expect(sessionRepository.getSessionPage).toHaveBeenCalledWith({
      userId: "owner-1", status: "completed", pageSize: 50, cursor: null,
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-11-01T00:00:00.000Z"),
      endDateExclusive: true,
      summaryOnly: true,
    });
  });

  test("supports exact UTC timestamp boundaries", async () => {
    const { app, sessionRepository } = setup();
    const res = await request(app).get(
      "/api/sessions?status=completed&pageSize=10&startDate=2026-11-17T12%3A00%3A00Z&endDate=2026-11-17T13%3A00%3A00.123Z"
    );
    expect(res.status).toBe(200);
    expect(sessionRepository.getSessionPage).toHaveBeenCalledWith({
      userId: "owner-1", status: "completed", pageSize: 10, cursor: null,
      startDate: new Date("2026-11-17T12:00:00Z"),
      endDate: new Date("2026-11-17T13:00:00.123Z"),
      endDateExclusive: false,
    });
  });

  test.each([
    "startDate=2026-02-30", "startDate=2026-11-17T25%3A00%3A00Z",
    "endDate=tomorrow", "startDate=2026-11-18&endDate=2026-11-17",
    "startDate=2026-11-17%26startDate%3D2026-11-18",
    "startDate=2026-11-17&endDate=2026-11-17T00%3A00%3A00Z&startDate=2026-11-18",
  ])("rejects invalid analytics range %s without querying Firestore", async (queryString) => {
    const { app, sessionRepository } = setup();
    const res = await request(app).get(`/api/sessions?status=completed&pageSize=25&${queryString}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("SESSION_DATE_RANGE_INVALID");
    expect(sessionRepository.getSessionPage).not.toHaveBeenCalled();
  });

  test("rejects repeated query string parameters", async () => {
    const { app, sessionRepository } = setup();
    const res = await request(app).get(
      "/api/sessions?status=completed&pageSize=25&startDate=2026-11-16&startDate=2026-11-17"
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("SESSION_DATE_RANGE_INVALID");
    expect(sessionRepository.getSessionPage).not.toHaveBeenCalled();
  });

  test.each([
    ["?status=completed&startDate=2026-11-17", "SESSION_PAGE_REQUIRED"],
    ["?status=completed&summaryOnly=1", "SESSION_PAGE_REQUIRED"],
    ["?pageSize=10&startDate=2026-11-17", "SESSION_STATUS_INVALID"],
    ["?pageSize=10&summaryOnly=1", "SESSION_STATUS_INVALID"],
    ["?status=completed&pageSize=10&summaryOnly=true", "SESSION_SUMMARY_INVALID"],
  ])("rejects unsupported date/summary request %s", async (query, code) => {
    const { app, sessionRepository } = setup();
    const res = await request(app).get(`/api/sessions${query}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
    expect(sessionRepository.getSessionPage).not.toHaveBeenCalled();
  });
});
