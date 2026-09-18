const EvaluationRepository = require("../contracts/EvaluationRepository");

/**
 * Firestore implementation for storing answer evaluations.
 *
 * The nested sessions/{sessionId}/responses/{questionId} structure is a
 * Firestore concern and is intentionally hidden from the route layer.
 */
class FirestoreEvaluationRepository extends EvaluationRepository {
  constructor({ db }) {
    super();

    if (!db) {
      throw new Error(
        "FirestoreEvaluationRepository requires a Firestore db instance."
      );
    }

    this.db = db;
  }

  async saveEvaluation({
    sessionId,
    questionId,
    candidateResponse,
    evaluation,
    evaluatedAt,
  }) {
    if (!sessionId || !questionId) {
      throw new Error("sessionId and questionId are required to save an evaluation.");
    }

    await this.db
      .collection("sessions")
      .doc(sessionId)
      .collection("responses")
      .doc(questionId)
      .set(
        {
          candidateResponse,
          evaluation,
          evaluatedAt,
        },
        { merge: true }
      );
  }
}

module.exports = FirestoreEvaluationRepository;
