import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import OfficeQuestLauncher from "./OfficeQuestLauncher";
import { KONAMI_CODE } from "./officeQuestLogic";

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

const enterCode = (target = window) => KONAMI_CODE.forEach((key) => fireEvent.keyDown(target, { key }));
const gameDialog = () => screen.queryByRole("dialog", { name: /secret office quest/i });

it("stays completely invisible until a full correct code, then closes and can reopen", async () => {
  render(<OfficeQuestLauncher />);
  expect(gameDialog()).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(gameDialog()).not.toBeInTheDocument();
  enterCode();
  expect(await screen.findByRole("dialog", { name: /secret office quest/i })).toBeInTheDocument();
  expect(screen.getByText(/0 \/ 5 CLEARED/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /close secret game/i }));
  expect(gameDialog()).not.toBeInTheDocument();
  enterCode();
  expect(await screen.findByRole("dialog", { name: /secret office quest/i })).toBeInTheDocument();
});

it("does not read a code typed into a normal input, textarea, or contenteditable", () => {
  render(
    <>
      <input aria-label="Regular input" />
      <textarea aria-label="Regular textarea" />
      <div contentEditable data-testid="editor" />
      <OfficeQuestLauncher />
    </>
  );
  for (const target of [
    screen.getByRole("textbox", { name: "Regular input" }),
    screen.getByRole("textbox", { name: "Regular textarea" }),
    screen.getByTestId("editor"),
  ]) {
    target.focus();
    enterCode(target);
    expect(gameDialog()).not.toBeInTheDocument();
  }
  expect(gameDialog()).not.toBeInTheDocument();
});

it("does not complete a code with modifiers, held keys, or an interrupted sequence", () => {
  render(<OfficeQuestLauncher />);
  KONAMI_CODE.slice(0, 9).forEach((key) => fireEvent.keyDown(window, { key }));
  fireEvent.keyDown(window, { key: "a", ctrlKey: true });
  fireEvent.keyDown(window, { key: "a" });
  expect(gameDialog()).not.toBeInTheDocument();

  KONAMI_CODE.slice(0, 9).forEach((key) => fireEvent.keyDown(window, { key }));
  fireEvent.keyDown(window, { key: "a", repeat: true });
  fireEvent.keyDown(window, { key: "a" });
  expect(gameDialog()).not.toBeInTheDocument();

  KONAMI_CODE.slice(0, 6).forEach((key) => fireEvent.keyDown(window, { key }));
  fireEvent.keyDown(window, { key: "x" });
  KONAMI_CODE.slice(6).forEach((key) => fireEvent.keyDown(window, { key }));
  expect(gameDialog()).not.toBeInTheDocument();
});

it("does not prevent normal browser keyboard events before unlocking", () => {
  render(<OfficeQuestLauncher />);
  const event = new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true });
  act(() => window.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(false);
  expect(gameDialog()).not.toBeInTheDocument();
});

it("closes on Escape and restores body overflow", async () => {
  document.body.style.overflow = "auto";
  render(<OfficeQuestLauncher />);
  enterCode();
  expect(await screen.findByRole("dialog", { name: /secret office quest/i })).toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(gameDialog()).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe("auto");
  document.body.style.overflow = "";
});

it("does not issue API requests when starting and answering a local interview", async () => {
  const oldFetch = global.fetch;
  const fetchSpy = jest.fn();
  global.fetch = fetchSpy;
  try {
    render(<OfficeQuestLauncher />);
    enterCode();
    expect(await screen.findByRole("dialog", { name: /secret office quest/i })).toBeInTheDocument();
    // Walk a valid route around the central table from (10,9) to (4,3).
    const steps = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" };
    "UUULLUULULLL".split("").forEach((step) => fireEvent.keyDown(window, { key: steps[step] }));
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByRole("heading", { name: /Mina/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start interview/i }));
    expect(screen.getByText(/question 1 of 2/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.getByText(/correct answer/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    global.fetch = oldFetch;
  }
});
