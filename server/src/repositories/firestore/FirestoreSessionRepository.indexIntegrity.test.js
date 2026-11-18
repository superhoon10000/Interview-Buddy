
"use strict";

const firebaseConfig = require("../../../../firebase.json");
const indexConfig = require("../../../../firestore.indexes.json");
const FirestoreSessionRepository = require("./FirestoreSessionRepository");
const {
  SESSION_HISTORY_PAGE_MAX,
} = require("../../config/sessionStorageLimits");

function makeFixture({ cursorData = null, queryDocs = [] } = {}) {
  const filters = [];
  const orders = [];

  const cursorGet = jest.fn().mockResolvedValue(
    cursorData === null
      ? { exists: false }
      : {
          exists: true,
          id: "cursor-1",
          data: () => cursorData,
        }
  );

  const query = {
    where: jest.fn((field, op, value) => {
      filters.push({ field, op, value });
      return query;
    }),

    orderBy: jest.fn((field, direction) => {
      orders.push({ field, direction });
      return query;
    }),

    startAfter: jest.fn(() => query),
    limit: jest.fn(() => query),
    get: jest.fn().mockResolvedValue({ docs: queryDocs }),
  };

  const sessions = {
    ...query,
    doc: jest.fn(() => ({ get: cursorGet })),
  };

  const db = {
    collection: jest.fn(() => sessions),
  };

  return {
    repository: new FirestoreSessionRepository({ db }),
    filters,
    orders,
    query,
    sessions,
    cursorGet,
  };
}

function requiredIndexFields(fixture) {
  const equalityFields = fixture.filters.map(({ field, op }) => {
    expect(op).toBe("==");

    return {
      fieldPath: field,
      order: "ASCENDING",
    };
  });

  const sortingFields = fixture.orders.map(
    ({ field, direction }) => ({
      fieldPath: field,
      order: direction === "desc" ? "DESCENDING" : "ASCENDING",
    })
  );

  return [...equalityFields, ...sortingFields];
}

function expectDeclaredSessionIndex(fixture) {
  const needed = requiredIndexFields(fixture);

  expect(indexConfig.indexes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        collectionGroup: "sessions",
        queryScope: "COLLECTION",
        fields: needed,
      }),
    ])
  );
}

describe("SCRUM-86 Firestore index configuration and query integrity", () => {
  test("Firebase deploy configuration points to the versioned indexes file", () => {
    expect(firebaseConfig.firestore.indexes)
      .toBe("firestore.indexes.json");

    expect(firebaseConfig.firestore.rules)
      .toBe("firestore.rules");
  });

  test("declared composite indexes have distinct valid field signatures", () => {
    const signatures = indexConfig.indexes.map((index) => {
      expect(index.queryScope).toBe("COLLECTION");
      expect(index.fields.length).toBeGreaterThan(1);

      for (const field of index.fields) {
        expect(typeof field.fieldPath).toBe("string");
        if (field.arrayConfig !== undefined) {
          expect(field.arrayConfig).toBe("CONTAINS");
          expect(field.order).toBeUndefined();
        } else {
          expect(["ASCENDING", "DESCENDING"])
            .toContain(field.order);
        }
      }

      return JSON.stringify([
        index.collectionGroup,
        index.queryScope,
        index.fields,
      ]);
    });

    expect(new Set(signatures).size).toBe(signatures.length);
  });

  test("ordinary history query is backed by the userId/createdAt index", async () => {
    const f = makeFixture();

    await f.repository.listByUser("user-A");

    expect(f.filters).toEqual([
      {
        field: "userId",
        op: "==",
        value: "user-A",
      },
    ]);

    expect(f.orders).toEqual([
      {
        field: "createdAt",
        direction: "desc",
      },
    ]);

    expect(f.query.limit)
      .toHaveBeenCalledWith(SESSION_HISTORY_PAGE_MAX);

    expectDeclaredSessionIndex(f);
  });

  test("completed history query is backed by userId/status/completedAt index", async () => {
    const f = makeFixture();

    await f.repository.listCompletedByUser("user-A");

    expect(f.filters).toEqual([
      {
        field: "userId",
        op: "==",
        value: "user-A",
      },
      {
        field: "status",
        op: "==",
        value: "completed",
      },
    ]);

    expect(f.orders).toEqual([
      {
        field: "completedAt",
        direction: "desc",
      },
    ]);

    expect(f.query.limit)
      .toHaveBeenCalledWith(SESSION_HISTORY_PAGE_MAX);

    expectDeclaredSessionIndex(f);
  });

  test.each([
    [null, "createdAt", 4],
    ["completed", "completedAt", 4],
  ])(
    "paginated %s history uses the corresponding composite index",
    async (status, field, limit) => {
      const f = makeFixture();

      await f.repository.getSessionPage({
        userId: "user-A",
        status,
        pageSize: 3,
      });

      expect(f.orders).toEqual([
        {
          field,
          direction: "desc",
        },
      ]);

      expect(f.query.limit)
        .toHaveBeenCalledWith(limit);

      expectDeclaredSessionIndex(f);
    }
  );

  test("rejects a same-owner cursor whose status mismatches completed history", async () => {
    const f = makeFixture({
      cursorData: {
        userId: "user-A",
        status: "active",
      },
    });

    await expect(
      f.repository.getSessionPage({
        userId: "user-A",
        status: "completed",
        pageSize: 5,
        cursor: "cursor-1",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "SESSION_CURSOR_INVALID",
    });

    expect(f.query.get).not.toHaveBeenCalled();
  });

  test("rejects a deleted history cursor rather than returning a misleading page", async () => {
    const f = makeFixture();

    await expect(
      f.repository.getSessionPage({
        userId: "user-A",
        pageSize: 5,
        cursor: "deleted-session",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "SESSION_CURSOR_INVALID",
    });

    expect(f.query.get).not.toHaveBeenCalled();
  });

  test("propagates a Firestore paging failure instead of reporting empty history", async () => {
    const f = makeFixture();

    f.query.get.mockRejectedValue(
      new Error("Firestore index/query unavailable")
    );

    await expect(
      f.repository.getSessionPage({
        userId: "user-A",
        pageSize: 5,
      })
    ).rejects.toThrow(
      "Firestore index/query unavailable"
    );
  });
});


describe("Analytics repository date filtering and summary projection", () => {
  test("uses the existing completedAt index for date bounds, scoped to the user", async () => {
    const f = makeFixture();
    const startDate = new Date("2026-10-01T00:00:00.000Z");
    const endDate = new Date("2026-11-01T00:00:00.000Z");
    await f.repository.getSessionPage({
      userId: "user-A", status: "completed", pageSize: 50, startDate, endDate,
      endDateExclusive: true,
    });
    expect(f.filters).toEqual([
      { field: "userId", op: "==", value: "user-A" },
      { field: "status", op: "==", value: "completed" },
      { field: "completedAt", op: ">=", value: startDate },
      { field: "completedAt", op: "<", value: endDate },
    ]);
    expect(f.orders).toEqual([{ field: "completedAt", direction: "desc" }]);
    expect(f.query.limit).toHaveBeenCalledWith(SESSION_HISTORY_PAGE_MAX + 1);
    expect(indexConfig.indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        collectionGroup: "sessions", queryScope: "COLLECTION", fields: [
          { fieldPath: "userId", order: "ASCENDING" },
          { fieldPath: "status", order: "ASCENDING" },
          { fieldPath: "completedAt", order: "DESCENDING" },
        ],
      }),
    ]));
  });

  test("compact analytics projection preserves scores and completion status but excludes answers", async () => {
    const f = makeFixture({ queryDocs: [{ id: "s-1", data: () => ({
      userId: "user-A", mode: "Quiz Style", status: "completed",
      completedAt: "2026-11-17T12:00:00Z", responseText: "sensitive response",
      result: { score: 82, completionStatus: "completed", internalAnswer: "private" },
    }) }] });
    const result = await f.repository.getSessionPage({
      userId: "user-A", status: "completed", pageSize: 10, summaryOnly: true,
    });
    expect(result).toEqual({
      sessions: [{
        id: "s-1", mode: "Quiz Style", status: "completed",
        completedAt: "2026-11-17T12:00:00Z", score: null,
        completionStatus: null, result: { score: 82, completionStatus: "completed" },
      }], nextCursor: null,
    });
    expect(JSON.stringify(result)).not.toMatch(/internalAnswer|responseText|private|sensitive/);
  });

  test("default paginated history still returns the full stored record", async () => {
    const doc = { mode: "Quiz Style", result: { score: 90, internalAnswer: "available in normal history" } };
    const f = makeFixture({ queryDocs: [{ id: "s-1", data: () => doc }] });
    await expect(f.repository.getSessionPage({ userId: "user-A", pageSize: 10 }))
      .resolves.toEqual({ sessions: [{ id: "s-1", ...doc }], nextCursor: null });
  });

  test("rejects an out-of-range cursor even if it belongs to the same user", async () => {
    const f = makeFixture({ cursorData: {
      userId: "user-A", status: "completed", completedAt: "2026-10-30T12:00:00.000Z",
    } });
    await expect(f.repository.getSessionPage({
      userId: "user-A", status: "completed", pageSize: 5, cursor: "cursor-1",
      startDate: new Date("2026-11-01T00:00:00Z"),
    })).rejects.toMatchObject({ statusCode: 400, code: "SESSION_CURSOR_INVALID" });
    expect(f.query.get).not.toHaveBeenCalled();
  });

  test("rejects range filters on unfiltered history and malformed direct repository ranges", async () => {
    const f = makeFixture();
    await expect(f.repository.getSessionPage({ userId: "user-A", pageSize: 5,
      startDate: new Date("2026-11-01T00:00:00Z"),
    })).rejects.toMatchObject({ code: "SESSION_STATUS_INVALID" });
    await expect(f.repository.getSessionPage({ userId: "user-A", status: "completed", pageSize: 5,
      startDate: new Date("invalid"),
    })).rejects.toMatchObject({ code: "SESSION_DATE_RANGE_INVALID" });
    expect(f.query.get).not.toHaveBeenCalled();
  });
});
