const express = require("express");
const cors = require("cors");
const questionRoutes = require("./routes/questions");
const evaluateRoutes = require("./routes/evaluate");


const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "interview-buddy-api" });
});

// TODO (authentication sprint): add Firebase Auth token verification middleware
// here before protected API routes. Keeping the route boundary now means the
// React pages will not need to change when authentication is added.
app.use("/api/questions", questionRoutes);
app.use("/api/evaluate", evaluateRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: "The Interview Buddy server could not complete the request.",
  });
});

module.exports = app;