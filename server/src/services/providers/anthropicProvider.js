// server/src/services/providers/anthropicProvider.js
//
// One concrete implementation of the AI provider contract (see
// aiProvider.interface.js). All Anthropic-specific details live in
// this ONE file — the SDK import, the prompt wording, the response
// parsing. Nothing outside this file should ever import '@anthropic-ai/sdk'.

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * @param {Object} params
 * @param {{ id: string, text: string }} params.question
 * @param {string} params.candidateResponse
 * @param {string[]} [params.gradingCriteria]
 * @returns {Promise<{ score: number, feedback: string }>}
 */
async function generateEvaluation({ question, candidateResponse, gradingCriteria }) {
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
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = aiResponse.content[0].text;
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  // Enforce the shared output shape before handing it back to the caller.
  const scoreIsValid = typeof parsed.score === 'number' && parsed.score >= 0 && parsed.score <= 100;
  const feedbackIsValid = typeof parsed.feedback === 'string' && parsed.feedback.length > 0;

  if (!scoreIsValid || !feedbackIsValid) {
    throw new Error('Anthropic response did not match the expected evaluation shape.');
  }

  return { score: parsed.score, feedback: parsed.feedback };
}

module.exports = { generateEvaluation };