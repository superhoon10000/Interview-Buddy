//Test analytics service for Analytics page
//Verifies pagination, empty history, API failures and invalid pagination responses
import { analyticsService } from "./analyticsService";
import { historyService } from "./historyService";

jest.mock("./historyService", () => ({
  historyService: {
    getSessionPage: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("loads every history page using the authenticated API", async () => {
  historyService.getSessionPage
    .mockResolvedValueOnce({
      sessions: [{ id: "new" }],
      nextCursor: "new",
    })
    .mockResolvedValueOnce({
      sessions: [{ id: "old" }],
      nextCursor: null,
    });

  await expect(
    analyticsService.getCompletedSessions()
  ).resolves.toEqual([
    { id: "new" },
    { id: "old" },
  ]);

  expect(
    historyService.getSessionPage
  ).toHaveBeenNthCalledWith(1, {
    cursor: null,
    pageSize: 50,
    summaryOnly: true,
  });

  expect(
    historyService.getSessionPage
  ).toHaveBeenNthCalledWith(2, {
    cursor: "new",
    pageSize: 50,
    summaryOnly: true,
  });
});

test("returns empty history when no interviews exist", async () => {
  historyService.getSessionPage.mockResolvedValue({
    sessions: [],
    nextCursor: null,
  });

  await expect(
    analyticsService.getCompletedSessions()
  ).resolves.toEqual([]);
});

test("rejects when a history page fails", async () => {
  historyService.getSessionPage
    .mockResolvedValueOnce({
      sessions: [{ id: "new" }],
      nextCursor: "new",
    })
    .mockRejectedValueOnce(
      new Error("History unavailable")
    );

  await expect(
    analyticsService.getCompletedSessions()
  ).rejects.toThrow("History unavailable");
});

test("rejects cyclic pagination cursors", async () => {
  historyService.getSessionPage.mockResolvedValue({
    sessions: [{ id: "new" }],
    nextCursor: "new",
  });

  await expect(
    analyticsService.getCompletedSessions()
  ).rejects.toThrow(/repeated history cursor/i);
});

test("supports an optional server-side date range on every page", async () => {
  historyService.getSessionPage
    .mockResolvedValueOnce({ sessions: [{ id: "one" }], nextCursor: "one" })
    .mockResolvedValueOnce({ sessions: [{ id: "two" }], nextCursor: null });

  await expect(analyticsService.getCompletedSessions({
    startDate: "2026-11-01", endDate: "2026-11-17",
  })).resolves.toEqual([{ id: "one" }, { id: "two" }]);

  expect(historyService.getSessionPage).toHaveBeenNthCalledWith(1, {
    cursor: null, pageSize: 50, summaryOnly: true,
    startDate: "2026-11-01", endDate: "2026-11-17",
  });
  expect(historyService.getSessionPage).toHaveBeenNthCalledWith(2, {
    cursor: "one", pageSize: 50, summaryOnly: true,
    startDate: "2026-11-01", endDate: "2026-11-17",
  });
});

test("retrieves more than two pages without truncating lifetime results", async () => {
  const results = Array.from({ length: 126 }, (_, index) => ({ id: `session-${index}` }));
  historyService.getSessionPage
    .mockResolvedValueOnce({ sessions: results.slice(0, 50), nextCursor: "session-49" })
    .mockResolvedValueOnce({ sessions: results.slice(50, 100), nextCursor: "session-99" })
    .mockResolvedValueOnce({ sessions: results.slice(100), nextCursor: null });

  await expect(analyticsService.getCompletedSessions()).resolves.toEqual(results);
  expect(historyService.getSessionPage).toHaveBeenCalledTimes(3);
});
