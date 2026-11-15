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
  });

  expect(
    historyService.getSessionPage
  ).toHaveBeenNthCalledWith(2, {
    cursor: "new",
    pageSize: 50,
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
