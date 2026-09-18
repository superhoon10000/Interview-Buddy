// server/src/services/providers/anthropicProvider.test.js
//
// Tests the Anthropic-specific logic: does it build a sensible prompt,
// does it correctly parse Claude's response, does it reject a malformed
// response. We mock the Anthropic SDK itself so no real API call happens.

jest.mock('@anthropic-ai/sdk', () => {
  // jest.fn() creates a fake function we can control and inspect.
  const mockCreate = jest.fn();
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

const Anthropic = require('@anthropic-ai/sdk');
const { generateEvaluation } = require('./anthropicProvider');

// Grab a reference to the fake "create" function so tests can control it.
const mockCreate = new Anthropic().messages.create;

describe('anthropicProvider.generateEvaluation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a valid score and feedback when Claude responds correctly', async () => {
    mockCreate.mockResolvedValue({
      content: [{ text: '{"score": 90, "feedback": "Great answer."}' }],
    });

    const result = await generateEvaluation({
      question: { id: 'q1', text: 'What is a closure?' },
      candidateResponse: 'A function with access to its outer scope.',
    });

    expect(result).toEqual({ score: 90, feedback: 'Great answer.' });
  });

  it('handles Claude wrapping its JSON in markdown code fences', async () => {
    mockCreate.mockResolvedValue({
      content: [{ text: '```json\n{"score": 70, "feedback": "Decent."}\n```' }],
    });

    const result = await generateEvaluation({
      question: { id: 'q1', text: 'test' },
      candidateResponse: 'test',
    });

    expect(result).toEqual({ score: 70, feedback: 'Decent.' });
  });

  it('throws when the score is out of range', async () => {
    mockCreate.mockResolvedValue({
      content: [{ text: '{"score": 150, "feedback": "Great."}' }],
    });

    await expect(
      generateEvaluation({ question: { id: 'q1', text: 'test' }, candidateResponse: 'test' })
    ).rejects.toThrow('did not match the expected evaluation shape');
  });

  it('throws when feedback is missing', async () => {
    mockCreate.mockResolvedValue({
      content: [{ text: '{"score": 80}' }],
    });

    await expect(
      generateEvaluation({ question: { id: 'q1', text: 'test' }, candidateResponse: 'test' })
    ).rejects.toThrow('did not match the expected evaluation shape');
  });
});