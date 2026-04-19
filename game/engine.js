const VIEWPORT_WIDTH = 1600;
const VIEWPORT_HEIGHT = 900;
const GROUND_MARGIN = 110;
const PLAYER_WIDTH = 44;
const PLAYER_HEIGHT = 68;
const PLAYER_SPEED = 285;
const JUMP_SPEED = 670;
const GRAVITY = 1780;
const PIXELS_PER_METER = 18;
const DISTANCE_MIN_FORWARD_STEP = 2.25;
const SPEED_BOOST_DURATION_SEC = 5;
const SPEED_BOOST_MULTIPLIER = 1.55;
const ENEMY_HIT_COOLDOWN_SEC = 0.85;
const INVINCIBILITY_DURATION_SEC = 2.0;
const ATTACK_RANGE = 78;
const ATTACK_ACTIVE_SEC = 0.16;
const ATTACK_COOLDOWN_SEC = 0.32;
const STOMP_BOUNCE_SPEED = 440;
const STOMP_TOP_TOLERANCE = 14;
const MAX_LIVES = 3;
const MAX_BACKTRACK_DISTANCE = 1200;
const BACKTRACK_WARN_INTERVAL_SEC = 1.3;
const BOSS_WIDTH = 120;
const BOSS_HEIGHT = 140;
const BOSS_BASE_HEALTH = 8;
const BOSS_SPEED = 90;
const BOSS_DAMAGE = 1;
const BOSS_ACTIVE_DISTANCE = 400;
const MAX_ENEMY_COUNT = 52;
const ENEMY_MIN_SPACING_BASE = 560;
const PLANK_PICKUP_RANGE = 86;
const PLANK_PLACE_RANGE = 116;
const PLANK_BRIDGE_THICKNESS = 12;
const PLANK_BRIDGE_OVERHANG = 18;
const PIT_FALL_THRESHOLD = 220;
const SKY_BIRD_MIN_COUNT = 6;
const SKY_BIRD_MAX_COUNT = 10;
const SKY_BIRD_OVERSCAN = 180;

const SKY_BIRD_TYPE_CONFIG = Object.freeze({
  small: Object.freeze({
    bodyWidth: 9,
    bodyHeight: 3.4,
    wingSpan: 11,
    wingLift: 4.1,
    wingFlapRange: 2.3,
    wingTipSwing: 1.2,
    lineWidth: 1.35,
    speedMin: 24,
    speedMax: 38,
    wingSpeedMin: 8.8,
    wingSpeedMax: 11.4,
    bobMin: 1.4,
    bobMax: 3.2,
    alpha: 0.76,
    color: "#334155",
    bodyColor: "#1f2937",
    accentColor: "#475569"
  }),
  large: Object.freeze({
    bodyWidth: 13,
    bodyHeight: 5.1,
    wingSpan: 16,
    wingLift: 5.5,
    wingFlapRange: 2.8,
    wingTipSwing: 1.6,
    lineWidth: 1.8,
    speedMin: 18,
    speedMax: 31,
    wingSpeedMin: 6.6,
    wingSpeedMax: 8.4,
    bobMin: 2.2,
    bobMax: 4.4,
    alpha: 0.82,
    color: "#1e293b",
    bodyColor: "#0f172a",
    accentColor: "#334155"
  }),
  thinWing: Object.freeze({
    bodyWidth: 8.4,
    bodyHeight: 3.2,
    wingSpan: 18,
    wingLift: 3.2,
    wingFlapRange: 3.1,
    wingTipSwing: 2.1,
    lineWidth: 1.15,
    speedMin: 28,
    speedMax: 44,
    wingSpeedMin: 9.6,
    wingSpeedMax: 12.8,
    bobMin: 1.1,
    bobMax: 2.8,
    alpha: 0.72,
    color: "#475569",
    bodyColor: "#334155",
    accentColor: "#64748b"
  }),
  wideWing: Object.freeze({
    bodyWidth: 10.8,
    bodyHeight: 4.2,
    wingSpan: 20,
    wingLift: 5.9,
    wingFlapRange: 2.5,
    wingTipSwing: 1.4,
    lineWidth: 1.62,
    speedMin: 21,
    speedMax: 34,
    wingSpeedMin: 7.4,
    wingSpeedMax: 9.2,
    bobMin: 1.8,
    bobMax: 3.9,
    alpha: 0.78,
    color: "#374151",
    bodyColor: "#1f2937",
    accentColor: "#4b5563"
  })
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, t) {
  return from + (to - from) * t;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export class RunnerGameEngine {
  constructor(canvas, levels, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.levels = levels;
    this.callbacks = {
      onHudChange: callbacks.onHudChange,
      onTaskChange: callbacks.onTaskChange,
      onNotify: callbacks.onNotify,
      onStatus: callbacks.onStatus,
      onLevelComplete: callbacks.onLevelComplete,
      onGameOver: callbacks.onGameOver
    };

    this.viewport = {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT
    };

    this.currentLevel = null;
    this.currentLevelNumber = 0;
    this.maxLives = MAX_LIVES;
    this.lives = MAX_LIVES;
    this.healCollectedLevels = new Set();
    this.levelHealCollected = false;
    this.world = null;
    this.player = null;
    this.cameraX = 0;
    this.totalGold = 0;
    this.progress = {
      gold: 0,
      distance: 0,
      traveledPx: 0,
      maxX: 0
    };
    this.taskFlags = {
      goldDone: false,
      distanceDone: false,
      levelDone: false
    };

    this.speedBoostActive = false;
    this.speedBoostTimer = 0;
    this.potionSpeedActive = false;
    this.potionSpeedTimer = 0;
    this.POTION_SPEED_COST = 30;
    this.POTION_SPEED_DURATION = 10;
    this.POTION_SPEED_MULTIPLIER = 1.4;
    this.enemyHitCooldown = 0;
    this.invincibilityTimer = 0;
    this.attackActive = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackDamagePending = false;
    this.backtrackWarnTimer = 0;

    this.input = {
      right: false,
      left: false,
      jumpQueued: false,
      attackQueued: false,
      plankActionQueued: false
    };

    this.lastHud = null;
    this.lastTask = null;
    this.running = false;
    this.paused = true;
    this.lastFrameTime = 0;
    this.renderTime = 0;
    this.baseScaleX = 1;
    this.baseScaleY = 1;

    this.handleResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onWindowBlur = this.onWindowBlur.bind(this);

    this.setupCanvasScale();
    this.attachInput();
    this.renderStaticWelcome();
    window.addEventListener("resize", this.handleResize);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onWindowBlur);
  }

  setupCanvasScale() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const bounds = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(bounds.width || this.viewport.width));
    const cssHeight = Math.max(1, Math.round(bounds.height || this.viewport.height));

    this.canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.floor(cssHeight * dpr));

    // Keep world coordinates stable while matching device-pixel resolution.
    const scaleX = this.canvas.width / this.viewport.width;
    const scaleY = this.canvas.height / this.viewport.height;
    this.baseScaleX = scaleX;
    this.baseScaleY = scaleY;
    this.applyCanvasTransform();
  }

  applyCanvasTransform() {
    // Always render in normal Y orientation; only local sprite code may mirror on X.
    this.ctx.setTransform(this.baseScaleX, 0, 0, this.baseScaleY, 0, 0);
  }

  handleResize() {
    this.setupCanvasScale();
  }

  attachInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onWindowBlur);
  }

  onWindowBlur() {
    this.input.right = false;
    this.input.left = false;
    this.input.jumpQueued = false;
    this.input.attackQueued = false;
    this.input.plankActionQueued = false;
  }

  onKeyDown(event) {
    if (event.repeat) return;

    const key = event.key.toLowerCase();
    if (key === "arrowright" || key === "d") {
      this.input.right = true;
      return;
    }

    if (key === "arrowleft" || key === "a") {
      this.input.left = true;
      return;
    }

    if (key === " " || key === "arrowup" || key === "w") {
      event.preventDefault();
      this.queueJump();
      return;
    }

    if (key === "e") {
      this.queueAttack();
      return;
    }

    if (key === "q") {
      this.queuePlankAction();
    }
  }

  onKeyUp(event) {
    const key = event.key.toLowerCase();
    if (key === "arrowright" || key === "d") {
      this.input.right = false;
      return;
    }

    if (key === "arrowleft" || key === "a") {
      this.input.left = false;
    }
  }

  setMoveRight(active) {
    this.input.right = Boolean(active);
  }

  setMoveLeft(active) {
    this.input.left = Boolean(active);
  }

  queueJump() {
    this.input.jumpQueued = true;
  }

  queueAttack() {
    this.input.attackQueued = true;
  }

  queuePlankAction() {
    this.input.plankActionQueued = true;
  }

  loadLevel(levelNumber, options = {}) {
    const preserveLives = options.preserveLives !== false;
    const announce = options.announce !== false;

    const nextLevelNumber = Number(levelNumber);
    if (!Number.isInteger(nextLevelNumber)) return;
    if (nextLevelNumber < 1 || nextLevelNumber > this.levels.length) return;
    if (!preserveLives) {
      this.lives = this.maxLives;
    }

    this.currentLevelNumber = nextLevelNumber;
    this.currentLevel = this.levels[nextLevelNumber - 1];
    this.world = this.buildWorld(this.currentLevel);
    this.levelHealCollected = this.healCollectedLevels.has(this.currentLevel.id);

    this.player = {
      x: this.world.startX,
      y: this.world.groundY - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      onGround: true,
      jumpsUsed: 0,
      facing: 1,
      stepTime: 0,
      carryingPlank: false,
      carriedPlankId: null,
      anim: {
        state: "idle",
        speedBlend: 0,
        walkBlend: 0,
        runBlend: 0,
        jumpBlend: 0,
        attackBlend: 0,
        idleBlend: 1,
        idleTime: 0,
        landingImpact: 0
      }
    };

    this.cameraX = 0;
    this.progress = {
      gold: 0,
      distance: 0,
      traveledPx: 0,
      maxX: this.player.x
    };
    this.taskFlags = {
      goldDone: false,
      distanceDone: false,
      levelDone: false
    };
    this.speedBoostActive = false;
    this.speedBoostTimer = 0;
    this.enemyHitCooldown = 0;
    this.invincibilityTimer = 0;
    this.attackActive = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackDamagePending = false;
    this.backtrackWarnTimer = 0;
    this.lastHud = null;
    this.lastTask = null;
    this.input.jumpQueued = false;
    this.input.attackQueued = false;
    this.input.plankActionQueued = false;

    this.paused = false;
    if (announce) {
      this.emitStatus(`${this.currentLevel.name} basladi. Gorevleri tamamla.`);
      this.notify(
        `Yeni gorev: ${this.currentLevel.tasks.goldTarget} altin, ${this.currentLevel.tasks.distanceTarget} metre.`
      );
      if (this.world.pits.length > 0) {
        this.notify("Yerdeki tahtayi al ve Q ile bosluga kopru kur.");
      }
    }
    this.emitHud(true);
    this.emitTask(true);
  }

  restartGameFromLevel(levelNumber = this.currentLevelNumber || 1) {
    this.lives = this.maxLives;
    this.healCollectedLevels.clear();
    this.levelHealCollected = false;
    this.loadLevel(levelNumber, { announce: false, preserveLives: true });
    this.emitStatus(`Yeni oyun basladi. Can: ${this.lives}.`);
    this.notify("Yeni oyun basladi.");
  }

  pickBirdType(randomFn = Math.random) {
    const roll = randomFn();
    if (roll < 0.28) return "small";
    if (roll < 0.5) return "large";
    if (roll < 0.74) return "thinWing";
    return "wideWing";
  }

  getBirdTypeConfig(type) {
    return SKY_BIRD_TYPE_CONFIG[type] ?? SKY_BIRD_TYPE_CONFIG.small;
  }

  createSkyBird(randomFn = Math.random) {
    const type = this.pickBirdType(randomFn);
    const config = this.getBirdTypeConfig(type);
    const direction = randomFn() > 0.5 ? 1 : -1;

    const baseYMin = 34;
    const baseYMax = Math.min(235, this.viewport.height * 0.34);
    const baseY = baseYMin + randomFn() * Math.max(8, baseYMax - baseYMin);

    return {
      x: randomFn() * (this.viewport.width + SKY_BIRD_OVERSCAN * 2) - SKY_BIRD_OVERSCAN,
      y: baseY,
      speed: config.speedMin + randomFn() * (config.speedMax - config.speedMin),
      direction,
      type,
      wingAnimationFrame: randomFn() * Math.PI * 2,
      baseY,
      wingSpeed:
        config.wingSpeedMin +
        randomFn() * (config.wingSpeedMax - config.wingSpeedMin),
      bobAmplitude: config.bobMin + randomFn() * (config.bobMax - config.bobMin),
      bobSpeed: 0.7 + randomFn() * 1.2,
      bobPhase: randomFn() * Math.PI * 2,
      sizeScale: 0.9 + randomFn() * 0.26
    };
  }

  resetSkyBird(bird, randomFn = Math.random) {
    if (!bird) return;

    if (randomFn() < 0.32) {
      bird.type = this.pickBirdType(randomFn);
    }
    const config = this.getBirdTypeConfig(bird.type);

    bird.direction = randomFn() > 0.5 ? 1 : -1;
    bird.speed = config.speedMin + randomFn() * (config.speedMax - config.speedMin);
    bird.wingSpeed =
      config.wingSpeedMin + randomFn() * (config.wingSpeedMax - config.wingSpeedMin);
    bird.bobAmplitude = config.bobMin + randomFn() * (config.bobMax - config.bobMin);
    bird.bobSpeed = 0.7 + randomFn() * 1.2;
    bird.bobPhase = randomFn() * Math.PI * 2;
    bird.wingAnimationFrame = randomFn() * Math.PI * 2;
    bird.sizeScale = 0.9 + randomFn() * 0.26;

    const respawnPad = SKY_BIRD_OVERSCAN + randomFn() * 80;
    bird.x = bird.direction > 0 ? -respawnPad : this.viewport.width + respawnPad;

    const baseYMin = 34;
    const baseYMax = Math.min(235, this.viewport.height * 0.34);
    bird.baseY = baseYMin + randomFn() * Math.max(8, baseYMax - baseYMin);
    bird.y = bird.baseY;
  }

  createSkyBirdFlock(level, randomFn) {
    const birdCount = clamp(
      SKY_BIRD_MIN_COUNT + Math.floor(level.id * 0.45),
      SKY_BIRD_MIN_COUNT,
      SKY_BIRD_MAX_COUNT
    );

    const birds = [];
    for (let i = 0; i < birdCount; i += 1) {
      const bird = this.createSkyBird(randomFn);
      const laneOffset = (i % 4) * 14 - 20;
      bird.baseY = clamp(
        bird.baseY + laneOffset,
        30,
        Math.min(245, this.viewport.height * 0.35)
      );
      bird.y = bird.baseY;
      birds.push(bird);
    }

    return birds;
  }

  updateBirds(deltaSec) {
    if (!this.world?.birds?.length) return;

    const leftBound = -SKY_BIRD_OVERSCAN - 120;
    const rightBound = this.viewport.width + SKY_BIRD_OVERSCAN + 120;

    for (const bird of this.world.birds) {
      const config = this.getBirdTypeConfig(bird.type);
      if (!config) continue;

      bird.x += bird.speed * bird.direction * deltaSec;
      bird.wingAnimationFrame += deltaSec * bird.wingSpeed;
      bird.y =
        bird.baseY +
        Math.sin(this.renderTime * bird.bobSpeed + bird.bobPhase) * bird.bobAmplitude;

      const outRight = bird.direction > 0 && bird.x > rightBound;
      const outLeft = bird.direction < 0 && bird.x < leftBound;
      if (outRight || outLeft) {
        this.resetSkyBird(bird);
      }
    }
  }

  buildWorld(level) {
    const rng = createRng(level.id * 7429 + 19);
    const groundY = this.viewport.height - GROUND_MARGIN;
    const worldWidth = Math.max(
      3200,
      Math.floor(level.tasks.distanceTarget * PIXELS_PER_METER + 900)
    );

    const platforms = [];
    const platformCount = Math.max(12, Math.floor(worldWidth / 760));
    const laneWidth = (worldWidth - 760) / platformCount;
    for (let i = 0; i < platformCount; i += 1) {
      const x = 460 + i * laneWidth + (rng() - 0.5) * 100;
      const y = groundY - 120 - (i % 4) * 32 - rng() * 32;
      const width = 110 + rng() * 120;
      platforms.push({
        x: clamp(x, 260, worldWidth - 260),
        y: clamp(y, groundY - 240, groundY - 90),
        width,
        height: 16
      });
    }

    const obstacles = [];
    const obstacleCount = Math.min(14, 5 + Math.floor(level.tasks.distanceTarget / 450));
    const obstacleLane = (worldWidth - 1100) / Math.max(obstacleCount, 1);
    for (let i = 0; i < obstacleCount; i += 1) {
      const obstacleX = 620 + i * obstacleLane + (rng() - 0.5) * 120;
      if (obstacleX > worldWidth - 260) break;

      const width = 72 + rng() * 48;
      const height = 56 + rng() * 32;

      obstacles.push({
        x: clamp(obstacleX, 280, worldWidth - 260),
        y: groundY - height,
        width,
        height
      });
    }

    const parkourMinStartX = 900;
    const parkourMaxStartX = Math.max(parkourMinStartX + 240, worldWidth - 2200);
    const parkourStartX = clamp(
      worldWidth * (0.24 + level.id * 0.012),
      parkourMinStartX,
      parkourMaxStartX
    );
    const parkourStepCount = 9 + Math.floor(level.id * 1.5);
    const parkourStepGap = 155 + level.id * 8;
    const parkourStepRise = 52 + level.id * 4;
    const parkourBlocks = [];
    const parkourPlatforms = [];

    for (let i = 0; i < parkourStepCount; i += 1) {
      const heightVariation = (i % 3 === 0) ? 20 : (i % 3 === 1) ? -10 : 0;
      const blockTopY = clamp(
        groundY - 90 - i * parkourStepRise - heightVariation,
        110,
        groundY - 100
      );
      const blockWidth = i % 4 === 0 ? 110 : (i % 4 === 2 ? 85 : 95);
      const gapVariation = (i % 2 === 0) ? 15 : -8;
      const blockX =
        parkourStartX +
        i * parkourStepGap + gapVariation +
        (rng() - 0.5) * 20;
      const blockY = blockTopY;
      const blockHeight = groundY - blockTopY;

      parkourBlocks.push({
        x: blockX,
        y: blockY,
        width: blockWidth,
        height: blockHeight,
        isParkour: true
      });

      if (i > 0 && i < parkourStepCount - 1 && i % 3 !== 0) {
        const supportWidth = i % 2 === 0 ? 65 : 50;
        const platformHeightVariation = (i % 2 === 0) ? -40 : -70;
        parkourPlatforms.push({
          x: blockX + blockWidth + 28,
          y: clamp(blockTopY + platformHeightVariation, 95, groundY - 140),
          width: supportWidth,
          height: 12,
          isParkour: true
        });
      }
    }

    const summitX = parkourStartX + parkourStepCount * parkourStepGap + 35;
    const summitY = clamp(
      groundY - 130 - parkourStepCount * parkourStepRise * 0.8,
      85,
      groundY - 220
    );
    const summitPlatform = {
      x: clamp(summitX, parkourStartX + 520, worldWidth - 260),
      y: summitY,
      width: 140,
      height: 14,
      isParkour: true
    };
    parkourPlatforms.push(summitPlatform);

    const healZone = {
      x: summitPlatform.x + summitPlatform.width * 0.5 - 44,
      y: summitPlatform.y - 56,
      width: 88,
      height: 52
    };

    for (const parkourBlock of parkourBlocks) {
      obstacles.push(parkourBlock);
    }
    for (const parkourPlatform of parkourPlatforms) {
      platforms.push(parkourPlatform);
    }

    const pitCount = clamp(1 + Math.floor((level.id - 1) / 3), 1, 3);
    const pits = [];
    const planks = [];

    const pitStartX = 1400;
    const pitEndX = Math.max(pitStartX + 900, worldWidth - 2400);
    const pitLane = Math.max(780, (pitEndX - pitStartX) / Math.max(1, pitCount));
    const parkourAvoidStart = parkourStartX - 340;
    const parkourAvoidEnd = summitPlatform.x + summitPlatform.width + 340;

    for (let i = 0; i < pitCount; i += 1) {
      const pitWidth = clamp(760 + level.id * 22 + rng() * 170, 820, 1240);
      const jitter = (rng() - 0.5) * 240;
      let pitX = pitStartX + pitLane * i + jitter;
      pitX = clamp(pitX, 980, worldWidth - 1700 - pitWidth);

      if (pitX < parkourAvoidEnd && pitX + pitWidth > parkourAvoidStart) {
        pitX = clamp(parkourAvoidEnd + 320 + i * 180, 980, worldWidth - 1700 - pitWidth);
      }

      pits.push({
        id: i,
        x: pitX,
        width: pitWidth,
        placed: false,
        bridge: {
          x: pitX - PLANK_BRIDGE_OVERHANG,
          y: groundY - 2,
          width: pitWidth + PLANK_BRIDGE_OVERHANG * 2,
          height: PLANK_BRIDGE_THICKNESS
        }
      });

      const plankWidth = 92;
      const plankHeight = 14;
      const pickupOffset = 88 + rng() * 58;
      const plankX = pitX - pickupOffset - plankWidth;

      planks.push({
        id: i,
        pitId: i,
        x: clamp(plankX, 250, worldWidth - plankWidth - 220),
        y: groundY - plankHeight,
        width: plankWidth,
        height: plankHeight,
        picked: false,
        carried: false,
        used: false
      });
    }

    const overlapsPitRange = (leftX, rightX, padding = 0) =>
      pits.some(
        (pit) =>
          rightX > pit.x - padding &&
          leftX < pit.x + pit.width + padding
      );

    const isPointInsidePit = (pointX, padding = 0) =>
      pits.some(
        (pit) =>
          pointX > pit.x - padding && pointX < pit.x + pit.width + padding
      );

    for (let i = platforms.length - 1; i >= 0; i -= 1) {
      const platform = platforms[i];
      if (overlapsPitRange(platform.x, platform.x + platform.width, 160)) {
        platforms.splice(i, 1);
      }
    }

    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = obstacles[i];
      const isGroundObstacle = obstacle.y + obstacle.height >= groundY - 10;
      if (isGroundObstacle && overlapsPitRange(obstacle.x, obstacle.x + obstacle.width, 80)) {
        obstacles.splice(i, 1);
      }
    }

    const overlapsObstacleHorizontally = (leftX, rightX, padding = 0) =>
      obstacles.some(
        (obstacle) =>
          rightX > obstacle.x - padding &&
          leftX < obstacle.x + obstacle.width + padding
      );

    const isCoinInsideObstacle = (coinX, coinY, radius) =>
      obstacles.some(
        (obstacle) =>
          coinX + radius > obstacle.x &&
          coinX - radius < obstacle.x + obstacle.width &&
          coinY + radius > obstacle.y &&
          coinY - radius < obstacle.y + obstacle.height
      );

    const enemies = [];
    const enemyDensityUnit = Math.max(2000, 2550 - level.id * 85);
    const enemyCountBase = Math.floor(worldWidth / enemyDensityUnit);
    const enemyCountBonus = Math.floor(level.id * 1.4);
    const enemyCount = clamp(enemyCountBase + enemyCountBonus + 2, 8, MAX_ENEMY_COUNT);

    const spawnStartX = 720;
    const spawnEndX = worldWidth - 900;
    const spawnSpread = Math.max(1200, spawnEndX - spawnStartX);
    const laneSpacing = spawnSpread / Math.max(1, enemyCount - 1);
    const minEnemySpacing = Math.max(300, ENEMY_MIN_SPACING_BASE - level.id * 22);

    const groundPatrolBase = 120 + level.id * 18;
    const surfaceSpots = [];

    let surfaceId = 0;
    for (const obstacle of obstacles) {
      if (obstacle.width < 90) continue;
      surfaceSpots.push({
        id: surfaceId,
        x: obstacle.x,
        y: obstacle.y,
        width: obstacle.width,
        type: "obstacle",
        capacity: Math.max(1, Math.floor(obstacle.width / 120))
      });
      surfaceId += 1;
    }
    for (const platform of platforms) {
      if (platform.width < 84) continue;
      if (platform.y > groundY - 55) continue;
      surfaceSpots.push({
        id: surfaceId,
        x: platform.x,
        y: platform.y,
        width: platform.width,
        type: "platform",
        capacity: Math.max(1, Math.floor(platform.width / 105))
      });
      surfaceId += 1;
    }

    const surfaceOccupancy = new Map();
    let lastAnchorX = spawnStartX - minEnemySpacing;

    for (let i = 0; i < enemyCount; i += 1) {
      const width = 40 + rng() * 10;
      const height = 44 + rng() * 10;

      const jitterRange = Math.min(220, laneSpacing * 0.36);
      let anchorX = spawnStartX + i * laneSpacing + (rng() - 0.5) * jitterRange * 2;
      const remaining = enemyCount - i - 1;
      const minAnchorX = lastAnchorX + minEnemySpacing;
      const maxAnchorX = spawnEndX - remaining * minEnemySpacing;
      anchorX = clamp(anchorX, minAnchorX, Math.max(minAnchorX, maxAnchorX));
      lastAnchorX = anchorX;

      let x = clamp(anchorX - width * 0.5, 220, worldWidth - width - 220);
      let y = groundY - height;
      let minX = x;
      let maxX = x;

      const prefersSurface = rng() < Math.min(0.34 + level.id * 0.02, 0.62);
      let placedOnSurface = false;

      if (prefersSurface && surfaceSpots.length > 0) {
        let chosenSurface = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const surface of surfaceSpots) {
          if (surface.width < width + 16) continue;
          const used = surfaceOccupancy.get(surface.id) ?? 0;
          if (used >= surface.capacity) continue;

          const surfaceCenter = surface.x + surface.width * 0.5;
          const distance = Math.abs(surfaceCenter - x);
          if (distance < bestDistance) {
            chosenSurface = surface;
            bestDistance = distance;
          }
        }

        if (chosenSurface) {
          const used = surfaceOccupancy.get(chosenSurface.id) ?? 0;
          surfaceOccupancy.set(chosenSurface.id, used + 1);

          const innerPadding = chosenSurface.type === "platform" ? 3 : 7;
          const surfaceMinX = chosenSurface.x + innerPadding;
          const surfaceMaxX = chosenSurface.x + chosenSurface.width - width - innerPadding;
          x = clamp(x, surfaceMinX, surfaceMaxX);
          y = chosenSurface.y - height;

          const availableSpan = Math.max(0, surfaceMaxX - surfaceMinX);
          if (availableSpan <= 48 || rng() < Math.min(0.28 + level.id * 0.012, 0.44)) {
            minX = x;
            maxX = x;
          } else {
            const patrolSpan = clamp(
              availableSpan * (0.45 + rng() * 0.35),
              42,
              availableSpan
            );
            minX = clamp(x - patrolSpan * 0.5, surfaceMinX, surfaceMaxX);
            maxX = clamp(x + patrolSpan * 0.5, minX + 28, surfaceMaxX);
          }
          placedOnSurface = true;
        }
      }

      if (!placedOnSurface) {
        let attempts = 0;
        while (
          (overlapsObstacleHorizontally(x, x + width, 10) || overlapsPitRange(x, x + width, 14)) &&
          attempts < 9
        ) {
          x = clamp(x + 90, 220, worldWidth - width - 220);
          attempts += 1;
        }

        y = groundY - height;
        const patrolRange = groundPatrolBase + rng() * (150 + level.id * 20);
        minX = clamp(x - patrolRange * 0.5, 180, worldWidth - width - 180);
        maxX = clamp(x + patrolRange * 0.5, minX + 60, worldWidth - width - 160);
      }

      const canMove = maxX - minX >= 32;
      const makeStatic = !canMove || rng() < Math.min(0.2 + level.id * 0.015, 0.42);
      const speedBase = 56 + level.id * 3.4;
      const speedVariance = 16 + level.id * 1.3;
      let speed = makeStatic ? 0 : speedBase + rng() * speedVariance;
      if (!makeStatic && rng() < 0.18) {
        speed += 24;
      }

      if (overlapsPitRange(x, x + width, 8)) {
        continue;
      }

      enemies.push({
        x,
        y,
        width,
        height,
        speed,
        direction: rng() > 0.5 ? 1 : -1,
        minX: makeStatic ? x : minX,
        maxX: makeStatic ? x : maxX,
        isStatic: makeStatic
      });
    }

    const potions = [];
    const potionCount = Math.min(3, 1 + Math.floor((level.id - 1) / 4));
    const potionLane = (worldWidth - 1400) / Math.max(potionCount, 1);
    for (let i = 0; i < potionCount; i += 1) {
      let x = clamp(
        900 + i * potionLane + (rng() - 0.5) * 180,
        260,
        worldWidth - 220
      );
      let y = groundY - 62;

      const placeOnObstacle = i % 2 === 1 && obstacles.length > 0;
      if (placeOnObstacle) {
        let selectedObstacle = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const obstacle of obstacles) {
          const obstacleCenter = obstacle.x + obstacle.width * 0.5;
          const distance = Math.abs(obstacleCenter - x);
          if (distance < bestDistance) {
            selectedObstacle = obstacle;
            bestDistance = distance;
          }
        }

        if (selectedObstacle) {
          x = clamp(
            x,
            selectedObstacle.x + 18,
            selectedObstacle.x + selectedObstacle.width - 18
          );
          y = selectedObstacle.y - 28;
        }
      }

      if (isPointInsidePit(x, 18)) {
        continue;
      }

      potions.push({
        x,
        y,
        radius: 13,
        collected: false,
        waveOffset: rng() * Math.PI * 2
      });
    }

    const coins = [];
    const coinBuffer = Math.max(6, Math.round(level.tasks.goldTarget * 0.12));
    const coinCount = level.tasks.goldTarget + coinBuffer;
    const usableWidth = worldWidth - 320;
    const averageGap = usableWidth / Math.max(coinCount, 1);
    const minGap = Math.max(110, averageGap * 0.85);
    const maxGap = Math.max(minGap + 24, averageGap * 1.35);

    let x = 180 + rng() * 24;
    for (let i = 0; i < coinCount; i += 1) {
      const remaining = coinCount - i;
      const remainingWidth = worldWidth - 140 - x;
      if (remainingWidth < 90) break;

      const adaptiveMin = Math.min(minGap, Math.max(90, (remainingWidth / remaining) * 0.8));
      const adaptiveMax = Math.min(maxGap, Math.max(adaptiveMin + 10, (remainingWidth / remaining) * 1.2));
      const gap = adaptiveMin + rng() * (adaptiveMax - adaptiveMin);
      x += gap;
      if (x > worldWidth - 130) {
        x = worldWidth - 130;
      }

      let y = groundY - 42 - rng() * 10;
      if (i % 12 === 0) {
        y = groundY - 120 - rng() * 28;
      } else if (i % 20 === 0) {
        y = groundY - 160 - rng() * 24;
      }

      if (isCoinInsideObstacle(x, y, 11)) {
        y = groundY - 32;
      }

      if (isCoinInsideObstacle(x, y, 11)) {
        continue;
      }

      if (isPointInsidePit(x, 16)) {
        continue;
      }

      coins.push({
        x,
        y,
        radius: 11,
        collected: false,
        waveOffset: rng() * Math.PI * 2
      });
    }

    const bossMaxHealth = BOSS_BASE_HEALTH + Math.floor((level.id - 1) * 2);
    const boss = {
      x: worldWidth - 280,
      y: groundY - BOSS_HEIGHT,
      width: BOSS_WIDTH,
      height: BOSS_HEIGHT,
      health: bossMaxHealth,
      maxHealth: bossMaxHealth,
      speed: BOSS_SPEED + level.id * 5,
      damage: BOSS_DAMAGE,
      direction: -1,
      active: false,
      type: 'boss',
      hitFlash: 0,
      minX: worldWidth - 480,
      maxX: worldWidth - 160
    };

    const birds = this.createSkyBirdFlock(level, rng);

    return {
      startX: 120,
      groundY,
      worldWidth,
      platforms,
      obstacles,
      enemies,
      potions,
      coins,
      pits,
      planks,
      birds,
      boss,
      parkour: {
        startX: parkourStartX,
        endX: summitPlatform.x + summitPlatform.width,
        topY: summitPlatform.y,
        healZone
      }
    };
  }

  loop(timestamp) {
    if (!this.running) return;

    const deltaSec = clamp((timestamp - this.lastFrameTime) / 1000, 0, 0.032);
    this.lastFrameTime = timestamp;
    this.renderTime = timestamp / 1000;

    this.update(deltaSec);
    this.render();

    requestAnimationFrame(this.loop);
  }

  update(deltaSec) {
    if (!this.currentLevel || this.paused) return;

    this.updateBirds(deltaSec);
    this.updateBoostState(deltaSec);
    this.updateEnemyHitCooldown(deltaSec);
    this.updateInvincibility(deltaSec);
    this.updateAttackState(deltaSec);

    this.backtrackWarnTimer = Math.max(0, this.backtrackWarnTimer - deltaSec);

    let speedMultiplier = 1;
    if (this.speedBoostActive) speedMultiplier *= SPEED_BOOST_MULTIPLIER;
    if (this.potionSpeedActive) speedMultiplier *= this.POTION_SPEED_MULTIPLIER;
    const targetSpeed = PLAYER_SPEED * speedMultiplier;
    const moveDirection = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    this.player.vx = moveDirection * targetSpeed;
    if (moveDirection !== 0) {
      this.player.facing = moveDirection > 0 ? 1 : -1;
    }
    if (moveDirection !== 0 && this.player.onGround) {
      const speedRatio = clamp(Math.abs(this.player.vx) / PLAYER_SPEED, 0.55, 2.2);
      this.player.stepTime += deltaSec * (7.2 * speedRatio);
    }

    if (this.input.jumpQueued && this.player.jumpsUsed < 2) {
      this.player.vy = -JUMP_SPEED;
      this.player.onGround = false;
      this.player.jumpsUsed += 1;
    }
    this.input.jumpQueued = false;
    const shouldAttack = this.input.attackQueued;
    this.input.attackQueued = false;
    const shouldPlankAction = this.input.plankActionQueued;
    this.input.plankActionQueued = false;

    const prevX = this.player.x;
    const prevY = this.player.y;
    this.player.x += this.player.vx * deltaSec;
    this.player.x = clamp(this.player.x, this.world.startX, this.world.worldWidth - this.player.width - 20);
    this.resolveHorizontalCollisions(prevX);
    this.enforceBacktrackLimit();

    this.player.vy += GRAVITY * deltaSec;
    this.player.y += this.player.vy * deltaSec;

    this.resolveVerticalCollisions(prevY);
    this.checkPitFalls();
    if (this.paused) return;
    if (shouldPlankAction) {
      this.handlePlankInteraction();
    }
    this.updateEnemies(deltaSec);
    this.updateBoss(deltaSec);
    if (shouldAttack) {
      this.startAttack();
    }
    this.resolveEnemyInteractions(prevY);
    this.resolveBossInteractions(prevY);
    if (this.attackDamagePending) {
      this.applyAttackHits();
    }
    this.applyBossAttackHits();
    this.updateProgress();
    this.collectCoins();
    this.collectPotions();
    this.checkParkourHealZone();
    this.checkTasks();
    this.updatePlayerAnimation(deltaSec);

    this.cameraX = clamp(
      this.player.x - this.viewport.width * 0.32,
      0,
      Math.max(0, this.world.worldWidth - this.viewport.width)
    );
  }

  updatePlayerAnimation(deltaSec) {
    if (!this.player?.anim) return;

    const anim = this.player.anim;
    const state = this.getPlayerAnimationState();
    const speedNorm = clamp(Math.abs(this.player.vx) / (PLAYER_SPEED * 1.45), 0, 1);
    const smooth = 1 - Math.exp(-10 * deltaSec);
    const blendSmooth = 1 - Math.exp(-12 * deltaSec);

    anim.state = state;
    anim.speedBlend = lerp(anim.speedBlend, speedNorm, smooth);
    anim.walkBlend = lerp(anim.walkBlend, state === "walk" ? 1 : 0, blendSmooth);
    anim.runBlend = lerp(anim.runBlend, state === "run" ? 1 : 0, blendSmooth);
    anim.jumpBlend = lerp(anim.jumpBlend, state === "jump" ? 1 : 0, 1 - Math.exp(-14 * deltaSec));
    anim.attackBlend = lerp(anim.attackBlend, state === "attack" ? 1 : 0, 1 - Math.exp(-18 * deltaSec));
    anim.idleBlend = lerp(anim.idleBlend, state === "idle" ? 1 : 0, 1 - Math.exp(-8 * deltaSec));
    anim.idleTime += deltaSec;
    anim.landingImpact = Math.max(0, anim.landingImpact - deltaSec * 4.8);
  }

  getBacktrackMinX() {
    if (!this.world || !this.player) return 0;
    const dynamicMin = this.progress.maxX - MAX_BACKTRACK_DISTANCE;
    return clamp(dynamicMin, this.world.startX, this.world.worldWidth - this.player.width - 20);
  }

  enforceBacktrackLimit() {
    const minX = this.getBacktrackMinX();
    if (this.player.x >= minX) return;

    this.player.x = minX;
    if (this.player.vx < 0) {
      this.player.vx = 0;
    }

    if (this.backtrackWarnTimer > 0) return;
    this.backtrackWarnTimer = BACKTRACK_WARN_INTERVAL_SEC;
    this.notify("Bu kadar geri gidemezsin.");
    this.emitStatus("Geri gitme sinirina ulastin.");
  }

  checkParkourHealZone() {
    if (this.levelHealCollected) return;
    if (!this.world?.parkour?.healZone) return;

    const zone = this.world.parkour.healZone;
    const playerRect = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height
    };

    if (!rectsOverlap(playerRect, zone)) return;

    this.levelHealCollected = true;
    this.healCollectedLevels.add(this.currentLevel.id);

    if (this.lives < this.maxLives) {
      this.lives += 1;
      this.notify("1 Can Kazandin.");
      this.emitStatus(`Parkur odulu alindi. Can: ${this.lives}.`);
      this.emitHud(true);
      return;
    }

    this.notify("Parkur tamamlandi, can zaten maksimum.");
    this.emitStatus("Parkur odulu kullanildi.");
  }

  getStandablePlatforms() {
    const placedBridges =
      this.world?.pits
        ?.filter((pit) => pit.placed)
        .map((pit) => pit.bridge) ?? [];
    return [...this.world.platforms, ...placedBridges];
  }

  isRangeOverUnbridgedPit(leftX, rightX) {
    if (!this.world?.pits?.length) return false;
    return this.world.pits.some(
      (pit) => !pit.placed && rightX > pit.x + 2 && leftX < pit.x + pit.width - 2
    );
  }

  findSafeGroundX(targetX) {
    if (!this.world || !this.player) return targetX;
    const minX = this.world.startX;
    const maxX = this.world.worldWidth - this.player.width - 20;
    let safeX = clamp(targetX, minX, maxX);

    let guard = 0;
    while (
      this.isRangeOverUnbridgedPit(safeX + 6, safeX + this.player.width - 6) &&
      guard < 10
    ) {
      const overlappingPit = this.world.pits.find(
        (pit) =>
          !pit.placed &&
          safeX + this.player.width - 6 > pit.x &&
          safeX + 6 < pit.x + pit.width
      );
      if (!overlappingPit) break;

      safeX = overlappingPit.x - this.player.width - 24;
      if (safeX < minX) {
        safeX = overlappingPit.x + overlappingPit.width + 24;
      }
      safeX = clamp(safeX, minX, maxX);
      guard += 1;
    }

    return safeX;
  }

  checkPitFalls() {
    if (!this.world?.pits?.length) return;
    if (this.player.y <= this.world.groundY + PIT_FALL_THRESHOLD) return;

    this.notify("Bosluga dustun.");
    this.emitStatus("Bosluga dustun.");
    this.handlePlayerDamage(null);
  }

  findNearestPickupPlank() {
    if (!this.world?.planks?.length) return null;

    const centerX = this.player.x + this.player.width * 0.5;
    const centerY = this.player.y + this.player.height * 0.5;
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const plank of this.world.planks) {
      if (plank.picked || plank.used) continue;

      const plankCenterX = plank.x + plank.width * 0.5;
      const plankCenterY = plank.y + plank.height * 0.5;
      const dx = Math.abs(centerX - plankCenterX);
      const dy = Math.abs(centerY - plankCenterY);
      if (dx > PLANK_PICKUP_RANGE || dy > 72) continue;

      const score = dx + dy * 0.45;
      if (score < bestScore) {
        best = plank;
        bestScore = score;
      }
    }

    return best;
  }

  findNearestPlaceablePit() {
    if (!this.player.carryingPlank) return null;
    if (!this.player.onGround) return null;
    if (!this.world?.pits?.length) return null;

    const centerX = this.player.x + this.player.width * 0.5;
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const pit of this.world.pits) {
      if (pit.placed) continue;
      const edgeDistance = Math.min(
        Math.abs(centerX - pit.x),
        Math.abs(centerX - (pit.x + pit.width))
      );
      if (edgeDistance > PLANK_PLACE_RANGE) continue;
      if (edgeDistance < bestDistance) {
        best = pit;
        bestDistance = edgeDistance;
      }
    }

    return best;
  }

  placeCarriedPlank(targetPit) {
    if (!targetPit || !this.player.carryingPlank) return false;

    const carriedPlank = this.world.planks.find(
      (plank) =>
        plank.id === this.player.carriedPlankId &&
        plank.carried &&
        !plank.used
    );
    if (!carriedPlank) return false;

    targetPit.placed = true;
    carriedPlank.used = true;
    carriedPlank.carried = false;
    carriedPlank.picked = true;
    carriedPlank.x = targetPit.bridge.x + targetPit.bridge.width * 0.5 - carriedPlank.width * 0.5;
    carriedPlank.y = targetPit.bridge.y + 1;

    this.player.carryingPlank = false;
    this.player.carriedPlankId = null;
    return true;
  }

  handlePlankInteraction() {
    if (!this.world?.pits?.length || !this.world?.planks?.length) return;

    if (this.player.carryingPlank) {
      const targetPit = this.findNearestPlaceablePit();
      if (!targetPit || !this.placeCarriedPlank(targetPit)) {
        this.emitStatus("Tahtayi koymak icin boslugun kenarina yaklas.");
        return;
      }

      this.notify("Tahta yerlestirildi. Kopru hazir.");
      this.emitStatus("Kopru kuruldu. Ilerle!");
      return;
    }

    const pickupPlank = this.findNearestPickupPlank();
    if (!pickupPlank) {
      this.emitStatus("Yakininda alinabilir tahta yok.");
      return;
    }

    pickupPlank.picked = true;
    pickupPlank.carried = true;
    this.player.carryingPlank = true;
    this.player.carriedPlankId = pickupPlank.id;

    const nearbyPit = this.findNearestPlaceablePit();
    if (nearbyPit && this.placeCarriedPlank(nearbyPit)) {
      this.notify("Tahtayi alip hemen yerlestirdin.");
      this.emitStatus("Kopru kuruldu. Ilerle!");
      return;
    }

    this.notify("Tahta alindi. Boslukta Q ile birak.");
    this.emitStatus("Tahta tasiyorsun.");
  }

  resolveHorizontalCollisions(prevX) {
    const movingRight = this.player.x > prevX;
    const movingLeft = this.player.x < prevX;
    if (!movingRight && !movingLeft) return;

    const playerRect = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height
    };

    for (const obstacle of this.world.obstacles) {
      if (!rectsOverlap(playerRect, obstacle)) continue;

      if (movingRight && prevX + this.player.width <= obstacle.x) {
        this.player.x = obstacle.x - this.player.width;
        this.player.vx = 0;
        playerRect.x = this.player.x;
      } else if (movingLeft && prevX >= obstacle.x + obstacle.width) {
        this.player.x = obstacle.x + obstacle.width;
        this.player.vx = 0;
        playerRect.x = this.player.x;
      }
    }
  }

  resolveVerticalCollisions(prevY) {
    const wasOnGround = this.player.onGround;
    const preCollisionVy = this.player.vy;
    this.player.onGround = false;

    const prevTop = prevY;
    const prevBottom = prevY + this.player.height;
    const currentTop = this.player.y;
    const currentBottom = this.player.y + this.player.height;
    const playerLeft = this.player.x;
    const playerRight = this.player.x + this.player.width;

    for (const obstacle of this.world.obstacles) {
      const overlapX = playerRight > obstacle.x && playerLeft < obstacle.x + obstacle.width;
      if (!overlapX) continue;

      const hitTop = prevBottom <= obstacle.y && currentBottom >= obstacle.y && this.player.vy >= 0;
      if (hitTop) {
        this.player.y = obstacle.y - this.player.height;
        this.player.vy = 0;
        this.player.onGround = true;
        continue;
      }

      const obstacleBottom = obstacle.y + obstacle.height;
      const hitBottom = prevTop >= obstacleBottom && currentTop <= obstacleBottom && this.player.vy < 0;
      if (hitBottom) {
        this.player.y = obstacleBottom;
        this.player.vy = 0;
      }
    }

    const standablePlatforms = this.getStandablePlatforms();
    for (const platform of standablePlatforms) {
      const overlapX = playerRight > platform.x && playerLeft < platform.x + platform.width;
      const landedOnTop =
        overlapX &&
        prevBottom <= platform.y &&
        currentBottom >= platform.y &&
        this.player.vy >= 0;

      if (landedOnTop) {
        this.player.y = platform.y - this.player.height;
        this.player.vy = 0;
        this.player.onGround = true;
      }
    }

    const overUnbridgedPit = this.isRangeOverUnbridgedPit(playerLeft + 6, playerRight - 6);
    if (!overUnbridgedPit && this.player.y + this.player.height >= this.world.groundY) {
      this.player.y = this.world.groundY - this.player.height;
      this.player.vy = 0;
      this.player.onGround = true;
    }

    if (this.player.onGround) {
      if (!wasOnGround && preCollisionVy > 120 && this.player.anim) {
        this.player.anim.landingImpact = clamp(preCollisionVy / 880, 0, 1);
      }
      this.player.jumpsUsed = 0;
    }
  }

  updateBoostState(deltaSec) {
    if (!this.speedBoostActive) return;

    this.speedBoostTimer = Math.max(0, this.speedBoostTimer - deltaSec);
    if (this.speedBoostTimer > 0) return;

    this.speedBoostActive = false;
    this.speedBoostTimer = 0;
    this.emitHud(true);
    this.emitStatus("Hizlandirma bitti. Normal hiza donuldu.");
  }

  updateEnemyHitCooldown(deltaSec) {
    if (this.enemyHitCooldown <= 0) return;
    this.enemyHitCooldown = Math.max(0, this.enemyHitCooldown - deltaSec);
  }

  updateInvincibility(deltaSec) {
    if (this.invincibilityTimer <= 0) return;
    this.invincibilityTimer = Math.max(0, this.invincibilityTimer - deltaSec);
  }

  updatePotionSpeed(deltaSec) {
    if (!this.potionSpeedActive) return;

    this.potionSpeedTimer = Math.max(0, this.potionSpeedTimer - deltaSec);
    if (this.potionSpeedTimer > 0) return;

    this.potionSpeedActive = false;
    this.potionSpeedTimer = 0;
    this.emitHud(true);
    this.notify("Hiz iksiri etkisi bitti.");
    this.emitStatus("Hiz iksiri bitti. Normal hiza donuldu.");
  }

  isInvincible() {
    return this.invincibilityTimer > 0;
  }

  updateAttackState(deltaSec) {
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - deltaSec);
    }

    if (!this.attackActive) return;
    this.attackTimer = Math.max(0, this.attackTimer - deltaSec);
    if (this.attackTimer > 0) return;

    this.attackActive = false;
    this.attackTimer = 0;
  }

  startAttack() {
    if (this.attackCooldown > 0) return;

    this.attackActive = true;
    this.attackTimer = ATTACK_ACTIVE_SEC;
    this.attackCooldown = ATTACK_COOLDOWN_SEC;
    this.attackDamagePending = true;
  }

  getAttackHitbox() {
    const width = ATTACK_RANGE;
    const height = this.player.height - 16;
    const y = this.player.y + 8;
    const x =
      this.player.facing >= 0
        ? this.player.x + this.player.width - 4
        : this.player.x - width + 4;

    return { x, y, width, height };
  }

  updateEnemies(deltaSec) {
    const activeMinX = this.player.x - this.viewport.width * 1.25;
    const activeMaxX = this.player.x + this.viewport.width * 1.8;

    for (const enemy of this.world.enemies) {
      if (enemy.isStatic || enemy.speed <= 0 || enemy.maxX - enemy.minX < 1) continue;
      if (enemy.x + enemy.width < activeMinX || enemy.x > activeMaxX) continue;

      enemy.x += enemy.speed * enemy.direction * deltaSec;
      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.direction = 1;
      } else if (enemy.x >= enemy.maxX) {
        enemy.x = enemy.maxX;
        enemy.direction = -1;
      }
    }
  }

  updateBoss(deltaSec) {
    const boss = this.world.boss;
    if (!boss || boss.health <= 0) return;

    if (boss.hitFlash > 0) {
      boss.hitFlash = Math.max(0, boss.hitFlash - deltaSec);
    }

    const distanceToBoss = Math.abs(this.player.x - boss.x);
    if (!boss.active && distanceToBoss <= BOSS_ACTIVE_DISTANCE) {
      boss.active = true;
      this.notify("Bolum Sonu Bossu Geldi!");
      this.emitStatus("Boss aktif! Dikkatli ol!");
      this.emitBossState(true);
    }

    if (!boss.active) return;

    const playerCenter = this.player.x + this.player.width * 0.5;
    const bossCenter = boss.x + boss.width * 0.5;

    if (playerCenter < bossCenter - 20) {
      boss.direction = -1;
    } else if (playerCenter > bossCenter + 20) {
      boss.direction = 1;
    }

    boss.x += boss.speed * boss.direction * deltaSec;

    if (boss.x <= boss.minX) {
      boss.x = boss.minX;
      boss.direction = 1;
    } else if (boss.x >= boss.maxX) {
      boss.x = boss.maxX;
      boss.direction = -1;
    }

    this.emitBossState();
  }

  resolveBossInteractions(prevY) {
    const boss = this.world.boss;
    if (!boss || boss.health <= 0 || !boss.active) return;
    if (this.isInvincible()) return;

    const playerRect = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height
    };

    if (!rectsOverlap(playerRect, boss)) return;

    const prevBottom = prevY + this.player.height;
    const currentBottom = this.player.y + this.player.height;
    const descending = this.player.vy >= 0;

    const stompHit =
      descending &&
      prevBottom <= boss.y + STOMP_TOP_TOLERANCE * 2 &&
      currentBottom >= boss.y;

    if (stompHit) {
      this.damageBoss(1);
      this.player.y = boss.y - this.player.height;
      this.player.vy = -STOMP_BOUNCE_SPEED * 0.8;
      this.player.onGround = false;
      this.player.jumpsUsed = 1;
      this.notify("Boss'a ustten vurdun!");
      return;
    }

    if (this.enemyHitCooldown <= 0) {
      this.applyEnemyCollisionPenalty(boss);
    }
  }

  applyBossAttackHits() {
    if (!this.attackDamagePending) return;

    const boss = this.world.boss;
    if (!boss || boss.health <= 0 || !boss.active) return;

    const hitbox = this.getAttackHitbox();
    if (!rectsOverlap(hitbox, boss)) return;

    this.damageBoss(1);
  }

  damageBoss(amount) {
    const boss = this.world.boss;
    if (!boss || boss.health <= 0) return;

    boss.health = Math.max(0, boss.health - amount);
    boss.hitFlash = 0.3;

    this.notify(`Boss'a vurdun! Can: ${boss.health} / ${boss.maxHealth}`);
    this.emitBossState();

    if (boss.health <= 0) {
      this.killBoss();
    }
  }

  killBoss() {
    const boss = this.world.boss;
    if (!boss) return;

    boss.active = false;
    this.notify("Boss oldu! Bolum tamamlandi!");
    this.emitStatus("Boss yenildi!");
    this.emitBossState();

    if (this.taskFlags.distanceDone) {
      this.completeLevel();
    }
  }

  emitBossState(force = false) {
    if (typeof this.callbacks.onBossChange !== "function") return;

    const boss = this.world?.boss;
    if (!boss) return;

    const snapshot = {
      active: boss.active,
      health: boss.health,
      maxHealth: boss.maxHealth,
      visible: boss.health > 0
    };

    this.callbacks.onBossChange(snapshot);
  }

  applyAttackHits() {
    this.attackDamagePending = false;
    if (!this.attackActive) return;

    const hitbox = this.getAttackHitbox();
    let removedCount = 0;
    this.world.enemies = this.world.enemies.filter((enemy) => {
      const isHit = rectsOverlap(hitbox, enemy);
      if (isHit) {
        removedCount += 1;
      }
      return !isHit;
    });

    if (removedCount > 0) {
      this.notify(`Saldiri isabet etti: ${removedCount} dusman.`);
      this.emitStatus("Saldiri basarili.");
    } else {
      this.emitStatus("Saldiri bosa gitti.");
    }
  }

  resolveEnemyInteractions(prevY) {
    if (this.isInvincible()) return;

    const playerRect = {
      x: this.player.x,
      y: this.player.y,
      width: this.player.width,
      height: this.player.height
    };
    const prevBottom = prevY + this.player.height;
    const currentBottom = this.player.y + this.player.height;
    const descending = this.player.vy >= 0;

    for (let i = this.world.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.world.enemies[i];
      if (!rectsOverlap(playerRect, enemy)) continue;

      const stompHit =
        descending &&
        prevBottom <= enemy.y + STOMP_TOP_TOLERANCE &&
        currentBottom >= enemy.y;

      if (stompHit) {
        this.world.enemies.splice(i, 1);
        this.player.y = enemy.y - this.player.height;
        this.player.vy = -STOMP_BOUNCE_SPEED;
        this.player.onGround = false;
        this.player.jumpsUsed = 1;
        this.notify("Dusmana ustten bastin.");
        this.emitStatus("Dusman ezildi.");
        continue;
      }

      if (this.enemyHitCooldown <= 0) {
        this.applyEnemyCollisionPenalty(enemy);
      }
      break;
    }
  }

  applyEnemyCollisionPenalty(enemy) {
    if (this.enemyHitCooldown > 0) return;

    this.enemyHitCooldown = ENEMY_HIT_COOLDOWN_SEC;
    this.handlePlayerDamage(enemy);
  }

  handlePlayerDamage(_enemy) {
    if (!this.currentLevel || this.paused) return;
    if (this.isInvincible()) return;

    this.lives = Math.max(0, this.lives - 1);
    this.emitHud(true);

    if (this.lives <= 0) {
      this.triggerGameOver();
      return;
    }

    this.respawnPlayer();
    this.emitStatus(`Hasar aldin. Kalan can: ${this.lives}.`);
    this.notify(`Can azaldi! Kalan can: ${this.lives}`);
  }

  respawnPlayer() {
    if (!this.player || !this.world) return;

    this.invincibilityTimer = INVINCIBILITY_DURATION_SEC;
    this.enemyHitCooldown = ENEMY_HIT_COOLDOWN_SEC;

    const currentX = this.player.x;
    const respawnX = this.findSafeGroundX(Math.max(this.world.startX, currentX - 200));

    this.player.x = respawnX;
    this.player.y = this.world.groundY - PLAYER_HEIGHT;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.onGround = true;
    this.player.jumpsUsed = 0;

    this.cameraX = clamp(
      this.player.x - this.viewport.width * 0.32,
      0,
      Math.max(0, this.world.worldWidth - this.viewport.width)
    );
  }

  triggerGameOver() {
    this.paused = true;
    this.speedBoostActive = false;
    this.speedBoostTimer = 0;
    this.attackActive = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackDamagePending = false;

    this.emitHud(true);
    this.emitStatus("Oyun bitti. Canin bitti.");
    this.notify("Canin bitti.");

    if (typeof this.callbacks.onGameOver === "function") {
      this.callbacks.onGameOver({
        levelId: this.currentLevel?.id ?? this.currentLevelNumber ?? 1,
        message: "Canin bitti. Oyun bitti."
      });
    }
  }

  updateProgress() {
    const furthestX = Math.max(this.progress.maxX, this.player.x);
    const deltaX = furthestX - this.progress.maxX;
    if (deltaX >= DISTANCE_MIN_FORWARD_STEP) {
      this.progress.maxX = furthestX;
      this.progress.traveledPx += deltaX;
    }

    const nextDistance = Math.floor(this.progress.traveledPx / PIXELS_PER_METER);
    this.progress.distance = Math.max(0, nextDistance);

    this.emitHud();
    this.emitTask();
  }

  collectCoins() {
    const centerX = this.player.x + this.player.width * 0.5;
    const centerY = this.player.y + this.player.height * 0.5;

    for (const coin of this.world.coins) {
      if (coin.collected) continue;

      const dx = centerX - coin.x;
      const dy = centerY - coin.y;
      const overlapX = Math.abs(dx) <= this.player.width * 0.5 + coin.radius;
      const overlapY = Math.abs(dy) <= this.player.height * 0.5 + coin.radius;
      if (!overlapX || !overlapY) continue;

      coin.collected = true;
      this.progress.gold += 1;
      this.totalGold += 1;
      this.emitHud();
      this.emitTask();
    }
  }

  buySpeedPotion() {
    if (this.potionSpeedActive) {
      return { success: false, message: "Hiz iksiri zaten aktif!" };
    }

    if (this.totalGold < this.POTION_SPEED_COST) {
      return { success: false, message: `Yetersiz altin! Gereken: ${this.POTION_SPEED_COST}` };
    }

    this.totalGold -= this.POTION_SPEED_COST;
    this.potionSpeedActive = true;
    this.potionSpeedTimer = this.POTION_SPEED_DURATION;

    this.emitHud(true);
    this.notify(`Hiz iksiri aktif! ${this.POTION_SPEED_DURATION} saniye boyunca hizli.`);
    this.emitStatus(`Hiz iksiri aktif! (+${Math.round((this.POTION_SPEED_MULTIPLIER - 1) * 100)}% hiz)`);

    return { success: true, message: "Hiz iksiri alindi!" };
  }

  collectPotions() {
    const centerX = this.player.x + this.player.width * 0.5;
    const centerY = this.player.y + this.player.height * 0.5;

    for (const potion of this.world.potions) {
      if (potion.collected) continue;

      const dx = centerX - potion.x;
      const dy = centerY - potion.y;
      const overlapX = Math.abs(dx) <= this.player.width * 0.5 + potion.radius;
      const overlapY = Math.abs(dy) <= this.player.height * 0.5 + potion.radius;
      if (!overlapX || !overlapY) continue;

      potion.collected = true;
      this.activateSpeedBoost();
    }
  }

  activateSpeedBoost() {
    const wasActive = this.speedBoostActive;
    this.speedBoostActive = true;
    this.speedBoostTimer = SPEED_BOOST_DURATION_SEC;
    this.emitHud(true);

    if (wasActive) {
      this.notify("Hizlandirma yenilendi.");
      this.emitStatus("Hizlandirma aktif: sure sifirlandi.");
      return;
    }

    this.notify("Hizlandirma aktif!");
    this.emitStatus("Hizlandirma aktif (5s).");
  }

  checkTasks() {
    const { distanceTarget } = this.currentLevel.tasks;

    if (!this.taskFlags.distanceDone && this.progress.distance >= distanceTarget) {
      this.taskFlags.distanceDone = true;
      this.notify("Gorev tamamlandi: Mesafe hedefi.");
      this.emitTask(true);
    }

    const boss = this.world?.boss;
    const bossDefeated = !boss || boss.health <= 0;

    if (!this.taskFlags.levelDone && this.taskFlags.distanceDone && bossDefeated) {
      this.taskFlags.levelDone = true;
      this.completeLevel();
    }
  }

  completeLevel() {
    this.paused = true;
    this.player.vx = 0;

    const levelId = this.currentLevel.id;
    const nextLevelId = levelId < this.levels.length ? levelId + 1 : null;

    this.notify("Gorev tamamlandi.");
    this.notify("Bolum tamamlandi.");
    this.emitStatus(
      nextLevelId
        ? `Bolum ${levelId} tamamlandi. Bolum ${nextLevelId} acildi.`
        : `Bolum ${levelId} tamamlandi. Tum bolumler bitti.`
    );

    if (typeof this.callbacks.onLevelComplete === "function") {
      this.callbacks.onLevelComplete({
        levelId,
        nextLevelId,
        gold: this.progress.gold,
        distance: this.progress.distance,
        tasks: this.currentLevel.tasks
      });
    }
  }

  emitHud(force = false) {
    if (typeof this.callbacks.onHudChange !== "function" || !this.currentLevel) return;

    const boostSeconds = this.speedBoostActive ? Math.ceil(this.speedBoostTimer) : 0;
    const snapshot = {
      level: this.currentLevel.id,
      gold: this.progress.gold,
      distance: this.progress.distance,
      lives: this.lives,
      maxLives: this.maxLives,
      boostActive: this.speedBoostActive,
      boostSeconds
    };

    if (
      !force &&
      this.lastHud &&
      this.lastHud.level === snapshot.level &&
      this.lastHud.gold === snapshot.gold &&
      this.lastHud.distance === snapshot.distance &&
      this.lastHud.lives === snapshot.lives &&
      this.lastHud.maxLives === snapshot.maxLives &&
      this.lastHud.boostActive === snapshot.boostActive &&
      this.lastHud.boostSeconds === snapshot.boostSeconds
    ) {
      return;
    }

    this.lastHud = snapshot;
    this.callbacks.onHudChange(snapshot);
  }

  emitTask(force = false) {
    if (typeof this.callbacks.onTaskChange !== "function" || !this.currentLevel) return;

    const snapshot = {
      gold: this.progress.gold,
      goldTarget: this.currentLevel.tasks.goldTarget,
      distance: this.progress.distance,
      distanceTarget: this.currentLevel.tasks.distanceTarget,
      goldDone: this.taskFlags.goldDone,
      distanceDone: this.taskFlags.distanceDone
    };

    if (
      !force &&
      this.lastTask &&
      this.lastTask.gold === snapshot.gold &&
      this.lastTask.distance === snapshot.distance &&
      this.lastTask.goldDone === snapshot.goldDone &&
      this.lastTask.distanceDone === snapshot.distanceDone
    ) {
      return;
    }

    this.lastTask = snapshot;
    this.callbacks.onTaskChange(snapshot);
  }

  notify(message) {
    if (typeof this.callbacks.onNotify === "function") {
      this.callbacks.onNotify(message);
    }
  }

  emitStatus(message) {
    if (typeof this.callbacks.onStatus === "function") {
      this.callbacks.onStatus(message);
    }
  }

  renderStaticWelcome() {
    const ctx = this.ctx;
    this.applyCanvasTransform();
    const { width, height } = this.viewport;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#dff4ff");
    gradient.addColorStop(1, "#f1f8ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 40px Segoe UI, sans-serif";
    ctx.fillText("Runner Quest", 470, 290);
    ctx.font = "600 22px Segoe UI, sans-serif";
    ctx.fillStyle = "#1e3a8a";
    ctx.fillText("Bir bolum sec ve gorevleri tamamla.", 405, 340);
  }

  render() {
    if (!this.currentLevel || !this.world || !this.player) {
      this.renderStaticWelcome();
      return;
    }

    const ctx = this.ctx;
    const width = this.viewport.width;
    const height = this.viewport.height;
    const groundY = this.world.groundY;

    // Reset any accidental transforms from previous draw calls.
    this.applyCanvasTransform();
    ctx.clearRect(0, 0, width, height);

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#d8ecff");
    sky.addColorStop(0.46, "#b7ddfb");
    sky.addColorStop(1, "#eef7ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    this.drawParallaxHills();
    this.drawBirds();
    this.drawDistanceMarkers();
    this.drawPlatforms();
    this.drawObstacles();
    this.drawPotions();
    this.drawCoins();
    this.drawEnemies();
    this.drawBoss();
    this.drawHealZone();

    const groundSoil = ctx.createLinearGradient(0, groundY, 0, height);
    groundSoil.addColorStop(0, "#9b6a3a");
    groundSoil.addColorStop(0.52, "#7b4f2a");
    groundSoil.addColorStop(1, "#5a351a");
    ctx.fillStyle = groundSoil;
    ctx.fillRect(0, groundY, width, height - groundY);

    this.drawGrassStrip(0, groundY - 8, width, 16, this.cameraX * 0.02, 12);
    this.drawPits();
    this.drawBridgePlanks();
    this.drawGroundPlanks();

    ctx.strokeStyle = "rgba(74, 45, 20, 0.34)";
    ctx.lineWidth = 1;
    for (let x = -24; x < width + 24; x += 28) {
      const y = groundY + 22 + ((x / 10) % 3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10, y + 4);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(133, 83, 45, 0.22)";
    for (let x = -20; x < width + 20; x += 24) {
      ctx.fillRect(x, groundY + 36, 10, 6);
    }

    this.drawPlayer();
    this.drawAttackEffect();
    this.drawFinishFlag();

    if (this.paused) {
      ctx.fillStyle = "rgba(2, 6, 23, 0.18)";
      ctx.fillRect(0, 0, width, height);
    }
  }

  drawParallaxHills() {
    const ctx = this.ctx;
    const width = this.viewport.width;
    const height = this.viewport.height;
    const horizon = height - Math.round(height * 0.3);

    const drawCloud = (centerX, centerY, scale, alpha) => {
      const r = 28 * scale;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(centerX - r * 1.2, centerY + r * 0.2, r * 1.1, r * 0.8, 0, 0, Math.PI * 2);
      ctx.ellipse(centerX, centerY - r * 0.25, r * 1.35, r * 1.05, 0, 0, Math.PI * 2);
      ctx.ellipse(centerX + r * 1.2, centerY + r * 0.15, r, r * 0.75, 0, 0, Math.PI * 2);
      ctx.ellipse(centerX + r * 0.15, centerY + r * 0.35, r * 2.1, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const cloudBands = [
      { y: horizon * 0.17, speed: 13, scale: 1.05, alpha: 0.32, offset: 120 },
      { y: horizon * 0.24, speed: 17, scale: 0.84, alpha: 0.26, offset: 420 },
      { y: horizon * 0.11, speed: 9, scale: 1.25, alpha: 0.22, offset: 700 }
    ];

    for (const band of cloudBands) {
      for (let i = 0; i < 4; i += 1) {
        const drift =
          ((this.renderTime * band.speed + this.cameraX * 0.04 + band.offset + i * 420) %
            (width + 520)) -
          260;
        const yJitter = Math.sin(this.renderTime * 0.6 + i * 0.8) * 8;
        drawCloud(drift, band.y + yJitter, band.scale * (1 + i * 0.05), band.alpha);
      }
    }

    const layers = [
      {
        speed: 0.08,
        step: 180,
        baseHeight: 86,
        baseOffset: 80,
        ampA: 24,
        ampB: 18,
        ampC: 10,
        freqA: 0.0032,
        freqB: 0.0072,
        freqC: 0.0118,
        phaseA: 1.2,
        phaseB: 0.4,
        phaseC: 2.1,
        colors: ["#d9e7f7", "#c1d5ec"],
        stroke: "rgba(178, 199, 226, 0.55)"
      },
      {
        speed: 0.16,
        step: 160,
        baseHeight: 112,
        baseOffset: 58,
        ampA: 34,
        ampB: 21,
        ampC: 13,
        freqA: 0.0038,
        freqB: 0.0088,
        freqC: 0.0144,
        phaseA: 0.8,
        phaseB: 1.7,
        phaseC: 2.9,
        colors: ["#afc9e7", "#7ea4cb"],
        stroke: "rgba(108, 148, 191, 0.5)"
      },
      {
        speed: 0.26,
        step: 145,
        baseHeight: 146,
        baseOffset: 24,
        ampA: 42,
        ampB: 26,
        ampC: 15,
        freqA: 0.0043,
        freqB: 0.0098,
        freqC: 0.0162,
        phaseA: 2.3,
        phaseB: 0.3,
        phaseC: 1.4,
        colors: ["#5e84ad", "#3f6288"],
        stroke: "rgba(49, 82, 117, 0.58)"
      }
    ];

    const drawRidgeLine = (points, strokeStyle, lineWidth) => {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i += 1) {
        const current = points[i];
        const next = points[i + 1];
        const controlX = (current.x + next.x) * 0.5;
        const controlY = (current.y + next.y) * 0.5;
        ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
      }
      ctx.stroke();
    };

    for (const layer of layers) {
      const points = [];
      const startX = -layer.step * 2;
      const endX = width + layer.step * 2;

      for (let x = startX; x <= endX; x += layer.step) {
        const worldX = x + this.cameraX * layer.speed;
        const waveA = Math.sin(worldX * layer.freqA + layer.phaseA) * layer.ampA;
        const waveB = Math.sin(worldX * layer.freqB + layer.phaseB) * layer.ampB;
        const waveC = Math.cos(worldX * layer.freqC + layer.phaseC) * layer.ampC;
        const y = horizon + layer.baseOffset - (layer.baseHeight + waveA + waveB + waveC);
        points.push({ x, y });
      }

      const topY = Math.min(...points.map((point) => point.y));
      const gradient = ctx.createLinearGradient(0, topY - 26, 0, horizon + 160);
      gradient.addColorStop(0, layer.colors[0]);
      gradient.addColorStop(1, layer.colors[1]);

      ctx.beginPath();
      ctx.moveTo(points[0].x, height);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i += 1) {
        const current = points[i];
        const next = points[i + 1];
        const controlX = (current.x + next.x) * 0.5;
        const controlY = (current.y + next.y) * 0.5;
        ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
      }
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      drawRidgeLine(points, layer.stroke, 1.1);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, horizon - 100, width, 90);
  }

  drawBirds() {
    if (!this.world?.birds?.length) return;

    const ctx = this.ctx;
    const viewPad = SKY_BIRD_OVERSCAN + 70;
    for (const bird of this.world.birds) {
      if (bird.x < -viewPad || bird.x > this.viewport.width + viewPad) continue;

      const config = this.getBirdTypeConfig(bird.type);
      const scale = bird.sizeScale ?? 1;
      const flap = Math.sin(bird.wingAnimationFrame);

      const wingSpan = config.wingSpan * scale;
      const wingLift = (config.wingLift + flap * config.wingFlapRange) * scale;
      const wingTip = flap * config.wingTipSwing * scale;
      const bodyW = config.bodyWidth * scale;
      const bodyH = config.bodyHeight * scale;

      ctx.save();
      ctx.translate(bird.x, bird.y);
      if (bird.direction < 0) {
        ctx.scale(-1, 1);
      }
      ctx.globalAlpha = config.alpha;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.lineWidth * scale;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-wingSpan * 0.42, -wingLift, -wingSpan, wingTip);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(wingSpan * 0.42, -wingLift * 0.95, wingSpan, -wingTip * 0.6);
      ctx.stroke();

      ctx.fillStyle = config.bodyColor;
      ctx.beginPath();
      ctx.ellipse(0.7, 0.6, bodyW * 0.52, bodyH * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = config.accentColor;
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.5, 0.7);
      ctx.lineTo(-bodyW * 0.92, -1.8 * scale);
      ctx.lineTo(-bodyW * 0.84, 2.6 * scale);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(bodyW * 0.5, 0.45);
      ctx.lineTo(bodyW * 0.79, 1.15);
      ctx.lineTo(bodyW * 0.5, 1.82);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  drawDistanceMarkers() {
    const ctx = this.ctx;
    const markerEveryMeters = 250;
    const markerStep = markerEveryMeters * PIXELS_PER_METER;

    const start = Math.floor(this.cameraX / markerStep) * markerStep;
    const end = this.cameraX + this.viewport.width + markerStep;

    ctx.strokeStyle = "rgba(15, 23, 42, 0.12)";
    ctx.fillStyle = "rgba(15, 23, 42, 0.48)";
    ctx.font = "600 14px Segoe UI, sans-serif";

    for (let worldX = start; worldX < end; worldX += markerStep) {
      const screenX = worldX - this.cameraX;
      const meters = Math.max(0, Math.floor((worldX - this.world.startX) / PIXELS_PER_METER));
      ctx.beginPath();
      ctx.moveTo(screenX, this.world.groundY - 10);
      ctx.lineTo(screenX, this.world.groundY - 68);
      ctx.stroke();

      if (meters > 0) {
        ctx.fillText(`${meters}m`, screenX + 5, this.world.groundY - 72);
      }
    }
  }

  drawGrassStrip(x, y, width, capHeight, seed = 0, bladeStep = 10) {
    const ctx = this.ctx;
    const safeWidth = Math.max(0, width);
    const safeCapHeight = Math.max(2, capHeight);
    if (safeWidth <= 0) return;

    const grassGradient = ctx.createLinearGradient(0, y, 0, y + safeCapHeight);
    grassGradient.addColorStop(0, "#9df777");
    grassGradient.addColorStop(0.42, "#65c85a");
    grassGradient.addColorStop(1, "#2f8e39");
    ctx.fillStyle = grassGradient;
    drawRoundedRect(ctx, x, y, safeWidth, safeCapHeight, Math.min(6, safeCapHeight * 0.6));
    ctx.fill();

    ctx.fillStyle = "rgba(225, 255, 205, 0.58)";
    ctx.fillRect(x + 2, y + 1, Math.max(0, safeWidth - 4), 1);

    ctx.strokeStyle = "rgba(25, 120, 46, 0.72)";
    ctx.lineWidth = 1.15;
    ctx.lineCap = "round";
    for (let gx = x + 4; gx < x + safeWidth - 3; gx += bladeStep) {
      const bladeWave = Math.sin(this.renderTime * 3 + gx * 0.07 + seed) * 1.4;
      const bladeHeight = 2.5 + (Math.sin(gx * 0.2 + seed) * 0.5 + 0.5) * 3.4;
      ctx.beginPath();
      ctx.moveTo(gx, y + safeCapHeight - 0.8);
      ctx.lineTo(gx + bladeWave * 0.35, y - bladeHeight);
      ctx.stroke();
    }
  }

  drawSoilBlock(x, y, width, height, radius = 7, seed = 0) {
    const ctx = this.ctx;
    if (width <= 0 || height <= 0) return;

    const soilGradient = ctx.createLinearGradient(0, y, 0, y + height);
    soilGradient.addColorStop(0, "#8c5b31");
    soilGradient.addColorStop(0.55, "#754827");
    soilGradient.addColorStop(1, "#563218");
    ctx.fillStyle = soilGradient;
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();

    ctx.strokeStyle = "rgba(70, 41, 19, 0.36)";
    ctx.lineWidth = 1;
    for (let tx = x + 6; tx < x + width - 7; tx += 20) {
      const lineY = y + 8 + (((tx + seed) % 11) * 0.55);
      ctx.beginPath();
      ctx.moveTo(tx, lineY);
      ctx.lineTo(tx + 9, lineY + 2.4);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(165, 107, 60, 0.2)";
    for (let tx = x + 4; tx < x + width - 5; tx += 24) {
      const dotY = y + 14 + (((tx * 0.17 + seed) % 9) * 0.7);
      ctx.fillRect(tx, dotY, 3, 3);
    }
  }

  drawPlatforms() {
    for (const platform of this.world.platforms) {
      const screenX = platform.x - this.cameraX;
      if (screenX + platform.width < -40 || screenX > this.viewport.width + 40) continue;

      this.drawSoilBlock(screenX, platform.y, platform.width, platform.height, 6, platform.x * 0.01);
      this.drawGrassStrip(
        screenX,
        platform.y - 2,
        platform.width,
        Math.min(7, platform.height + 2),
        platform.x * 0.013,
        9
      );
    }
  }

  drawObstacles() {
    for (const obstacle of this.world.obstacles) {
      const screenX = obstacle.x - this.cameraX;
      if (screenX + obstacle.width < -40 || screenX > this.viewport.width + 40) continue;

      this.drawSoilBlock(
        screenX,
        obstacle.y,
        obstacle.width,
        obstacle.height,
        8,
        obstacle.x * 0.01
      );
      this.drawGrassStrip(
        screenX,
        obstacle.y - 2,
        obstacle.width,
        Math.min(10, Math.max(6, obstacle.height * 0.16)),
        obstacle.x * 0.012,
        10
      );
    }
  }

  drawPlankBoard(screenX, y, width, height, seed = 0) {
    const ctx = this.ctx;
    const woodGradient = ctx.createLinearGradient(0, y, 0, y + height);
    woodGradient.addColorStop(0, "#c08457");
    woodGradient.addColorStop(0.55, "#9a6139");
    woodGradient.addColorStop(1, "#6f4225");

    ctx.fillStyle = woodGradient;
    drawRoundedRect(ctx, screenX, y, width, height, Math.min(5, height * 0.45));
    ctx.fill();

    ctx.fillStyle = "rgba(255, 228, 182, 0.18)";
    ctx.fillRect(screenX + 3, y + 1, Math.max(0, width - 6), 1.6);

    ctx.strokeStyle = "rgba(78, 49, 29, 0.5)";
    ctx.lineWidth = 1;
    for (let lx = screenX + 8; lx < screenX + width - 7; lx += 14) {
      const offset = Math.sin(seed + lx * 0.08) * 0.8;
      ctx.beginPath();
      ctx.moveTo(lx, y + 2 + offset);
      ctx.lineTo(lx + 5, y + height - 2 + offset * 0.3);
      ctx.stroke();
    }
  }

  drawGroundPlanks() {
    if (!this.world?.planks?.length) return;

    for (const plank of this.world.planks) {
      if (plank.picked || plank.used || plank.carried) continue;

      const screenX = plank.x - this.cameraX;
      if (screenX + plank.width < -60 || screenX > this.viewport.width + 60) continue;

      this.drawPlankBoard(screenX, plank.y, plank.width, plank.height, plank.id * 0.7);
    }
  }

  drawPits() {
    if (!this.world?.pits?.length) return;

    const ctx = this.ctx;
    const holeTop = this.world.groundY - 2;
    const holeDepth = this.viewport.height - holeTop + 2;

    for (const pit of this.world.pits) {
      const screenX = pit.x - this.cameraX;
      if (screenX + pit.width < -80 || screenX > this.viewport.width + 80) continue;

      const holeGradient = ctx.createLinearGradient(0, holeTop, 0, this.viewport.height);
      holeGradient.addColorStop(0, "#111827");
      holeGradient.addColorStop(0.55, "#0b1120");
      holeGradient.addColorStop(1, "#030712");
      ctx.fillStyle = holeGradient;
      ctx.fillRect(screenX, holeTop, pit.width, holeDepth);

      ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
      ctx.fillRect(screenX, holeTop, pit.width, 4);

      const wallHeight = Math.min(220, holeDepth);
      this.drawSoilBlock(screenX - 14, holeTop, 14, wallHeight, 4, pit.x * 0.02);
      this.drawSoilBlock(screenX + pit.width, holeTop, 14, wallHeight, 4, pit.x * 0.02 + 1);
    }
  }

  drawBridgePlanks() {
    if (!this.world?.pits?.length) return;

    for (const pit of this.world.pits) {
      if (!pit.placed) continue;
      const bridge = pit.bridge;
      const screenX = bridge.x - this.cameraX;
      if (screenX + bridge.width < -80 || screenX > this.viewport.width + 80) continue;
      this.drawPlankBoard(screenX, bridge.y, bridge.width, bridge.height, pit.id * 1.7);
    }
  }

  drawHealZone() {
    if (this.levelHealCollected) return;
    if (!this.world?.parkour?.healZone) return;

    const ctx = this.ctx;
    const zone = this.world.parkour.healZone;
    const screenX = zone.x - this.cameraX;
    if (screenX + zone.width < -60 || screenX > this.viewport.width + 60) return;

    const pulse = Math.sin(this.renderTime * 4.2) * 0.5 + 0.5;
    const glowAlpha = 0.22 + pulse * 0.24;

    ctx.fillStyle = `rgba(16, 185, 129, ${glowAlpha})`;
    drawRoundedRect(ctx, screenX - 8, zone.y - 8, zone.width + 16, zone.height + 16, 14);
    ctx.fill();

    ctx.fillStyle = "rgba(5, 150, 105, 0.26)";
    drawRoundedRect(ctx, screenX, zone.y, zone.width, zone.height, 10);
    ctx.fill();

    ctx.strokeStyle = "rgba(4, 120, 87, 0.9)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, screenX, zone.y, zone.width, zone.height, 10);
    ctx.stroke();

    const centerX = screenX + zone.width * 0.5;
    const centerY = zone.y + zone.height * 0.5;
    ctx.fillStyle = "#ecfdf5";
    ctx.fillRect(centerX - 4, centerY - 14, 8, 28);
    ctx.fillRect(centerX - 14, centerY - 4, 28, 8);

    ctx.fillStyle = "#064e3b";
    ctx.font = "700 14px Segoe UI, sans-serif";
    ctx.fillText("Can +1", screenX + 12, zone.y - 10);
  }

  drawPotions() {
    const ctx = this.ctx;
    for (const potion of this.world.potions) {
      if (potion.collected) continue;
      const screenX = potion.x - this.cameraX;
      if (screenX < -36 || screenX > this.viewport.width + 36) continue;

      const bobY = potion.y + Math.sin(this.renderTime * 3.8 + potion.waveOffset) * 4;

      ctx.beginPath();
      ctx.arc(screenX, bobY, potion.radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 211, 238, 0.22)";
      ctx.fill();

      drawRoundedRect(ctx, screenX - 9, bobY - 12, 18, 22, 6);
      ctx.fillStyle = "#06b6d4";
      ctx.fill();

      drawRoundedRect(ctx, screenX - 6, bobY - 18, 12, 8, 3);
      ctx.fillStyle = "#0891b2";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(screenX - 3, bobY - 4, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fill();
    }
  }

  drawCoins() {
    const ctx = this.ctx;
    for (const coin of this.world.coins) {
      if (coin.collected) continue;
      const screenX = coin.x - this.cameraX;
      if (screenX < -30 || screenX > this.viewport.width + 30) continue;

      const floatingY = coin.y + Math.sin(this.renderTime * 3 + coin.waveOffset) * 3;

      ctx.beginPath();
      ctx.arc(screenX, floatingY, coin.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(screenX - 3, floatingY - 3, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.fill();
    }
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.world.enemies) {
      const screenX = enemy.x - this.cameraX;
      if (screenX + enemy.width < -40 || screenX > this.viewport.width + 40) continue;

      drawRoundedRect(ctx, screenX, enemy.y, enemy.width, enemy.height, 8);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      drawRoundedRect(ctx, screenX + 5, enemy.y + 6, enemy.width - 10, 8, 3);
      ctx.fillStyle = "#fca5a5";
      ctx.fill();

      const eyeY = enemy.y + enemy.height * 0.35;
      const leftEyeX = screenX + enemy.width * 0.3;
      const rightEyeX = screenX + enemy.width * 0.7;
      const eyeRadius = Math.max(3, enemy.width * 0.12);

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.arc(rightEyeX, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      const pupilOffset = enemy.direction > 0 ? 1 : -1;
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.arc(leftEyeX + pupilOffset, eyeY + 1, eyeRadius * 0.5, 0, Math.PI * 2);
      ctx.arc(rightEyeX + pupilOffset, eyeY + 1, eyeRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(leftEyeX + pupilOffset, eyeY + 1, eyeRadius * 0.25, 0, Math.PI * 2);
      ctx.arc(rightEyeX + pupilOffset, eyeY + 1, eyeRadius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      const mouthY = enemy.y + enemy.height * 0.65;
      ctx.strokeStyle = "#450a0a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(screenX + enemy.width * 0.35, mouthY);
      ctx.lineTo(screenX + enemy.width * 0.65, mouthY);
      ctx.stroke();

      ctx.fillStyle = "#450a0a";
      ctx.beginPath();
      ctx.moveTo(screenX + enemy.width * 0.4, mouthY);
      ctx.lineTo(screenX + enemy.width * 0.45, mouthY + 3);
      ctx.lineTo(screenX + enemy.width * 0.5, mouthY);
      ctx.moveTo(screenX + enemy.width * 0.55, mouthY);
      ctx.lineTo(screenX + enemy.width * 0.6, mouthY + 3);
      ctx.lineTo(screenX + enemy.width * 0.65, mouthY);
      ctx.fill();
    }
  }

  drawBoss() {
    const boss = this.world.boss;
    if (!boss || boss.health <= 0) return;

    const ctx = this.ctx;
    const screenX = boss.x - this.cameraX;
    if (screenX + boss.width < -80 || screenX > this.viewport.width + 80) return;

    const isFlashing = boss.hitFlash > 0;
    const pulse = Math.sin(this.renderTime * 3) * 0.5 + 0.5;

    const bodyColor = isFlashing ? "#fef3c7" : (boss.active ? "#7c2d12" : "#9a3412");
    const glowAlpha = boss.active ? 0.3 + pulse * 0.2 : 0.1;

    ctx.fillStyle = `rgba(124, 45, 18, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(screenX + boss.width * 0.5, boss.y + boss.height * 0.5, boss.width * 0.7, 0, Math.PI * 2);
    ctx.fill();

    drawRoundedRect(ctx, screenX, boss.y, boss.width, boss.height, 16);
    ctx.fillStyle = bodyColor;
    ctx.fill();

    ctx.fillStyle = "#451a03";
    drawRoundedRect(ctx, screenX + 10, boss.y + 15, boss.width - 20, 20, 8);
    ctx.fill();

    const eyeY = boss.y + 45;
    const leftEyeX = screenX + 35;
    const rightEyeX = screenX + boss.width - 35;

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(leftEyeX, eyeY, 12, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(rightEyeX, eyeY, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    const pupilOffsetX = boss.direction * 4;
    ctx.fillStyle = isFlashing ? "#dc2626" : "#7f1d1d";
    ctx.beginPath();
    ctx.ellipse(leftEyeX + pupilOffsetX, eyeY + 2, 6, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(rightEyeX + pupilOffsetX, eyeY + 2, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(leftEyeX + pupilOffsetX, eyeY + 2, 3, 0, Math.PI * 2);
    ctx.arc(rightEyeX + pupilOffsetX, eyeY + 2, 3, 0, Math.PI * 2);
    ctx.fill();

    const mouthY = boss.y + 85;
    ctx.strokeStyle = "#450a0a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(screenX + 45, mouthY);
    ctx.lineTo(screenX + boss.width - 45, mouthY);
    ctx.stroke();

    ctx.fillStyle = "#450a0a";
    ctx.beginPath();
    ctx.moveTo(screenX + 50, mouthY);
    ctx.lineTo(screenX + 55, mouthY + 8);
    ctx.lineTo(screenX + 60, mouthY);
    ctx.moveTo(screenX + boss.width - 60, mouthY);
    ctx.lineTo(screenX + boss.width - 55, mouthY + 8);
    ctx.lineTo(screenX + boss.width - 50, mouthY);
    ctx.fill();

    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX + 40, boss.y + 25);
    ctx.lineTo(screenX + 55, boss.y + 35);
    ctx.moveTo(screenX + boss.width - 40, boss.y + 25);
    ctx.lineTo(screenX + boss.width - 55, boss.y + 35);
    ctx.stroke();

    const healthBarWidth = boss.width - 30;
    const healthRatio = boss.health / boss.maxHealth;
    ctx.fillStyle = "#374151";
    drawRoundedRect(ctx, screenX + 15, boss.y - 25, healthBarWidth, 14, 7);
    ctx.fill();

    const healthColor = healthRatio > 0.5 ? "#22c55e" : healthRatio > 0.25 ? "#eab308" : "#ef4444";
    ctx.fillStyle = healthColor;
    drawRoundedRect(ctx, screenX + 17, boss.y - 23, healthBarWidth * healthRatio - 4, 10, 5);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "700 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${boss.health} / ${boss.maxHealth}`, screenX + boss.width * 0.5, boss.y - 12);
    ctx.textAlign = "left";

    if (boss.active) {
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX + boss.width * 0.5, boss.y + boss.height * 0.5, boss.width * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawAttackEffect() {
    if (!this.attackActive) return;

    const ctx = this.ctx;
    const hitbox = this.getAttackHitbox();
    const screenX = hitbox.x - this.cameraX;
    if (screenX + hitbox.width < -40 || screenX > this.viewport.width + 40) return;

    const alpha = clamp(this.attackTimer / ATTACK_ACTIVE_SEC, 0, 1);
    ctx.fillStyle = `rgba(71, 85, 105, ${0.2 + alpha * 0.3})`;
    drawRoundedRect(ctx, screenX, hitbox.y, hitbox.width, hitbox.height, 12);
    ctx.fill();

    ctx.strokeStyle = `rgba(51, 65, 85, ${0.4 + alpha * 0.4})`;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, screenX, hitbox.y, hitbox.width, hitbox.height, 12);
    ctx.stroke();
  }

  getPlayerAnimationState() {
    if (!this.player) return "idle";
    if (this.attackActive) return "attack";
    if (!this.player.onGround) return "jump";

    const speed = Math.abs(this.player.vx);
    if (speed > PLAYER_SPEED * 1.1) return "run";
    if (speed > 18) return "walk";
    return "idle";
  }

  drawPlayer() {
    const ctx = this.ctx;
    const worldX = this.player.x - this.cameraX;
    const worldY = this.player.y;
    const width = this.player.width;
    const height = this.player.height;

    const state = this.getPlayerAnimationState();
    const facing = this.player.facing >= 0 ? 1 : -1;
    const speedRatio = clamp(Math.abs(this.player.vx) / PLAYER_SPEED, 0, 2.1);

    const isInvincible = this.isInvincible();
    const blinkVisible = !isInvincible || Math.floor(this.renderTime * 10) % 2 === 0;
    const attackProgress = this.attackActive
      ? 1 - clamp(this.attackTimer / ATTACK_ACTIVE_SEC, 0, 1)
      : 0;

    const anim =
      this.player.anim ??
      {
        walkBlend: 0,
        runBlend: 0,
        jumpBlend: 0,
        attackBlend: 0,
        idleBlend: 1,
        idleTime: 0,
        landingImpact: 0
      };
    this.player.anim = anim;

    const walkBlend = anim.walkBlend ?? 0;
    const runBlend = anim.runBlend ?? 0;
    const jumpBlend = anim.jumpBlend ?? 0;
    const attackBlend = anim.attackBlend ?? 0;
    const idleBlend = anim.idleBlend ?? 0;

    const cycleRate = 1 + walkBlend * 0.55 + runBlend * 1.25 + speedRatio * 0.18;
    const cycle = this.player.stepTime * cycleRate;
    const stride = Math.sin(cycle);
    const strideOpp = Math.sin(cycle + Math.PI);

    const idleBreath = Math.sin(anim.idleTime * 2.2) * 0.32 * idleBlend;
    const locomotionBob = Math.sin(cycle * 1.42) * (0.95 * walkBlend + 1.85 * runBlend);
    const jumpPoseOffset = -1.2 * jumpBlend;
    const attackPoseOffset = (this.player.onGround ? -0.35 : -1.25) * attackBlend;
    const landingCompress = (anim.landingImpact ?? 0) * 2.1;
    const bodyBob = idleBreath + locomotionBob + jumpPoseOffset + attackPoseOffset + landingCompress;

    const forwardVelocity = this.player.vx * facing;
    const walkLean = 0.028 * walkBlend * Math.sign(forwardVelocity || 1);
    const runLean = (0.08 + speedRatio * 0.014) * runBlend;
    let torsoLean = walkLean + runLean;
    torsoLean = lerp(torsoLean, this.player.vy < 0 ? -0.045 : 0.06, jumpBlend);
    torsoLean = lerp(torsoLean, 0.12, attackBlend);
    torsoLean += Math.sin(anim.idleTime * 1.7) * 0.006 * idleBlend;

    const palette = {
      skin: "#efbf99",
      skinShade: "#d89a70",
      shirt: "#d7262d",
      shirtShade: "#a31820",
      sleeve: "#2b3a53",
      sleeveShade: "#1f2a3d",
      pants: "#2457d4",
      pantsShade: "#1d44a5",
      shoe: "#0f172a",
      shoeSole: "#cbd5e1",
      hair: "#4a2b1e",
      hairShade: "#6a3f2a",
      outline: "#1f2937",
      eyeWhite: "#f8fafc",
      eyeDark: "#0f172a",
      accent: "#ef4444"
    };

    const partOriginY = bodyBob;
    const leanShift = torsoLean * 10;

    const parts = {
      head: { cx: 22 + leanShift * 0.5, cy: 14 + partOriginY, rx: 8.4, ry: 8.8 },
      torso: { x: 14.2 + leanShift * 0.55, y: 23.8 + partOriginY, width: 15.6, height: 22.4 },
      leftArm: {},
      rightArm: {},
      leftLeg: {},
      rightLeg: {},
      hands: { left: null, right: null },
      feet: { left: null, right: null }
    };

    const shoulders = {
      left: { x: 15.6 + leanShift, y: 29 + partOriginY },
      right: { x: 28.4 + leanShift, y: 29 + partOriginY }
    };
    const hips = {
      left: { x: 18.1 + leanShift * 0.35, y: 47.2 + partOriginY },
      right: { x: 25.9 + leanShift * 0.35, y: 47.2 + partOriginY }
    };

    const legSwingAmp = 0.08 + walkBlend * 0.54 + runBlend * 0.86;
    const armSwingAmp = 0.1 + walkBlend * 0.58 + runBlend * 0.9;

    // Reverse animation when facing left so walking matches movement direction
    const dirSign = facing >= 0 ? 1 : -1;
    const strideDir = stride * dirSign;
    const strideOppDir = strideOpp * dirSign;

    // Natural human walking: opposite arm and leg swing
    // When right leg goes forward, left arm goes forward (and vice versa)
    let leftLegSwing = strideOppDir * legSwingAmp;
    let rightLegSwing = strideDir * legSwingAmp;
    let leftArmSwing = strideDir * armSwingAmp;
    let rightArmSwing = strideOppDir * armSwingAmp;

    // Idle sway adjustments
    const idleArmSway = Math.sin(anim.idleTime * 2.05) * 0.06 * idleBlend * dirSign;
    const idleLegSway = Math.sin(anim.idleTime * 1.65 + 0.8) * 0.035 * idleBlend * dirSign;
    leftArmSwing += idleArmSway;
    rightArmSwing -= idleArmSway;
    leftLegSwing -= idleLegSway;
    rightLegSwing += idleLegSway;

    const jumpLeftLeg = this.player.vy < 0 ? -0.14 : -0.07;
    const jumpRightLeg = this.player.vy < 0 ? 0.34 : 0.26;
    const jumpLeftArm = this.player.vy < 0 ? -0.5 : -0.24;
    const jumpRightArm = this.player.vy < 0 ? 0.3 : 0.16;
    leftLegSwing = lerp(leftLegSwing, jumpLeftLeg, jumpBlend);
    rightLegSwing = lerp(rightLegSwing, jumpRightLeg, jumpBlend);
    leftArmSwing = lerp(leftArmSwing, jumpLeftArm, jumpBlend);
    rightArmSwing = lerp(rightArmSwing, jumpRightArm, jumpBlend);

    const attackPunch = clamp(attackBlend * (0.55 + attackProgress * 0.65), 0, 1.2);
    leftLegSwing = lerp(leftLegSwing, -0.12, attackBlend);
    rightLegSwing = lerp(rightLegSwing, 0.19, attackBlend);
    leftArmSwing = lerp(leftArmSwing, 0.38, attackBlend);
    rightArmSwing = lerp(rightArmSwing, -0.95 + attackPunch * 0.28, attackBlend);

    const armBaseAngle = Math.PI * 0.5 - torsoLean * 0.35;
    const legBaseAngle = Math.PI * 0.5 + torsoLean * 0.55;
    const armKneeBend = 0.42 + runBlend * 0.1;
    const legKneeBend = 0.62 + runBlend * 0.16 + jumpBlend * 0.08;

    const pointAt = (x, y, length, angle) => ({
      x: x + Math.cos(angle) * length,
      y: y + Math.sin(angle) * length
    });

    const drawSegment = (from, to, widthPx, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = widthPx;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    };

    const drawTorso = () => {
      const torso = parts.torso;

      ctx.fillStyle = palette.shirt;
      drawRoundedRect(ctx, torso.x, torso.y, torso.width, torso.height, 5);
      ctx.fill();

      ctx.fillStyle = palette.sleeve;
      drawRoundedRect(ctx, torso.x - 1.2, torso.y + 1.4, 2.6, 8.4, 1.2);
      drawRoundedRect(ctx, torso.x + torso.width - 1.4, torso.y + 1.4, 2.6, 8.4, 1.2);
      ctx.fill();

      ctx.fillStyle = palette.shirtShade;
      drawRoundedRect(ctx, torso.x + torso.width * 0.42, torso.y + 1.6, torso.width * 0.18, torso.height - 3.6, 2);
      ctx.fill();

      ctx.fillStyle = palette.pants;
      drawRoundedRect(ctx, torso.x + 0.4, torso.y + torso.height - 2.2, torso.width - 0.8, 6.8, 2);
      ctx.fill();

      ctx.fillStyle = palette.skin;
      drawRoundedRect(ctx, 19.8 + leanShift * 0.45, torso.y - 2.6, 4.4, 3.4, 1.2);
      ctx.fill();
    };

    const drawHead = () => {
      const head = parts.head;

      ctx.fillStyle = palette.skin;
      ctx.beginPath();
      ctx.ellipse(head.cx, head.cy, head.rx, head.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.skinShade;
      ctx.beginPath();
      ctx.ellipse(head.cx + 2.5, head.cy + 2.4, head.rx * 0.38, head.ry * 0.35, 0, 0, Math.PI * 2);
      ctx.globalAlpha *= 0.2;
      ctx.fill();
      ctx.globalAlpha = isInvincible && !blinkVisible ? 0.34 : 1;

      ctx.fillStyle = palette.accent;
      drawRoundedRect(ctx, head.cx - 8.8, head.cy - 6.8, 17.6, 3.2, 1.3);
      ctx.fill();

      ctx.fillStyle = palette.hair;
      ctx.beginPath();
      ctx.moveTo(head.cx - 8.6, head.cy - 1.2);
      ctx.quadraticCurveTo(head.cx - 9.1, head.cy - 11.0, head.cx - 0.8, head.cy - 11.8);
      ctx.quadraticCurveTo(head.cx + 8.5, head.cy - 11.0, head.cx + 8.9, head.cy - 1.0);
      ctx.quadraticCurveTo(head.cx + 4.4, head.cy - 4.0, head.cx, head.cy - 3.9);
      ctx.quadraticCurveTo(head.cx - 4.3, head.cy - 4.0, head.cx - 8.6, head.cy - 1.2);
      ctx.fill();

      ctx.fillStyle = palette.hairShade;
      ctx.beginPath();
      ctx.moveTo(head.cx - 7.0, head.cy - 9.6);
      ctx.lineTo(head.cx - 9.2, head.cy - 11.7);
      ctx.lineTo(head.cx - 4.2, head.cy - 10.0);
      ctx.lineTo(head.cx - 0.5, head.cy - 12.6);
      ctx.lineTo(head.cx + 3.3, head.cy - 9.7);
      ctx.lineTo(head.cx + 7.5, head.cy - 11.0);
      ctx.lineTo(head.cx + 5.5, head.cy - 8.2);
      ctx.fill();
    };

    const drawFace = () => {
      const head = parts.head;
      const eyeY = head.cy - 1.2;
      const blinkHeight = state === "jump" ? 1 : 2.2;

      ctx.fillStyle = palette.eyeWhite;
      drawRoundedRect(ctx, head.cx - 5.7, eyeY - 1.0, 3.3, 2.4, 0.8);
      drawRoundedRect(ctx, head.cx + 2.4, eyeY - 1.0, 3.3, 2.4, 0.8);
      ctx.fill();

      ctx.fillStyle = palette.eyeDark;
      ctx.fillRect(head.cx - 4.6, eyeY - 0.2, 1.2, blinkHeight);
      ctx.fillRect(head.cx + 3.5, eyeY - 0.2, 1.2, blinkHeight);

      ctx.strokeStyle = palette.skinShade;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(head.cx + 0.35, head.cy + 0.7);
      ctx.lineTo(head.cx - 0.1, head.cy + 3.2);
      ctx.stroke();

      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (state === "jump") {
        ctx.moveTo(head.cx - 2.8, head.cy + 5.0);
        ctx.lineTo(head.cx + 2.8, head.cy + 5.0);
      } else {
        ctx.moveTo(head.cx - 3.1, head.cy + 4.9);
        ctx.quadraticCurveTo(head.cx, head.cy + 7.0, head.cx + 3.1, head.cy + 4.9);
      }
      ctx.stroke();
    };

    const drawArmPart = (partKey, shoulder, upperAngle, lowerAngle, layer) => {
      const upperLen = 8.8;
      const lowerLen = 8.2;
      const elbow = pointAt(shoulder.x, shoulder.y, upperLen, upperAngle);
      const hand = pointAt(elbow.x, elbow.y, lowerLen, lowerAngle);

      parts[partKey] = { shoulder, elbow, hand };
      parts.hands[partKey === "leftArm" ? "left" : "right"] = hand;

      const sleeveMain = layer === "front" ? palette.sleeve : palette.sleeveShade;
      const sleeveLow = layer === "front" ? palette.shirtShade : palette.sleeveShade;
      drawSegment(shoulder, elbow, layer === "front" ? 4.8 : 4.3, sleeveMain);
      drawSegment(elbow, hand, layer === "front" ? 4.5 : 4.0, sleeveLow);
      drawSegment({ x: elbow.x + 0.2, y: elbow.y + 0.2 }, hand, layer === "front" ? 2.05 : 1.75, palette.skin);
    };

    const drawLegPart = (partKey, hip, upperAngle, lowerAngle, layer) => {
      const upperLen = 10.7;
      const lowerLen = 10.2;
      const knee = pointAt(hip.x, hip.y, upperLen, upperAngle);
      const ankle = pointAt(knee.x, knee.y, lowerLen, lowerAngle);

      parts[partKey] = { hip, knee, ankle };
      parts.feet[partKey === "leftLeg" ? "left" : "right"] = ankle;

      const legMain = layer === "front" ? palette.pants : palette.pantsShade;
      drawSegment(hip, knee, layer === "front" ? 5.05 : 4.55, legMain);
      drawSegment(knee, ankle, layer === "front" ? 4.7 : 4.2, legMain);
    };

    const drawHands = () => {
      const leftHand = parts.hands.left;
      const rightHand = parts.hands.right;
      if (leftHand) {
        ctx.fillStyle = palette.skinShade;
        ctx.beginPath();
        ctx.arc(leftHand.x, leftHand.y, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
      if (rightHand) {
        const punchBoost = state === "attack" ? 0.7 + attackProgress * 0.9 : 0;
        ctx.fillStyle = palette.skinShade;
        ctx.beginPath();
        ctx.arc(rightHand.x, rightHand.y, 2 + punchBoost * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawFeet = () => {
      const leftFoot = parts.feet.left;
      const rightFoot = parts.feet.right;
      if (leftFoot) {
        ctx.fillStyle = palette.shoe;
        ctx.beginPath();
        ctx.ellipse(leftFoot.x + 4.2, leftFoot.y + 1.7, 6.2, 3.3, 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = palette.shoeSole;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(leftFoot.x - 0.2, leftFoot.y + 2.9);
        ctx.lineTo(leftFoot.x + 7.3, leftFoot.y + 2.9);
        ctx.stroke();
      }
      if (rightFoot) {
        ctx.fillStyle = palette.shoe;
        ctx.beginPath();
        ctx.ellipse(rightFoot.x + 4.3, rightFoot.y + 1.7, 6.4, 3.4, -0.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = palette.shoeSole;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(rightFoot.x - 0.1, rightFoot.y + 2.9);
        ctx.lineTo(rightFoot.x + 7.6, rightFoot.y + 2.9);
        ctx.stroke();
      }
    };

    const drawCarriedPlank = () => {
      if (!this.player.carryingPlank) return;
      const frontHand = parts.hands.right;
      if (!frontHand) return;

      const plankWidth = 58;
      const plankHeight = 9.5;
      const plankX = frontHand.x - 8;
      const plankY = frontHand.y - 5.2;
      this.drawPlankBoard(plankX, plankY, plankWidth, plankHeight, this.player.stepTime * 0.37);
    };

    ctx.save();
    if (isInvincible && !blinkVisible) {
      ctx.globalAlpha = 0.34;
    }

    const facingLeft = facing < 0;
    ctx.translate(worldX, worldY);
    if (facingLeft) {
      // Mirror only the player drawing, not the full canvas.
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    const shadowAlpha = this.player.onGround ? 0.18 : 0.11;
    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height + 2, 14.5, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();

    const leftLegUpper = legBaseAngle + leftLegSwing * 0.6;
    const rightLegUpper = legBaseAngle + rightLegSwing * 0.6;
    const landingKneeBend = (anim.landingImpact ?? 0) * 0.28;
    let leftLegLower = leftLegUpper + legKneeBend + landingKneeBend - Math.abs(leftLegSwing) * 0.14;
    let rightLegLower = rightLegUpper + legKneeBend + landingKneeBend - Math.abs(rightLegSwing) * 0.14;

    leftLegLower += jumpBlend * 0.24;
    rightLegLower += jumpBlend * 0.16;

    const leftArmUpper = armBaseAngle + leftArmSwing * 0.55;
    const leftArmLower = leftArmUpper + armKneeBend - Math.abs(leftArmSwing) * 0.12;

    let rightArmUpper = armBaseAngle + rightArmSwing * 0.54;
    let rightArmLower = rightArmUpper + armKneeBend - Math.abs(rightArmSwing) * 0.1;
    if (attackBlend > 0.02) {
      rightArmUpper = lerp(rightArmUpper, -0.18 + attackProgress * 0.06, attackBlend);
      rightArmLower = lerp(rightArmLower, -0.06 + attackProgress * 0.03, attackBlend);
    }

    drawLegPart("leftLeg", hips.left, leftLegUpper, leftLegLower, "back");
    drawArmPart("leftArm", shoulders.left, leftArmUpper, leftArmLower, "back");
    drawTorso();
    drawHead();
    drawFace();
    drawLegPart("rightLeg", hips.right, rightLegUpper, rightLegLower, "front");
    drawArmPart("rightArm", shoulders.right, rightArmUpper, rightArmLower, "front");
    drawCarriedPlank();
    drawHands();
    drawFeet();

    ctx.restore();

    if (isInvincible) {
      ctx.save();
      ctx.strokeStyle = `rgba(96, 165, 250, ${0.45 + Math.sin(this.renderTime * 8) * 0.26})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        worldX + this.player.width * 0.5,
        worldY + this.player.height * 0.5,
        40,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  drawFinishFlag() {
    const ctx = this.ctx;
    const finishX = this.world.worldWidth - 120 - this.cameraX;
    if (finishX < -80 || finishX > this.viewport.width + 80) return;

    const baseY = this.world.groundY;
    ctx.fillStyle = "#374151";
    ctx.fillRect(finishX, baseY - 140, 6, 140);

    ctx.fillStyle = "#f43f5e";
    drawRoundedRect(ctx, finishX + 6, baseY - 140, 34, 22, 4);
    ctx.fill();
  }
}
