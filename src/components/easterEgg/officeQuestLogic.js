// Interview Buddy's optional, LOCAL-ONLY Easter egg.
// None of this module imports application services, auth, Firestore, or scoring.
export const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a",
];

export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 12;
export const TILE_SIZE = 24;
export const START_POSITION = { x: 10, y: 9, direction: "down" };
export const SECRET_CABINET = { x: 17, y: 9 };

export const INTERVIEWERS = [
  { id: "beginner", name: "Mina", title: "The Intern", tier: "BEGINNER", x: 3, y: 3, color: "#78dfaf", dialogue: "Welcome aboard! Let's start with the foundations." },
  { id: "intermediate", name: "Leo", title: "The Developer", tier: "INTERMEDIATE", x: 8, y: 3, color: "#8ecaff", dialogue: "I hope you have brushed up on everyday dev work." },
  { id: "expert", name: "Nova", title: "The Architect", tier: "EXPERT", x: 14, y: 3, color: "#f3bc6b", dialogue: "Let's see how you reason through tricky systems." },
  { id: "veteran", name: "Ada", title: "The CTO", tier: "VETERAN", x: 14, y: 8, color: "#d6a5ff", dialogue: "Experience is earned. Show me your judgment." },
  { id: "random", name: "Casey", title: "The Wild Card", tier: "RANDOM", x: 6, y: 8, color: "#ff9fa0", dialogue: "No one knows what the next question will be!" },
];

// Individual short interviews have two self-contained, multiple-choice questions.
// Each bank includes several variants so retries can feel different.
export const QUESTION_BANK = {
  beginner: [
    { id: "b1", prompt: "Which data structure removes the most recently added item first?", options: ["Queue", "Stack", "Linked list", "Hash map"], correct: 1, explanation: "A stack follows last-in, first-out (LIFO)." },
    { id: "b2", prompt: "Which HTTP method is most commonly used to retrieve a resource?", options: ["POST", "PATCH", "GET", "DELETE"], correct: 2, explanation: "GET requests a resource without intending to change it." },
    { id: "b3", prompt: "What does a Boolean value represent?", options: ["A decimal number", "True or false", "A sequence of characters", "A file path"], correct: 1, explanation: "Boolean values represent the logical states true and false." },
  ],
  intermediate: [
    { id: "i1", prompt: "Which SQL clause filters grouped results after aggregation?", options: ["WHERE", "ORDER BY", "HAVING", "LIMIT"], correct: 2, explanation: "HAVING filters groups, while WHERE filters rows before grouping." },
    { id: "i2", prompt: "What is the average-case lookup complexity of a well-distributed hash table?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correct: 3, explanation: "Hash tables generally offer expected constant-time lookup with a good hash and controlled load." },
    { id: "i3", prompt: "What does a database transaction provide when it is atomic?", options: ["All changes commit or none do", "Every query is cached", "All queries run in parallel", "Tables cannot be altered"], correct: 0, explanation: "Atomicity means a transaction either commits all its changes or none." },
  ],
  expert: [
    { id: "e1", prompt: "Which strategy helps prevent a cache stampede on an expired popular key?", options: ["Disable caching entirely", "Single-flight request coalescing", "Use a shorter key name", "Double the response payload"], correct: 1, explanation: "Single-flight lets one refresh populate the cache while others share or await the result." },
    { id: "e2", prompt: "What is a key advantage of cursor-based pagination on a frequently changing feed?", options: ["It eliminates indexes", "It prevents all duplicates in all cases", "It is more stable than offset pagination under inserts", "It automatically encrypts data"], correct: 2, explanation: "A cursor advances from a known position instead of shifting numeric offsets." },
    { id: "e3", prompt: "In a distributed service, why are idempotency keys useful for retried writes?", options: ["They improve image compression", "They help avoid duplicate side effects", "They replace authentication", "They eliminate all network failures"], correct: 1, explanation: "An idempotency key helps a server recognize a repeated operation and avoid applying it twice." },
  ],
  veteran: [
    { id: "v1", prompt: "A deployment causes elevated errors. What is the safest immediate mitigation when rollback is supported?", options: ["Increase all timeouts blindly", "Roll back and inspect the regression", "Delete the error logs", "Restart every database cluster"], correct: 1, explanation: "Restoring the last known-good version reduces impact while you investigate the cause." },
    { id: "v2", prompt: "Which design most directly limits the blast radius of a failing downstream dependency?", options: ["One shared thread pool for all work", "Unbounded retries", "Bulkheads with bounded resources", "No request timeouts"], correct: 2, explanation: "Bulkheads isolate resource pools so one failure does not exhaust all service capacity." },
    { id: "v3", prompt: "What is a sound approach when migrating a heavily used database schema with no planned downtime?", options: ["Drop old columns first", "Deploy all clients at once", "Use expand-migrate-contract stages", "Disable backups"], correct: 2, explanation: "Expand-migrate-contract allows old and new applications to coexist during a gradual migration." },
  ],
};

export const FURNITURE = [
  { x: 3, y: 2, type: "desk" }, { x: 8, y: 2, type: "desk" },
  { x: 14, y: 2, type: "desk" }, { x: 6, y: 7, type: "desk" },
  { x: 14, y: 7, type: "desk" }, { x: 9, y: 5, type: "table" },
  { x: 10, y: 5, type: "table" }, { x: 11, y: 5, type: "table" },
  { x: 2, y: 7, type: "shelf" }, { x: 17, y: 6, type: "printer" },
  { x: 17, y: 3, type: "cooler" }, { x: 1, y: 3, type: "plant" },
  { x: 18, y: 3, type: "plant" }, { ...SECRET_CABINET, type: "cabinet" },
];

export function advanceKonamiIndex(currentIndex, rawKey) {
  const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
  if (key === KONAMI_CODE[currentIndex]) return currentIndex + 1;
  return key === KONAMI_CODE[0] ? 1 : 0;
}

export function isEditableTarget(target) {
  return Boolean(target && (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    (typeof target.closest === "function" && target.closest("[contenteditable='true']"))
  ));
}

export function isAdjacent(one, two) {
  return Math.abs(one.x - two.x) + Math.abs(one.y - two.y) <= 1;
}

export function isWalkable(x, y) {
  return x > 0 && y > 0 && x < MAP_WIDTH - 1 && y < MAP_HEIGHT - 1 &&
    !FURNITURE.some((item) => item.x === x && item.y === y) &&
    !INTERVIEWERS.some((person) => person.x === x && person.y === y);
}

export function movePlayer(player, dx, dy) {
  const direction = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
  const x = player.x + dx;
  const y = player.y + dy;
  return isWalkable(x, y) ? { x, y, direction } : { ...player, direction };
}

export function getNearbyInterviewer(player) {
  return INTERVIEWERS.find((npc) => isAdjacent(player, npc)) || null;
}

// Uniform selection of two different questions. Random is drawn from all tiers.
export function selectQuestions(id, random = Math.random) {
  const pool = id === "random"
    ? Object.values(QUESTION_BANK).flat()
    : (QUESTION_BANK[id] || []);
  const remaining = [...pool];
  const selected = [];
  while (remaining.length && selected.length < 2) {
    const value = Number(random());
    const safeRandom = Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0;
    selected.push(remaining.splice(Math.floor(safeRandom * remaining.length), 1)[0]);
  }
  return selected;
}

export function createInitialGame() {
  return {
    player: { ...START_POSITION },
    phase: "explore",
    activeId: null,
    questions: [],
    questionIndex: 0,
    correctCount: 0,
    selectedAnswer: null,
    completed: {},
    foundPass: false,
    usedPass: false,
    notice: "Find five interviewers. Walk up and press E to talk.",
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case "MOVE":
      return state.phase === "explore"
        ? { ...state, player: movePlayer(state.player, action.dx, action.dy), notice: "" }
        : state;
    case "INTERACT": {
      if (state.phase !== "explore") return state;
      const npc = getNearbyInterviewer(state.player);
      if (npc) {
        if (state.completed[npc.id]) {
          return { ...state, notice: `${npc.name}: Already approved! Keep going.` };
        }
        return { ...state, phase: "intro", activeId: npc.id, notice: "" };
      }
      if (isAdjacent(state.player, SECRET_CABINET)) {
        if (state.foundPass) return { ...state, notice: "The cabinet is empty now." };
        return { ...state, foundPass: true, phase: "item", notice: "" };
      }
      return { ...state, notice: "No one to talk to here. Try walking closer." };
    }
    case "START":
      if (state.phase !== "intro" || !state.activeId || action.questions?.length !== 2) return state;
      return { ...state, phase: "interview", questions: action.questions, questionIndex: 0, correctCount: 0, selectedAnswer: null };
    case "ANSWER": {
      if (state.phase !== "interview") return state;
      const question = state.questions[state.questionIndex];
      if (!question || !Number.isInteger(action.index) || action.index < 0 || action.index >= question.options.length) return state;
      return {
        ...state, phase: "feedback", selectedAnswer: action.index,
        correctCount: state.correctCount + Number(action.index === question.correct),
      };
    }
    case "CONTINUE": {
      if (state.phase !== "feedback") return state;
      if (state.questionIndex + 1 < state.questions.length) {
        return { ...state, phase: "interview", questionIndex: state.questionIndex + 1, selectedAnswer: null };
      }
      const passed = state.correctCount === state.questions.length;
      const completed = passed
        ? { ...state.completed, [state.activeId]: "passed" }
        : state.completed;
      return {
        ...state, completed, phase: passed && Object.keys(completed).length === INTERVIEWERS.length ? "won" : "summary",
      };
    }
    case "SKIP": {
      if (state.phase !== "intro" || !state.foundPass || state.usedPass || !state.activeId) return state;
      const completed = { ...state.completed, [state.activeId]: "skipped" };
      return {
        ...state, usedPass: true, completed,
        phase: Object.keys(completed).length === INTERVIEWERS.length ? "won" : "summary",
        correctCount: 0, questions: [],
      };
    }
    case "RETRY":
      return state.phase === "summary" && !state.completed[state.activeId]
        ? { ...state, phase: "intro", questions: [], questionIndex: 0, correctCount: 0, selectedAnswer: null }
        : state;
    case "EXPLORE":
      return { ...state, phase: "explore", activeId: null, questions: [], selectedAnswer: null, notice: "" };
    case "RESET":
      return createInitialGame();
    default:
      return state;
  }
}
