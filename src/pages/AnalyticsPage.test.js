//Tests real data display, empty accounts, leaderboard failures, retry handling,
//and preventing previous user's statistics from remaining visible after changing accounts
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import AnalyticsPage from "./AnalyticsPage";
import { useAuth } from "../context/AuthContext";
import { analyticsService } from "../services/analyticsService";
import { leaderboardService } from "../services/leaderboardService";

jest.mock("../components/layout/PageLayout", () => ({
  children,
  title,
}) => (
  <main>
    <h1>{title}</h1>
    {children}
  </main>
));

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../services/analyticsService", () => ({
  analyticsService: {
    getCompletedSessions: jest.fn(),
  },
}));

jest.mock("../services/leaderboardService", () => ({
  leaderboardService: {
    getUserRanking: jest.fn(),
  },
}));

const sample = [
  {
    id: "a1",
    mode: "Quiz Style",
    status: "completed",
    completedAt: "2026-10-02T12:00:00Z",
    result: {
      score: 88,
      completionStatus: "completed",
    },
  },
];

beforeEach(() => {
  jest.clearAllMocks();

  useAuth.mockReturnValue({
    user: { uid: "alice" },
  });

  analyticsService.getCompletedSessions.mockResolvedValue(
    sample
  );

  leaderboardService.getUserRanking.mockResolvedValue({
    elo: 1300,
  });
});

test("renders actual session metrics and ranking", async () => {
  render(
    <AnalyticsPage
      currentPage="/analytics"
      onNavigate={jest.fn()}
    />
  );

  expect(
    await screen.findByText("1300")
  ).toBeInTheDocument();

  expect(
    screen.getAllByText("88%").length
  ).toBeGreaterThan(0);

  expect(
    screen.getAllByText("Quiz Style").length
  ).toBeGreaterThan(0);

  expect(
    screen.getByRole("img", {
      name: /Quiz Style: 88% on Oct 2/i,
    })
  ).toBeInTheDocument();

  // Old prototype value must not appear.
  expect(
    screen.queryByText("1435")
  ).not.toBeInTheDocument();
});

test("renders an empty state", async () => {
  analyticsService.getCompletedSessions.mockResolvedValue([]);

  render(
    <AnalyticsPage
      currentPage="/analytics"
      onNavigate={jest.fn()}
    />
  );

  expect(
    await screen.findByText("No completed interviews yet")
  ).toBeInTheDocument();

  expect(
    screen.getByText("0")
  ).toBeInTheDocument();

  expect(
    screen.queryByRole("img", {
      name: /Quiz Style: 88%/i,
    })
  ).not.toBeInTheDocument();
});

test("analytics works when leaderboard fails", async () => {
  leaderboardService.getUserRanking.mockRejectedValue(
    new Error("Ranking unavailable")
  );

  render(
    <AnalyticsPage
      currentPage="/analytics"
      onNavigate={jest.fn()}
    />
  );

  expect(
    await screen.findByRole("img", {
      name: /Quiz Style: 88% on Oct 2/i,
    })
  ).toBeInTheDocument();
});

test("shows an error and supports retry", async () => {
  analyticsService.getCompletedSessions
    .mockRejectedValueOnce(
      new Error("Temporary outage")
    )
    .mockResolvedValueOnce(sample);

  render(
    <AnalyticsPage
      currentPage="/analytics"
      onNavigate={jest.fn()}
    />
  );

  expect(
    await screen.findByText("Temporary outage")
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Try Again",
    })
  );

  expect(
    await screen.findByRole("img", {
      name: /Quiz Style: 88% on Oct 2/i,
    })
  ).toBeInTheDocument();

  expect(
    analyticsService.getCompletedSessions
  ).toHaveBeenCalledTimes(2);
});

test("clears previous account metrics when user changes", async () => {
  const { rerender } = render(
    <AnalyticsPage
      currentPage="/analytics"
      onNavigate={jest.fn()}
    />
  );

  expect(
    await screen.findByRole("img", {
      name: /Quiz Style: 88% on Oct 2/i,
    })
  ).toBeInTheDocument();

  let finishBob;

  analyticsService.getCompletedSessions.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishBob = resolve;
      })
  );

  useAuth.mockReturnValue({
    user: { uid: "bob" },
  });

  rerender(
    <AnalyticsPage
      currentPage="/analytics"
      onNavigate={jest.fn()}
    />
  );

  expect(
    screen.queryByText("88%")
  ).not.toBeInTheDocument();

  finishBob([]);

  await waitFor(() => {
    expect(
      screen.getByText("No completed interviews yet")
    ).toBeInTheDocument();
  });
});
