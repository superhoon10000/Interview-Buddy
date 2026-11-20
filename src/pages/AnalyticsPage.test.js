
import {
  act,
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

// Use local calendar dates to avoid tests expiring over time.
const localDate = (daysAgo = 0) => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
    12
  );
};

const dateLabel = (daysAgo = 0) =>
  localDate(daysAgo).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const makeSession = (
  id = "a1",
  score = 88,
  daysAgo = 0,
  mode = "Quiz Style"
) => ({
  id,
  mode,
  status: "completed",
  completedAt: localDate(daysAgo).toISOString(),
  result: {
    score,
    completionStatus: "completed",
  },
});

const renderPage = () =>
  render(
    <AnalyticsPage
      currentPage="/analytics"
      onNavigate={jest.fn()}
    />
  );

beforeEach(() => {
  jest.clearAllMocks();

  useAuth.mockReturnValue({
    user: { uid: "alice" },
  });

  analyticsService.getCompletedSessions.mockResolvedValue([
    makeSession(),
  ]);

  leaderboardService.getUserRanking.mockResolvedValue({
    elo: 1300,
  });
});

test("renders actual lifetime statistics and current ELO", async () => {
  renderPage();

  expect(
    await screen.findByText("1300")
  ).toBeInTheDocument();

  expect(
    screen.getAllByText("88%").length
  ).toBeGreaterThan(0);

  expect(
    screen.getByText("Across 1 all-time scored interviews.")
  ).toBeInTheDocument();

  expect(
    screen.getByRole("heading", {
      name: "Daily Average — Last 30 Days",
    })
  ).toBeInTheDocument();

  expect(
    screen.getByRole("img", {
      name: `${dateLabel()}: 88% daily average across 1 interview`,
    })
  ).toBeInTheDocument();

  expect(
    screen.getAllByRole("img", {
      name: /No scored interviews/i,
    })
  ).toHaveLength(29);

  // Old prototype value must not appear.
  expect(
    screen.queryByText("1435")
  ).not.toBeInTheDocument();
});

test("shows 30 missing dates for an empty account", async () => {
  analyticsService.getCompletedSessions.mockResolvedValue([]);

  renderPage();

  expect(
    await screen.findByRole("heading", {
      name: "Daily Average — Last 30 Days",
    })
  ).toBeInTheDocument();

  expect(
    screen.getByText("0")
  ).toBeInTheDocument();

  expect(
    screen.getAllByRole("img", {
      name: /No scored interviews/i,
    })
  ).toHaveLength(30);

  expect(
    screen.queryByRole("img", {
      name: /daily average across/i,
    })
  ).not.toBeInTheDocument();
});

test("analytics still works when leaderboard fails", async () => {
  leaderboardService.getUserRanking.mockRejectedValue(
    new Error("Ranking unavailable")
  );

  renderPage();

  expect(
    await screen.findByRole("img", {
      name: `${dateLabel()}: 88% daily average across 1 interview`,
    })
  ).toBeInTheDocument();

  expect(
    screen.getByText("Across 1 all-time scored interviews.")
  ).toBeInTheDocument();
});

test("shows history errors and supports retry", async () => {
  analyticsService.getCompletedSessions
    .mockRejectedValueOnce(
      new Error("Temporary outage")
    )
    .mockResolvedValueOnce([makeSession()]);

  renderPage();

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
      name: `${dateLabel()}: 88% daily average across 1 interview`,
    })
  ).toBeInTheDocument();

  expect(
    analyticsService.getCompletedSessions
  ).toHaveBeenCalledTimes(2);
});

test("clears previous account metrics when user changes", async () => {
  const { rerender } = renderPage();

  expect(
    await screen.findByRole("img", {
      name: `${dateLabel()}: 88% daily average across 1 interview`,
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

  // Old account data should not remain visible.
  expect(
    screen.queryByText("88%")
  ).not.toBeInTheDocument();

  await waitFor(() => {
    expect(typeof finishBob).toBe("function");
  });

  act(() => {
    finishBob([]);
  });

  expect(
    await screen.findByRole("heading", {
      name: "Daily Average — Last 30 Days",
    })
  ).toBeInTheDocument();

  expect(
    screen.getAllByRole("img", {
      name: /No scored interviews/i,
    })
  ).toHaveLength(30);
});

test("daily averages include recent sessions while lifetime stats include older ones", async () => {
  analyticsService.getCompletedSessions.mockResolvedValue([
    makeSession("a1", 88, 0, "Quiz Style"),
    makeSession("a2", 72, 0, "Code Style"),
    makeSession("older", 40, 40, "Theoretical Style"),
  ]);

  renderPage();

  expect(
    await screen.findByText(
      "Across 3 all-time scored interviews."
    )
  ).toBeInTheDocument();

  // Lifetime average: (88 + 72 + 40) / 3 = 67%.
  expect(
    screen.getAllByText("67%").length
  ).toBeGreaterThan(0);

  // Daily average: (88 + 72) / 2 = 80%.
  expect(
    screen.getByRole("img", {
      name: `${dateLabel()}: 80% daily average across 2 interviews`,
    })
  ).toBeInTheDocument();

  expect(
    screen.getAllByRole("img", {
      name: /No scored interviews/i,
    })
  ).toHaveLength(29);

  expect(
    screen.getByRole("heading", {
      name: "Performance Breakdown",
    })
  ).toBeInTheDocument();
});

test("distinguishes a zero score from a day without data", async () => {
  analyticsService.getCompletedSessions.mockResolvedValue([
    makeSession("zero", 0),
  ]);

  renderPage();

  expect(
    await screen.findByRole("img", {
      name: `${dateLabel()}: 0% daily average across 1 interview`,
    })
  ).toBeInTheDocument();

  expect(
    screen.getAllByRole("img", {
      name: /No scored interviews/i,
    })
  ).toHaveLength(29);
});
