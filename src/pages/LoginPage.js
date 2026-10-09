
import React, { useState } from "react";
import { Link } from "react-router-dom";

import AuthShell from "../components/auth/AuthShell";
import { authService } from "../services/authService.js";
import { PAGES } from "../utils/constants";

function LoginPage({ onLogin, onGoToRegister, loginMessage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login({
        email: email.trim(),
        password,
      });

      if (result.authenticated) {
        onLogin();
      }
    } catch (loginError) {
      setError(loginError.message || "Login Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const result = await authService.loginWithGoogle();

      if (result.authenticated) {
        onLogin();
      }
    } catch (loginError) {
      setError(loginError.message || "Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="ACCOUNT ACCESS"
      title="Welcome back"
      subtitle="Sign in to continue practicing and tracking your progress."
    >
      {loginMessage && (
        <p className="ib-auth-message ib-auth-message--success" role="status">
          {loginMessage}
        </p>
      )}

      <form className="ib-auth-form" onSubmit={handleLogin} noValidate>
        <div className="ib-auth-field">
          <label className="ib-label" htmlFor="ib-login-email">
            Email address
          </label>

          <input
            id="ib-login-email"
            className="ib-input ib-auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={loading}
            required
          />
        </div>

        <div className="ib-auth-field">
          <div className="ib-auth-field-heading">
            <label className="ib-label" htmlFor="ib-login-password">
              Password
            </label>

            <Link className="ib-auth-link" to={PAGES.FORGOT_PASSWORD}>
              Forgot password?
            </Link>
          </div>

          <input
            id="ib-login-password"
            className="ib-input ib-auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={loading}
            required
          />
        </div>

        {error && (
          <p className="ib-auth-message ib-auth-message--error" role="alert">
            {error}
          </p>
        )}

        <button
          className="ib-button ib-button--primary ib-auth-action"
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login to Workspace"}
          {!loading && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <div className="ib-auth-separator" aria-hidden="true">
        <span>or continue with</span>
      </div>

      <button
        type="button"
        className="ib-button ib-button--secondary ib-auth-action ib-auth-google-button"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <span className="ib-auth-google-symbol" aria-hidden="true">
          G
        </span>
        Continue with Google
      </button>

      <p className="ib-auth-switch">
        New to Interview Buddy?{" "}
        <button
          type="button"
          className="ib-auth-switch-button"
          onClick={onGoToRegister}
          disabled={loading}
        >
          Create Account
        </button>
      </p>
    </AuthShell>
  );
}

export default LoginPage;
