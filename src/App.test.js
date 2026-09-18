import React from "react";
import {
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

function renderAtRoute(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
}

describe("Interview Buddy application routing", () => {
  test("the base URL redirects to the login page", async () => {
    renderAtRoute("/");

    expect(
      await screen.findByRole("heading", {
        name: "Interview Buddy",
      })
    ).toBeInTheDocument();
  });

  test("the login URL displays the login page", async () => {
    renderAtRoute("/login");

    expect(
      await screen.findByRole("heading", {
        name: "Interview Buddy",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Login",
      })
    ).toBeInTheDocument();
  });

  test("the dashboard URL displays the dashboard", async () => {
    renderAtRoute("/dashboard");

    expect(
      await screen.findByRole("heading", {
        name: "Dashboard",
      })
    ).toBeInTheDocument();
  });

  test("a direct history URL displays the history page", async () => {
    renderAtRoute("/history");

    expect(
      await screen.findByRole("heading", {
        name: "Chat History",
      })
    ).toBeInTheDocument();
  });

  test("an unknown URL redirects to the dashboard", async () => {
    renderAtRoute(
      "/this-route-does-not-exist"
    );

    expect(
      await screen.findByRole("heading", {
        name: "Dashboard",
      })
    ).toBeInTheDocument();
  });

  test("Create Account navigates from login to register", async () => {
    renderAtRoute("/login");

    userEvent.click(
      screen.getByRole("button", {
        name: "Create Account",
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: "Create Account",
      })
    ).toBeInTheDocument();
  });

  test("Back to Login navigates from register to login", async () => {
    renderAtRoute("/register");

    userEvent.click(
      screen.getByRole("button", {
        name: "Back to Login",
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: "Interview Buddy",
      })
    ).toBeInTheDocument();
  });

  test("selecting Quiz Style navigates to interview setup", async () => {
    renderAtRoute("/dashboard");

    const openModeButtons =
      screen.getAllByRole("button", {
        name: "Open Mode",
      });

    userEvent.click(openModeButtons[0]);

    expect(
      await screen.findByRole("heading", {
        name: "Interview Setup",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Selected Mode: Quiz Style"
      )
    ).toBeInTheDocument();
  });

  test("selecting Code Style preserves the selected mode", async () => {
    renderAtRoute("/dashboard");

    const openModeButtons =
      screen.getAllByRole("button", {
        name: "Open Mode",
      });

    userEvent.click(openModeButtons[1]);

    expect(
      await screen.findByText(
        "Selected Mode: Code Style"
      )
    ).toBeInTheDocument();
  });

  test("selecting Theoretical Style preserves the selected mode", async () => {
    renderAtRoute("/dashboard");

    const openModeButtons =
      screen.getAllByRole("button", {
        name: "Open Mode",
      });

    userEvent.click(openModeButtons[2]);

    expect(
      await screen.findByText(
        "Selected Mode: Theoretical Style"
      )
    ).toBeInTheDocument();
  });
});