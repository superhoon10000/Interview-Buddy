/**
 * Repository composition root.
 *
 * This is the one application-level location where concrete persistence
 * adapters are selected. Routes receive repository interfaces and never import
 * firebaseAdmin directly.
 */
const { admin, db } = require("../firebaseAdmin");
const FirestoreQuestionRepository = require("./firestore/FirestoreQuestionRepository");
const FirestoreEvaluationRepository = require("./firestore/FirestoreEvaluationRepository");

const questionRepository = new FirestoreQuestionRepository({ db, admin });
const evaluationRepository = new FirestoreEvaluationRepository({ db });

module.exports = {
  questionRepository,
  evaluationRepository,
};
