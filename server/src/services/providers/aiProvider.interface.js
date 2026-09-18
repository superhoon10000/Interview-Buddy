// server/src/services/providers/aiProvider.interface.js
//
// This file has NO real code that runs — it's documentation of a contract.
// Every provider file (anthropicProvider.js, openaiProvider.js, etc.) must
// export a function matching this exact shape:
//
//   async function generateEvaluation({ question, candidateResponse, gradingCriteria })
//     -> returns { score: number, feedback: string }
//
// Why write this down as a file at all, instead of just a comment somewhere?
// So the next person adding a provider (or you, in six months) has one
// obvious place to check: "what am I supposed to build?"

module.exports = {
  CONTRACT: `
    Every AI provider module must export:

    async function generateEvaluation({ question, candidateResponse, gradingCriteria })

    Input:
      - question: { id, text }
      - candidateResponse: string
      - gradingCriteria: string[] (optional)

    Output (must always match this shape, regardless of provider):
      - { score: number (0-100), feedback: string }

    Providers are responsible for:
      - Building their own provider-specific prompt/request
      - Parsing their own provider-specific response format
      - Converting their result into the shared { score, feedback } shape
        before returning, so callers never see provider-specific fields.
  `,
};