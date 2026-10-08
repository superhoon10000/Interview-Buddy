import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RegisterPage from "./RegisterPage";
import { authService } from "../services/authService";

jest.mock("../config/firebase", () => ({
  __esModule: true,
  auth: {
    currentUser: null,
  },
  default: {},
}));

jest.mock("../services/authService", () => ({
  authService: {
    register: jest.fn(),
  },
}));



test("rejects malicious XSS input in username", async () => {
  const maliciousInput = '<script>alert("Hacked!")</script>';

  render(
    <RegisterPage
      onRegister={jest.fn()}
      onGoToLogin={jest.fn()}
    />
  );

  const usernameInput = screen.getByPlaceholderText("Username");
  const emailInput = screen.getByPlaceholderText("Email");
  const passwordInput = screen.getByPlaceholderText("Password");

  fireEvent.change(usernameInput, {
    target: { value: maliciousInput },
  });

  fireEvent.change(emailInput, {
    target: { value: "test@example.com" },
  });

  fireEvent.change(passwordInput, {
    target: { value: "password123" },
  });

  const createButton = screen.getByRole("button", {
    name: /create account/i,
  });

  fireEvent.click(createButton);

  expect(
    screen.getByText("Username contains invalid characters.")
  ).toBeInTheDocument();

  expect(authService.register).not.toHaveBeenCalled();
});