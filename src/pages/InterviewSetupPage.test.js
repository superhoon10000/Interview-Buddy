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

jest.mock("../services", () => ({
  interviewService: {
    startSession: jest.fn(),
  },
}));

describe("InterviewSetupPage", () => {
  let onNavigate;
  let onStartInterview;

  beforeEach(() => {
    jest.clearAllMocks();

    onNavigate = jest.fn();
    onStartInterview = jest.fn();
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

  test("displays the Interview Setup page", () => {
    renderPage();

    expect(
      screen.getByRole("heading", {
        name: "Interview Setup",
      })
    ).toBeInTheDocument();
  });

  test("displays the selected interview mode", () => {
    renderPage("Quiz Style");

    expect(
      screen.getByText("Selected Mode: Quiz Style")
    ).toBeInTheDocument();
  });

  test("displays another selected mode correctly", () => {
    renderPage("Code Style");

    expect(
      screen.getByText("Selected Mode: Code Style")
    ).toBeInTheDocument();
  });

  test("does not start a session when required fields are empty", () => {
    renderPage();

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

  test("calls interviewService.startSession with the form data", async () => {
    const mockSession = {
      id: "mock-session-1",
      mode: "Quiz Style",
      jobRole: "Software Engineer",
      experienceLevel: "Intermediate",
      practiceGoals: "Data structures",
      status: "active",
    };

    interviewService.startSession.mockResolvedValue(
      mockSession
    );

    renderPage();

    userEvent.type(
      screen.getByLabelText("Job Role"),
      "Software Engineer"
    );

    userEvent.selectOptions(
      screen.getByLabelText("Experience Level"),
      "Intermediate"
    );

    userEvent.type(
      screen.getByLabelText("Practice Goals"),
      "Data structures"
    );

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
        practiceGoals: "Data structures",
      });
    });
  });

  test("passes the returned session to onStartInterview", async () => {
    const mockSession = {
      id: "mock-session-1",
      mode: "Quiz Style",
      jobRole: "Software Engineer",
      experienceLevel: "Intermediate",
      practiceGoals: "Data structures",
      status: "active",
    };

    interviewService.startSession.mockResolvedValue(
      mockSession
    );

    renderPage();

    userEvent.type(
      screen.getByLabelText("Job Role"),
      "Software Engineer"
    );

    userEvent.selectOptions(
      screen.getByLabelText("Experience Level"),
      "Intermediate"
    );

    userEvent.type(
      screen.getByLabelText("Practice Goals"),
      "Data structures"
    );

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

  test("displays an error when the service fails", async () => {
    interviewService.startSession.mockRejectedValue(
      new Error("Unable to create session.")
    );

    renderPage();

    userEvent.type(
      screen.getByLabelText("Job Role"),
      "Software Engineer"
    );

    userEvent.selectOptions(
      screen.getByLabelText("Experience Level"),
      "Beginner"
    );

    userEvent.type(
      screen.getByLabelText("Practice Goals"),
      "Technical interview practice"
    );

    userEvent.click(
      screen.getByRole("button", {
        name: "Start Session",
      })
    );

    expect(
      await screen.findByText(
        "Unable to create session."
      )
    ).toBeInTheDocument();

    expect(
      onStartInterview
    ).not.toHaveBeenCalled();
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