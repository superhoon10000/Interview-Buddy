// server/src/routes/evaluate.js
// Follows the same pattern as questions.js: Express route -> Firebase Admin -> Firestore
// Handles AI evaluation of a candidate's interview answer.
// This file is mounted in app.js as: app.use("/api/evaluate", evaluateRoutes)
// so the paths in this file are relative to /api/evaluate.
//
// NOTE: this route no longer imports the Anthropic SDK directly. It only
// depends on aiService.js (the abstraction) — this is what makes it
// provider-independent, per the Jira ticket.
 
const express = require('express');
const aiService = require('../services/aiService');

function createEvaluateRouter({
  evaluationRepository,
}) {
  const router = express.Router();
// This becomes POST /api/evaluate once mounted in app.js
// Body shape matches evaluationRequest.interface.ts
router.post('/', async (req, res, next) => {
  try {
    const { requestId, question, candidateResponse, gradingCriteria, metadata } = req.body;
 
    if (!question || !candidateResponse) {
      return res.status(400).json({ error: 'question and candidateResponse are required' });
    }
 
    // The route no longer knows or cares which AI provider actually
    // handles this — that decision lives entirely inside aiService.js.
    const evaluation = await aiService.generateEvaluation({
      question,
      candidateResponse,
      gradingCriteria,
    });
 
    // Save the evaluation back to Firestore, linked to the session/question
    if (metadata?.sessionId) {
      await db
        .collection('sessions')
        .doc(metadata.sessionId)
        .collection('responses')
        .doc(question.id)
        .set(
          {
            candidateResponse,
            evaluation,
            evaluatedAt: new Date().toISOString()
          },
          { merge: true }
        );
    }
 
    return res.json({ requestId, evaluation });
  } catch (error) {
    return next(error);
  }
});
  return router;
} 

module.exports = createEvaluateRouter;
 