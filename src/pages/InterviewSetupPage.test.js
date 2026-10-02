import React from "react";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InterviewSetupPage from "./InterviewSetupPage";
import { interviewService } from "../services";
import { PAGES } from "../utils/constants";

jest.mock("../services/authService", () => ({
  authService: {
    logout: jest.fn(),
  },
}));

jest.mock("../services", () => ({
  interviewService: {
    getSetupOptions: jest.fn(),
    startSession: jest.fn(),
  },
}));

// Allows page to render normally while preventing Firebase from initializing during testing.
jest.mock("../config/firebase", () => ({
  __esModule: true,
  auth: {
    currentUser: {
      uid: "test-user",
      email: "test@example.com",
    },
  },
  default: {},
}));

const setupOptions = {
  jobRoles: [
    "backend developer",
    "software engineer",
  ],
  experienceLevels: [
    "Beginner",
    "Intermediate",
  ],
  tags: [
    "algorithms",
    "data structures",
    "tree",
  ],
};

describe("InterviewSetupPage", () => {
  let onNavigate;
  let onStartInterview;

  beforeEach(() => {
    jest.clearAllMocks();

    onNavigate = jest.fn();
    onStartInterview = jest.fn();

    interviewService.getSetupOptions.mockResolvedValue(
      setupOptions
    );
  });

  function renderPage(selectedMode = "Quiz Style") {
    render(
      <InterviewSetupPage
        currentPage={PAGES.INTERVIEW_SETUP}
        onNavigate={onNavigate}
        selectedMode={selectedMode}
        onStartInterview={onStartInterview}
      />
    );
  }

  async function fillValidSetup() {
    await screen.findByRole("button", {
      name: "Data Structures",
    });

    userEvent.click(screen.getByLabelText("Job Role"));
    userEvent.click(
      screen.getByRole("option", {
        name: "Software Engineer",
      })
    );

    userEvent.selectOptions(
      screen.getByLabelText("Experience Level"),
      "Intermediate"
    );

    userEvent.click(
      screen.getByRole("button", {
        name: "Data Structures",
      })
    );
  }

  test("displays the Interview Setup page", () => {
    renderPage();

    expect(
      screen.getByRole("heading", {
        name: "Interview Setup",
      })
    ).toBeInTheDocument();
  });

  test("loads setup options for the selected interview mode", async () => {
    renderPage("Code Style");

    await waitFor(() => {
      expect(
        interviewService.getSetupOptions
      ).toHaveBeenCalledWith("Code Style");
    });

    expect(
      await screen.findByRole("button", {
        name: "Tree",
      })
    ).toBeInTheDocument();
  });

  test("displays the selected interview mode", () => {
    renderPage("Quiz Style");

    expect(
      screen.getByText("Selected Mode: Quiz Style")
    ).toBeInTheDocument();
  });

  test("does not start a session when required fields are empty", async () => {
    renderPage();

    await screen.findByRole("button", {
      name: "Data Structures",
    });

    userEvent.click(
      screen.getByRole("button", {
        name: "Start Session",
      })
    );

    expect(
      screen.getByText(
        "Please fill in all required fields before starting."
      )
    ).toBeInTheDocument();

    expect(
      interviewService.startSession
    ).not.toHaveBeenCalled();

    expect(
      onStartInterview
    ).not.toHaveBeenCalled();
  });

  test("calls interviewService.startSession with tags and question count", async () => {
    const mockSession = {
      id: "mock-session-1",
      mode: "Quiz Style",
      jobRole: "Software Engineer",
      experienceLevel: "Intermediate",
      tags: ["data structures"],
      questionCount: 10,
      status: "active",
    };

    interviewService.startSession.mockResolvedValue(
      mockSession
    );

    renderPage();
    await fillValidSetup();

    userEvent.click(
      screen.getByRole("button", {
        name: "Start Session",
      })
    );

    await waitFor(() => {
      expect(
        interviewService.startSession
      ).toHaveBeenCalledWith({
        mode: "Quiz Style",
        jobRole: "Software Engineer",
        experienceLevel: "Intermediate",
        tags: ["data structures"],
        questionCount: 10,
      });
    });
  });

  test("passes the returned session to onStartInterview", async () => {
    const mockSession = {
      id: "mock-session-1",
      mode: "Quiz Style",
      jobRole: "Software Engineer",
      experienceLevel: "Intermediate",
      tags: ["data structures"],
      questionCount: 10,
      status: "active",
    };

    interviewService.startSession.mockResolvedValue(
      mockSession
    );

    renderPage();
    await fillValidSetup();

    userEvent.click(
      screen.getByRole("button", {
        name: "Start Session",
      })
    );

    await waitFor(() => {
      expect(onStartInterview).toHaveBeenCalledWith(
        mockSession
      );
    });
  });

  test("displays an error when setup options cannot be loaded", async () => {
    interviewService.getSetupOptions.mockRejectedValue(
      new Error("Unable to load setup options.")
    );

    renderPage();

    expect(
      await screen.findByText("Unable to load setup options.")
    ).toBeInTheDocument();
  });

  test("Cancel returns the user to the dashboard", () => {
    renderPage();

    userEvent.click(
      screen.getByRole("button", {
        name: "Cancel",
      })
    );

    expect(onNavigate).toHaveBeenCalledWith(
      PAGES.DASHBOARD
    );
  });
});
