require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { questionRepository } = require("../src/repositories");

async function seed() {
  const seedPath = path.join(__dirname, "..", "seed", "questions.json");
  const questions = JSON.parse(fs.readFileSync(seedPath, "utf8"));

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("server/seed/questions.json does not contain any questions.");
  }

  for (const question of questions) {
    if (!question.id || !question.mode || !question.prompt) {
      throw new Error(
        "Every seed question must include id, mode, and prompt fields."
      );
    }
  }

  const count = await questionRepository.upsertMany(questions);
  console.log(`Seeded ${count} questions through QuestionRepository.`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
