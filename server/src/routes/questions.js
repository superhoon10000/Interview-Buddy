const express = require("express");
const {
  buildQuestionSetupOptions,
  parseSelectedTags,
  selectQuestions,
} = require("../services/questionSelection");

const ALLOWED_MODES = new Set([
  "Quiz Style",
  "Code Style",
  "Theoretical Style",
]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function toPublicQuestion(question) {
  return {
    id: question.id,
    mode: question.mode,
    prompt: question.prompt,
    options: Array.isArray(question.options) ? question.options : [],
    difficulty: question.difficulty || "",
    topic: question.topic || "",
    tags: Array.isArray(question.tags) ? question.tags : [],
  };
}

/**
 * Router factory. The application injects a QuestionRepository implementation
 * so this route stays independent of Firestore/Firebase APIs.
 */
function createQuestionRouter({ questionRepository }) {
  if (!questionRepository) {
    throw new Error("createQuestionRouter requires questionRepository.");
  }

  const router = express.Router();

  router.get("/options", async (req, res, next) => {
    try {
      const mode = String(req.query.mode || "").trim();
      if (!ALLOWED_MODES.has(mode)) {
        return res.status(400).json({
          error:
            "A valid mode is required: Quiz Style, Code Style, or Theoretical Style.",
        });
      }

      const questions = await questionRepository.findByMode(mode);

      return res.json(buildQuestionSetupOptions(questions));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const mode = String(req.query.mode || "").trim();
      if (!ALLOWED_MODES.has(mode)) {
        return res.status(400).json({
          error:
            "A valid mode is required: Quiz Style, Code Style, or Theoretical Style.",
        });
      }

      const jobRole = String(req.query.jobRole || "").trim();
      const experienceLevel = String(req.query.experienceLevel || "").trim();
      const tags = parseSelectedTags(req.query.tags);

      if (!jobRole || !experienceLevel || tags.length === 0) {
        return res.status(400).json({
          error:
            "Job role, experience level, and at least one tag are required.",
        });
      }

      const requestedLimit = Number.parseInt(req.query.limit, 10);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 20)
        : 10;

      // Firestore access stays behind the repository. The Application Layer
      // applies the setup/tag matching rules to the stored question metadata.
      const questions = await questionRepository.findByMode(mode);

      const selectedQuestions = selectQuestions(
        questions,
        {
          jobRole,
          experienceLevel,
          tags,
        },
        limit
      ).map(toPublicQuestion);

      return res.json({ questions: selectedQuestions });
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

      const question = await questionRepository.findById(req.params.questionId);

      if (!question) {
        return res.status(404).json({ error: "Question not found." });
      }

      if (question.mode !== "Quiz Style") {
        return res.status(400).json({
          error: "Server-side answer checking is currently only used for Quiz Style.",
        });
      }

      const correctAnswer = normalize(question.correctAnswer);
      if (!correctAnswer) {
        return res.status(500).json({
          error: "This quiz question is missing a correct answer in the data store.",
        });
      }

      const isCorrect = normalize(answer) === correctAnswer;
      const explanation =
        question.explanation ||
        (isCorrect
          ? "Correct."
          : "That answer is not correct. Review the topic and try another question.");

      return res.json({
        questionId: question.id,
        isCorrect,
        explanation,
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createQuestionRouter;
