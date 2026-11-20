import {
  KONAMI_CODE, INTERVIEWERS, MAP_HEIGHT, MAP_WIDTH, SECRET_CABINET,
  advanceKonamiIndex, createInitialGame, gameReducer, getNearbyInterviewer,
  isAdjacent, isWalkable, movePlayer, selectQuestions,
} from "./officeQuestLogic";

const act = (state, type, extras = {}) => gameReducer(state, { type, ...extras });

it("unlocks only after the full Konami sequence and resets mismatches", () => {
  let index = 0;
  KONAMI_CODE.forEach((key) => { index = advanceKonamiIndex(index, key); });
  expect(index).toBe(KONAMI_CODE.length);
  expect(advanceKonamiIndex(3, "Left")).toBe(0);
  expect(advanceKonamiIndex(4, "ArrowUp")).toBe(1);
  expect(advanceKonamiIndex(9, "A")).toBe(10);
});

it("keeps the player inside the office and out of desks, NPCs and props", () => {
  expect(isWalkable(0, 1)).toBe(false);
  expect(isWalkable(MAP_WIDTH - 1, 3)).toBe(false);
  expect(isWalkable(3, 2)).toBe(false);
  expect(isWalkable(3, 3)).toBe(false);
  expect(movePlayer({ x: 3, y: 4, direction: "up" }, 0, -1))
    .toEqual({ x: 3, y: 4, direction: "up" });
  expect(movePlayer({ x: 10, y: 9, direction: "up" }, -1, 0))
    .toMatchObject({ x: 9, y: 9, direction: "left" });
});

it("lets a player walk from spawn to every interviewer and the hidden cabinet", () => {
  const initial = createInitialGame().player;
  const visited = new Set([`${initial.x},${initial.y}`]);
  const queue = [initial];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx; const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT || !isWalkable(nx, ny) || visited.has(key)) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  [...INTERVIEWERS, SECRET_CABINET].forEach((target) => {
    const accessible = [...visited].some((location) => {
      const [x, y] = location.split(",").map(Number);
      return isAdjacent({ x, y }, target);
    });
    expect(accessible).toBe(true);
  });
  expect(isAdjacent(initial, { x: 10, y: 10 })).toBe(true);
  expect(getNearbyInterviewer(initial)).toBeNull();
});

it("draws two unique local questions in every tier, including random", () => {
  INTERVIEWERS.forEach(({ id }) => {
    const questions = selectQuestions(id, () => 0);
    expect(questions).toHaveLength(2);
    expect(questions[0].id).not.toBe(questions[1].id);
    questions.forEach((q) => {
      expect(q.options).toHaveLength(4);
      expect(q.options[q.correct]).toBeTruthy();
      expect(q.explanation).toBeTruthy();
    });
  });
});

it("requires both answers to pass, allows retry, and never records failed interviews", () => {
  let state = { ...createInitialGame(), player: { x: 3, y: 4, direction: "up" } };
  state = act(state, "INTERACT");
  expect(state.activeId).toBe("beginner");
  const questions = selectQuestions("beginner", () => 0);
  state = act(state, "START", { questions });
  expect(state.phase).toBe("interview");
  state = act(state, "ANSWER", { index: (questions[0].correct + 1) % 4 });
  state = act(state, "ANSWER", { index: questions[0].correct }); // cannot submit twice
  expect(state.correctCount).toBe(0);
  state = act(state, "CONTINUE");
  state = act(state, "ANSWER", { index: questions[1].correct });
  state = act(state, "CONTINUE");
  expect(state.phase).toBe("summary");
  expect(state.completed).toEqual({});
  state = act(state, "RETRY");
  expect(state.phase).toBe("intro");
  state = act(state, "START", { questions });
  questions.forEach((question) => {
    state = act(state, "ANSWER", { index: question.correct });
    state = act(state, "CONTINUE");
  });
  expect(state.completed).toEqual({ beginner: "passed" });
});

it("lets the hidden referral skip exactly one interview, then wins after all five", () => {
  let state = { ...createInitialGame(), player: { x: 16, y: 9, direction: "right" } };
  state = act(state, "INTERACT");
  expect(state.phase).toBe("item");
  expect(state.foundPass).toBe(true);
  state = act(state, "EXPLORE");
  const first = INTERVIEWERS[0];
  state = { ...state, player: { x: first.x, y: first.y + 1, direction: "up" } };
  state = act(state, "INTERACT");
  state = act(state, "SKIP");
  expect(state.completed.beginner).toBe("skipped");
  expect(state.usedPass).toBe(true);
  state = act(state, "EXPLORE");
  for (const npc of INTERVIEWERS.slice(1)) {
    state = { ...state, player: { x: npc.x, y: npc.y + 1, direction: "up" } };
    state = act(state, "INTERACT");
    expect(state.activeId).toBe(npc.id);
    expect(act(state, "SKIP")).toBe(state);
    const questions = selectQuestions(npc.id, () => 0);
    state = act(state, "START", { questions });
    questions.forEach((question) => {
      state = act(state, "ANSWER", { index: question.correct });
      state = act(state, "CONTINUE");
    });
    if (npc.id !== "random") state = act(state, "EXPLORE");
  }
  expect(Object.keys(state.completed)).toHaveLength(5);
  expect(state.phase).toBe("won");
  state = act(state, "RESET");
  expect(state).toEqual(createInitialGame());
});

describe("negative cases and state isolation", () => {
  it("rejects invalid answer choices and actions in the wrong phase without changes", () => {
    const initial = createInitialGame();
    expect(act(initial, "ANSWER", { index: 0 })).toBe(initial);
    expect(act(initial, "START", { questions: selectQuestions("beginner") })).toBe(initial);
    expect(act(initial, "SKIP")).toBe(initial);
    const before = { ...initial, phase: "interview", activeId: "beginner", questions: selectQuestions("beginner") };
    expect(act(before, "ANSWER", { index: -1 })).toBe(before);
    expect(act(before, "ANSWER", { index: 4 })).toBe(before);
    expect(act(before, "ANSWER", { index: "0" })).toBe(before);
    expect(act(before, "ANSWER", { index: Number.NaN })).toBe(before);
  });

  it("ignores movement outside exploration and does not mutate input state", () => {
    const state = { ...createInitialGame(), phase: "intro", activeId: "beginner" };
    const before = JSON.parse(JSON.stringify(state));
    expect(act(state, "MOVE", { dx: 1, dy: 0 })).toBe(state);
    expect(act(state, "CONTINUE")).toBe(state);
    expect(act(state, "RETRY")).toBe(state);
    expect(state).toEqual(before);
  });

  it("does not use backend data and prevents unexpected input from crashing selection", () => {
    expect(selectQuestions("nonexistent")).toEqual([]);
    expect(selectQuestions("beginner", () => Number.NaN)).toHaveLength(2);
    expect(selectQuestions("random", () => 1)).toHaveLength(2);
    expect(selectQuestions("random", () => -1)).toHaveLength(2);
  });

  it("cannot consume the referral before discovering it or use it twice", () => {
    let state = { ...createInitialGame(), player: { x: 3, y: 4 } };
    state = act(state, "INTERACT");
    expect(act(state, "SKIP")).toBe(state);
    state = { ...state, foundPass: true };
    state = act(state, "SKIP");
    expect(state.usedPass).toBe(true);
    expect(state.completed).toEqual({ beginner: "skipped" });
    expect(act(state, "SKIP")).toBe(state);
  });
});

it("finishes all five successfully without using the optional referral", () => {
  let state = createInitialGame();
  for (const npc of INTERVIEWERS) {
    // This directly exercises the reducer; map traversal is separately tested.
    state = { ...state, player: { x: npc.x, y: npc.y + 1, direction: "up" } };
    state = act(state, "INTERACT");
    expect(state.activeId).toBe(npc.id);
    state = act(state, "START", { questions: selectQuestions(npc.id, () => 0) });
    state.questions.forEach((question) => {
      state = act(state, "ANSWER", { index: question.correct });
      state = act(state, "CONTINUE");
    });
    if (npc.id !== "random") state = act(state, "EXPLORE");
  }
  expect(state.phase).toBe("won");
  expect(Object.values(state.completed)).toEqual(Array(5).fill("passed"));
  expect(state.foundPass).toBe(false);
  expect(state.usedPass).toBe(false);
});
