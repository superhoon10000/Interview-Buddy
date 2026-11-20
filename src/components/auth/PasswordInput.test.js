import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordInput from "./PasswordInput";

function renderField(props = {}) {
  render(
    <>
      <label htmlFor="pw">Password</label>
      <PasswordInput id="pw" value="secret123" onChange={() => {}} {...props} />
    </>
  );
  return {
    input: screen.getByLabelText("Password"),
    button: screen.getByRole("button"),
  };
}

test("starts hidden", () => {
  const { input, button } = renderField();

  expect(input).toHaveAttribute("type", "password");
  expect(button).toHaveTextContent("Show");
  expect(button).toHaveAttribute("aria-label", "Show password");
  expect(button).toHaveAttribute("aria-pressed", "false");
});

test("can be shown and hidden again any number of times", () => {
  const { input, button } = renderField();

  for (let round = 0; round < 3; round += 1) {
    userEvent.click(button);
    expect(input).toHaveAttribute("type", "text");
    expect(button).toHaveTextContent("Hide");
    expect(button).toHaveAttribute("aria-pressed", "true");

    userEvent.click(button);
    expect(input).toHaveAttribute("type", "password");
    expect(button).toHaveTextContent("Show");
  }
});

test("still works after the field loses focus", () => {
  const { input, button } = renderField();

  userEvent.click(input);
  userEvent.tab(); // move focus away, which hides Edge's built-in icon
  userEvent.click(button);

  expect(input).toHaveAttribute("type", "text");
});

test("does not submit the form when clicked", () => {
  const onSubmit = jest.fn((event) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <PasswordInput aria-label="Password" value="x" onChange={() => {}} />
    </form>
  );

  userEvent.click(screen.getByRole("button", { name: "Show password" }));

  expect(onSubmit).not.toHaveBeenCalled();
});

test("passes input props through and disables the button with the field", () => {
  const { input, button } = renderField({
    autoComplete: "current-password",
    required: true,
    disabled: true,
  });

  expect(input).toHaveAttribute("autocomplete", "current-password");
  expect(input).toBeRequired();
  expect(input).toBeDisabled();
  expect(button).toBeDisabled();
});
