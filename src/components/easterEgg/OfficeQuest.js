import React, { useEffect, useMemo, useReducer, useRef } from "react";
import {
  FURNITURE, INTERVIEWERS, MAP_HEIGHT, MAP_WIDTH, SECRET_CABINET,
  TILE_SIZE, createInitialGame, gameReducer, getNearbyInterviewer,
  isAdjacent, isEditableTarget, selectQuestions,
} from "./officeQuestLogic";
import "./officeQuest.css";

const WIDTH = MAP_WIDTH * TILE_SIZE;
const HEIGHT = MAP_HEIGHT * TILE_SIZE;

function block(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), width, height);
}

function drawFloor(ctx) {
  block(ctx, 0, 0, WIDTH, HEIGHT, "#202c3d");
  for (let y = 1; y < MAP_HEIGHT - 1; y += 1) {
    for (let x = 1; x < MAP_WIDTH - 1; x += 1) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      block(ctx, px, py, TILE_SIZE, TILE_SIZE, (x + y) % 2 ? "#37465a" : "#394a5c");
      block(ctx, px + 2, py + 22, 20, 1, "#41536a");
      block(ctx, px + 22, py + 1, 1, 20, "#314056");
      if ((x * 3 + y * 7) % 8 === 0) block(ctx, px + 5, py + 8, 2, 2, "#435369");
    }
  }
  // A little central break-room carpet with a contrasting pixel border.
  block(ctx, 7 * 24, 5 * 24, 6 * 24, 4 * 24, "#52616f");
  block(ctx, 7 * 24 + 4, 5 * 24 + 4, 6 * 24 - 8, 4 * 24 - 8, "#3c6474");
  for (let i = 0; i < 6; i += 1) {
    block(ctx, 7 * 24 + i * 24 + 11, 5 * 24 + 5, 2, 2, "#79a3a8");
    block(ctx, 7 * 24 + i * 24 + 11, 9 * 24 - 8, 2, 2, "#79a3a8");
  }
  // Outer office walls, baseboards, windows, and a glass entry door.
  block(ctx, 0, 0, WIDTH, 24, "#263548");
  block(ctx, 0, 0, WIDTH, 5, "#5c7184");
  block(ctx, 0, 20, WIDTH, 4, "#172737");
  block(ctx, 0, HEIGHT - 24, WIDTH, 24, "#243549");
  block(ctx, 0, HEIGHT - 24, WIDTH, 4, "#5c7184");
  block(ctx, 0, 0, 24, HEIGHT, "#263548");
  block(ctx, WIDTH - 24, 0, 24, HEIGHT, "#263548");
  block(ctx, 20, 0, 4, HEIGHT, "#172737");
  block(ctx, WIDTH - 24, 0, 4, HEIGHT, "#172737");
  for (const x of [3, 7, 12, 16]) {
    block(ctx, x * 24, 5, 42, 15, "#182a3d");
    block(ctx, x * 24 + 3, 7, 36, 10, "#4a8a9f");
    block(ctx, x * 24 + 3, 14, 36, 3, "#78b8bc");
    block(ctx, x * 24 + 20, 7, 2, 10, "#bad1c4");
  }
  block(ctx, 9 * 24, HEIGHT - 24, 48, 24, "#7ca6ad");
  block(ctx, 9 * 24 + 2, HEIGHT - 21, 44, 18, "#39576d");
  block(ctx, 10 * 24 - 1, HEIGHT - 21, 2, 18, "#9ebac0");
  block(ctx, 9 * 24 + 11, HEIGHT - 13, 3, 3, "#ddbe6b");
  block(ctx, 10 * 24 + 7, HEIGHT - 13, 3, 3, "#ddbe6b");
}

function drawFurniture(ctx, item, secretIsFound, player) {
  const x = item.x * TILE_SIZE;
  const y = item.y * TILE_SIZE;
  const b = (dx, dy, w, h, c) => block(ctx, x + dx, y + dy, w, h, c);
  block(ctx, x + 3, y + 20, 18, 4, "#273649");
  if (item.type === "desk") {
    b(2, 6, 20, 15, "#283647"); b(0, 4, 24, 7, "#b67e58");
    b(1, 4, 22, 2, "#e0aa7a"); b(4, 11, 4, 9, "#805b47");
    b(18, 11, 4, 9, "#805b47"); b(7, 1, 10, 5, "#1d3342");
    b(8, 2, 8, 3, "#77c4d3"); b(10, 6, 6, 1, "#e4caae");
  } else if (item.type === "table") {
    b(0, 7, 24, 12, "#8c694b"); b(0, 6, 24, 6, "#c09b70");
    b(2, 6, 20, 2, "#e6be86"); b(2, 18, 5, 5, "#6f4c3d");
    b(17, 18, 5, 5, "#6f4c3d");
    if (item.x === 10) { b(8, 3, 7, 5, "#f4deb0"); b(9, 4, 3, 2, "#6d98b2"); }
  } else if (item.type === "shelf") {
    b(3, 1, 18, 22, "#6b4d42"); b(5, 3, 14, 16, "#293a46");
    for (let i = 0; i < 3; i += 1) { b(5, 7 + i * 5, 14, 2, "#a17c5d"); b(7, 2 + i * 5, 3, 5, "#edbf77"); b(12, 2 + i * 5, 5, 5, "#74a9b9"); }
  } else if (item.type === "cooler") {
    b(6, 7, 13, 15, "#d7ded7"); b(5, 1, 15, 9, "#7ccada");
    b(8, 3, 9, 4, "#b2eaf1"); b(9, 12, 7, 3, "#869da8");
    b(12, 16, 3, 3, "#417f9e");
  } else if (item.type === "printer") {
    b(3, 9, 18, 13, "#263443"); b(4, 4, 16, 12, "#abb4b8");
    b(7, 1, 10, 7, "#f1e9c6"); b(7, 11, 10, 2, "#4d6073");
    b(16, 8, 2, 2, "#7ed5a2");
  } else if (item.type === "plant") {
    b(8, 13, 10, 9, "#a77958"); b(6, 12, 14, 3, "#dbac78");
    b(10, 4, 5, 12, "#458f67"); b(4, 7, 10, 7, "#3a815c");
    b(12, 2, 9, 11, "#5fb281"); b(3, 4, 7, 8, "#62b58a");
    b(12, 7, 5, 5, "#91d19a");
  } else if (item.type === "cabinet") {
    b(2, 1, 20, 22, "#24364a"); b(4, 2, 16, 19, "#617a8b");
    b(6, 5, 12, 6, "#829cac"); b(6, 13, 12, 6, "#829cac");
    b(11, 8, 4, 2, "#dfca89"); b(11, 16, 4, 2, "#dfca89");
    // Only reveal the shimmer after the player gets close to this cabinet.
    if (!secretIsFound && Math.abs(player.x - item.x) + Math.abs(player.y - item.y) <= 2) {
      b(17, -5, 3, 3, "#ffeb9f"); b(18, -8, 1, 9, "#ffeb9f");
      b(15, -5, 9, 1, "#ffeb9f");
    }
  }
}

function drawPerson(ctx, person, done, isPlayer = false) {
  const x = person.x * TILE_SIZE;
  const y = person.y * TILE_SIZE;
  const b = (dx, dy, w, h, color) => block(ctx, x + dx, y + dy, w, h, color);
  const skin = isPlayer ? "#d9a06c" : (person.skin || "#e8ae83");
  const clothing = isPlayer ? "#4b97a1" : person.color;
  b(5, 21, 16, 3, "#293c4c");
  b(7, 16, 5, 6, "#263748"); b(14, 16, 5, 6, "#263748");
  b(5, 10, 15, 10, "#263747"); b(6, 9, 13, 10, clothing);
  b(4, 11, 3, 8, skin); b(19, 11, 3, 8, skin);
  b(8, 10, 4, 5, "#eef1d1"); b(12, 10, 3, 5, "#eef1d1");
  b(11, 13, 2, 6, "#2d4057");
  b(7, 2, 12, 10, "#263748"); b(8, 3, 11, 9, skin);
  b(5, 3, 5, 7, isPlayer ? "#b98455" : "#2f3345");
  b(16, 2, 4, 5, isPlayer ? "#b98455" : "#2f3345");
  b(8, 2, 10, 3, isPlayer ? "#b98455" : "#2f3345");
  b(11, 7, 2, 2, "#263748"); b(17, 7, 2, 2, "#263748");
  b(15, 10, 3, 1, "#9c6757");
  if (isPlayer) { b(5, 12, 2, 8, "#d29b59"); b(12, 17, 3, 3, "#f0c46a"); }
  if (!isPlayer) {
    // Floating pixel status glyph. Approvals show a green check.
    b(9, -11, 13, 10, done ? "#316f55" : "#263748");
    b(10, -10, 11, 8, done ? "#80d9a2" : "#f4c879");
    ctx.fillStyle = "#22394a";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(done ? "OK" : "!", x + 15, y - 3);
  }
}

function drawOfficeScene(canvas, game) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  drawFloor(ctx);
  // Small office decor and signs.
  block(ctx, 26, 29, 41, 9, "#1e3345");
  ctx.fillStyle = "#d6e8c8";
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "left";
  ctx.fillText("IB HQ", 31, 36);
  block(ctx, 16 * 24, 4 * 24 + 4, 27, 5, "#d7b27a");
  block(ctx, 16 * 24 + 3, 4 * 24 + 5, 10, 2, "#5f97a6");
  FURNITURE.forEach((item) => drawFurniture(ctx, item, game.foundPass, game.player));
  INTERVIEWERS.forEach((npc, index) => drawPerson(ctx, {
    ...npc,
    skin: ["#e8b88a", "#ca916c", "#edbb9a", "#b97e5b", "#eac098"][index],
  }, Boolean(game.completed[npc.id])));
  drawPerson(ctx, game.player, false, true);
  // Retro CRT scanlines are intentionally faint at native resolution.
  for (let y = 0; y < HEIGHT; y += 4) block(ctx, 0, y, WIDTH, 1, "rgba(15,25,35,0.07)");
}

function GameDialog({ game, dispatch }) {
  const npc = INTERVIEWERS.find((item) => item.id === game.activeId);
  const currentQuestion = game.questions[game.questionIndex];
  const completeCount = Object.keys(game.completed).length;
  const total = INTERVIEWERS.length;

  if (game.phase === "item") {
    return (
      <div className="officeQuestDialogShade">
        <div className="officeQuestDialog" role="status">
          <div className="officeQuestPixelIcon">1-UP</div>
          <span className="officeQuestOverline">SECRET DISCOVERED</span>
          <h2>A golden referral!</h2>
          <p>Hidden in the filing cabinet: a one-use interview skip. You can cash it in while talking to any interviewer. Choose carefully.</p>
          <button className="officeQuestPrimary" onClick={() => dispatch({ type: "EXPLORE" })}>Pocket the power-up</button>
        </div>
      </div>
    );
  }

  if (game.phase === "won") {
    return (
      <div className="officeQuestDialogShade officeQuestWinShade">
        <div className="officeQuestDialog officeQuestWin" role="status">
          <div className="officeQuestConfetti" aria-hidden="true">* + * + * + * + *</div>
          <div className="officeQuestTrophy" aria-hidden="true">WIN</div>
          <span className="officeQuestOverline">QUEST COMPLETE: 5 / 5</span>
          <h2>YOU GOT THE OFFER!</h2>
          <p>All five interviewers have signed off. You conquered the Interview Buddy office!</p>
          <p className="officeQuestSmall">This is a secret mini-game. No real interview scores, ELO, quotas, or history were changed.</p>
          <div className="officeQuestActions">
            <button className="officeQuestPrimary" onClick={() => dispatch({ type: "RESET" })}>Play again</button>
          </div>
        </div>
      </div>
    );
  }

  if (!npc) return null;
  if (game.phase === "intro") {
    return (
      <div className="officeQuestDialogShade">
        <div className="officeQuestDialog">
          <span className="officeQuestOverline" style={{ color: npc.color }}>{npc.tier} INTERVIEW</span>
          <h2>{npc.name} <small>/ {npc.title}</small></h2>
          <p className="officeQuestQuote">"{npc.dialogue}"</p>
          <p>Answer <strong>both</strong> questions correctly to earn this approval. Miss one? You can always retry.</p>
          <div className="officeQuestActions">
            <button className="officeQuestPrimary" onClick={() => dispatch({ type: "START", questions: selectQuestions(npc.id) })}>Start interview</button>
            {game.foundPass && !game.usedPass && (
              <button className="officeQuestGoldButton" onClick={() => dispatch({ type: "SKIP" })}>Use golden referral (1)</button>
            )}
            <button className="officeQuestPlain" onClick={() => dispatch({ type: "EXPLORE" })}>Maybe later</button>
          </div>
        </div>
      </div>
    );
  }

  if (game.phase === "interview" && currentQuestion) {
    return (
      <div className="officeQuestDialogShade">
        <div className="officeQuestDialog officeQuestQuestionDialog">
          <span className="officeQuestOverline" style={{ color: npc.color }}>{npc.tier} / QUESTION {game.questionIndex + 1} OF {game.questions.length}</span>
          <h2>{npc.name} asks...</h2>
          <p className="officeQuestQuestionText">{currentQuestion.prompt}</p>
          <div className="officeQuestOptions">
            {currentQuestion.options.map((option, index) => (
              <button key={`${currentQuestion.id}-${index}`} className="officeQuestOption" onClick={() => dispatch({ type: "ANSWER", index })}>
                <span className="officeQuestOptionNumber">{index + 1}</span> {option}
              </button>
            ))}
          </div>
          <p className="officeQuestSmall">Click an answer or press 1-4. Your choice is final for this attempt.</p>
        </div>
      </div>
    );
  }

  if (game.phase === "feedback" && currentQuestion) {
    const correct = game.selectedAnswer === currentQuestion.correct;
    return (
      <div className="officeQuestDialogShade">
        <div className="officeQuestDialog">
          <span className={`officeQuestVerdict ${correct ? "officeQuestRight" : "officeQuestWrong"}`}>{correct ? "CORRECT!" : "NOT QUITE!"}</span>
          <h2>{correct ? "Nice work!" : "Here's the trick."}</h2>
          <p><strong>Correct answer:</strong> {currentQuestion.options[currentQuestion.correct]}</p>
          <p>{currentQuestion.explanation}</p>
          <button className="officeQuestPrimary" onClick={() => dispatch({ type: "CONTINUE" })}>
            {game.questionIndex + 1 < game.questions.length ? "Next question" : "See interview result"}
          </button>
        </div>
      </div>
    );
  }

  if (game.phase === "summary") {
    const passed = Boolean(game.completed[npc.id]);
    const skipped = game.completed[npc.id] === "skipped";
    return (
      <div className="officeQuestDialogShade">
        <div className="officeQuestDialog">
          <span className="officeQuestOverline">{npc.tier} INTERVIEW COMPLETE</span>
          <h2>{skipped ? "Referral accepted!" : passed ? "Approved!" : "Keep practicing!"}</h2>
          <p>{skipped ? `${npc.name} signed off on your golden referral.` : `You answered ${game.correctCount} of ${game.questions.length} questions correctly.`}</p>
          <p>{passed ? `${completeCount}/${total} interviewers cleared. Keep exploring the office!` : "You'll need 2/2 to pass, but there's no penalty for another try."}</p>
          <div className="officeQuestActions">
            {!passed && <button className="officeQuestPrimary" onClick={() => dispatch({ type: "RETRY" })}>Try again</button>}
            <button className={passed ? "officeQuestPrimary" : "officeQuestPlain"} onClick={() => dispatch({ type: "EXPLORE" })}>Back to office</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function OfficeQuest({ onClose }) {
  const [game, dispatch] = useReducer(gameReducer, undefined, createInitialGame);
  const canvasRef = useRef(null);
  const closeRef = useRef(null);
  const nearby = useMemo(() => getNearbyInterviewer(game.player), [game.player]);
  const nearCabinet = !nearby && isAdjacent(game.player, SECRET_CABINET);
  const progress = Object.keys(game.completed).length;
  const actionText = nearby
    ? `E / ENTER: Talk to ${nearby.name} (${nearby.tier.toLowerCase()})`
    : nearCabinet ? "E / ENTER: Inspect filing cabinet" : (game.notice || "Walk up to a coworker and press E to talk.");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    };
  }, []);

  useEffect(() => { drawOfficeScene(canvasRef.current, game); }, [game]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (isEditableTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (game.phase === "explore") {
        const direction = {
          ArrowUp: [0, -1], w: [0, -1],
          ArrowDown: [0, 1], s: [0, 1],
          ArrowLeft: [-1, 0], a: [-1, 0],
          ArrowRight: [1, 0], d: [1, 0],
        }[event.key.length === 1 ? event.key.toLowerCase() : event.key];
        if (direction) {
          event.preventDefault();
          dispatch({ type: "MOVE", dx: direction[0], dy: direction[1] });
        } else if (event.key.toLowerCase() === "e" || event.key === "Enter") {
          // Preserve Enter activation for accessible buttons.
          if (event.key === "Enter" && event.target?.closest?.("button")) return;
          event.preventDefault();
          dispatch({ type: "INTERACT" });
        }
      } else if (game.phase === "interview" && /^[1-4]$/.test(event.key)) {
        event.preventDefault();
        dispatch({ type: "ANSWER", index: Number(event.key) - 1 });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game.phase, onClose]);

  return (
    <div className="officeQuestBackdrop">
      <section className="officeQuestWindow" role="dialog" aria-modal="true" aria-label="Interview Buddy secret office quest">
        <header className="officeQuestHeader">
          <div className="officeQuestBrand">
            <span className="officeQuestBrandIcon" aria-hidden="true">IB</span>
            <div><span className="officeQuestOverline">INTERVIEW BUDDY / SECRET LEVEL</span><h1>AFTER HOURS: OFFICE QUEST</h1></div>
          </div>
          <div className="officeQuestHeaderRight">
            <span className="officeQuestProgress" aria-label={`${progress} of five interviews cleared`}>{progress} / 5 CLEARED</span>
            <button ref={closeRef} className="officeQuestClose" type="button" onClick={onClose} aria-label="Close secret game">X</button>
          </div>
        </header>
        <div className="officeQuestMain">
          <div className="officeQuestGameArea">
            <div className="officeQuestScene">
              <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="officeQuestCanvas" aria-label="Pixel art office. Move with arrow keys or WASD and interact with E." role="img" />
              {game.phase !== "explore" && <GameDialog game={game} dispatch={dispatch} />}
            </div>
            <div className="officeQuestPrompt" role="status"><span className="officeQuestPromptDot" aria-hidden="true" />{game.phase === "explore" ? actionText : "Your office adventure is in progress."}</div>
            <div className="officeQuestButtonRow" aria-label="Game controls">
              <div className="officeQuestDpad">
                <button type="button" aria-label="Move up" onClick={() => dispatch({ type: "MOVE", dx: 0, dy: -1 })}>UP</button>
                <div><button type="button" aria-label="Move left" onClick={() => dispatch({ type: "MOVE", dx: -1, dy: 0 })}>LEFT</button><button type="button" aria-label="Move down" onClick={() => dispatch({ type: "MOVE", dx: 0, dy: 1 })}>DOWN</button><button type="button" aria-label="Move right" onClick={() => dispatch({ type: "MOVE", dx: 1, dy: 0 })}>RIGHT</button></div>
              </div>
              <button className="officeQuestTalkButton" type="button" onClick={() => dispatch({ type: "INTERACT" })} disabled={game.phase !== "explore"}>E / TALK</button>
            </div>
          </div>
          <aside className="officeQuestSide">
            <div className="officeQuestQuestTitle"><span>MISSION 01</span><h2>LAND THE JOB</h2><p>Find five coworkers. Pass their mini-interviews to get the offer.</p></div>
            <div className="officeQuestNPCList">
              {INTERVIEWERS.map((npc) => (
                <div key={npc.id} className={`officeQuestNPC ${game.completed[npc.id] ? "officeQuestNPCDone" : ""}`}>
                  <span className="officeQuestNPCPixel" style={{ background: npc.color }} aria-hidden="true" />
                  <span><strong>{npc.name}</strong><small>{npc.tier}</small></span>
                  <span className="officeQuestNPCStatus">{game.completed[npc.id] === "skipped" ? "SKIP" : game.completed[npc.id] ? "PASS" : "---"}</span>
                </div>
              ))}
            </div>
            <div className="officeQuestInventory"><span>INVENTORY</span><strong>{!game.foundPass ? "[ empty ]" : game.usedPass ? "[ referral used ]" : "[ golden referral x1 ]"}</strong></div>
            <div className="officeQuestHelp"><span>HOW TO PLAY</span><p><strong>WASD / ARROWS</strong> Move<br /><strong>E / ENTER</strong> Interact<br /><strong>1 - 4</strong> Pick an answer<br /><strong>ESC</strong> Exit game</p><p className="officeQuestSmall">Psst... the office has secrets.</p></div>
          </aside>
        </div>
        <footer className="officeQuestFooter">JUST FOR FUN - GAME PROGRESS STAYS IN THIS WINDOW. NO REAL INTERVIEW DATA IS CHANGED.</footer>
      </section>
    </div>
  );
}
