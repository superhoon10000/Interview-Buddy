import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PeekingCapybara from "./PeekingCapybara";

let play;
let pause;

beforeEach(() => {
  play = jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  pause = jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  jest.spyOn(HTMLMediaElement.prototype, "paused", "get").mockReturnValue(false);
});

afterEach(() => jest.restoreAllMocks());

function revealAndPlay() {
  fireEvent(window, new MouseEvent("pointermove", { clientX: window.innerWidth, clientY: 0 }));
  fireEvent.click(screen.getByRole("button", { name: "Headphone-wearing capybara" }));
}

test("plays the song on click and displays the GIF only while audio is playing", async () => {
  const { unmount } = render(<PeekingCapybara />);
  const audio = screen.getByLabelText("Interview Buddy music");
  expect(screen.queryByRole("button", { name: "Headphone-wearing capybara" })).toBeNull();
  revealAndPlay();
  expect(play).toHaveBeenCalledTimes(1);
  expect(audio.getAttribute("src")).toContain("Interview Buddy.mp3");
  expect(screen.queryByAltText("Capybara dancing to Interview Buddy")).toBeNull();
  fireEvent.playing(audio);
  expect(screen.getByAltText("Capybara dancing to Interview Buddy").getAttribute("src")).toContain("Finger-Sway Animation.gif");
  fireEvent.ended(audio);
  expect(screen.queryByAltText("Capybara dancing to Interview Buddy")).toBeNull();
  unmount();
  expect(pause).toHaveBeenCalled();
});

test("Stop music and Escape dismiss the animation and pause playback", () => {
  render(<PeekingCapybara />);
  const audio = screen.getByLabelText("Interview Buddy music");
  fireEvent.playing(audio);
  fireEvent.click(screen.getByRole("button", { name: "Stop music" }));
  expect(pause).toHaveBeenCalledTimes(1);
  expect(screen.queryByAltText("Capybara dancing to Interview Buddy")).toBeNull();
  fireEvent.playing(audio);
  fireEvent.keyDown(window, { key: "Escape" });
  expect(pause).toHaveBeenCalledTimes(2);
  expect(screen.queryByAltText("Capybara dancing to Interview Buddy")).toBeNull();
});

test("failed playback leaves the GIF hidden and displays a retry message", async () => {
  play.mockRejectedValueOnce(new Error("Playback failed"));
  render(<PeekingCapybara />);
  revealAndPlay();
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to play"));
  expect(screen.queryByAltText("Capybara dancing to Interview Buddy")).toBeNull();
});
