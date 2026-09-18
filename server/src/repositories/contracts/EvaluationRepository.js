/**
 * Data-access contract for persisted AI answer evaluations.
 *
 * The application layer only knows about this method. It does not know how
 * session responses are represented in Firestore (or any future database).
 */
class EvaluationRepository {
  constructor() {
    if (new.target === EvaluationRepository) {
      throw new Error(
        "EvaluationRepository is an interface and cannot be instantiated directly."
      );
    }
  }

  async saveEvaluation({
    sessionId,
    questionId,
    candidateResponse,
    evaluation,
    evaluatedAt,
  }) {
    throw new Error("saveEvaluation() must be implemented.");
  }
}

module.exports = EvaluationRepository;
