import React from "react";
import {
  render,
  screen,
  act,
} from "@testing-library/react";

import {
  AuthProvider,
  useAuth,
} from "./AuthContext";

import { authService } from "../services/authService";

jest.mock("../services/authService", () => ({
  authService: {
    subscribeToAuthState: jest.fn(),
  },
}));

function TestConsumer() {
  const { user, loading } = useAuth();

  return (
    <div>
      <div data-testid="loading">
        {loading ? "loading" : "ready"}
      </div>

      <div data-testid="user">
        {user ? user.email : "no-user"}
      </div>
    </div>
  );
}

describe("AuthContext", () => {
  let authCallback;
  let unsubscribe;

  beforeEach(() => {
    jest.clearAllMocks();

    unsubscribe = jest.fn();

    authService.subscribeToAuthState.mockImplementation(
      (callback) => {
        authCallback = callback;
        return unsubscribe;
      }
    );
  });

  test("starts in loading state before Firebase auth resolves", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(
      screen.getByTestId("loading")
    ).toHaveTextContent("loading");

    expect(
      screen.getByTestId("user")
    ).toHaveTextContent("no-user");

    expect(
      authService.subscribeToAuthState
    ).toHaveBeenCalledTimes(1);
  });

  test("sets authenticated user and finishes loading when auth resolves", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      authCallback({
        uid: "test-user",
        email: "test@example.com",
      });
    });

    expect(
      screen.getByTestId("loading")
    ).toHaveTextContent("ready");

    expect(
      screen.getByTestId("user")
    ).toHaveTextContent("test@example.com");
  });

  test("sets user to null and finishes loading when no session exists", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      authCallback(null);
    });

    expect(
      screen.getByTestId("loading")
    ).toHaveTextContent("ready");

    expect(
      screen.getByTestId("user")
    ).toHaveTextContent("no-user");
  });

  test("updates session state when authentication changes", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      authCallback({
        uid: "test-user",
        email: "test@example.com",
      });
    });

    expect(
      screen.getByTestId("user")
    ).toHaveTextContent("test@example.com");

    act(() => {
      authCallback(null);
    });

    expect(
      screen.getByTestId("user")
    ).toHaveTextContent("no-user");
  });

  test("unsubscribes from auth state when provider unmounts", () => {
    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});