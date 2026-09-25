import React, { useState } from "react"; 
import { authService } from "..\services\authService.js";

function LoginPage({ onLogin, onGoToRegister, loginMessage }) {
  const [email, setEmail] = useState("");
  const [password,setPassword] = useState("");
  const handleLogin = async () => {
    try {
      const result = await authService.login({
        email,
        password,
      });

      console.log("Login successful:", result);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // 4. Render the UI
  return (
    <div className="loginPage">
      {/* Your existing UI goes here */}
    </div>
  );
}



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
          <label className="inputLabel">Email or Username</label>
              <input
                className="textInput"
                type="text"
                placeholder="Username or Email"
                value={email}
                onChange={(e)=> setEmail.(e.target.value)}
              />
          </div>


          <div className="inputGroup">
            <div className="labelRow"> 
               <label className="inputLabel">Password</label>
               <a href="#" className="forgotPasswordLink">Forgot Password</a>
            </div>
                 <input
                   className="textInput"
                   type="password"
                   placeholder="Password"
                   value={password}
                   onChange={(e)=> setPassword(e.target.value)}
                   />
          </div>

          <button className="primaryButton" onClick={handleLogin}>
            Login to Workspace &rarr;
          </button>

          <div className="divider">
            <span className="dividerText">OR</span>
          </div>

          <div className="socialButton"> 
            <button className="socialButton" type="button">
            <span style={{ color: 'gold' }}>&#9679;</span> Google
            </button>
            <button className="socialButton" type="button">
              <span>&diams; </span> Github
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
