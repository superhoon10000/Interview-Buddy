import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

jest.mock("../services/authService.js", () => ({
  authService: {
    login: jest.fn(),
    loginWithGoogle: jest.fn(),
    register: jest.fn(),
  },
}));

const renderLoginPage = () => {
  render(
    <MemoryRouter>
      <LoginPage
        onLogin={jest.fn()}
        onGoToRegister={jest.fn()}
        loginMessage=""
      />
    </MemoryRouter>
  );
};

test("displays error when email and password are empty", () => {
  renderLoginPage();

  const loginButton = screen.getByRole("button", {
    name: /login to workspace/i,
  });

  fireEvent.click(loginButton);

  expect(
    screen.getByText("Please enter both email and password.")
  ).toBeInTheDocument();
});

test("displays error when email is invalid", () => {
  renderLoginPage();

  const emailInput = screen.getByPlaceholderText("Email");
  const passwordInput = screen.getByPlaceholderText("Password");

  fireEvent.change(emailInput, {
    target: { value: "bryanexample.com" },
  });

  fireEvent.change(passwordInput, {
    target: { value: "password123" },
  });

  const loginButton = screen.getByRole("button", {
    name: /login to workspace/i,
  });

  fireEvent.click(loginButton);

  expect(
    screen.getByText("Please enter a valid email")
  ).toBeInTheDocument();
});


test("Rejects malicious looking email", () => {
  renderLoginPage();

  const emailInput = screen.getByPlaceholderText("Email");
  const passwordInput = screen.getByPlaceholderText("Password");
  
  fireEvent.change(emailInput, {
    target: { value: "' OR '1'='1" },
  });

  fireEvent.change(passwordInput, {
    target: { value: "password123" },
  });

  const loginButton = screen.getByRole("button", {
    name: /login to workspace/i,
  });

  fireEvent.click(loginButton);

  expect(
    screen.getByText("Please enter a valid email")
  ).toBeInTheDocument();
});

test("handles stored XSS input in username", () => {
  
  render(<RegisterPage
    onRegister={jest.fn()}
    onGoToLogin={jest.fn()} />);
    
    const usernameInput = screen.getByPlaceholderText("Username");
    const maliciousInput = '<script>alert("Hacked!")</script>';

  fireEvent.change(usernameInput, {
    target: { value: maliciousInput },
  });

  expect(usernameInput.value).toBe(maliciousInput);
});
