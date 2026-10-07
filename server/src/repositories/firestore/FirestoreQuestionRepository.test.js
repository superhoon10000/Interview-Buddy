const FirestoreQuestionRepository = require("./FirestoreQuestionRepository");

describe("FirestoreQuestionRepository.upsertMany", () => {
  test("splits large question seeds across multiple Firestore batches", async () => {
    const committedBatches = [];
    const setCalls = [];

    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn((id) => ({ id })),
      })),
      batch: jest.fn(() => {
        const batch = {
          set: jest.fn((...args) => setCalls.push(args)),
          commit: jest.fn(async () => {
            committedBatches.push(batch);
          }),
        };

        return batch;
      }),
    };

    const repository = new FirestoreQuestionRepository({ db });
    const questions = Array.from({ length: 1500 }, (_, index) => ({
      id: `question-${index}`,
      mode: "Quiz Style",
      prompt: `Question ${index}`,
    }));

    const count = await repository.upsertMany(questions);

    expect(count).toBe(1500);
    expect(db.batch).toHaveBeenCalledTimes(4);
    expect(committedBatches).toHaveLength(4);
    expect(setCalls).toHaveLength(1500);
  });
});
