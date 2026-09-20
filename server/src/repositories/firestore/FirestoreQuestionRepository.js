const QuestionRepository = require("../contracts/QuestionRepository");

/**
 * Firestore implementation of the question data-access contract.
 *
 * Firestore collection/query/document APIs are deliberately contained in this
 * adapter so Express routes do not depend on Firebase-specific behavior.
 */
class FirestoreQuestionRepository extends QuestionRepository {
  constructor({ db, admin }) {
    super();

    if (!db) {
      throw new Error("FirestoreQuestionRepository requires a Firestore db instance.");
    }

    this.db = db;
    this.admin = admin;
  }

  async findByMode(mode) {
    const snapshot = await this.db
      .collection("questions")
      .where("mode", "==", mode)
      .limit(100)
      .get();

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));
  }

  async findById(questionId) {
    const document = await this.db.collection("questions").doc(questionId).get();

    if (!document.exists) {
      return null;
    }

    return {
      id: document.id,
      ...document.data(),
    };
  }

  /**
   * Used by the seed utility so Firestore-specific batch/write behavior also
   * stays inside the data-access layer.
   */
  async upsertMany(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return 0;
    }

    const batch = this.db.batch();

    for (const question of questions) {
      const { id, ...data } = question;
      const reference = this.db.collection("questions").doc(id);

      const updatedAt = this.admin?.firestore?.FieldValue?.serverTimestamp
        ? this.admin.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString();

      batch.set(
        reference,
        {
          ...data,
          updatedAt,
        },
        { merge: true }
      );
    }

    await batch.commit();
    return questions.length;
  }
}

module.exports = FirestoreQuestionRepository;
