require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { admin, db } = require("../src/firebaseAdmin");

async function seed() {
  const seedPath = path.join(__dirname, "..", "seed", "questions.json");
  const questions = JSON.parse(fs.readFileSync(seedPath, "utf8"));

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("server/seed/questions.json does not contain any questions.");
  }

  const batch = db.batch();

  for (const question of questions) {
    if (!question.id || !question.mode || !question.prompt) {
      throw new Error(
        "Every seed question must include id, mode, and prompt fields."
      );
    }

    const { id, ...data } = question;
    const reference = db.collection("questions").doc(id);

    batch.set(
      reference,
      {
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
  console.log(`Seeded ${questions.length} questions into Firestore.`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
