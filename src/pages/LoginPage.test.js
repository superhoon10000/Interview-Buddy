
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import { authService } from "../services/authService.js";

jest.mock("../services/authService.js", () => ({
  authService: {
    login: jest.fn(),
    loginWithGoogle: jest.fn(),
    register: jest.fn(),
  },
}));

const renderLoginPage = (loginMessage = "") => {
  const onLogin = jest.fn();
  const onGoToRegister = jest.fn();

  render(
    <MemoryRouter>
      <LoginPage
        onLogin={onLogin}
        onGoToRegister={onGoToRegister}
        loginMessage={loginMessage}
      />
    </MemoryRouter>
  );

  return { onLogin, onGoToRegister };
};

const enterValidCredentials = () => {
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "test@example.com" },
  });

  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "password123" },
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("displays error when email and password are empty", () => {
  renderLoginPage();

  fireEvent.click(screen.getByRole("button", { name: /login to workspace/i }));

  expect(
    screen.getByText("Please enter both email and password.")
  ).toBeInTheDocument();

  expect(authService.login).not.toHaveBeenCalled();
});

test("displays error when email is invalid", () => {
  renderLoginPage();

  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "bryanexample.com" },
  });

  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "password123" },
  });

  fireEvent.click(screen.getByRole("button", { name: /login to workspace/i }));

  expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
  expect(authService.login).not.toHaveBeenCalled();
});

test("rejects malicious looking email", () => {
  renderLoginPage();

  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "' OR '1'='1" },
  });

  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "password123" },
  });

  fireEvent.click(screen.getByRole("button", { name: /login to workspace/i }));

  expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
  expect(authService.login).not.toHaveBeenCalled();
});

test("logs in through the existing auth service", async () => {
  authService.login.mockResolvedValue({ authenticated: true });

  const { onLogin } = renderLoginPage();
  enterValidCredentials();

  fireEvent.click(screen.getByRole("button", { name: /login to workspace/i }));

  await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));

  expect(authService.login).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "password123",
  });
});

test("shows the service error and keeps the user on login", async () => {
  authService.login.mockRejectedValue(new Error("Invalid email or password."));

  const { onLogin } = renderLoginPage();
  enterValidCredentials();

  fireEvent.click(screen.getByRole("button", { name: /login to workspace/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid email or password."
  );

  expect(onLogin).not.toHaveBeenCalled();
});

test("disables login actions while a request is pending", async () => {
  let resolveLogin;

  authService.login.mockReturnValue(
    new Promise((resolve) => {
      resolveLogin = resolve;
    })
  );

  const { onLogin } = renderLoginPage();
  enterValidCredentials();

  fireEvent.click(screen.getByRole("button", { name: /login to workspace/i }));

  expect(screen.getByRole("button", { name: /logging in/i })).toBeDisabled();

  expect(
    screen.getByRole("button", { name: /continue with google/i })
  ).toBeDisabled();

  resolveLogin({ authenticated: true });

  await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));
});

test("supports Google sign-in without replacing the Firebase flow", async () => {
  authService.loginWithGoogle.mockResolvedValue({ authenticated: true });

  const { onLogin } = renderLoginPage();

  fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

  await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));

  expect(authService.loginWithGoogle).toHaveBeenCalledTimes(1);
});

test("preserves the account deletion confirmation and registration action", () => {
  const { onGoToRegister } = renderLoginPage(
    "Your account has been successfully deleted."
  );

  expect(screen.getByRole("status")).toHaveTextContent(
    "Your account has been successfully deleted."
  );

  fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

  expect(onGoToRegister).toHaveBeenCalledTimes(1);
});

test("keeps the password reset route available", () => {
  renderLoginPage();

  expect(
    screen.getByRole("link", { name: /forgot password/i })
  ).toHaveAttribute("href", "/forgot-password");
});

test("handles stored XSS input in username", () => {
  render(
    <RegisterPage onRegister={jest.fn()} onGoToLogin={jest.fn()} />
  );

  const usernameInput = screen.getByPlaceholderText("Username");
  const maliciousInput = '<script>alert("Hacked!")</script>';

  fireEvent.change(usernameInput, {
    target: { value: maliciousInput },
  });

  expect(usernameInput.value).toBe(maliciousInput);
});
