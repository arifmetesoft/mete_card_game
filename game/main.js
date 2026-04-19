import { RunnerGameEngine } from "./engine.js";
import { LEVELS } from "./levels.js";
import { loadProgress, saveProgress } from "./storage.js";

const hudLevel = document.getElementById("hudLevel");
const hudGold = document.getElementById("hudGold");
const hudDistance = document.getElementById("hudDistance");
const hudBoost = document.getElementById("hudBoost");
const livesHearts = document.getElementById("livesHearts");

const taskGoldCard = document.getElementById("taskGoldCard");
const taskDistanceCard = document.getElementById("taskDistanceCard");
const taskGoldText = document.getElementById("taskGoldText");
const taskDistanceText = document.getElementById("taskDistanceText");
const taskGoldFill = document.getElementById("taskGoldFill");
const taskDistanceFill = document.getElementById("taskDistanceFill");
const statusLine = document.getElementById("statusLine");
const notificationStack = document.getElementById("notificationStack");
const bossHealthBar = document.getElementById("bossHealthBar");
const bossFill = document.getElementById("bossFill");
const bossText = document.getElementById("bossText");

const shopPanel = document.getElementById("shopPanel");
const totalGoldDisplay = document.getElementById("totalGoldDisplay");
const buySpeedPotionBtn = document.getElementById("buySpeedPotion");
const potionActiveDisplay = document.getElementById("potionActiveDisplay");
const potionTimer = document.getElementById("potionTimer");

const levelGrid = document.getElementById("levelGrid");
const canvas = document.getElementById("gameCanvas");

const moveLeftBtn = document.getElementById("moveLeftBtn");
const moveRightBtn = document.getElementById("moveRightBtn");
const jumpBtn = document.getElementById("jumpBtn");

const overlay = document.getElementById("levelCompleteOverlay");
const overlaySummary = document.getElementById("overlaySummary");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const replayLevelBtn = document.getElementById("replayLevelBtn");
const closeOverlayBtn = document.getElementById("closeOverlayBtn");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const gameOverMessage = document.getElementById("gameOverMessage");
const restartGameBtn = document.getElementById("restartGameBtn");
const finalStoryOverlay = document.getElementById("finalStoryOverlay");
const finalStoryText = document.getElementById("finalStoryText");
const finalReplayBtn = document.getElementById("finalReplayBtn");
const finalMenuBtn = document.getElementById("finalMenuBtn");
const storyIntroOverlay = document.getElementById("storyIntroOverlay");
const storyIntroText = document.getElementById("storyIntroText");
const storyContinueBtn = document.getElementById("storyContinueBtn");

const progress = loadProgress(LEVELS.length);
let activeLevel = 1;
let lastCompletion = null;
let gameOverActive = false;
let lastLives = null;
let lastMaxLives = null;
let gameState = "intro";
let introActive = true;
let introTypingDone = false;
let introTypeTimer = null;
let finalActive = false;
let finalTypeTimer = null;

const INTRO_STORY =
  "Bir gun aniden dusmanlar Turkiye'ye saldirdi.\n" +
  "Ulke buyuk bir tehlike altina girdi.\n" +
  "Bu saldiriyi durdurabilecek tek kisi sensin.\n" +
  "Zorlu parkurlari as, dusmanlari yen ve ulkeni kurtar!";

const FINAL_STORY =
  "On bolumluk uzun ve zorlu mucadelenin sonunda dusman hatti dagitildi.\n" +
  "Isgal gucleri geri cekildi, sehirlerde yeniden umut atesleri yandi.\n\n" +
  "Hapiste tutulan insanlarimizi kurtardin; aileler yeniden bir araya geldi.\n" +
  "Her adimda buyuyen tehlikeyi durdurdun, ulkenin kaderini degistirdin.\n\n" +
  "Bu zafer bir ordunun degil, senin cesaretinin zaferi oldu.\n" +
  "Turkiye seni unutmayacak.";

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function setStatus(message) {
  statusLine.textContent = message;
}

function renderLivesHearts(livesValue, maxLivesValue) {
  if (!livesHearts) return;

  const safeMaxLives = Math.max(0, Math.floor(Number(maxLivesValue) || 0));
  const cappedMaxLives = Math.min(5, safeMaxLives);
  const safeLives = Math.max(0, Math.floor(Number(livesValue) || 0));
  const cappedLives = Math.min(cappedMaxLives || safeLives, safeLives);

  if (lastLives === cappedLives && lastMaxLives === cappedMaxLives) return;
  lastLives = cappedLives;
  lastMaxLives = cappedMaxLives;

  livesHearts.textContent = "";
  livesHearts.setAttribute("aria-label", `Can: ${cappedLives}`);

  for (let i = 0; i < cappedLives; i += 1) {
    const heart = document.createElement("span");
    heart.className = "heart-icon";
    heart.textContent = "\u2764\uFE0F";
    heart.style.animationDelay = `${i * 0.08}s`;
    livesHearts.appendChild(heart);
  }
}

function notify(message) {
  const item = document.createElement("div");
  item.className = "notification";
  item.textContent = message;
  notificationStack.prepend(item);

  requestAnimationFrame(() => {
    item.classList.add("show");
  });

  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => {
      item.remove();
    }, 220);
  }, 2200);
}

function stopIntroTypewriter() {
  if (introTypeTimer !== null) {
    clearInterval(introTypeTimer);
    introTypeTimer = null;
  }
}

function startIntroTypewriter() {
  if (!storyIntroText) return;

  stopIntroTypewriter();
  introTypingDone = false;
  storyIntroText.textContent = "";
  let index = 0;

  introTypeTimer = setInterval(() => {
    index += 1;
    storyIntroText.textContent = INTRO_STORY.slice(0, index);
    if (index < INTRO_STORY.length) return;

    introTypingDone = true;
    stopIntroTypewriter();
  }, 19);
}

function finishIntroImmediately() {
  if (!storyIntroText) return;
  stopIntroTypewriter();
  introTypingDone = true;
  storyIntroText.textContent = INTRO_STORY;
}

function closeStoryIntroAndStartGame() {
  if (!introActive) return;

  introActive = false;
  gameState = "playing";
  finishIntroImmediately();
  storyIntroOverlay?.classList.add("hidden");
  window.removeEventListener("keydown", handleStoryIntroKeyDown, true);
  startLevel(1);
}

function handleStoryIntroKeyDown(event) {
  if (!introActive) return;
  if (event.code !== "Space" && event.key !== " ") return;

  event.preventDefault();
  event.stopPropagation();
  closeStoryIntroAndStartGame();
}

function showStoryIntro() {
  if (!storyIntroOverlay) {
    closeStoryIntroAndStartGame();
    return;
  }

  introActive = true;
  gameState = "intro";
  storyIntroOverlay.classList.remove("hidden");
  startIntroTypewriter();
  window.addEventListener("keydown", handleStoryIntroKeyDown, true);
}

function stopFinalTypewriter() {
  if (finalTypeTimer !== null) {
    clearInterval(finalTypeTimer);
    finalTypeTimer = null;
  }
}

function startFinalTypewriter() {
  if (!finalStoryText) return;

  stopFinalTypewriter();
  finalStoryText.textContent = "";
  let index = 0;

  finalTypeTimer = setInterval(() => {
    index += 1;
    finalStoryText.textContent = FINAL_STORY.slice(0, index);
    if (index < FINAL_STORY.length) return;

    stopFinalTypewriter();
  }, 20);
}

function handleFinalOverlayKeyDown(event) {
  if (!finalActive) return;
  const blockedKeys = new Set([
    "arrowleft",
    "arrowright",
    "arrowup",
    " ",
    "a",
    "d",
    "w",
    "e"
  ]);
  if (!blockedKeys.has(event.key.toLowerCase())) return;
  event.preventDefault();
  event.stopPropagation();
}

function hideFinalStoryOverlay() {
  if (!finalActive) return;

  finalActive = false;
  stopFinalTypewriter();
  finalStoryOverlay?.classList.add("hidden");
  window.removeEventListener("keydown", handleFinalOverlayKeyDown, true);
}

function showFinalStoryOverlay() {
  hideOverlay();
  hideGameOverOverlay();
  finalActive = true;
  gameState = "final";
  finalStoryOverlay?.classList.remove("hidden");
  startFinalTypewriter();
  window.addEventListener("keydown", handleFinalOverlayKeyDown, true);
  setStatus("Son savas bitti. Zafer hikayesi gosteriliyor.");
}

function updateHud(snapshot) {
  renderLivesHearts(snapshot.lives, snapshot.maxLives);
  hudLevel.textContent = String(snapshot.level);
  hudGold.textContent = String(snapshot.gold);
  hudDistance.textContent = `${snapshot.distance} m`;
  if (snapshot.boostActive) {
    hudBoost.textContent = `Hizlandirma aktif (${snapshot.boostSeconds}s)`;
    hudBoost.dataset.boost = "true";
  } else {
    hudBoost.textContent = "Normal";
    hudBoost.dataset.boost = "false";
  }
}

function updateTasks(snapshot) {
  taskGoldText.textContent = `${snapshot.gold} (Bonus)`;
  taskDistanceText.textContent = `${snapshot.distance} / ${snapshot.distanceTarget} m`;

  const distanceRatio =
    snapshot.distanceTarget <= 0 ? 1 : snapshot.distance / snapshot.distanceTarget;

  taskGoldFill.style.width = "0%";
  taskDistanceFill.style.width = `${clampPercent(distanceRatio * 100)}%`;

  taskGoldCard.classList.remove("completed");
  taskDistanceCard.classList.toggle("completed", snapshot.distanceDone);
}

function updateBoss(snapshot) {
  if (!snapshot || !snapshot.visible) {
    bossHealthBar.classList.add("hidden");
    return;
  }

  bossHealthBar.classList.remove("hidden");

  if (snapshot.active) {
    bossHealthBar.classList.add("active");
  } else {
    bossHealthBar.classList.remove("active");
  }

  const healthRatio = snapshot.maxHealth > 0 ? snapshot.health / snapshot.maxHealth : 0;
  bossFill.style.width = `${clampPercent(healthRatio * 100)}%`;
  bossText.textContent = `Boss Cani: ${snapshot.health} / ${snapshot.maxHealth}`;

  const healthColor = healthRatio > 0.5 ? "#22c55e" : healthRatio > 0.25 ? "#eab308" : "#ef4444";
  bossFill.style.backgroundColor = healthColor;
}

function isLevelLocked(levelId) {
  return levelId > progress.unlockedLevel;
}

function createLevelButton(level) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "level-btn";
  button.textContent = String(level.id).padStart(2, "0");
  button.setAttribute("aria-label", level.name);

  if (activeLevel === level.id) {
    button.classList.add("active");
  }

  if (progress.completedLevels.includes(level.id)) {
    button.classList.add("completed");
  }

  if (isLevelLocked(level.id)) {
    button.disabled = true;
    button.title = "Kilitli bolum";
  } else {
    button.title = `${level.name} (${level.tasks.goldTarget} altin / ${level.tasks.distanceTarget} m)`;
    button.addEventListener("click", () => {
      startLevel(level.id);
    });
  }

  return button;
}

function renderLevelGrid() {
  levelGrid.innerHTML = "";
  for (const level of LEVELS) {
    levelGrid.appendChild(createLevelButton(level));
  }
}

function hideOverlay() {
  overlay.classList.add("hidden");
  lastCompletion = null;
}

function hideGameOverOverlay() {
  gameOverOverlay.classList.add("hidden");
  gameOverActive = false;
}

function showGameOverOverlay(payload) {
  hideFinalStoryOverlay();
  hideOverlay();
  gameOverActive = true;
  gameState = "gameover";
  gameOverOverlay.classList.remove("hidden");
  gameOverMessage.textContent = payload?.message || "Canin bitti. Oyun bitti.";
}

function showOverlay(completion) {
  lastCompletion = completion;
  overlay.classList.remove("hidden");

  const completedLevel = completion.levelId;
  overlaySummary.textContent = `Bolum ${completedLevel} bitti. Altin: ${completion.gold} / ${completion.tasks.goldTarget}, Mesafe: ${completion.distance} / ${completion.tasks.distanceTarget} m.`;

  if (completion.nextLevelId) {
    nextLevelBtn.style.display = "";
    nextLevelBtn.textContent = `Bolum ${completion.nextLevelId} Baslat`;
  } else {
    nextLevelBtn.style.display = "none";
  }
}

function applyLevelCompletion(completion) {
  if (!progress.completedLevels.includes(completion.levelId)) {
    progress.completedLevels.push(completion.levelId);
    progress.completedLevels.sort((a, b) => a - b);
  }

  if (completion.nextLevelId) {
    progress.unlockedLevel = Math.max(progress.unlockedLevel, completion.nextLevelId);
  } else {
    progress.unlockedLevel = LEVELS.length;
  }

  saveProgress(progress, LEVELS.length);
  renderLevelGrid();
}

const engine = new RunnerGameEngine(canvas, LEVELS, {
  onHudChange: updateHud,
  onTaskChange: updateTasks,
  onNotify: notify,
  onStatus: setStatus,
  onBossChange: updateBoss,
  onGameOver: (payload) => {
    showGameOverOverlay(payload);
  },
  onLevelComplete: (completion) => {
    if (gameOverActive) return;
    applyLevelCompletion(completion);
    if (completion.levelId >= LEVELS.length) {
      showFinalStoryOverlay();
      return;
    }
    showOverlay(completion);
  }
});

function updateShopUI() {
  if (!totalGoldDisplay) return;
  totalGoldDisplay.textContent = `Altin: ${engine.totalGold}`;

  const canAfford = engine.totalGold >= engine.POTION_SPEED_COST;
  const isActive = engine.potionSpeedActive;

  if (buySpeedPotionBtn) {
    buySpeedPotionBtn.disabled = !canAfford || isActive;
    buySpeedPotionBtn.textContent = isActive ? "Aktif" : (canAfford ? "Satın Al" : "Yetersiz");
  }

  if (potionActiveDisplay) {
    if (isActive) {
      potionActiveDisplay.classList.remove("hidden");
      potionTimer.textContent = `${Math.ceil(engine.potionSpeedTimer)}s`;
    } else {
      potionActiveDisplay.classList.add("hidden");
    }
  }
}

function buySpeedPotion() {
  const result = engine.buySpeedPotion();
  if (result.success) {
    notify(`Hiz iksiri alindi! Kalan altin: ${engine.totalGold}`);
  } else {
    notify(result.message);
  }
  updateShopUI();
}

if (buySpeedPotionBtn) {
  buySpeedPotionBtn.addEventListener("click", buySpeedPotion);
}

function startLevel(levelId) {
  if (isLevelLocked(levelId)) return;
  activeLevel = levelId;
  gameState = "playing";
  hideFinalStoryOverlay();
  hideOverlay();
  hideGameOverOverlay();
  renderLevelGrid();
  engine.loadLevel(levelId);
  updateShopUI();
}

function bindHoldButton(button, onDown, onUp) {
  const release = (event) => {
    event.preventDefault();
    onUp();
  };

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    onDown();
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

bindHoldButton(
  moveLeftBtn,
  () => engine.setMoveLeft(true),
  () => engine.setMoveLeft(false)
);

bindHoldButton(
  moveRightBtn,
  () => engine.setMoveRight(true),
  () => engine.setMoveRight(false)
);

jumpBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  engine.queueJump();
});

nextLevelBtn.addEventListener("click", () => {
  if (!lastCompletion?.nextLevelId) return;
  startLevel(lastCompletion.nextLevelId);
});

replayLevelBtn.addEventListener("click", () => {
  const replayLevel = lastCompletion?.levelId ?? activeLevel;
  startLevel(replayLevel);
});

closeOverlayBtn.addEventListener("click", () => {
  hideOverlay();
  setStatus(`Bolum ${activeLevel} secili. Hazirsan devam et.`);
});

restartGameBtn.addEventListener("click", () => {
  hideGameOverOverlay();
  gameState = "playing";
  engine.restartGameFromLevel(activeLevel);
});

if (finalReplayBtn) {
  finalReplayBtn.addEventListener("click", () => {
    hideFinalStoryOverlay();
    gameState = "playing";
    activeLevel = 1;
    renderLevelGrid();
    engine.restartGameFromLevel(1);
    updateShopUI();
    setStatus("Yeni oyun basladi. Bolum 1.");
  });
}

if (finalMenuBtn) {
  finalMenuBtn.addEventListener("click", () => {
    hideFinalStoryOverlay();
    gameState = "menu";
    renderLevelGrid();
    setStatus("Ana menuye donuldu. Bolum secerek devam edebilirsin.");
  });
}

if (storyContinueBtn) {
  storyContinueBtn.addEventListener("click", () => {
    closeStoryIntroAndStartGame();
  });
}

renderLevelGrid();
engine.start();
updateShopUI();
showStoryIntro();
