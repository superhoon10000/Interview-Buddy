import React, { useState } from "react";
import { authService } from  "../services/authService";

function RegisterPage({ onRegister, onGoToLogin }) {
const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const handleRegister = async () => {
  setError("");
  setLoading(true);

  try {
    const result = await authService.register({
      username,
      email,
      password,
    });

    if (result.created) {
      console.log("Registration successful:", result);
      onRegister();
    }
  } catch (error) {
    console.error("Registration failed:", error);

    if (error.code === "auth/email-already-in-use") {
      setError("An account with this email already exists.");
    } else if (error.code === "auth/weak-password") {
      setError("Please choose a stronger password.");
    } else {
      setError("Registration failed. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="loginPage">
      <div className="loginCard">
        <h1 className="loginTitle">Create Account</h1>
        <p className="loginSubtitle">
          Make a hardcoded prototype account for Interview Buddy.
        </p>

        <div className="loginForm">
          <input 
          className="textInput"
          type="text"
          value={username}
          onChange={(e)=> setUsername(e.target.value)}
          placeholder="Username"
           />

          <input 
          className="textInput"
          type="text"
          value={email}
          onChange={(e)=> setEmail(e.target.value)}
          placeholder="Email"
           />

          <input 
          className="textInput"
          type="password"
          value={password}
          onChange={(e)=> setPassword(e.target.value)}
          placeholder="Password"
           />

          <input
            className="textInput"
            type="password"
            placeholder="Confirm Password"
          />

          <button className="primaryButton"
          type="button"
          onClick={handleRegister}
          disabled={loading}
          >
          {loading ? "Creating account.." : "Create Account"}
          </button>
          {error && (
            <p role="alert" style={{ color: "red" }}>
              { error}
            </p>
          )};

          <button className="textButton" onClick={onGoToLogin}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
