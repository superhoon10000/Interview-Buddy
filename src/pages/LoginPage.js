import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AuthShell from "../components/auth/AuthShell";
import { authService } from "../services/authService.js";
import { PAGES } from "../utils/constants";

import {
  useAuth,
} from "../context/AuthContext";

function LoginPage({
  onLogin,
  onGoToRegister,
  loginMessage,
}) {
  const [email, setEmail] =
    useState("");

  const {
    user: authenticatedUser,
    profileComplete,
    profileError,
    loading: authLoading,
    refreshProfile,
  } = useAuth();

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    googleUsernameSetup,
    setGoogleUsernameSetup,
  ] = useState(false);

  const [
    googleUsername,
    setGoogleUsername,
  ] = useState("");

  const [
    googleAccountEmail,
    setGoogleAccountEmail,
  ] = useState("");

  useEffect(() => {
    if (
      !authLoading &&
      authenticatedUser &&
      !profileComplete &&
      !profileError
    ) {
      setGoogleAccountEmail(
        authenticatedUser.email || ""
      );

      setGoogleUsernameSetup(true);
    }
  }, [
    authLoading,
    authenticatedUser,
    profileComplete,
    profileError,
  ]);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    if (!email.trim() || !password) {
      setError(
        "Please enter both email and password."
      );

      return;
    }

    if (!email.includes("@")) {
      setError(
        "Please enter a valid email"
      );

      return;
    }

    setLoading(true);

    try {
      const result =
        await authService.login({
          email: email.trim(),
          password,
        });

      if (result.authenticated) {
        onLogin();
      }
    } catch (loginError) {
      setError(
        loginError.message ||
          "Login Failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result =
        await authService.loginWithGoogle();

      if (
        result.authenticated &&
        result.needsUsernameSetup
      ) {
        setGoogleAccountEmail(
          result.user?.email || ""
        );

        setGoogleUsernameSetup(true);

        return;
      }

      if (result.authenticated) {
        onLogin();
      }
    } catch (loginError) {
      setError(
        loginError.message ||
          "Google login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleUsernameSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      const normalizedUsername =
        googleUsername.trim();

      setError("");

      if (!normalizedUsername) {
        setError(
          "Please enter a username."
        );

        return;
      }

      setLoading(true);

      try {
        const result =
          await authService.completeGoogleProfile(
            normalizedUsername
          );

        if (result.authenticated) {
          const profile =
            await refreshProfile();

          if (!profile) {
            throw new Error(
              "Your profile was created but could not be verified. Please try again."
            );
          }

          onLogin();
        }
      } catch (profileError) {
        setError(
          profileError.message ||
            "Username setup failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

  const handleGeneratedUsername =
    async () => {
      if (loading) {
        return;
      }

      setError("");
      setLoading(true);

      try {
        const result =
          await authService
            .completeGoogleProfileWithGeneratedUsername();

        if (result.authenticated) {
          const profile =
            await refreshProfile();

          if (!profile) {
            throw new Error(
              "Your profile was created but could not be verified. Please try again."
            );
          }

          onLogin();
        }
      } catch (profileError) {
        setError(
          profileError.message ||
            "Username setup failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

  if (googleUsernameSetup) {
    return (
      <AuthShell
        eyebrow="PROFILE SETUP"
        title="Choose your username"
        subtitle="Choose how you want to appear throughout Interview Buddy."
      >
        {googleAccountEmail && (
          <p className="ib-auth-google-account">
            Signed in with{" "}
            <strong>
              {googleAccountEmail}
            </strong>
          </p>
        )}

        <form
          className="ib-auth-form"
          onSubmit={
            handleGoogleUsernameSubmit
          }
          noValidate
        >
          <div className="ib-auth-field">
            <label
              className="ib-label"
              htmlFor="ib-google-username"
            >
              Username
            </label>

            <input
              id="ib-google-username"
              className="ib-input ib-auth-input"
              type="text"
              placeholder="Choose a username"
              value={googleUsername}
              onChange={(event) =>
                setGoogleUsername(
                  event.target.value
                )
              }
              autoComplete="username"
              disabled={loading}
              autoFocus
              required
            />

            <p className="ib-auth-field-help">
              This username will be used
              across Interview Buddy.
            </p>
          </div>

          {error && (
            <p
              className="ib-auth-message ib-auth-message--error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="ib-button ib-button--primary ib-auth-action"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating profile..."
              : "Create Username"}

            {!loading && (
              <span aria-hidden="true">
                →
              </span>
            )}
          </button>

          <button
            className="ib-button ib-button--secondary ib-auth-action"
            type="button"
            onClick={
              handleGeneratedUsername
            }
            disabled={loading}
          >
            Skip — assign me a username
          </button>
        </form>

        <p className="ib-auth-footnote">
          If you skip this step,
          Interview Buddy will generate a
          unique username for you.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="ACCOUNT ACCESS"
      title="Welcome back"
      subtitle="Sign in to continue practicing and tracking your progress."
    >
      {loginMessage && (
        <p
          className="ib-auth-message ib-auth-message--success"
          role="status"
        >
          {loginMessage}
        </p>
      )}

      <form
        className="ib-auth-form"
        onSubmit={handleLogin}
        noValidate
      >
        <div className="ib-auth-field">
          <label
            className="ib-label"
            htmlFor="ib-login-email"
          >
            Email address
          </label>

          <input
            id="ib-login-email"
            className="ib-input ib-auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            autoComplete="email"
            disabled={loading}
            required
          />
        </div>

        <div className="ib-auth-field">
          <div className="ib-auth-field-heading">
            <label
              className="ib-label"
              htmlFor="ib-login-password"
            >
              Password
            </label>

            <Link
              className="ib-auth-link"
              to={PAGES.FORGOT_PASSWORD}
            >
              Forgot password?
            </Link>
          </div>

          <input
            id="ib-login-password"
            className="ib-input ib-auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            autoComplete="current-password"
            disabled={loading}
            required
          />
        </div>

        {error && (
          <p
            className="ib-auth-message ib-auth-message--error"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          className="ib-button ib-button--primary ib-auth-action"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Logging in..."
            : "Login to Workspace"}

          {!loading && (
            <span aria-hidden="true">
              →
            </span>
          )}
        </button>
      </form>

      <div
        className="ib-auth-separator"
        aria-hidden="true"
      >
        <span>
          or continue with
        </span>
      </div>

      <button
        type="button"
        className="ib-button ib-button--secondary ib-auth-action ib-auth-google-button"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <span
          className="ib-auth-google-symbol"
          aria-hidden="true"
        >
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