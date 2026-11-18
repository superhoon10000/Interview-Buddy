
import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import Sidebar from "./Sidebar";
import ProfileBadge from "../common/ProfileBadge";
import { PAGES } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { leaderboardService } from "../../services/leaderboardService";

jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../services/authService", () => ({
  authService: {
    logout: jest.fn(),
  },
}));

jest.mock("../../services/leaderboardService", () => ({
  leaderboardService: {
    getUserRanking: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();

  useAuth.mockReturnValue({
    user: {
      uid: "test-user",
      username: "FallbackName",
      email: "test@example.com",
    },
    profile: {
      username: "DPhoenix",
      ranking: { elo: 1000 },
    },
  });

  authService.logout.mockResolvedValue(undefined);
  leaderboardService.getUserRanking.mockResolvedValue(null);
});


async function renderSidebar(currentPage = PAGES.SETTINGS) {
  const onNavigate = jest.fn();

  render(
    <Sidebar
      currentPage={currentPage}
      onNavigate={onNavigate}
    />
  );

  // Allow the async ranking request to settle using Testing Library's
  // built-in async utilities rather than wrapping render() in act().
  await waitFor(() => {
    expect(leaderboardService.getUserRanking).toHaveBeenCalledTimes(1);
  });

  return { onNavigate };
}


test("renders the logo, graduate badge and username", async () => {
  await renderSidebar();

  expect(
    screen.getByRole("button", {
      name: "Go to Interview Buddy dashboard",
    })
  ).toBeInTheDocument();

  expect(
    screen.getByAltText("Graduate ELO rank badge")
  ).toHaveAttribute(
    "src",
    "/Cheerful%20Graduate%20Mascot%20Badge.png"
  );

  expect(
    screen.getByText("DPhoenix")
  ).toBeInTheDocument();
});

test("highlights the current page and preserves navigation", async () => {
  const { onNavigate } = await renderSidebar(PAGES.SETTINGS);

  expect(
    screen.getByRole("button", { name: "Settings" })
  ).toHaveAttribute("aria-current", "page");

  fireEvent.click(
    screen.getByRole("button", { name: "History" })
  );

  expect(onNavigate).toHaveBeenCalledWith(
    PAGES.HISTORY
  );
});

test("allows the user to cancel logout", async () => {
  await renderSidebar();

  fireEvent.click(
    screen.getByRole("button", { name: "Logout" })
  );

  expect(
    screen.getByRole("dialog")
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: "Cancel" })
  );

  expect(
    screen.queryByRole("dialog")
  ).not.toBeInTheDocument();

  expect(authService.logout).not.toHaveBeenCalled();
});

test("logs out through the existing auth service", async () => {
  const { onNavigate } = await renderSidebar();

  fireEvent.click(
    screen.getByRole("button", { name: "Logout" })
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Yes, log out" })
  );

  
    await waitFor(() => {
    expect(onNavigate).toHaveBeenCalledWith(PAGES.LOGIN);
    });

    expect(authService.logout).toHaveBeenCalledTimes(1);

});

test("does not navigate to login if logout fails", async () => {
  authService.logout.mockRejectedValue(
    new Error("Unable to sign out")
  );

  const { onNavigate } = await renderSidebar();

  fireEvent.click(
    screen.getByRole("button", { name: "Logout" })
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Yes, log out" })
  );

  expect(
    await screen.findByRole("alert")
  ).toHaveTextContent("Unable to sign out");

  expect(onNavigate).not.toHaveBeenCalled();
});

test("profile badge supports a different image source", () => {
  render(
    <ProfileBadge
      imageSrc="/another-badge.png"
      badgeAlt="Custom achievement badge"
      username="DPhoenix"
    />
  );

  expect(
    screen.getByAltText("Custom achievement badge")
  ).toHaveAttribute("src", "/another-badge.png");
});

test("shows initials if a badge image fails", () => {
  render(
    <ProfileBadge
      imageSrc="/missing-badge.png"
      username="DPhoenix"
    />
  );

  fireEvent.error(
    screen.getByAltText("Cheerful graduate mascot badge")
  );

  expect(
    screen.getByRole("img", {
      name: "DPhoenix's profile",
    })
  ).toHaveTextContent("DP");
});


test("sidebar uses the global #3 Meta badge regardless of a low ELO", async () => {
  leaderboardService.getUserRanking.mockResolvedValue({ uid: "test-user", username: "DPhoenix", rank: 3, elo: 51 });
  await renderSidebar();

  expect(await screen.findByAltText("Meta ELO rank badge")).toHaveAttribute(
    "src", "/Meta%20Mascot%20Tech%20Keynote%20Badge.png"
  );
});

test("sidebar shows the #2 Bill Gates badge regardless of ELO", async () => {
  leaderboardService.getUserRanking.mockResolvedValue({ uid: "test-user", username: "DPhoenix", rank: 2, elo: 75 });
  await renderSidebar();

  expect(await screen.findByAltText("Bill Gates ELO rank badge")).toHaveAttribute(
    "src", "/Tech%20CEO%20Mascot%20Innovation%20Badge.png"
  );
});

test("sidebar gives a high-ELO user outside the top three a regular badge", async () => {
  leaderboardService.getUserRanking.mockResolvedValue({ uid: "test-user", username: "DPhoenix", rank: 4, elo: 2500 });
  await renderSidebar();

  expect(await screen.findByAltText("Senior Developer ELO rank badge")).toBeInTheDocument();
});

test("sidebar falls back to persisted profile ELO when the ranking service fails", async () => {
  leaderboardService.getUserRanking.mockRejectedValue(new Error("Offline"));
  useAuth.mockReturnValue({
    user: { uid: "test-user", username: "DPhoenix" },
    profile: { username: "DPhoenix", ranking: { elo: 250 } },
  });
  await renderSidebar();

  expect(screen.getByAltText("Bum ELO rank badge")).toBeInTheDocument();
  await waitFor(() => expect(leaderboardService.getUserRanking).toHaveBeenCalledTimes(1));
});

test("sidebar does not claim a badge if no ELO is available", async () => {
  useAuth.mockReturnValue({ user: { uid: "test-user", username: "DPhoenix" }, profile: { username: "DPhoenix" } });
  await renderSidebar();

  expect(screen.getByRole("img", { name: "Rank badge unavailable" })).toBeInTheDocument();
  expect(screen.queryByAltText(/ELO rank badge/)).not.toBeInTheDocument();
});
