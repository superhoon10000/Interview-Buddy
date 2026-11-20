import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  fireEvent(window, new MouseEvent("pointermove", { clientX: window.innerWidth, clientY: window.innerHeight }));
  fireEvent.click(screen.getByRole("button", { name: "Headphone-wearing capybara" }));
}

test("reveals only inside the bottom-right 96px corner", () => {
  render(<PeekingCapybara />);
  const move = (x, y) => fireEvent(window, new MouseEvent("pointermove", { clientX: x, clientY: y }));
  const buttonName = { name: "Headphone-wearing capybara" };
  move(window.innerWidth - 5, 5);
  expect(screen.queryByRole("button", buttonName)).toBeNull();
  move(window.innerWidth - 5, window.innerHeight / 2);
  expect(screen.queryByRole("button", buttonName)).toBeNull();
  move(window.innerWidth - 5, window.innerHeight - 5);
  expect(screen.getByRole("button", buttonName)).toBeEnabled();
  move(window.innerWidth - 97, window.innerHeight - 5);
  expect(screen.queryByRole("button", buttonName)).toBeNull();
  move(window.innerWidth - 5, window.innerHeight - 97);
  expect(screen.queryByRole("button", buttonName)).toBeNull();
});

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

test("lyric lines follow the audio clock, seeking, stopping and replay", () => {
  render(<PeekingCapybara />);
  const audio = screen.getByLabelText("Interview Buddy music");
  expect(screen.queryByLabelText("Song lyrics")).toBeNull();
  fireEvent.playing(audio);
  expect(screen.getByText("Interview Buddy, here we go!")).toBeInTheDocument();

  [
    [2.54, "Interview Buddy, here we go!"],
    [2.55, "Master the interview, steal the show."],
    [3, "Master the interview, steal the show."],
    [5.79, "Master the interview, steal the show."],
    [5.8, "Boost your confidence, play it cool."],
    [6, "Boost your confidence, play it cool."],
    [8.34, "Boost your confidence, play it cool."],
    [8.35, "Interview Buddy, capybaras rule!"],
    [9, "Interview Buddy, capybaras rule!"],
    [1, "Interview Buddy, here we go!"],
  ].forEach(([time, line]) => {
    audio.currentTime = time;
    fireEvent.timeUpdate(audio);
    expect(screen.getByLabelText("Song lyrics")).toHaveTextContent(line);
    expect(screen.getByText(line)).toBeInTheDocument();
    expect(screen.getByText(line)).toHaveStyle({ animationPlayState: "paused" });
  });

  fireEvent.click(screen.getByRole("button", { name: "Stop music" }));
  expect(screen.queryByLabelText("Song lyrics")).toBeNull();
  revealAndPlay();
  fireEvent.playing(audio);
  expect(audio.currentTime).toBe(0);
  expect(screen.getByText("Interview Buddy, here we go!")).toBeInTheDocument();
});

test("animation uses only media time and follows frames without waiting for timeupdate", () => {
  let nextFrame;
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    nextFrame = callback;
    return 123;
  });
  const cancelFrame = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  render(<PeekingCapybara />);
  const audio = screen.getByLabelText("Interview Buddy music");
  fireEvent.playing(audio);

  audio.currentTime = 5;
  act(() => nextFrame());
  const caption = screen.getByText("Master the interview, steal the show.");
  expect(caption).toHaveStyle({ animationPlayState: "paused", animationDelay: "-2.452s" });
  // A stalled media clock must leave the caption at the same animation position.
  act(() => nextFrame());
  expect(caption).toHaveStyle({ animationDelay: "-2.452s" });
  audio.currentTime = 5.8;
  act(() => nextFrame());
  expect(screen.getByText("Boost your confidence, play it cool.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Stop music" }));
  expect(cancelFrame).toHaveBeenCalledWith(123);
});
