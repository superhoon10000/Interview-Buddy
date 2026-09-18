// server/src/services/aiService.test.js
//
// Tests the ABSTRACTION layer, not the real Anthropic API. We don't want
// tests that make real network calls (slow, costs money, requires a real
// API key, fails if Anthropic's servers are down). Instead we "mock" the
// provider — swap in a fake version we control — so we can test aiService's
// own logic (picking the right provider, handling errors) in isolation.

// jest.mock() replaces the real anthropicProvider module with a fake one
// for this test file only. Anywhere aiService.js does
// require('./providers/anthropicProvider'), it gets this fake instead.
jest.mock('./providers/anthropicProvider');

const anthropicProvider = require('./providers/anthropicProvider');
const aiService = require('./aiService');

describe('aiService.generateEvaluation', () => {
  beforeEach(() => {
    // Clears any fake return values/call history from the previous test,
    // so tests don't accidentally affect each other.
    jest.clearAllMocks();
  });

  it('calls the anthropic provider by default', async () => {
    // Tell the FAKE anthropicProvider what to return when called.
    anthropicProvider.generateEvaluation.mockResolvedValue({
      score: 85,
      feedback: 'Solid answer, could be more specific.',
    });

    const result = await aiService.generateEvaluation({
      question: { id: 'q1', text: 'Explain closures.' },
      candidateResponse: 'A closure is...',
      gradingCriteria: ['clarity'],
    });

    // Confirm aiService actually called the provider, and with the right data.
    expect(anthropicProvider.generateEvaluation).toHaveBeenCalledWith({
      question: { id: 'q1', text: 'Explain closures.' },
      candidateResponse: 'A closure is...',
      gradingCriteria: ['clarity'],
    });

    // Confirm aiService returned exactly what the provider gave it.
    expect(result).toEqual({
      score: 85,
      feedback: 'Solid answer, could be more specific.',
    });
  });

  it('throws a clear error for an unknown provider', async () => {
    // Temporarily override the env variable for this one test.
    const originalProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = 'not-a-real-provider';

    // Re-require aiService so it picks up the new env value
    // (it reads AI_PROVIDER once, when the module first loads).
    jest.resetModules();
    const aiServiceWithBadProvider = require('./aiService');

    await expect(
      aiServiceWithBadProvider.generateEvaluation({
        question: { id: 'q1', text: 'test' },
        candidateResponse: 'test',
      })
    ).rejects.toThrow('Unknown AI_PROVIDER');

    // Restore the original value so we don't affect other tests.
    process.env.AI_PROVIDER = originalProvider;
  });

  it('propagates errors from the provider instead of swallowing them', async () => {
    anthropicProvider.generateEvaluation.mockRejectedValue(
      new Error('Anthropic response did not match the expected evaluation shape.')
    );

    await expect(
      aiService.generateEvaluation({
        question: { id: 'q1', text: 'test' },
        candidateResponse: 'test',
      })
    ).rejects.toThrow('Anthropic response did not match the expected evaluation shape.');
  });
});