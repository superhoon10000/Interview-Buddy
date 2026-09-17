import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import "./styles/layout.css";
import "./styles/pages.css";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);