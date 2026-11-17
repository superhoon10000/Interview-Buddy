"use strict";

const FirestoreUserRepository = require("./FirestoreUserRepository");

describe("SCRUM-108 Firestore username prefix search", () => {
  test("uses bounded, indexed prefix query and selects only public fields", async () => {
    const docs = [
      { id: "u1", data: () => ({ username: "Alex", status: "active" }) },
      { id: "u2", data: () => ({ username: "Alice" }) },
    ];
    const get = jest.fn().mockResolvedValue({ docs });
    const select = jest.fn(() => ({ get }));
    const limit = jest.fn(() => ({ select }));
    const endAt = jest.fn(() => ({ limit }));
    const startAt = jest.fn(() => ({ endAt }));
    const orderBy = jest.fn(() => ({ startAt }));
    const collection = jest.fn(() => ({ orderBy }));
    const repository = new FirestoreUserRepository({ db: { collection } });

    const matches = await repository.searchByUsernamePrefix("  AL  ");
    expect(collection).toHaveBeenCalledWith("users");
    expect(orderBy).toHaveBeenCalledWith("usernameLower");
    expect(startAt).toHaveBeenCalledWith("al");
    expect(endAt).toHaveBeenCalledWith(`al\uf8ff`);
    expect(limit).toHaveBeenCalledWith(25);
    expect(select).toHaveBeenCalledWith("username", "status", "deleting");
    expect(matches).toEqual([
      { id: "u1", username: "Alex", status: "active" },
      { id: "u2", username: "Alice" },
    ]);
  });

  test.each(["", "a", "z".repeat(65)])(
    "rejects invalid prefix %s before hitting Firestore", async (prefix) => {
      const collection = jest.fn();
      const repository = new FirestoreUserRepository({ db: { collection } });
      await expect(repository.searchByUsernamePrefix(prefix)).rejects.toThrow(
        "A search prefix must contain 2 to 64 characters."
      );
      expect(collection).not.toHaveBeenCalled();
    }
  );
});
