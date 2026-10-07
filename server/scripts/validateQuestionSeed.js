const fs = require("fs");
const path = require("path");
const { validateRubric } = require("../src/services/evaluationContract");

const ALLOWED_MODES = [
  "Quiz Style",
  "Code Style",
  "Theoretical Style",
];

const seedPath = path.join(__dirname, "..", "seed", "questions.json");
const questions = JSON.parse(fs.readFileSync(seedPath, "utf8"));

function fail(message) {
  throw new Error(message);
}

if (!Array.isArray(questions) || questions.length === 0) {
  fail("Question seed must be a non-empty array.");
}

const seenIds = new Set();
const modeCounts = new Map(ALLOWED_MODES.map((mode) => [mode, 0]));
const modeTagCounts = new Map(
  ALLOWED_MODES.map((mode) => [mode, new Map()])
);
const modeRoleCounts = new Map(
  ALLOWED_MODES.map((mode) => [mode, new Map()])
);
const modeLevelCounts = new Map(
  ALLOWED_MODES.map((mode) => [mode, new Map()])
);

for (const question of questions) {
  if (!question?.id || !question?.mode || !question?.prompt) {
    fail("Every question requires id, mode, and prompt.");
  }

  if (seenIds.has(question.id)) {
    fail(`Duplicate question id: ${question.id}`);
  }
  seenIds.add(question.id);

  if (!ALLOWED_MODES.includes(question.mode)) {
    fail(`Question ${question.id} has invalid mode ${question.mode}.`);
  }

  for (const field of ["tags", "experienceLevels", "jobRoles"]) {
    if (!Array.isArray(question[field]) || question[field].length === 0) {
      fail(`Question ${question.id} requires a non-empty ${field} array.`);
    }
  }

  if (question.mode === "Quiz Style") {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      fail(`Quiz question ${question.id} requires at least two options.`);
    }
    if (!question.correctAnswer || !question.explanation) {
      fail(`Quiz question ${question.id} requires correctAnswer and explanation.`);
    }
    if (!question.options.includes(question.correctAnswer)) {
      fail(`Quiz question ${question.id} has a correctAnswer outside options.`);
    }
    if (new Set(question.options).size !== question.options.length) {
      fail(`Quiz question ${question.id} contains duplicate options.`);
    }
  } else {
    const rubricError = validateRubric(question);
    if (rubricError) {
      fail(`Question ${question.id} has an invalid rubric: ${rubricError}`);
    }
  }

  modeCounts.set(question.mode, modeCounts.get(question.mode) + 1);

  const tagCounts = modeTagCounts.get(question.mode);
  for (const tag of new Set(question.tags)) {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }

  const roleCounts = modeRoleCounts.get(question.mode);
  for (const role of new Set(question.jobRoles)) {
    roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
  }

  const levelCounts = modeLevelCounts.get(question.mode);
  for (const level of new Set(question.experienceLevels)) {
    levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
  }
}

for (const mode of ALLOWED_MODES) {
  const count = modeCounts.get(mode);
  if (count < 500 || count > 1000) {
    fail(`${mode} must contain 500-1000 questions. Found ${count}.`);
  }

  const sparseTags = [...modeTagCounts.get(mode).entries()].filter(
    ([, count]) => count < 10
  );
  if (sparseTags.length > 0) {
    fail(
      `${mode} contains sparse tags (<10 questions): ${sparseTags
        .map(([tag, count]) => `${tag}=${count}`)
        .join(", ")}`
    );
  }
}

console.log(`Validated ${questions.length} questions.`);
for (const mode of ALLOWED_MODES) {
  const tags = modeTagCounts.get(mode);
  const roles = modeRoleCounts.get(mode);
  const levels = modeLevelCounts.get(mode);
  const minTagCount = Math.min(...tags.values());

  console.log(`\n${mode}: ${modeCounts.get(mode)} questions`);
  console.log(`  tags: ${tags.size} unique, minimum coverage ${minTagCount}`);
  console.log(`  roles: ${roles.size} unique`);
  console.log(
    `  experience: ${[...levels.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([level, count]) => `${level}=${count}`)
      .join(", ")}`
  );
}
