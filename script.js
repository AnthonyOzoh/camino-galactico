// Camino Galáctico - Simple endless runner
// Developed by Nexora Games
// Parent Company: Ancherem Innovation LTD

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const finalScoreEl = document.getElementById("finalScore");
const highScoreEl = document.getElementById("highScore");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

let width = 960;
let height = 540;
let groundY = 420;
let scale = 1;
let animationId = null;
let lastTime = 0;
let gameState = "start";

let score = 0;
let highScore = Number(localStorage.getItem("caminoGalacticoHighScore") || 0);

const brand = {
  navy: "#050B2E",
  navy2: "#08164A",
  horizonBlue: "#1E7BFF",
  cyan: "#00F5FF",
  gold: "#FFC857",
  white: "#F4F7FF",
  danger: "#ff4d6d"
};

const player = {
  x: 110,
  y: 0,
  w: 44,
  h: 58,
  vy: 0,
  gravity: 2100,
  jumpPower: -760,
  grounded: true
};

let obstacles = [];
let orbs = [];
let stars = [];
let speed = 390;
let spawnTimer = 0;
let orbTimer = 0;

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  width = rect.width;
  height = rect.height;
  scale = Math.min(width / 960, height / 540);
  groundY = height * 0.78;

  player.w = Math.max(34, 44 * scale);
  player.h = Math.max(46, 58 * scale);
  player.x = Math.max(58, width * 0.12);

  if (gameState === "start" || gameState === "over") {
    player.y = groundY - player.h;
    draw();
  }
}

function resetGame() {
  score = 0;
  speed = Math.max(330, width * 0.42);
  obstacles = [];
  orbs = [];
  spawnTimer = 0.8;
  orbTimer = 1.2;
  player.y = groundY - player.h;
  player.vy = 0;
  player.grounded = true;
  scoreEl.textContent = "0";
}

function startGame() {
  resetGame();
  gameState = "playing";
  startScreen.classList.remove("active");
  gameOverScreen.classList.remove("active");
  lastTime = performance.now();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function endGame() {
  gameState = "over";
  cancelAnimationFrame(animationId);

  highScore = Math.max(highScore, Math.floor(score));
  localStorage.setItem("caminoGalacticoHighScore", String(highScore));

  finalScoreEl.textContent = Math.floor(score);
  highScoreEl.textContent = highScore;
  gameOverScreen.classList.add("active");
}

function jump() {
  if (gameState === "start") {
    startGame();
    return;
  }

  if (gameState === "over") {
    startGame();
    return;
  }

  if (player.grounded) {
    player.vy = player.jumpPower * Math.max(0.82, scale);
    player.grounded = false;
  }
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  update(dt);
  draw();

  if (gameState === "playing") {
    animationId = requestAnimationFrame(loop);
  }
}

function update(dt) {
  score += dt * 10;
  speed += dt * 4;
  scoreEl.textContent = Math.floor(score);

  player.vy += player.gravity * dt;
  player.y += player.vy * dt;

  if (player.y >= groundY - player.h) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.grounded = true;
  }

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = randomRange(1.05, 1.7) * Math.max(0.7, 390 / speed);
  }

  orbTimer -= dt;
  if (orbTimer <= 0) {
    spawnOrb();
    orbTimer = randomRange(0.9, 1.45);
  }

  obstacles.forEach(o => o.x -= speed * dt);
  orbs.forEach(o => o.x -= speed * dt);

  obstacles = obstacles.filter(o => o.x + o.w > -40);
  orbs = orbs.filter(o => !o.collected && o.x + o.r > -40);

  for (const obstacle of obstacles) {
    if (rectsCollide(player, obstacle)) {
      endGame();
      return;
    }
  }

  for (const orb of orbs) {
    if (circleRectCollide(orb, player)) {
      orb.collected = true;
      score += 25;
      scoreEl.textContent = Math.floor(score);
    }
  }

  stars.forEach(s => {
    s.x -= s.speed * dt;
    if (s.x < 0) {
      s.x = width + Math.random() * 80;
      s.y = Math.random() * height * 0.55;
    }
  });
}

function spawnObstacle() {
  const size = randomRange(34, 58) * Math.max(0.85, scale);
  obstacles.push({
    x: width + 20,
    y: groundY - size,
    w: size,
    h: size,
    glow: Math.random()
  });
}

function spawnOrb() {
  const jumpHeight = randomRange(70, 145) * Math.max(0.8, scale);
  orbs.push({
    x: width + 30,
    y: groundY - jumpHeight,
    r: Math.max(10, 14 * scale),
    collected: false,
    pulse: Math.random() * Math.PI * 2
  });
}

function createStars() {
  stars = Array.from({ length: 70 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height * 0.62,
    r: Math.random() * 1.8 + 0.4,
    speed: Math.random() * 28 + 8,
    alpha: Math.random() * 0.65 + 0.25
  }));
}

function draw() {
  drawBackground();
  drawHorizon();
  drawGround();
  drawOrbs();
  drawObstacles();
  drawPlayer();

  if (gameState === "playing") {
    drawMiniTip();
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#020617");
  gradient.addColorStop(0.5, brand.navy);
  gradient.addColorStop(1, "#020817");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  for (const s of stars) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = brand.white;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const glow = ctx.createRadialGradient(width * 0.72, height * 0.2, 5, width * 0.72, height * 0.2, width * 0.65);
  glow.addColorStop(0, "rgba(0,245,255,0.18)");
  glow.addColorStop(0.4, "rgba(30,123,255,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawHorizon() {
  const horizonY = groundY - height * 0.23;

  ctx.save();
  ctx.strokeStyle = "rgba(255, 200, 87, 0.75)";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.shadowColor = brand.gold;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.quadraticCurveTo(width * 0.5, horizonY - 55 * scale, width, horizonY);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 200, 87, 0.9)";
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(width * 0.76, horizonY - 14 * scale, 6 * scale + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGround() {
  ctx.save();

  const roadGradient = ctx.createLinearGradient(0, groundY, width, height);
  roadGradient.addColorStop(0, "rgba(30,123,255,0.18)");
  roadGradient.addColorStop(0.5, "rgba(0,245,255,0.34)");
  roadGradient.addColorStop(1, "rgba(255,200,87,0.16)");

  ctx.fillStyle = roadGradient;
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(width * 0.42, groundY);
  ctx.lineTo(width * 0.58, groundY);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(0,245,255,0.72)";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.shadowColor = brand.cyan;
  ctx.shadowBlur = 14;

  for (let i = 0; i < 5; i++) {
    const offset = (i - 2) * width * 0.08;
    ctx.beginPath();
    ctx.moveTo(width * 0.5 + offset * 0.15, groundY);
    ctx.lineTo(width * 0.5 + offset, height);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(244,247,255,0.18)";
  ctx.lineWidth = 1;
  for (let y = groundY; y < height; y += 34 * scale) {
    ctx.beginPath();
    ctx.moveTo(width * 0.36 - (y - groundY) * 0.65, y);
    ctx.lineTo(width * 0.64 + (y - groundY) * 0.65, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const w = player.w;
  const h = player.h;

  ctx.save();
  ctx.shadowColor = brand.cyan;
  ctx.shadowBlur = 20;

  const bodyGradient = ctx.createLinearGradient(x, y, x + w, y + h);
  bodyGradient.addColorStop(0, brand.cyan);
  bodyGradient.addColorStop(0.65, brand.horizonBlue);
  bodyGradient.addColorStop(1, brand.white);

  ctx.fillStyle = bodyGradient;
  roundRect(x, y, w, h, 12 * scale);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(5,11,46,0.85)";
  ctx.beginPath();
  ctx.arc(x + w * 0.68, y + h * 0.28, Math.max(3, 5 * scale), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,200,87,0.95)";
  ctx.beginPath();
  ctx.moveTo(x - 10 * scale, y + h * 0.67);
  ctx.lineTo(x - 30 * scale, y + h * 0.52);
  ctx.lineTo(x - 10 * scale, y + h * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawObstacles() {
  for (const o of obstacles) {
    ctx.save();
    ctx.shadowColor = brand.danger;
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(255,77,109,0.88)";
    roundRect(o.x, o.y, o.w, o.h, 9 * scale);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

function drawOrbs() {
  for (const o of orbs) {
    ctx.save();
    const pulse = 1 + Math.sin(performance.now() / 180 + o.pulse) * 0.12;
    ctx.shadowColor = brand.gold;
    ctx.shadowBlur = 22;
    ctx.fillStyle = brand.gold;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * 1.55 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawMiniTip() {
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = brand.white;
  ctx.font = `${Math.max(12, 14 * scale)}px system-ui, sans-serif`;
  ctx.fillText("Tap / Space to jump", 18, height - 22);
  ctx.restore();
}

function rectsCollide(a, b) {
  const padding = 7 * scale;
  return (
    a.x + padding < b.x + b.w &&
    a.x + a.w - padding > b.x &&
    a.y + padding < b.y + b.h &&
    a.y + a.h - padding > b.y
  );
}

function circleRectCollide(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.r * circle.r;
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

window.addEventListener("resize", () => {
  resizeCanvas();
  createStars();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  }

  if (event.key.toLowerCase() === "r" && gameState === "over") {
    startGame();
  }

  if (event.key === "Enter" && gameState === "start") {
    startGame();
  }
});

canvas.parentElement.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  jump();
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

resizeCanvas();
createStars();
player.y = groundY - player.h;
highScoreEl.textContent = highScore;
draw();
