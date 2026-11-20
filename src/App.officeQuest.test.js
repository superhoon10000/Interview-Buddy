// Route-level regression checks: exercise the real App and secret launcher,
// but replace unrelated pages/services with minimal deterministic stubs.
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuth } from "./context/AuthContext";
import { interviewService } from "./services/interviewService";
import { KONAMI_CODE } from "./components/easterEgg/officeQuestLogic";

jest.mock("./context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("./services/interviewService", () => ({
  interviewService: {
    refreshSetupMetadata: jest.fn().mockResolvedValue(undefined),
    resetMetadataVerification: jest.fn(),
  },
}));
jest.mock("./utils/routes", () => {
  const React = require("react");
  return function MockAppRoutes({ currentPage, onNavigate }) {
    return (
      <main>
        <h1>Original app at {currentPage}</h1>
        <button onClick={() => onNavigate("/dashboard")}>Navigate dashboard</button>
        <button onClick={() => onNavigate("/interview/setup")}>Navigate setup</button>
        <button onClick={() => onNavigate("/interview/session")}>Navigate interview</button>
        <button onClick={() => onNavigate("/history")}>Navigate history</button>
      </main>
    );
  };
});

const signedIn = { user: { uid: "test-user" }, loading: false };
const gameDialog = () => screen.queryByRole("dialog", { name: /secret office quest/i });
const enterCode = () => KONAMI_CODE.forEach((key) => fireEvent.keyDown(window, { key }));
const renderOn = (route) => render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
// The launcher imports asynchronously on the Dashboard. Flush that import
// before sending keystrokes to make the test independent of load timing.
const letLauncherMount = async () => {
  // Wait for the Dashboard-only lazy module to resolve inside React's act.
  await act(async () => {
    await import("./components/easterEgg/OfficeQuestLauncher");
  });
};

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: jest.fn(() => ({
      fillRect: jest.fn(), fillText: jest.fn(),
      set fillStyle(_value) {}, set font(_value) {}, set textAlign(_value) {},
      set imageSmoothingEnabled(_value) {},
    })),
  });
});

beforeEach(() => {
  // react-scripts/Jest may reset mock implementations between tests. The app
  // attaches .catch() to this result, so always return a Promise here.
  interviewService.refreshSetupMetadata.mockResolvedValue(undefined);
  interviewService.resetMetadataVerification.mockImplementation(() => {});
  useAuth.mockReturnValue(signedIn);
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

it.each([
  "/", "/login", "/register", "/forgot-password",
  "/interview/setup", "/interview/session", "/history", "/results",
  "/results/saved-session-123", "/analytics", "/leaderboard",
  "/settings", "/settings/password", "/unrecognized-route",
])("does not activate or install a game on %s", async (route) => {
  renderOn(route);
  await letLauncherMount();
  enterCode();
  expect(gameDialog()).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: `Original app at ${route}` })).toBeInTheDocument();
});

it("opens only on the signed-in Dashboard; normal metadata refresh is not duplicated", async () => {
  renderOn("/dashboard");
  await letLauncherMount();
  const countBefore = interviewService.refreshSetupMetadata.mock.calls.length;
  expect(countBefore).toBe(1);
  enterCode();
  expect(await screen.findByRole("dialog", { name: /secret office quest/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Original app at /dashboard" })).toBeInTheDocument();
  expect(interviewService.refreshSetupMetadata).toHaveBeenCalledTimes(countBefore);
});

it("unmounts and closes the game when navigating away, without affecting the destination page", async () => {
  renderOn("/dashboard");
  await letLauncherMount();
  enterCode();
  expect(await screen.findByRole("dialog", { name: /secret office quest/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Navigate interview" }));
  expect(gameDialog()).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Original app at /interview/session" })).toBeInTheDocument();
  enterCode();
  expect(gameDialog()).not.toBeInTheDocument();
});

it("does not carry a partially entered secret sequence across navigation", async () => {
  renderOn("/dashboard");
  await letLauncherMount();
  KONAMI_CODE.slice(0, 7).forEach((key) => fireEvent.keyDown(window, { key }));
  fireEvent.click(screen.getByRole("button", { name: "Navigate setup" }));
  fireEvent.click(screen.getByRole("button", { name: "Navigate dashboard" }));
  await letLauncherMount();
  KONAMI_CODE.slice(7).forEach((key) => fireEvent.keyDown(window, { key }));
  expect(gameDialog()).not.toBeInTheDocument();
  enterCode();
  expect(await screen.findByRole("dialog", { name: /secret office quest/i })).toBeInTheDocument();
});

it("keeps the Easter egg inaccessible while authentication loads or when signed out", async () => {
  useAuth.mockReturnValue({ user: { uid: "test-user" }, loading: true });
  const view = renderOn("/dashboard");
  await letLauncherMount();
  enterCode();
  expect(gameDialog()).not.toBeInTheDocument();

  useAuth.mockReturnValue({ user: null, loading: false });
  view.rerender(<MemoryRouter initialEntries={["/dashboard"]}><App /></MemoryRouter>);
  await letLauncherMount();
  enterCode();
  expect(gameDialog()).not.toBeInTheDocument();
});

it("closes an open game when authentication is lost", async () => {
  const view = renderOn("/dashboard");
  await letLauncherMount();
  enterCode();
  expect(await screen.findByRole("dialog", { name: /secret office quest/i })).toBeInTheDocument();
  useAuth.mockReturnValue({ user: null, loading: false });
  view.rerender(<MemoryRouter initialEntries={["/dashboard"]}><App /></MemoryRouter>);
  expect(gameDialog()).not.toBeInTheDocument();
});

it("keeps the original Dashboard visible if the optional game itself crashes", async () => {
  const originalCanvas = HTMLCanvasElement.prototype.getContext;
  const err = jest.spyOn(console, "error").mockImplementation(() => {});
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  HTMLCanvasElement.prototype.getContext = jest.fn(() => { throw new Error("Optional game canvas failure"); });
  try {
    renderOn("/dashboard");
    await letLauncherMount();
    enterCode();
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Original app at /dashboard" })).toBeInTheDocument();
    expect(gameDialog()).not.toBeInTheDocument();
  } finally {
    HTMLCanvasElement.prototype.getContext = originalCanvas;
    err.mockRestore();
    warn.mockRestore();
  }
});
