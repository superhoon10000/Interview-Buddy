import React from "react";

function LoginPage({ onLogin, onGoToRegister, loginMessage }) {
  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginHeader">
          <img src="/IBlogo.jpg" alt="Interview Buiddy logo" class="LoginLogo" />
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
                   />
          </div>

          <button className="primaryButton" onClick={onLogin}>
            Login to Workspace &rarr;
          </button>

          <div className="divider">
            <span className="dividerText">OR</span>
          </div>

          <div className="socialButtons"> 
            <button className="socialButton" type="button">
            <span style={{ color: 'gold' }}>&#9679;</span> Google
            </button>
            <button className="socialButton" type="button">
              <span>&diams</span> Github
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
