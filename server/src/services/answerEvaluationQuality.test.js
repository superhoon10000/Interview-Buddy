
const { evaluateAnswer } = require("./answerEvaluationService");

// Shared question for consistent evaluation
const question = {
  text: "What is the difference between authentication and authorization?",
  referenceAnswer:
    "Authentication verifies user identity, while authorization determines permissions and access rights.",
};

describe("AI Evaluation - Answer Quality Tests", () => {
  test("Strong response receives an appropriate evaluation", async () => {
    const answer = `
      Authentication verifies the identity of a user.
      Authorization determines which resources and actions
      that user is permitted to access.

      For example, logging into an application authenticates
      the user, while checking whether they can access an
      administrative dashboard is authorization.
    `;

    const result = await evaluateAnswer({ question, answer });

    expect(result).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(result.feedback).toBeTruthy();
  });

  test("Partial response receives an appropriate evaluation", async () => {
    const answer = `
      Authentication is when a user logs into a system.
      Authorization is related to security and access.
    `;

    const result = await evaluateAnswer({ question, answer });

    expect(result).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(result.feedback).toBeTruthy();
  });

  test("Incorrect response receives an appropriate evaluation", async () => {
    const answer = `
      Authentication determines which files a user can access.
      Authorization checks whether their password is correct.
      Both processes are basically the same.
    `;

    const result = await evaluateAnswer({ question, answer });

    expect(result).toBeDefined();
    expect(typeof result.score).toBe("number");
    expect(result.feedback).toBeTruthy();
  });
});
