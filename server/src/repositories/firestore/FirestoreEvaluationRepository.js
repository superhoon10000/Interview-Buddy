const EvaluationRepository = require("../contracts/EvaluationRepository");

/**
 * Firestore implementation for storing answer evaluations.
 *
 * Firestore document layout and server timestamps stay isolated here so the
 * route/application layer remains database-independent.
 */
class FirestoreEvaluationRepository extends EvaluationRepository {
  constructor({ db, admin }) {
    super();

    if (!db) {
      throw new Error(
        "FirestoreEvaluationRepository requires a Firestore db instance."
      );
    }

    this.db = db;
    this.admin = admin;
  }

  getTimestamp(fallbackValue) {
    return this.admin?.firestore?.FieldValue?.serverTimestamp
      ? this.admin.firestore.FieldValue.serverTimestamp()
      : fallbackValue || new Date().toISOString();
  }

  async saveEvaluation({
    sessionId,
    questionId,
    questionPrompt,
    mode,
    candidateResponse,
    evaluation,
    metadata = {},
    evaluatedAt,
  }) {
    if (!sessionId || !questionId) {
      throw new Error(
        "sessionId and questionId are required to save an evaluation."
      );
    }

    const sessionReference = this.db.collection("sessions").doc(sessionId);
    const timestamp = this.getTimestamp(evaluatedAt);

    await sessionReference.set(
      {
        mode: mode || null,
        jobRole: metadata.jobRole || null,
        experienceLevel: metadata.experienceLevel || null,
        status: "active",
        updatedAt: timestamp,
      },
      { merge: true }
    );

    await sessionReference
      .collection("responses")
      .doc(questionId)
      .set(
        {
          questionId,
          questionPrompt: questionPrompt || null,
          mode: mode || null,
          candidateResponse,
          evaluation,
          evaluatedAt: timestamp,
        },
        { merge: true }
      );
  }
}

module.exports = FirestoreEvaluationRepository;
