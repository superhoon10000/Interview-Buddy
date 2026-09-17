import React, { useState } from "react";
import { PAGES } from "../../utils/constants";

function Sidebar({ currentPage, onNavigate }) {
  // Local state — controls the UC13 logout confirmation modal.
  // Kept inside Sidebar so every page that already passes onNavigate
  // automatically inherits the new flow with no extra wiring.
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  function handleLogoutClick() {
    setShowLogoutDialog(true);
  }

  function handleConfirmLogout() {
    // Mock equivalent of the spec's "clear session token + cookies".
    // In production this would call the auth service first.
    setShowLogoutDialog(false);
    onNavigate(PAGES.LOGIN);
  }

  function handleCancelLogout() {
    setShowLogoutDialog(false);
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebarTop">
          <div className="profileCircle">DP</div>
        </div>

        <nav className="sidebarNav">
          <button
            className={currentPage === PAGES.DASHBOARD ? "sidebarButton active" : "sidebarButton"}
            onClick={() => onNavigate(PAGES.DASHBOARD)}
          >
            Home
          </button>

          <button
            className={currentPage === PAGES.INTERVIEW ? "sidebarButton active" : "sidebarButton"}
            onClick={() => onNavigate(PAGES.INTERVIEW)}
          >
            Practice
          </button>

          <button
            className={currentPage === PAGES.HISTORY ? "sidebarButton active" : "sidebarButton"}
            onClick={() => onNavigate(PAGES.HISTORY)}
          >
            History
          </button>

          <button
            className={currentPage === PAGES.LEADERBOARD ? "sidebarButton active" : "sidebarButton"}
            onClick={() => onNavigate(PAGES.LEADERBOARD)}
          >
            Ranking
          </button>

          <button
            className={currentPage === PAGES.ANALYTICS ? "sidebarButton active" : "sidebarButton"}
            onClick={() => onNavigate(PAGES.ANALYTICS)}
          >
            Stats
          </button>

          <button
            className={currentPage === PAGES.SETTINGS ? "sidebarButton active" : "sidebarButton"}
            onClick={() => onNavigate(PAGES.SETTINGS)}
          >
            Settings
          </button>
        </nav>

        <div className="sidebarBottom">
          <button className="sidebarLogoutButton" onClick={handleLogoutClick}>
            Logout
          </button>
        </div>
      </aside>

      {showLogoutDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logoutDialogTitle"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCancelLogout}
        >
          <div
            // stopPropagation so clicking inside the card doesn't close it.
            // Easy detail to overlook — without it the modal feels broken.
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "28px 28px 22px",
              width: "min(420px, 92vw)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
              border: "2px solid #d8dee8",
            }}
          >
            <h2
              id="logoutDialogTitle"
              style={{
                fontSize: "1.4rem",
                marginBottom: "10px",
                color: "#16325c",
              }}
            >
              Log out of Interview Buddy?
            </h2>
            <p
              style={{
                color: "#5b6470",
                lineHeight: 1.5,
                marginBottom: "20px",
              }}
            >
              Are you sure you want to log out? You will need to sign back in
              to continue practicing.
            </p>

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
                onClick={handleCancelLogout}
              >
                Cancel
              </button>
              <button
                className="primaryButton"
                style={{ padding: "8px 16px" }}
                onClick={handleConfirmLogout}
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
