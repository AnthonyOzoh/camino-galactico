// Camino Galáctico v2
// A better mobile + desktop web runner by Nexora Games
// Parent Company: Ancherem Innovation LTD

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const finalScoreEl = document.getElementById("finalScore");
const finalBestEl = document.getElementById("finalBest");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const jumpBtn = document.getElementById("jumpBtn");

const brand = {
  navy: "#050B2E",
  blue: "#1E7BFF",
  cyan: "#00F5FF",
  gold: "#FFC857",
  white: "#F4F7FF",
  pink: "#FF3D7F"
};

let W = 960;
let H = 540;
let DPR = 1;

let state = "start";
let last = 0;
let raf = null;

let score = 0;
let best = Number(localStorage.getItem("caminoGalacticoBestV2") || 0);

let lane = 1;
let targetLane = 1;
let playerX = 0;
let jump = 0;
let jumpVelocity = 0;
let isJumping = false;

let speed = 0.34;
let spawnTimer = 0;
let coinTimer = 0;
let objects = [];
let particles = [];
let stars = [];

bestEl.textContent = best;

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * DPR);
  canvas.height = Math.floor(rect.height * DPR);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  W = rect.width;
  H = rect.height;

  createStars();
  draw();
}

function createStars() {
  stars = Array.from({ length: Math.floor(W / 9) }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.62,
    r: Math.random() * 1.7 + 0.35,
    a: Math.random() * 0.65 + 0.25,
    v: Math.random() * 18 + 8
  }));
}

function startGame() {
  state = "playing";
  score = 0;
  lane = 1;
  targetLane = 1;
  jump = 0;
  jumpVelocity = 0;
  isJumping = false;
  speed = 0.34;
  spawnTimer = 0.4;
  coinTimer = 0.9;
  objects = [];
  particles = [];

  startScreen.classList.remove("active");
  gameOverScreen.classList.remove("active");

  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function endGame() {
  state = "over";
  cancelAnimationFrame(raf);

  best = Math.max(best, Math.floor(score));
  localStorage.setItem("caminoGalacticoBestV2", String(best));
  bestEl.textContent = best;
  finalScoreEl.textContent = Math.floor(score);
  finalBestEl.textContent = best;

  gameOverScreen.classList.add("active");
}

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.034);
  last = now;

  update(dt);
  draw();

  if (state === "playing") raf = requestAnimationFrame(loop);
}

function update(dt) {
  score += dt * 18;
  speed += dt * 0.006;
  scoreEl.textContent = Math.floor(score);

  // Smooth lane movement
  const desiredX = laneToX(targetLane, 1);
  playerX += (desiredX - playerX) * Math.min(1, dt * 13);

  // Jump physics
  if (isJumping) {
    jumpVelocity -= dt * 3.8;
    jump += jumpVelocity * dt;
    if (jump <= 0) {
      jump = 0;
      jumpVelocity = 0;
      isJumping = false;
    }
  }

  spawnTimer -= dt;
  coinTimer -= dt;

  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = Math.max(0.62, random(1.05, 1.45) - speed * 0.6);
  }

  if (coinTimer <= 0) {
    spawnCoin();
    coinTimer = random(0.45, 0.78);
  }

  for (const obj of objects) {
    obj.p += dt * (speed + obj.extraSpeed);
    obj.spin += dt * 3.2;
  }

  for (const s of stars) {
    s.y += s.v * dt * 0.25;
    if (s.y > H * 0.64) {
      s.y = -4;
      s.x = Math.random() * W;
    }
  }

  updateParticles(dt);
  checkCollisions();

  objects = objects.filter(obj => obj.p < 1.22 && !obj.dead);
}

function spawnObstacle() {
  const chosenLane = Math.floor(Math.random() * 3);
  objects.push({
    type: "block",
    lane: chosenLane,
    p: -0.05,
    spin: Math.random() * 6,
    extraSpeed: 0
  });
}

function spawnCoin() {
  const chosenLane = Math.floor(Math.random() * 3);
  objects.push({
    type: "coin",
    lane: chosenLane,
    p: -0.08,
    spin: Math.random() * 6,
    extraSpeed: 0.02
  });
}

function checkCollisions() {
  for (const obj of objects) {
    if (obj.p > 0.78 && obj.p < 1.02 && obj.lane === targetLane) {
      if (obj.type === "block") {
        if (jump < 0.36) {
          burst(playerX, playerY(), brand.pink, 22);
          endGame();
          return;
        }
      } else if (obj.type === "coin" && !obj.dead) {
        obj.dead = true;
        score += 45;
        burst(laneToX(obj.lane, obj.p), roadY(obj.p), brand.gold, 14);
      }
    }
  }
}

function moveLeft() {
  if (state === "start") return startGame();
  if (state === "over") return startGame();
  targetLane = Math.max(0, targetLane - 1);
}

function moveRight() {
  if (state === "start") return startGame();
  if (state === "over") return startGame();
  targetLane = Math.min(2, targetLane + 1);
}

function doJump() {
  if (state === "start") return startGame();
  if (state === "over") return startGame();

  if (!isJumping) {
    isJumping = true;
    jumpVelocity = 1.38;
    burst(playerX, playerY() + 28, brand.cyan, 8);
  }
}

function roadY(p) {
  const horizon = H * 0.29;
  return horizon + Math.pow(p, 1.7) * (H * 0.68);
}

function roadWidth(p) {
  return (W * 0.08) + Math.pow(p, 1.45) * (W * 0.66);
}

function laneToX(l, p) {
  const center = W * 0.5;
  const half = roadWidth(p) * 0.38;
  const laneOffset = [-half, 0, half][l];
  return center + laneOffset;
}

function playerY() {
  return H * 0.79 - jump * H * 0.22;
}

function draw() {
  drawSpace();
  drawRoad();
  drawObjects();
  drawPlayer();
  drawParticles();

  if (state === "playing") drawHelp();
}

function drawSpace() {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#020617");
  bg.addColorStop(0.45, "#050B2E");
  bg.addColorStop(1, "#020817");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const nebula = ctx.createRadialGradient(W * 0.68, H * 0.22, 0, W * 0.68, H * 0.22, W * 0.56);
  nebula.addColorStop(0, "rgba(0,245,255,0.18)");
  nebula.addColorStop(0.35, "rgba(30,123,255,0.08)");
  nebula.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  for (const s of stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = brand.white;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Horizon curve
  const hy = H * 0.33;
  ctx.save();
  ctx.strokeStyle = "rgba(255,200,87,0.9)";
  ctx.lineWidth = 3;
  ctx.shadowColor = brand.gold;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(-40, hy + 20);
  ctx.quadraticCurveTo(W * 0.5, hy - 20, W + 40, hy + 20);
  ctx.stroke();

  ctx.fillStyle = brand.gold;
  ctx.beginPath();
  ctx.arc(W * 0.73, hy + 6, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRoad() {
  const horizon = H * 0.36;
  const bottom = H * 1.04;
  const center = W * 0.5;
  const bottomHalf = W * 0.43;

  ctx.save();

  const roadGrad = ctx.createLinearGradient(0, horizon, W, bottom);
  roadGrad.addColorStop(0, "rgba(0,245,255,0.05)");
  roadGrad.addColorStop(0.45, "rgba(0,245,255,0.18)");
  roadGrad.addColorStop(1, "rgba(255,200,87,0.13)");

  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(center - W * 0.035, horizon);
  ctx.lineTo(center + W * 0.035, horizon);
  ctx.lineTo(center + bottomHalf, bottom);
  ctx.lineTo(center - bottomHalf, bottom);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = brand.cyan;
  ctx.shadowBlur = 16;
  ctx.lineWidth = 2;

  // lane lines
  for (let i = -3; i <= 3; i++) {
    const offset = i / 3;
    ctx.strokeStyle = i === 0 ? "rgba(0,245,255,0.9)" : "rgba(0,245,255,0.45)";
    ctx.beginPath();
    ctx.moveTo(center + offset * W * 0.025, horizon);
    ctx.lineTo(center + offset * bottomHalf, bottom);
    ctx.stroke();
  }

  // cross lines
  ctx.shadowBlur = 4;
  for (let p = 0.08; p <= 1.06; p += 0.09) {
    const y = roadY(p);
    const half = roadWidth(p) * 0.52;
    ctx.strokeStyle = "rgba(244,247,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(center - half, y);
    ctx.lineTo(center + half, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObjects() {
  const sorted = [...objects].sort((a, b) => a.p - b.p);

  for (const obj of sorted) {
    const p = obj.p;
    if (p < 0 || p > 1.16) continue;

    const x = laneToX(obj.lane, p);
    const y = roadY(p);
    const size = 12 + Math.pow(p, 1.45) * 72;

    if (obj.type === "block") drawVoidBlock(x, y, size, obj.spin);
    if (obj.type === "coin") drawStarCoin(x, y, size * 0.34, obj.spin);
  }
}

function drawVoidBlock(x, y, size, spin) {
  ctx.save();
  ctx.translate(x, y - size * 0.55);
  ctx.rotate(Math.sin(spin) * 0.06);
  ctx.shadowColor = brand.pink;
  ctx.shadowBlur = 22;

  const g = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  g.addColorStop(0, "#FF3D7F");
  g.addColorStop(1, "#8A2CFF");
  ctx.fillStyle = g;

  roundRect(-size / 2, -size / 2, size, size, size * 0.16);
  ctx.fill();

  ctx.lineWidth = Math.max(2, size * 0.04);
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.stroke();

  ctx.restore();
}

function drawStarCoin(x, y, r, spin) {
  ctx.save();
  ctx.translate(x, y - r * 2.2);
  ctx.rotate(spin);
  ctx.shadowColor = brand.gold;
  ctx.shadowBlur = 22;
  ctx.fillStyle = brand.gold;

  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const px = playerX || laneToX(targetLane, 1);
  const py = playerY();
  const size = Math.min(88, Math.max(62, W * 0.09));

  ctx.save();
  ctx.translate(px, py);

  // shadow on road
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "rgba(0,245,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.46, size * 0.62, size * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // flame
  ctx.shadowColor = brand.gold;
  ctx.shadowBlur = 20;
  ctx.fillStyle = brand.gold;
  ctx.beginPath();
  ctx.moveTo(-size * 0.52, size * 0.1);
  ctx.lineTo(-size * 0.95, 0);
  ctx.lineTo(-size * 0.52, -size * 0.1);
  ctx.closePath();
  ctx.fill();

  // hover-runner body
  ctx.shadowColor = brand.cyan;
  ctx.shadowBlur = 24;
  const body = ctx.createLinearGradient(-size * 0.5, -size * 0.25, size * 0.5, size * 0.25);
  body.addColorStop(0, brand.cyan);
  body.addColorStop(0.55, brand.blue);
  body.addColorStop(1, brand.white);

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-size * 0.52, 0);
  ctx.quadraticCurveTo(-size * 0.18, -size * 0.34, size * 0.45, -size * 0.25);
  ctx.quadraticCurveTo(size * 0.68, 0, size * 0.45, size * 0.25);
  ctx.quadraticCurveTo(-size * 0.18, size * 0.34, -size * 0.52, 0);
  ctx.closePath();
  ctx.fill();

  // cockpit
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(5,11,46,0.88)";
  ctx.beginPath();
  ctx.ellipse(size * 0.21, -size * 0.03, size * 0.22, size * 0.14, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(244,247,255,0.9)";
  ctx.beginPath();
  ctx.arc(size * 0.30, -size * 0.09, size * 0.035, 0, Math.PI * 2);
  ctx.fill();

  // bottom light
  ctx.fillStyle = brand.gold;
  ctx.beginPath();
  ctx.arc(0, size * 0.22, size * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHelp() {
  ctx.save();
  ctx.globalAlpha = 0.66;
  ctx.fillStyle = brand.white;
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Move lanes. Jump over void blocks. Collect stars.", 18, 28);
  ctx.restore();
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      vx: random(-150, 150),
      vy: random(-150, 80),
      life: random(0.3, 0.75),
      max: 0.75,
      color,
      r: random(2, 5)
    });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
  }
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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

function random(min, max) {
  return Math.random() * (max - min) + min;
}

window.addEventListener("resize", resize);

document.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "KeyA"].includes(e.code)) {
    e.preventDefault();
    moveLeft();
  }
  if (["ArrowRight", "KeyD"].includes(e.code)) {
    e.preventDefault();
    moveRight();
  }
  if (["ArrowUp", "Space", "KeyW"].includes(e.code)) {
    e.preventDefault();
    doJump();
  }
  if (e.code === "Enter" && state !== "playing") startGame();
  if (e.code === "KeyR" && state === "over") startGame();
});

leftBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); moveLeft(); });
rightBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); moveRight(); });
jumpBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); doJump(); });

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// Swipe support
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("pointerdown", (e) => {
  touchStartX = e.clientX;
  touchStartY = e.clientY;
});

canvas.addEventListener("pointerup", (e) => {
  const dx = e.clientX - touchStartX;
  const dy = e.clientY - touchStartY;

  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
    dx < 0 ? moveLeft() : moveRight();
  } else if (Math.abs(dy) > 45 && dy < 0) {
    doJump();
  } else if (state !== "playing") {
    startGame();
  }
});

resize();
playerX = laneToX(1, 1);
draw();
