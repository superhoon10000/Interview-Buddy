import { useState } from "react";

// A password field with its own Show/Hide button.
//
// Browsers handle password reveal differently (Microsoft Edge only shows its
// eye icon until the field loses focus, then hides it), so the app provides
// one button that behaves the same everywhere. Edge's built-in button is
// hidden in auth.css so there are never two.
//
// Accepts the same props as a normal <input>, e.g. id, value, onChange,
// placeholder, autoComplete, disabled, required.
export default function PasswordInput({
  className = "ib-input ib-auth-input",
  disabled,
  ...inputProps
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="ib-password-field">
      <input
        {...inputProps}
        className={`${className} ib-password-input`}
        type={visible ? "text" : "password"}
        disabled={disabled}
      />

      <button
        type="button"
        className="ib-password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        disabled={disabled}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
