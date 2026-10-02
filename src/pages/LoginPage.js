import React, { useState } from "react"; 
import { authService } from "../services/authService.js";
import { Link } from "react-router-dom";
import { PAGES } from "../utils/constants";

function LoginPage({ onLogin, onGoToRegister, loginMessage }) {
  const [email, setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if(!email.trim() || !password) {
      setError("Please enter both email and password.")
      return;
    }

    if (!email.includes("@")) {
       setError("Please enter a valid email");
      return;
    }
    setLoading(true);

    try {
      const result = await authService.login({
        email,
        password,
      });

      if (result.authenticated){
        console.log("Login Successful:", result);
        onLogin();
      }

    } catch (error) {
      console.error("Login failed:", error);
      setError(error.message || "Login Failed. Please try again.")
    }finally{
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await authService.loginWithGoogle();
      if(result.authenticated) {
        console.log("Google login successful:", result);
         onLogin();
      }
    } catch (error){
      console.error("Google login failed:", error);
      setError(error.message || "Google login failed. Please try again.");
    }finally{
      setLoading(false);
    }
  };

  // 4. Render the UI
  
  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginHeader">
          <img src="/IBlogo.jpg" alt="Interview Buiddy logo" className="loginLogo" />
          <h1 className="loginTitle">Interview Buddy</h1>
          <p className="loginSubtitle">
            Technical Interview Excellence
          </p>
        </div>

        {/* UC15 — confirmation banner shown after account deletion. */}
        {loginMessage && (
          <p
            style={{
              backgroundColor: "#e6f4ea",
              color: "#2e7d32",
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            ✓ {loginMessage}
          </p>
        )}

          

        <div className="loginForm">
          <div className="inputGroup">  
          <label className="inputLabel">Email</label>
              <input
                className="textInput"
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e)=> setEmail(e.target.value)}
              />
          </div>

                  
          <div className="inputGroup">
            <div className="labelRow"> 
               <label className="inputLabel">Password</label>
               <Link to={PAGES.FORGOT_PASSWORD} className="forgotPasswordLink">Forgot Password</Link>
            </div>
                 <input
                   className="textInput"
                   type="password"
                   placeholder="Password"
                   value={password}
                   onChange={(e)=> setPassword(e.target.value)}
                   />
          </div>

          {error && (
            <p role="alert" style={{ color: "red" }}>
              {error}
              </p>
          )}

          <button
           className="primaryButton"
           type="button"
           onClick={handleLogin}
           disabled={loading}>
           {loading ? "Logging in...": <>Login to Workspace &rarr;</>}
           </button>

          <div className="divider">
            <span className="dividerText">OR</span>
          </div>
          
          <div className="socialButton"> 
            <button className="socialButton" 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            >

            <span style={{ color: 'gold' }}>&#9679;</span> Google
            </button>
          </div>

          <button className="textButton" onClick={onGoToRegister}>
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
