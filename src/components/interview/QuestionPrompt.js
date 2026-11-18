import React from "react";

// Show structured question contracts as readable paragraphs without altering
// the original prompt submitted to the server or saved in session history.
const FIELD_LABELS =
  "Task|Input|Output|Examples?|Constraints?|Verification focus|Edge cases|Notes?";

export function splitQuestionPrompt(prompt) {
  const text = String(prompt ?? "").trim();
  if (!text) return [];

  // Older Code Style seed records contain the whole contract on one line.
  // Insert a visual break before the next explicit field label.
  const fields = new RegExp(`([ \\t]+)(?=(${FIELD_LABELS}):\\s)`, "g");
  const separated = text.replace(fields, "\n");
  const paragraphs = separated.split(/\n\s*\n|\n(?=(?:Task|Input|Output|Examples?|Constraints?|Verification focus|Edge cases|Notes?):\s)/g);
  const labelPattern = new RegExp(`^(${FIELD_LABELS}):\\s*`, "i");

  return paragraphs
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(labelPattern);
      return match
        ? { label: `${match[1]}:`, text: part.slice(match[0].length) }
        : { label: "", text: part };
    });
}

export default function QuestionPrompt({ prompt, className = "" }) {
  return (
    <div className={`ibQuestionPrompt ${className}`.trim()}>
      {splitQuestionPrompt(prompt).map(({ label, text }, index) => (
        <p className="ibQuestionPromptSection" key={index}>
          {label && <strong className="ibQuestionPromptLabel">{label} </strong>}
          {text}
        </p>
      ))}
    </div>
  );
}
