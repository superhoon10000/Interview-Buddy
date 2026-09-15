const express = require("express");
const { db } = require("../firebaseAdmin");

const router = express.Router();

const ALLOWED_MODES = new Set([
  "Quiz Style",
  "Code Style",
  "Theoretical Style",
]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function tokenize(value) {
  return normalize(value)
    .split(/[^a-z0-9+#.]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function relevanceScore(question, setup) {
  let score = Number(question.priority || 0);

  const experienceLevel = normalize(setup.experienceLevel);
  const allowedExperienceLevels = (question.experienceLevels || []).map(normalize);
  if (
    experienceLevel &&
    (allowedExperienceLevels.length === 0 ||
      allowedExperienceLevels.includes(experienceLevel))
  ) {
    score += 4;
  }

  const jobRole = normalize(setup.jobRole);
  const jobRoles = (question.jobRoles || []).map(normalize);
  if (
    jobRole &&
    jobRoles.some((role) => jobRole.includes(role) || role.includes(jobRole))
  ) {
    score += 3;
  }

  const goalTokens = new Set(tokenize(setup.practiceGoals));
  const questionTokens = new Set([
    ...(question.tags || []).flatMap(tokenize),
    ...tokenize(question.topic),
    ...tokenize(question.prompt),
  ]);

  for (const token of goalTokens) {
    if (questionTokens.has(token)) {
      score += 1;
    }
  }

  return score;
}

function toPublicQuestion(document) {
  const question = document.data();

  return {
    id: document.id,
    mode: question.mode,
    prompt: question.prompt,
    options: Array.isArray(question.options) ? question.options : [],
    difficulty: question.difficulty || "",
    topic: question.topic || "",
    tags: Array.isArray(question.tags) ? question.tags : [],
  };
}

router.get("/", async (req, res, next) => {
  try {
    const mode = String(req.query.mode || "").trim();
    if (!ALLOWED_MODES.has(mode)) {
      return res.status(400).json({
        error:
          "A valid mode is required: Quiz Style, Code Style, or Theoretical Style.",
      });
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 20)
      : 10;

    // Query by mode in Firestore, then do lightweight relevance ranking in the
    // application layer using the user's setup data. This avoids requiring a
    // separate Firestore composite index for every future matching field.
    const snapshot = await db
      .collection("questions")
      .where("mode", "==", mode)
      .limit(100)
      .get();

    const setup = {
      jobRole: req.query.jobRole,
      experienceLevel: req.query.experienceLevel,
      practiceGoals: req.query.practiceGoals,
    };

    const ranked = snapshot.docs
      .filter((document) => document.data().active !== false)
      .map((document) => ({
        document,
        score: relevanceScore(document.data(), setup),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ document }) => toPublicQuestion(document));

    return res.json({ questions: ranked });
  } catch (error) {
    return next(error);
  }
});

router.post("/:questionId/check", async (req, res, next) => {
  try {
    const answer = String(req.body?.answer || "").trim();
    if (!answer) {
      return res.status(400).json({ error: "An answer is required." });
    }

    const document = await db
      .collection("questions")
      .doc(req.params.questionId)
      .get();

    if (!document.exists) {
      return res.status(404).json({ error: "Question not found." });
    }

    const question = document.data();
    if (question.mode !== "Quiz Style") {
      return res.status(400).json({
        error: "Server-side answer checking is currently only used for Quiz Style.",
      });
    }

    const correctAnswer = normalize(question.correctAnswer);
    if (!correctAnswer) {
      return res.status(500).json({
        error: "This quiz question is missing a correct answer in Firebase.",
      });
    }

    const isCorrect = normalize(answer) === correctAnswer;
    const explanation =
      question.explanation ||
      (isCorrect
        ? "Correct."
        : "That answer is not correct. Review the topic and try another question.");

    return res.json({
      questionId: document.id,
      isCorrect,
      explanation,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
