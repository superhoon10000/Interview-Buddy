
"use strict";

// Dependency-free regression suite. Runs with Jest (npm test) or Node's test runner:
// node --test test/eloRanking.node.test.cjs
// Jest provides global test; otherwise use Node's built-in test API.
const test = typeof globalThis.test === "function"
  ? globalThis.test
  : require("node:test").test;
const assert = require("node:assert/strict");
const FirestoreSessionRepository = require("../src/repositories/firestore/FirestoreSessionRepository");
const { calculateEloUpdate } = require("../src/services/eloRating");
const { rankProfiles } = require("../src/services/leaderboardRanking");

function fixture(questionScores, experienceLevel = "Intermediate") {
  const docs = new Map();
  const ref = (path) => ({ path, id: path.split("/").at(-1),
    collection: (name) => ref(`${path}/${name}`) });
  const userRef = "users/user-1";
  const sessionRef = "sessions/session-1";
  docs.set(userRef, { uid: "user-1", ranking: {
    points: 0, rankedSessions: 0, averageScore: 0, elo: 1000,
  }});
  docs.set(sessionRef, { userId: "user-1", mode: "Quiz Style", status: "active",
    experienceLevel, questionCount: questionScores.length,
    assignmentStatus: "assigned",
    assignedQuestionIds: questionScores.map((_, i) => `q${i}`),
  });
  questionScores.forEach((score, i) => docs.set(`${sessionRef}/responses/q${i}`, {
    questionId: `q${i}`, mode: "Quiz Style", evaluation: { score },
  }));
  const db = { collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
    async runTransaction(callback) {
      const writes = [];
      const transaction = {
        get: async (r) => r.path.endsWith("/responses")
          ? { docs: [...docs.entries()].filter(([path]) => path.startsWith(`${r.path}/`))
            .map(([path, data]) => ({id: path.split("/").at(-1), data: () => data})) }
          : { id: r.id, exists: docs.has(r.path), data: () => docs.get(r.path) },
        update: (r, changes) => writes.push([r.path, changes]),
        delete: (r) => writes.push([r.path, null]),
      };
      const result = await callback(transaction);
      for (const [path, patch] of writes) {
        if (patch === null) docs.delete(path);
        else docs.set(path, { ...docs.get(path), ...patch });
      }
      return result;
    },
  };
  return { docs, userRef, sessionRef,
    repository: new FirestoreSessionRepository({ db, now: () => new Date("2026-11-12T20:00:00Z") }),
  };
}

// Add another session to an existing user's in-memory Firestore fixture.
function addSession(f, sessionId, questionScores, experienceLevel = "Intermediate") {
  const sessionRef = `sessions/${sessionId}`;
  f.docs.set(sessionRef, {
    userId: "user-1", mode: "Quiz Style", status: "active",
    experienceLevel, questionCount: questionScores.length,
    assignmentStatus: "assigned",
    assignedQuestionIds: questionScores.map((_, i) => `q${i}`),
  });
  questionScores.forEach((score, i) => f.docs.set(`${sessionRef}/responses/q${i}`, {
    questionId: `q${i}`, mode: "Quiz Style", evaluation: { score },
  }));
}

test("the nine reference difficulty and length examples remain stable", () => {
  const examples = [
    ["Beginner", 1, 100, 0], ["Beginner", 5, 100, 5],
    ["Beginner", 10, 100, 9], ["Beginner", 10, 50, -7],
    ["Intermediate", 10, 50, 0], ["Experienced", 10, 50, 7],
    ["Veteran", 5, 40, 4], ["Veteran", 10, 50, 11],
    ["Veteran", 20, 75, 38],
  ];
  for (const [experienceLevel, questionCount, sessionScore, change] of examples) {
    const result = calculateEloUpdate({currentElo: 1000,
      experienceLevel, questionCount, sessionScore});
    assert.equal(result.eloChange, change, `${experienceLevel} / ${questionCount} / ${sessionScore}`);
  }
});

test("four completed questions are unranked and retain existing ranking", async () => {
  const f = fixture([100, 100, 100, 100], "Veteran");
  const before = { ...f.docs.get(f.userRef).ranking };
  const completed = await f.repository.finalizeSessionWithResults("session-1", "user-1");
  assert.equal(completed.result.completionStatus, "completed");
  assert.equal(completed.result.rankEligible, false);
  assert.equal(completed.result.eloChange, undefined);
  assert.deepEqual(f.docs.get(f.userRef).ranking, before);
});

test("five completed Beginner questions update ELO only once", async () => {
  const f = fixture([100, 100, 100, 100, 100], "Beginner");
  const first = await f.repository.finalizeSessionWithResults("session-1", "user-1");
  assert.equal(first.result.eloChange, "+5");
  assert.equal(f.docs.get(f.userRef).ranking.elo, 1005);
  assert.equal(f.docs.get(f.userRef).ranking.rankedSessions, 1);
  const second = await f.repository.finalizeSessionWithResults("session-1", "user-1");
  assert.deepEqual(first.result, second.result);
  assert.equal(f.docs.get(f.userRef).ranking.elo, 1005);
});

test("ten Veteran questions scoring fifty percent gain eleven ELO", async () => {
  const f = fixture(Array(10).fill(50), "Veteran");
  const saved = await f.repository.finalizeSessionWithResults("session-1", "user-1");
  assert.equal(saved.result.eloChange, "+11");
  assert.equal(f.docs.get(f.userRef).ranking.elo, 1011);
});

test("leaderboard orders by ELO not points and uses competition ties", () => {
  const profile = (uid, elo, points) => ({uid, username: uid,
    ranking: { elo, points, rankedSessions: 1, averageScore: points }});
  const rows = rankProfiles([
    profile("low", 900, 100), profile("high", 1200, 0), profile("tie", 1200, 20),
  ]);
  assert.deepEqual(rows.map(({ uid, rank, elo }) => [uid, rank, elo]), [
    ["high", 1, 1200], ["tie", 1, 1200], ["low", 3, 900],
  ]);
  assert.equal(Object.hasOwn(rows[0], "points"), false);
});

// CI/CD-21: Integration-oriented ELO and ranking regression coverage.
test("sequential ranked completions reorder the leaderboard; replay is idempotent", async () => {
  const f = fixture(Array(10).fill(100));
  const peer = (uid, elo) => ({
    uid, username: uid,
    ranking: { elo, points: 0, rankedSessions: 1, averageScore: 0 },
  });
  const peers = [peer("alice", 1016), peer("bob", 1008)];
  const standings = () => rankProfiles([
    ...peers,
    { ...f.docs.get(f.userRef), username: "current-user" },
  ]).map(({ uid, rank, elo }) => [uid, rank, elo]);

  assert.deepEqual(standings(), [
    ["alice", 1, 1016], ["bob", 2, 1008],
  ]);

  const first = await f.repository.finalizeSessionWithResults("session-1", "user-1");
  assert.deepEqual([
    first.result.previousElo, first.result.newElo, first.result.eloChange,
  ], [1000, 1016, "+16"]);
  assert.deepEqual(standings(), [
    ["alice", 1, 1016], ["user-1", 1, 1016], ["bob", 3, 1008],
  ]);

  addSession(f, "session-2", Array(10).fill(0));
  const second = await f.repository.finalizeSessionWithResults("session-2", "user-1");
  assert.deepEqual([
    second.result.previousElo, second.result.newElo, second.result.eloChange,
  ], [1016, 999, "-17"]);
  assert.deepEqual(standings(), [
    ["alice", 1, 1016], ["bob", 2, 1008], ["user-1", 3, 999],
  ]);
  assert.equal(f.docs.get(f.userRef).ranking.rankedSessions, 2);

  const savedRanking = { ...f.docs.get(f.userRef).ranking };
  const replay = await f.repository.finalizeSessionWithResults("session-1", "user-1");
  assert.deepEqual(replay.result, first.result);
  assert.deepEqual(f.docs.get(f.userRef).ranking, savedRanking);
  assert.deepEqual(standings(), [
    ["alice", 1, 1016], ["bob", 2, 1008], ["user-1", 3, 999],
  ]);
});

test("unranked session followed by an eligible session joins the leaderboard", async () => {
  const f = fixture([100, 100, 100, 100], "Veteran");
  const friend = {
    uid: "friend", username: "friend",
    ranking: { elo: 1003, points: 30, rankedSessions: 1, averageScore: 30 },
  };
  const standings = () => rankProfiles([
    friend, { ...f.docs.get(f.userRef), username: "current-user" },
  ]).map(({ uid, rank, elo }) => [uid, rank, elo]);
  const before = { ...f.docs.get(f.userRef).ranking };

  const unranked = await f.repository.finalizeSessionWithResults("session-1", "user-1");
  assert.equal(unranked.result.rankEligible, false);
  assert.deepEqual(f.docs.get(f.userRef).ranking, before);
  assert.deepEqual(standings(), [["friend", 1, 1003]]);

  addSession(f, "session-2", Array(5).fill(100), "Beginner");
  const ranked = await f.repository.finalizeSessionWithResults("session-2", "user-1");
  assert.equal(ranked.result.rankEligible, true);
  assert.deepEqual([
    ranked.result.previousElo, ranked.result.newElo, ranked.result.eloChange,
  ], [1000, 1005, "+5"]);
  assert.equal(f.docs.get(f.userRef).ranking.rankedSessions, 1);
  assert.deepEqual(standings(), [
    ["user-1", 1, 1005], ["friend", 2, 1003],
  ]);
});

test("persisted zero ELO remains nonnegative after a poor ranked session", async () => {
  const f = fixture(Array(20).fill(0), "Veteran");
  f.docs.get(f.userRef).ranking = {
    elo: 0, points: 30, rankedSessions: 1, averageScore: 30,
  };

  const completed = await f.repository.finalizeSessionWithResults("session-1", "user-1");
  assert.equal(completed.result.rankEligible, true);
  assert.deepEqual([
    completed.result.previousElo, completed.result.newElo, completed.result.eloChange,
  ], [0, 0, "0"]);
  const ranking = f.docs.get(f.userRef).ranking;
  assert.equal(ranking.elo, 0);
  assert.equal(ranking.lastEloChange, 0);
  assert.equal(ranking.rankedSessions, 2);
  assert.deepEqual(
    rankProfiles([{ ...f.docs.get(f.userRef), username: "current-user" }])
      .map(({ uid, rank, elo }) => [uid, rank, elo]),
    [["user-1", 1, 0]]
  );
});
