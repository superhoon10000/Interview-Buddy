import React from "react";
import { render, screen } from "@testing-library/react";
import QuestionPrompt, { splitQuestionPrompt } from "./QuestionPrompt";

test("turns inline Code Style labels into separate readable sections", () => {
  const parts = splitQuestionPrompt(
    "Task: Implement solve(). Input: integers. Output: boolean. Examples: 1 => true. Verification focus: handle empty values."
  );
  expect(parts.map((part) => part.label)).toEqual([
    "Task:", "Input:", "Output:", "Examples:", "Verification focus:",
  ]);
  expect(parts[2].text).toBe("boolean.");
});

test("preserves line breaks and does not change unstructured quiz text", () => {
  expect(splitQuestionPrompt("Which operation is correct?")).toEqual([
    { label: "", text: "Which operation is correct?" },
  ]);
  expect(splitQuestionPrompt("Task: Return values.\n\nKeep the order.\nSecond line.")).toEqual([
    { label: "Task:", text: "Return values." },
    { label: "", text: "Keep the order.\nSecond line." },
  ]);
});

test("renders question text and section headings with no answer content", () => {
  render(<QuestionPrompt prompt="Task: Find the item. Input: an array." />);
  expect(screen.getByText(/Find the item/)).toBeInTheDocument();
  expect(screen.getByText(/an array/)).toBeInTheDocument();
  expect(screen.getByText("Task:")).toBeInTheDocument();
});
