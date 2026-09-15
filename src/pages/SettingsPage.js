import React, { useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import mockSettings from "../data/mockSettings";
import { useTheme } from "../context/ThemeContext";
import { PAGES } from "../utils/constants";

// UC15 — for the prototype we treat this as the "real" password.
// In production it would be validated against the auth service.
const MOCK_VALID_PASSWORD = "password123";
const MAX_PASSWORD_ATTEMPTS = 3;

function SettingsPage({ currentPage, onNavigate, onAccountDeleted }) {
  // Theme is sourced from the app-wide ThemeContext so changing it
  // actually flips the palette. Everything else stays in local state.
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({ ...mockSettings, theme });
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  // Keep the displayed value in sync with the live theme.
  if (settings.theme !== theme) {
    setSettings((s) => ({ ...s, theme }));
  }

  // UC15 dialog state — kept local so it resets every time the user
  // closes the modal. `step` is what makes this a multi-step flow.
  // 0 = closed, 1 = warning + acknowledgment, 2 = password entry
  const [deleteStep, setDeleteStep] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [passwordAttempts, setPasswordAttempts] = useState(0);

  function startEdit(field) {
    setEditingField(field);
    setTempValue(settings[field]);
    setSaveStatus("");
  }

  function cancelEdit() {
    setEditingField(null);
    setTempValue("");
  }

  function saveEdit(field) {
    if (!tempValue.trim()) return;
    const newValue = tempValue.trim();
    setSettings({ ...settings, [field]: newValue });
    // Theme is special — push it into the context so the rest of the
    // app re-renders against the new palette.
    if (field === "theme") {
      setTheme(newValue);
    }
    setEditingField(null);
    setSaveStatus(`"${field}" updated successfully.`);
  }

  // ----- UC15 handlers -------------------------------------------------

  function openDeleteDialog() {
    // Reset every piece of dialog state so a previous abandoned attempt
    // never leaks into a new one. Easy to forget.
    setDeleteStep(1);
    setAcknowledged(false);
    setConfirmPassword("");
    setDeleteError("");
    setPasswordAttempts(0);
  }

  function closeDeleteDialog() {
    setDeleteStep(0);
    setDeleteError("");
  }

  function handleAcknowledgmentNext() {
    // Extension #4a — block the user if they didn't tick the checkbox.
    if (!acknowledged) {
      setDeleteError("You must agree to the acknowledgment to proceed.");
      return;
    }
    setDeleteError("");
    setDeleteStep(2);
  }

  function handleConfirmDelete() {
    // Extension #6a — empty password.
    if (!confirmPassword.trim()) {
      setDeleteError("Please enter your password to confirm account deletion.");
      return;
    }

    // Step 7 — validate the password.
    if (confirmPassword !== MOCK_VALID_PASSWORD) {
      const nextAttempts = passwordAttempts + 1;
      setPasswordAttempts(nextAttempts);

      // Extension #6b — three failed attempts cancels the deletion.
      if (nextAttempts >= MAX_PASSWORD_ATTEMPTS) {
        closeDeleteDialog();
        setSaveStatus(
          "Too many failed attempts. Account deletion has been cancelled."
        );
        return;
      }

      const remaining = MAX_PASSWORD_ATTEMPTS - nextAttempts;
      setDeleteError(
        `Incorrect password. ${remaining} attempt${
          remaining === 1 ? "" : "s"
        } remaining.`
      );
      setConfirmPassword("");
      return;
    }

    // Steps 8-10 (happy path). For the prototype we just bubble up
    // to App.js, which clears state and routes back to login with a
    // success banner.
    closeDeleteDialog();
    if (onAccountDeleted) {
      onAccountDeleted();
    } else {
      onNavigate(PAGES.LOGIN);
    }
  }

  const fields = [
    {
      key: "username",
      label: "Username",
      description: "Your public display name for the platform.",
    },
    {
      key: "email",
      label: "Email",
      description: "Primary email connected to the account.",
    },
    {
      key: "theme",
      label: "Theme",
      description: "Current display preference for the prototype.",
      options: ["Light", "Dark"],
    },
    {
      key: "notifications",
      label: "Notifications",
      description: "Whether you receive session reminder notifications.",
      options: ["Enabled", "Disabled"],
    },
  ];

  return (
    <PageLayout
      title="Settings"
      subtitle="Manage your account settings and preferences."
      currentPage={currentPage}
      onNavigate={onNavigate}
    >
      {saveStatus && (
        <p
          style={{
            backgroundColor: "#e6f4ea",
            color: "#2e7d32",
            padding: "8px 14px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          ✓ {saveStatus}
        </p>
      )}

      <div className="settingsPanel">
        {fields.map(({ key, label, description, options }) => (
          <div className="settingsRowCard" key={key}>
            <div className="settingsRowLeft">
              <h3>{label}</h3>
              <p>{description}</p>
            </div>

            {editingField === key ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {options ? (
                  <select
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    autoFocus
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      fontSize: "14px",
                      minWidth: "140px",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                <input
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(key);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  autoFocus
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    fontSize: "14px",
                    minWidth: "140px",
                  }}
                />
                )}
                <button
                  className="primaryButton"
                  style={{ padding: "6px 12px", fontSize: "13px" }}
                  onClick={() => saveEdit(key)}
                >
                  Save
                </button>
                <button
                  className="secondaryButton"
                  style={{ padding: "6px 12px", fontSize: "13px" }}
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div className="settingsValue">{settings[key]}</div>
                <button
                  className="secondaryButton"
                  style={{ padding: "4px 10px", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}
                  onClick={() => startEdit(key)}
                  title="Edit"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="largePanel" style={{ marginTop: "24px" }}>
        <h2 className="panelTitle">Password</h2>
        <p>
          Password changes require current password verification. This feature
          will be fully implemented in CPSC 491.
        </p>
        <button
          className="primaryButton"
          style={{ marginTop: "10px" }}
          onClick={() => onNavigate(PAGES.CHANGE_PASSWORD)}
        >
          Change Password
        </button>
      </div>

      {/* UC15 — Account Management */}
      <div
        className="largePanel"
        style={{
          marginTop: "24px",
          borderColor: "#f2c9c9",
          background: "#fff7f7",
          // Explicit dark text colors so the panel reads correctly in both
          // light and dark themes (the pink background stays light in both).
          color: "#5b6470",
        }}
      >
        <h2 className="panelTitle" style={{ color: "#9f1c1c" }}>
          Account Management
        </h2>
        <p style={{ color: "#5b6470" }}>
          Permanently delete your Interview Buddy account and all associated
          data. This action cannot be undone.
        </p>
        <button
          className="primaryButton"
          style={{
            marginTop: "10px",
            background: "#9f1c1c",
          }}
          onClick={openDeleteDialog}
        >
          Delete Account
        </button>
      </div>

      {/* UC15 modal — shared overlay, two interior screens */}
      {deleteStep > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deleteAccountTitle"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeDeleteDialog}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "28px",
              width: "min(460px, 92vw)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              border: "2px solid #f2c9c9",
            }}
          >
            {deleteStep === 1 && (
              <>
                <h2
                  id="deleteAccountTitle"
                  style={{
                    fontSize: "1.4rem",
                    marginBottom: "10px",
                    color: "#9f1c1c",
                  }}
                >
                  Delete your account?
                </h2>
                <p
                  style={{
                    color: "#5b6470",
                    lineHeight: 1.5,
                    marginBottom: "16px",
                  }}
                >
                  This action is <strong>permanent</strong> and cannot be
                  undone. All of your sessions, scores, and personal data will
                  be removed from Interview Buddy.
                </p>

                <label
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                    cursor: "pointer",
                    marginBottom: "20px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => {
                      setAcknowledged(e.target.checked);
                      if (e.target.checked) setDeleteError("");
                    }}
                    style={{ marginTop: "4px" }}
                  />
                  <span style={{ color: "#1f2937", lineHeight: 1.5 }}>
                    I acknowledge this is a permanent action.
                  </span>
                </label>

                {deleteError && (
                  <p
                    style={{
                      color: "#9f1c1c",
                      backgroundColor: "#fff1f1",
                      border: "1px solid #f2c9c9",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      marginBottom: "14px",
                      fontSize: "14px",
                    }}
                  >
                    {deleteError}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="secondaryButton"
                    style={{ padding: "8px 16px" }}
                    onClick={closeDeleteDialog}
                  >
                    Cancel
                  </button>
                  <button
                    className="primaryButton"
                    style={{ padding: "8px 16px" }}
                    onClick={handleAcknowledgmentNext}
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {deleteStep === 2 && (
              <>
                <h2
                  id="deleteAccountTitle"
                  style={{
                    fontSize: "1.4rem",
                    marginBottom: "10px",
                    color: "#9f1c1c",
                  }}
                >
                  Confirm with your password
                </h2>
                <p
                  style={{
                    color: "#5b6470",
                    lineHeight: 1.5,
                    marginBottom: "16px",
                  }}
                >
                  For your security, enter your password to confirm permanent
                  deletion of your account.
                  <br />
                  <em style={{ fontSize: "0.85rem" }}>
                    (Prototype hint: use{" "}
                    <code>{MOCK_VALID_PASSWORD}</code>)
                  </em>
                </p>

                <input
                  className="textInput"
                  type="password"
                  placeholder="Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (deleteError) setDeleteError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmDelete();
                  }}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: deleteError
                      ? "2px solid #9f1c1c"
                      : "1px solid #ccc",
                    fontSize: "14px",
                    marginBottom: "12px",
                  }}
                />

                {deleteError && (
                  <p
                    style={{
                      color: "#9f1c1c",
                      backgroundColor: "#fff1f1",
                      border: "1px solid #f2c9c9",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      marginBottom: "14px",
                      fontSize: "14px",
                    }}
                  >
                    {deleteError}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="secondaryButton"
                    style={{ padding: "8px 16px" }}
                    onClick={closeDeleteDialog}
                  >
                    Cancel
                  </button>
                  <button
                    className="primaryButton"
                    style={{ padding: "8px 16px", background: "#9f1c1c" }}
                    onClick={handleConfirmDelete}
                  >
                    Confirm Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default SettingsPage;
