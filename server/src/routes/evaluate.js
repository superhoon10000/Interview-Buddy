// server/src/routes/evaluate.js
// Follows the same pattern as questions.js: Express route -> Firebase Admin -> Firestore
// Handles AI evaluation of a candidate's interview answer.
// This file is mounted in app.js as: app.use("/api/evaluate", evaluateRoutes)
// so the paths in this file are relative to /api/evaluate.

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { db } = require('../firebaseAdmin'); // reuse existing Firebase Admin connection

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// This becomes POST /api/evaluate once mounted in app.js
// Body shape matches evaluationRequest.interface.ts
router.post('/', async (req, res, next) => {
  try {
    const { requestId, question, candidateResponse, gradingCriteria, metadata } = req.body;

    if (!question || !candidateResponse) {
      return res.status(400).json({ error: 'question and candidateResponse are required' });
    }

    const criteriaText = gradingCriteria?.length
      ? `Grade against these criteria: ${gradingCriteria.join(', ')}.`
      : '';

    const prompt = `You are grading an interview answer.
Question: ${question.text}
Candidate's answer: ${candidateResponse}
${criteriaText}
Respond ONLY in JSON with this shape: { "score": number (0-100), "feedback": string }`;

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const rawText = aiResponse.content[0].text;
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const evaluation = JSON.parse(cleaned);

    // Sanity-check that Claude actually returned the shape we asked for,
    // before we save it to Firestore or send it back to the user.
    // (This is a lightweight version of schema validation — no extra
    // dependency needed, just checking the two fields we rely on.)
    const scoreIsValid =
      typeof evaluation.score === 'number' &&
      evaluation.score >= 0 &&
      evaluation.score <= 100;
    const feedbackIsValid = typeof evaluation.feedback === 'string' && evaluation.feedback.length > 0;

    if (!scoreIsValid || !feedbackIsValid) {
      return res.status(502).json({
        error: 'The AI response did not match the expected evaluation shape.',
        requestId,
      });
    }

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

module.exports = router;