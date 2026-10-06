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

// Prevent Firebase from initializing during frontend unit tests.
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

/*
 * These options represent the metadata returned
 * before the user has fully configured the session.
 */
const baseSetupOptions = {
  jobRoles: [
    "backend developer",
    "frontend developer",
    "full stack developer",
    "software engineer",
  ],

  experienceLevels: [
    "Beginner",
    "Intermediate",
    "Experienced",
  ],

  tags: [],
};

/*
 * Practice goals are returned after both a role
 * and experience level have been selected.
 *
 * This better represents the real backend behavior
 * we just implemented.
 */
const configuredSetupOptions = {
  jobRoles: [
    "backend developer",
    "frontend developer",
    "full stack developer",
    "software engineer",
  ],

  experienceLevels: [
    "Beginner",
    "Intermediate",
    "Experienced",
  ],

  tags: [
    "algorithms",
    "data structures",
    "testing",
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

    /*
     * The real page now requests setup options
     * several times:
     *
     * 1. Mode only
     * 2. Mode + job role
     * 3. Mode + job role + experience level
     *
     * Our mock behaves similarly.
     */
    interviewService.getSetupOptions.mockImplementation(
      async (
        mode,
        {
          jobRole = "",
          experienceLevel = "",
        } = {}
      ) => {
        if (
          jobRole &&
          experienceLevel
        ) {
          return configuredSetupOptions;
        }

        return baseSetupOptions;
      }
    );

    interviewService.startSession.mockResolvedValue({
      id: "mock-session-default",
      status: "active",
    });
  });

  function renderPage(
    selectedMode = "Quiz Style"
  ) {
    render(
      <InterviewSetupPage
        currentPage={
          PAGES.INTERVIEW_SETUP
        }
        onNavigate={onNavigate}
        selectedMode={selectedMode}
        onStartInterview={
          onStartInterview
        }
      />
    );
  }

  /*
   * Wait until the initial asynchronous
   * setup-options request has completed.
   *
   * We no longer wait for a practice-goal
   * button because goals intentionally do
   * not load until role + experience are
   * selected.
   */
  async function waitForSetupOptions() {
    await waitFor(() => {
      expect(
        screen.getByLabelText(
          "Job Role"
        )
      ).toBeEnabled();

      expect(
        screen.getByLabelText(
          "Experience Level"
        )
      ).toBeEnabled();
    });

    await waitFor(() => {
      expect(
        screen.queryByText(
          /loading available setup options from firebase/i
        )
      ).not.toBeInTheDocument();
    });
  }

  /*
   * Select a valid Firebase-backed role and
   * wait for the role-dependent options
   * request to complete.
   */
  async function selectSoftwareEngineer() {
    await waitForSetupOptions();

    const jobRoleInput =
      screen.getByLabelText(
        "Job Role"
      );

    userEvent.click(jobRoleInput);

    userEvent.click(
      screen.getByRole(
        "option",
        {
          name:
            "Software Engineer",
        }
      )
    );

    await waitFor(() => {
      expect(
        interviewService
          .getSetupOptions
      ).toHaveBeenCalledWith(
        expect.any(String),
        {
          jobRole:
            "Software Engineer",

          experienceLevel: "",
        }
      );
    });

    await waitFor(() => {
      expect(
        screen.getByLabelText(
          "Experience Level"
        )
      ).toBeEnabled();

      expect(
        screen.queryByText(
          /loading available setup options from firebase/i
        )
      ).not.toBeInTheDocument();
    });
  }

  /*
   * Experience selection triggers another
   * setup-options request.
   *
   * After that request completes, the valid
   * practice goals become available.
   */
  async function selectIntermediateExperience() {
    userEvent.selectOptions(
      screen.getByLabelText(
        "Experience Level"
      ),
      "Intermediate"
    );

    await waitFor(() => {
      expect(
        interviewService
          .getSetupOptions
      ).toHaveBeenCalledWith(
        expect.any(String),
        {
          jobRole:
            "Software Engineer",

          experienceLevel:
            "Intermediate",
        }
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole(
          "button",
          {
            name:
              "Data Structures",
          }
        )
      ).toBeEnabled();
    });
  }

  /*
   * Complete all required setup fields.
   */
  async function fillValidSetup() {
    await selectSoftwareEngineer();

    await selectIntermediateExperience();

    userEvent.click(
      screen.getByRole(
        "button",
        {
          name:
            "Data Structures",
        }
      )
    );
  }

  test(
    "displays the Interview Setup page",
    async () => {
      renderPage();

      expect(
        screen.getByRole(
          "heading",
          {
            name:
              "Interview Setup",
          }
        )
      ).toBeInTheDocument();

      /*
       * Allow the component's startup
       * request to finish before ending
       * the test.
       */
      await waitForSetupOptions();
    }
  );

  test(
    "displays the selected interview mode",
    async () => {
      renderPage(
        "Quiz Style"
      );

      expect(
        screen.getByText(
          "Selected Mode: Quiz Style"
        )
      ).toBeInTheDocument();

      await waitForSetupOptions();
    }
  );

  test(
    "loads setup options for the selected interview mode",
    async () => {
      renderPage(
        "Code Style"
      );

      await waitFor(() => {
        expect(
          interviewService
            .getSetupOptions
        ).toHaveBeenCalledWith(
          "Code Style",
          {
            jobRole: "",
            experienceLevel: "",
          }
        );
      });

      await waitForSetupOptions();

      const jobRoleInput =
        screen.getByLabelText(
          "Job Role"
        );

      userEvent.click(
        jobRoleInput
      );

      expect(
        screen.getByRole(
          "option",
          {
            name:
              "Software Engineer",
          }
        )
      ).toBeInTheDocument();

      expect(
        screen.getByRole(
          "option",
          {
            name:
              "Intermediate",
          }
        )
      ).toBeInTheDocument();
    }
  );

  test(
    "filters job roles while the user types",
    async () => {
      renderPage();

      await waitForSetupOptions();

      const jobRoleInput =
        screen.getByLabelText(
          "Job Role"
        );

      userEvent.click(
        jobRoleInput
      );

      expect(
        screen.getByRole(
          "option",
          {
            name:
              "Backend Developer",
          }
        )
      ).toBeInTheDocument();

      expect(
        screen.getByRole(
          "option",
          {
            name:
              "Frontend Developer",
          }
        )
      ).toBeInTheDocument();

      userEvent.type(
        jobRoleInput,
        "front"
      );

      expect(
        screen.getByRole(
          "option",
          {
            name:
              "Frontend Developer",
          }
        )
      ).toBeInTheDocument();

      expect(
        screen.queryByRole(
          "option",
          {
            name:
              "Backend Developer",
          }
        )
      ).not.toBeInTheDocument();

      expect(
        screen.queryByRole(
          "option",
          {
            name:
              "Software Engineer",
          }
        )
      ).not.toBeInTheDocument();
    }
  );

  test(
    "shows a message when no job roles match the search",
    async () => {
      renderPage();

      await waitForSetupOptions();

      userEvent.type(
        screen.getByLabelText(
          "Job Role"
        ),
        "astronaut"
      );

      expect(
        screen.getByText(
          "No matching job roles found."
        )
      ).toBeInTheDocument();
    }
  );

  test(
    "does not accept an arbitrary job role that was not selected from Firebase options",
    async () => {
      renderPage();

      await waitForSetupOptions();

      /*
       * Typing text into the box does not
       * make it a valid role.
       *
       * A valid role must be selected from
       * the Firebase-backed dropdown.
       */
      userEvent.type(
        screen.getByLabelText(
          "Job Role"
        ),
        "Game Developer"
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Start Session",
          }
        )
      );

      expect(
        screen.getByText(
          "Please fill in all required fields before starting."
        )
      ).toBeInTheDocument();

      expect(
        interviewService
          .startSession
      ).not.toHaveBeenCalled();

      expect(
        onStartInterview
      ).not.toHaveBeenCalled();
    }
  );

  test(
    "reloads setup options after a job role is selected",
    async () => {
      renderPage(
        "Quiz Style"
      );

      await selectSoftwareEngineer();

      expect(
        interviewService
          .getSetupOptions
      ).toHaveBeenCalledWith(
        "Quiz Style",
        {
          jobRole:
            "Software Engineer",

          experienceLevel: "",
        }
      );
    }
  );

  test(
    "reloads practice goals after an experience level is selected",
    async () => {
      renderPage(
        "Quiz Style"
      );

      await selectSoftwareEngineer();

      await selectIntermediateExperience();

      expect(
        interviewService
          .getSetupOptions
      ).toHaveBeenCalledWith(
        "Quiz Style",
        {
          jobRole:
            "Software Engineer",

          experienceLevel:
            "Intermediate",
        }
      );

      expect(
        screen.getByRole(
          "button",
          {
            name:
              "Data Structures",
          }
        )
      ).toBeInTheDocument();
    }
  );

  test(
    "selects and deselects practice goal pills",
    async () => {
      renderPage();

      await selectSoftwareEngineer();

      await selectIntermediateExperience();

      const algorithmsButton =
        screen.getByRole(
          "button",
          {
            name:
              "Algorithms",
          }
        );

      const dataStructuresButton =
        screen.getByRole(
          "button",
          {
            name:
              "Data Structures",
          }
        );

      expect(
        algorithmsButton
      ).toHaveAttribute(
        "aria-pressed",
        "false"
      );

      userEvent.click(
        algorithmsButton
      );

      expect(
        algorithmsButton
      ).toHaveAttribute(
        "aria-pressed",
        "true"
      );

      expect(
        screen.getByText(
          "1 practice goal selected."
        )
      ).toBeInTheDocument();

      userEvent.click(
        dataStructuresButton
      );

      expect(
        dataStructuresButton
      ).toHaveAttribute(
        "aria-pressed",
        "true"
      );

      expect(
        screen.getByText(
          "2 practice goals selected."
        )
      ).toBeInTheDocument();

      /*
       * Clicking an already-selected
       * practice goal should remove it.
       */
      userEvent.click(
        algorithmsButton
      );

      expect(
        algorithmsButton
      ).toHaveAttribute(
        "aria-pressed",
        "false"
      );

      expect(
        screen.getByText(
          "1 practice goal selected."
        )
      ).toBeInTheDocument();
    }
  );

  test(
    "does not start a session when required fields are empty",
    async () => {
      renderPage();

      await waitForSetupOptions();

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Start Session",
          }
        )
      );

      expect(
        screen.getByText(
          "Please fill in all required fields before starting."
        )
      ).toBeInTheDocument();

      expect(
        interviewService
          .startSession
      ).not.toHaveBeenCalled();

      expect(
        onStartInterview
      ).not.toHaveBeenCalled();
    }
  );

  test(
    "uses 10 questions by default",
    async () => {
      const mockSession = {
        id: "mock-session-1",

        mode:
          "Quiz Style",

        jobRole:
          "Software Engineer",

        experienceLevel:
          "Intermediate",

        tags: [
          "data structures",
        ],

        questionCount: 10,

        status:
          "active",
      };

      interviewService.startSession.mockResolvedValue(
        mockSession
      );

      renderPage();

      await fillValidSetup();

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Start Session",
          }
        )
      );

      await waitFor(() => {
        expect(
          interviewService
            .startSession
        ).toHaveBeenCalledWith({
          mode:
            "Quiz Style",

          jobRole:
            "Software Engineer",

          experienceLevel:
            "Intermediate",

          tags: [
            "data structures",
          ],

          questionCount: 10,
        });
      });
    }
  );

  test(
    "passes multiple selected practice goals to startSession",
    async () => {
      interviewService.startSession.mockResolvedValue({
        id:
          "mock-session-1",

        status:
          "active",
      });

      renderPage();

      await selectSoftwareEngineer();

      await selectIntermediateExperience();

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Algorithms",
          }
        )
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Testing",
          }
        )
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Start Session",
          }
        )
      );

      await waitFor(() => {
        expect(
          interviewService
            .startSession
        ).toHaveBeenCalledWith({
          mode:
            "Quiz Style",

          jobRole:
            "Software Engineer",

          experienceLevel:
            "Intermediate",

          tags: [
            "algorithms",
            "testing",
          ],

          questionCount: 10,
        });
      });
    }
  );

  test(
    "passes the selected question count to startSession",
    async () => {
      interviewService.startSession.mockResolvedValue({
        id:
          "mock-session-1",

        status:
          "active",
      });

      renderPage();

      await fillValidSetup();

      const questionCountInput =
        screen.getByRole(
          "spinbutton",
          {
            name:
              "Number of Questions",
          }
        );

      userEvent.clear(
        questionCountInput
      );

      userEvent.type(
        questionCountInput,
        "20"
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Start Session",
          }
        )
      );

      await waitFor(() => {
        expect(
          interviewService
            .startSession
        ).toHaveBeenCalledWith({
          mode:
            "Quiz Style",

          jobRole:
            "Software Engineer",

          experienceLevel:
            "Intermediate",

          tags: [
            "data structures",
          ],

          questionCount: 20,
        });
      });
    }
  );

  test(
    "rejects a question count greater than 20",
    async () => {
      renderPage();

      await fillValidSetup();

      const questionCountInput =
        screen.getByRole(
          "spinbutton",
          {
            name:
              "Number of Questions",
          }
        );

      userEvent.clear(
        questionCountInput
      );

      userEvent.type(
        questionCountInput,
        "21"
      );

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Start Session",
          }
        )
      );

      expect(
        screen.getByText(
          "Please choose between 1 and 20 questions."
        )
      ).toBeInTheDocument();

      expect(
        interviewService
          .startSession
      ).not.toHaveBeenCalled();

      expect(
        onStartInterview
      ).not.toHaveBeenCalled();
    }
  );

  test(
    "passes the returned session to onStartInterview",
    async () => {
      const mockSession = {
        id:
          "mock-session-1",

        mode:
          "Quiz Style",

        jobRole:
          "Software Engineer",

        experienceLevel:
          "Intermediate",

        tags: [
          "data structures",
        ],

        questionCount: 10,

        status:
          "active",
      };

      interviewService.startSession.mockResolvedValue(
        mockSession
      );

      renderPage();

      await fillValidSetup();

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Start Session",
          }
        )
      );

      await waitFor(() => {
        expect(
          onStartInterview
        ).toHaveBeenCalledWith(
          mockSession
        );
      });
    }
  );

  test(
    "displays an error when setup options cannot be loaded",
    async () => {
      interviewService.getSetupOptions.mockRejectedValue(
        new Error(
          "Unable to load setup options."
        )
      );

      renderPage();

      expect(
        await screen.findByText(
          "Unable to load setup options."
        )
      ).toBeInTheDocument();

      expect(
        screen.getByLabelText(
          "Job Role"
        )
      ).toBeDisabled();

      expect(
        screen.getByRole(
          "button",
          {
            name:
              "Start Session",
          }
        )
      ).toBeDisabled();
    }
  );

  test(
    "does not load setup options when no interview mode is selected",
    async () => {
      renderPage("");

      expect(
        await screen.findByText(
          "Select an interview mode before configuring a session."
        )
      ).toBeInTheDocument();

      expect(
        interviewService
          .getSetupOptions
      ).not.toHaveBeenCalled();
    }
  );

  test(
    "Cancel returns the user to the dashboard",
    async () => {
      renderPage();

      /*
       * Let the initial async request finish
       * so the test does not end while React
       * is still updating state.
       */
      await waitForSetupOptions();

      userEvent.click(
        screen.getByRole(
          "button",
          {
            name: "Cancel",
          }
        )
      );

      expect(
        onNavigate
      ).toHaveBeenCalledWith(
        PAGES.DASHBOARD
      );
    }
  );
});