import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

jest.mock("../services/authService.js", () => ({
  authService: {
    login: jest.fn(),
    loginWithGoogle: jest.fn(),
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


test("Rejects malicioous looking email"), () => {
  renderLoginPage();

  
}