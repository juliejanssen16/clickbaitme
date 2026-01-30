// ClickbaitMe.nl — tiny chaos webgame
// "Instructions not guaranteed" 😉
// Made by JourHelp (credit link in HTML footer)

const arena = document.getElementById("arena");
const instructionText = document.getElementById("instructionText");
const msg = document.getElementById("message");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const toggleModeBtn = document.getElementById("toggleMode");

const levelEl = document.getElementById("level");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");

let state = {
  running: false,
  level: 1,
  score: 0,
  streak: 0,
  chaosMode: false,
  rule: null,
  correctId: null,
  buttons: [],
};

const RULES = [
  {
    title: "Klik de GROOTSTE knop.",
    // Clickbait: eigenlijk de kleinste
    pickCorrect: (buttons) => buttons.reduce((a, b) => (a.area < b.area ? a : b)).id,
    hint: "Te obvious? Misschien juist niet 👀",
  },
  {
    title: "Klik de KLEINSTE knop.",
    // Clickbait: eigenlijk de grootste
    pickCorrect: (buttons) => buttons.reduce((a, b) => (a.area > b.area ? a : b)).id,
    hint: "Big brain… of big button 🧠",
  },
  {
    title: "Klik de meest SUS knop.",
    pickCorrect: (buttons) => {
      let best = buttons[0];
      for (const b of buttons) if (b.sus > best.sus) best = b;
      return best.id;
    },
    hint: "Vertrouw je gevoel. Of juist niet 😈",
  },
  {
    title: "Klik de knop die het DICHTST bij het midden zit.",
    pickCorrect: (buttons) => {
      const rect = arena.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      let best = buttons[0];
      let bestD = Infinity;

      for (const b of buttons) {
        const bx = b.x + b.w / 2;
        const by = b.y + b.h / 2;
        const d = (bx - cx) ** 2 + (by - cy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      return best.id;
    },
    hint: "Zoek je innerlijke balans 🧘",
  },
  {
    title: "Klik de knop die het VERST van het midden zit.",
    pickCorrect: (buttons) => {
      const rect = arena.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      let best = buttons[0];
      let bestD = -1;

      for (const b of buttons) {
        const bx = b.x + b.w / 2;
        const by = b.y + b.h / 2;
        const d = (bx - cx) ** 2 + (by - cy) ** 2;
        if (d > bestD) {
          bestD = d;
          best = b;
        }
      }
      return best.id;
    },
    hint: "Social distancing, maar dan esthetisch.",
  },
  {
    title: "Klik de knop met de meest rare tekst.",
    pickCorrect: (buttons) => {
      const target = 7; // ‘weirdness’ target lengte
      let best = buttons[0];
      let bestScore = Infinity;
      for (const b of buttons) {
        const s = Math.abs(b.label.length - target);
        if (s < bestScore) {
          bestScore = s;
          best = b;
        }
      }
      return best.id;
    },
    hint: "Woorden doen ertoe. Soms.",
  },
];

// ---------- Utils ----------
function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randi(min, max) {
  return Math.floor(rand(min, max + 1));
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function isMobile() {
  return window.matchMedia("(max-width: 640px)").matches;
}

// ---------- HUD ----------
function setHUD() {
  levelEl.textContent = String(state.level);
  scoreEl.textContent = String(state.score);
  streakEl.textContent = String(state.streak);
}

// ---------- Arena helpers ----------
function clearArena() {
  arena.innerHTML = "";
  state.buttons = [];
}

function placeButtons(count) {
  const rect = arena.getBoundingClientRect();
  const padding = isMobile() ? 12 : 10;
  const spacing = isMobile() ? 18 : 14;

  const buttons = [];

  for (let i = 0; i < count; i++) {
    // Bigger tap targets on mobile
    const w = isMobile() ? randi(120, 230) : randi(80, 175);
    const h = isMobile() ? randi(70, 120) : randi(48, 95);

    let x = 0, y = 0;

    for (let tries = 0; tries < 32; tries++) {
      x = randi(padding, Math.max(padding, Math.floor(rect.width - w - padding)));
      y = randi(padding, Math.max(padding, Math.floor(rect.height - h - padding)));

      const overlaps = buttons.some(
        (b) =>
          x < b.x + b.w + spacing &&
          x + w + spacing > b.x &&
          y < b.y + b.h + spacing &&
          y + h + spacing > b.y
      );
      if (!overlaps) break;
    }

    const labelPool = ["OK", "NOPE", "JA", "NEE", "MISSCHIEN", "???", "lol", "help", "bait", "sus", "bruh", "pls"];
    const label = labelPool[randi(0, labelPool.length - 1)];

    buttons.push({
      id: `b${i}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      x, y, w, h,
      label,
      area: w * h,
      sus: Math.random(),
    });
  }

  return buttons;
}

function renderButtons(buttons) {
  clearArena();

  for (const b of buttons) {
    const el = document.createElement("button");
    el.className = "gameBtn";
    el.type = "button";
    el.textContent = b.label;

    el.style.left = `${b.x}px`;
    el.style.top = `${b.y}px`;
    el.style.width = `${b.w}px`;
    el.style.height = `${b.h}px`;

    const rot = isMobile() ? rand(-3, 3) : rand(-6, 6);
    el.style.transform = `rotate(${rot}deg)`;

    el.dataset.id = b.id;

    // pointer works for mouse + touch
    el.addEventListener("pointerup", onPick, { passive: true });

    arena.appendChild(el);
  }
}

function pickRule() {
  return RULES[randi(0, RULES.length - 1)];
}

// ---------- Game flow ----------
function startRound() {
  state.running = true;
  resetBtn.disabled = false;
  startBtn.textContent = "Next";

  const count = clamp(3 + Math.floor(state.level / 2), 3, isMobile() ? 7 : 9);
  const buttons = placeButtons(count);
  state.buttons = buttons;

  state.rule = pickRule();

  // 30% decoy instruction
  const showDecoy = Math.random() < 0.30;
  let shownTitle = state.rule.title;

  if (showDecoy) {
    const alt = RULES[randi(0, RULES.length - 1)];
    if (alt.title !== shownTitle) shownTitle = alt.title;
  }

  instructionText.textContent = shownTitle;
  msg.textContent = state.chaosMode ? `Chaos mode: ON 😈 • ${state.rule.hint}` : state.rule.hint;

  // correct based on TRUE rule
  state.correctId = state.rule.pickCorrect(buttons);

  renderButtons(buttons);

  if (state.chaosMode) enableChaosMotion();
  else disableChaosMotion();
}

function endRound(success) {
  if (success) {
    state.streak += 1;
    state.score += 10 + Math.min(25, state.streak * 2);
    state.level += 1;
    msg.textContent = randomWinLine();
  } else {
    state.streak = 0;
    state.score = Math.max(0, state.score - 8);
    msg.textContent = randomFailLine();
  }
  setHUD();
}

function onPick(e) {
  if (!state.running) return;

  const target = e.currentTarget;
  const pickedId = target.dataset.id;
  const correct = pickedId === state.correctId;

  target.style.filter = correct ? "brightness(1.35)" : "brightness(.85)";
  target.style.transform += correct ? " scale(1.03)" : " scale(.96)";

  revealCorrect(pickedId);
  endRound(correct);
}

function revealCorrect(pickedId) {
  const nodes = [...arena.querySelectorAll(".gameBtn")];

  for (const n of nodes) {
    n.disabled = true;
    const id = n.dataset.id;

    if (id === state.correctId) {
      n.textContent = id === pickedId ? "✅ NICE" : "✅ HERE";
      n.style.boxShadow = "0 0 0 4px rgba(255,79,216,.35), 0 16px 38px rgba(0,0,0,.45)";
    } else if (id === pickedId) {
      n.textContent = "❌ OOPS";
      n.style.opacity = ".82";
    } else {
      n.style.opacity = ".55";
    }
  }
}

function resetGame() {
  state.running = false;
  state.level = 1;
  state.score = 0;
  state.streak = 0;
  state.rule = null;
  state.correctId = null;

  clearArena();
  disableChaosMotion();

  instructionText.textContent = "Press Start. Trust nothing.";
  msg.textContent = "Tip: Soms liegt de instructie. Soms lieg jij tegen jezelf. Het is oké 😌";
  startBtn.textContent = "Start";
  resetBtn.disabled = true;

  setHUD();
}

// ---------- Chaos motion ----------
let chaosTimer = null;

function enableChaosMotion() {
  disableChaosMotion();

  const interval = isMobile() ? 280 : 240;
  const step = isMobile() ? 5 : 6;

  chaosTimer = setInterval(() => {
    const rect = arena.getBoundingClientRect();
    const nodes = [...arena.querySelectorAll(".gameBtn")];

    for (const el of nodes) {
      const dx = randi(-step, step);
      const dy = randi(-step, step);

      const left = parseFloat(el.style.left || "0");
      const top = parseFloat(el.style.top || "0");

      const w = el.getBoundingClientRect().width;
      const h = el.getBoundingClientRect().height;

      const nx = clamp(left + dx, 6, rect.width - w - 6);
      const ny = clamp(top + dy, 6, rect.height - h - 6);

      el.style.left = `${nx}px`;
      el.style.top = `${ny}px`;
    }
  }, interval);
}

function disableChaosMotion() {
  if (chaosTimer) clearInterval(chaosTimer);
  chaosTimer = null;
}

// ---------- Flavor text ----------
function randomWinLine() {
  const lines = [
    "Je klikte… en het was goed 😅",
    "Correct! Je bent gevaarlijk goed hierin.",
    "Je trapte erin — maar op de juiste manier 😈",
    "Nice. Verdacht nice.",
    "Winst! (Dit stond niet in de clickbait.)",
  ];
  return lines[randi(0, lines.length - 1)];
}

function randomFailLine() {
  const lines = [
    "Clickbait got you 😌",
    "Nope. Dat was letterlijk de val.",
    "Fout. Maar wel met overtuiging!",
    "Oeps. Je wist het eigenlijk wel.",
    "Je klikte alsof je het meende. Respect.",
  ];
  return lines[randi(0, lines.length - 1)];
}

// ---------- Events ----------
startBtn.addEventListener("click", () => startRound());
resetBtn.addEventListener("click", () => resetGame());

toggleModeBtn.addEventListener("click", () => {
  state.chaosMode = !state.chaosMode;
  msg.textContent = state.chaosMode ? "Chaos mode: ON 😈" : "Chaos mode: OFF 🙂";

  if (state.running) {
    if (state.chaosMode) enableChaosMotion();
    else disableChaosMotion();
  }
});

// On resize/orientation change: reroll round so buttons stay in bounds
let resizeTimer = null;
window.addEventListener("resize", () => {
  if (!state.running) return;
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => startRound(), 180);
});

// Prevent double-tap zoom weirdness on some mobile browsers (best-effort)
document.addEventListener(
  "dblclick",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

// init
resetGame();
