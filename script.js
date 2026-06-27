// Camino Galáctico - Release Version
// Polished simple space runner by Nexora Games
// Parent Company: Ancherem Innovation LTD

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const finalScoreEl = document.getElementById("finalScore");
const finalBestEl = document.getElementById("finalBest");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const C = {
  navy: "#050B2E",
  blue: "#1E7BFF",
  cyan: "#00F5FF",
  gold: "#FFC857",
  white: "#F4F7FF",
  danger: "#FF4D6D",
  purple: "#8A2CFF"
};

let W = 960;
let H = 540;
let DPR = 1;
let state = "start";
let raf = null;
let last = 0;

let score = 0;
let best = Number(localStorage.getItem("caminoGalacticoReleaseBest") || 0);
bestEl.textContent = best;

const ship = {
  x: 0,
  y: 0,
  targetX: 0,
  size: 42,
  invincible: 0
};

let speed = 260;
let asteroids = [];
let starsToCollect = [];
let starfield = [];
let particles = [];
let asteroidTimer = 0;
let collectTimer = 0;
let roadOffset = 0;
let dragging = false;

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * DPR);
  canvas.height = Math.floor(rect.height * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  W = rect.width;
  H = rect.height;

  ship.size = Math.max(34, Math.min(52, W * 0.06));
  ship.x = ship.targetX || W / 2;
  ship.targetX = ship.x;
  ship.y = H * 0.78;

  createStarfield();
  draw();
}

function createStarfield() {
  starfield = Array.from({ length: Math.floor(W / 8) }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.8 + 0.35,
    a: Math.random() * 0.65 + 0.25,
    v: Math.random() * 80 + 35
  }));
}

function resetGame() {
  score = 0;
  speed = Math.max(230, H * 0.42);
  asteroids = [];
  starsToCollect = [];
  particles = [];
  asteroidTimer = 0.3;
  collectTimer = 1.1;
  roadOffset = 0;

  ship.x = W / 2;
  ship.targetX = W / 2;
  ship.y = H * 0.78;
  ship.invincible = 0;

  scoreEl.textContent = "0";
}

function startGame() {
  resetGame();
  state = "playing";
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
  localStorage.setItem("caminoGalacticoReleaseBest", String(best));
  bestEl.textContent = best;
  finalScoreEl.textContent = Math.floor(score);
  finalBestEl.textContent = best;

  gameOverScreen.classList.add("active");
}

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;

  update(dt);
  draw();

  if (state === "playing") raf = requestAnimationFrame(loop);
}

function update(dt) {
  score += dt * 12;
  speed += dt * 4.5;
  roadOffset += speed * dt;
  scoreEl.textContent = Math.floor(score);

  ship.x += (ship.targetX - ship.x) * Math.min(1, dt * 12);
  ship.targetX = clamp(ship.targetX, ship.size * 0.9, W - ship.size * 0.9);

  asteroidTimer -= dt;
  collectTimer -= dt;

  if (asteroidTimer <= 0) {
    spawnAsteroid();
    asteroidTimer = Math.max(0.42, random(0.72, 1.18) - score / 3000);
  }

  if (collectTimer <= 0) {
    spawnCollectible();
    collectTimer = random(0.82, 1.45);
  }

  for (const a of asteroids) {
    a.y += speed * dt * a.speedMul;
    a.rot += dt * a.spin;
  }

  for (const s of starsToCollect) {
    s.y += speed * dt * 0.9;
    s.rot += dt * 4;
  }

  for (const s of starfield) {
    s.y += s.v * dt + speed * dt * 0.08;
    if (s.y > H + 8) {
      s.y = -8;
      s.x = Math.random() * W;
    }
  }

  updateParticles(dt);

  asteroids = asteroids.filter(a => a.y - a.r < H + 80);
  starsToCollect = starsToCollect.filter(s => !s.dead && s.y - s.r < H + 60);

  checkCollisions();
}

function spawnAsteroid() {
  const r = random(22, 42) * Math.max(0.85, Math.min(1.2, W / 780));
  asteroids.push({
    x: random(r + 10, W - r - 10),
    y: -r - 30,
    r,
    rot: random(0, Math.PI * 2),
    spin: random(-2, 2),
    speedMul: random(0.85, 1.22),
    sides: Math.floor(random(7, 11))
  });
}

function spawnCollectible() {
  const r = Math.max(10, ship.size * 0.28);
  starsToCollect.push({
    x: random(r + 14, W - r - 14),
    y: -r - 25,
    r,
    rot: random(0, Math.PI * 2),
    dead: false
  });
}

function checkCollisions() {
  for (const a of asteroids) {
    const dx = ship.x - a.x;
    const dy = ship.y - a.y;
    const hitDistance = ship.size * 0.42 + a.r * 0.72;

    if (dx * dx + dy * dy < hitDistance * hitDistance) {
      burst(ship.x, ship.y, C.danger, 34);
      endGame();
      return;
    }
  }

  for (const s of starsToCollect) {
    const dx = ship.x - s.x;
    const dy = ship.y - s.y;
    const hitDistance = ship.size * 0.46 + s.r;

    if (dx * dx + dy * dy < hitDistance * hitDistance) {
      s.dead = true;
      score += 55;
      burst(s.x, s.y, C.gold, 16);
    }
  }
}

function draw() {
  drawBackground();
  drawRoad();
  drawCollectibles();
  drawAsteroids();
  drawShip();
  drawParticles();

  if (state === "playing") {
    drawTip();
  }
}

function drawBackground() {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#020617");
  bg.addColorStop(0.48, C.navy);
  bg.addColorStop(1, "#020817");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const nebula = ctx.createRadialGradient(W * 0.7, H * 0.18, 0, W * 0.7, H * 0.18, W * 0.6);
  nebula.addColorStop(0, "rgba(0,245,255,.17)");
  nebula.addColorStop(0.35, "rgba(30,123,255,.08)");
  nebula.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  for (const s of starfield) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawHorizon();
}

function drawHorizon() {
  const y = H * 0.26;
  ctx.save();
  ctx.strokeStyle = "rgba(255,200,87,.84)";
  ctx.lineWidth = 3;
  ctx.shadowColor = C.gold;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(-60, y + 32);
  ctx.quadraticCurveTo(W * 0.5, y - 16, W + 60, y + 32);
  ctx.stroke();

  ctx.fillStyle = C.gold;
  ctx.beginPath();
  ctx.arc(W * 0.75, y + 18, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRoad() {
  const topY = H * 0.22;
  const bottomY = H + 80;
  const center = W / 2;
  const topHalf = W * 0.08;
  const bottomHalf = W * 0.45;

  ctx.save();

  const road = ctx.createLinearGradient(0, topY, 0, bottomY);
  road.addColorStop(0, "rgba(0,245,255,.02)");
  road.addColorStop(0.45, "rgba(0,245,255,.12)");
  road.addColorStop(1, "rgba(30,123,255,.24)");
  ctx.fillStyle = road;

  ctx.beginPath();
  ctx.moveTo(center - topHalf, topY);
  ctx.lineTo(center + topHalf, topY);
  ctx.lineTo(center + bottomHalf, bottomY);
  ctx.lineTo(center - bottomHalf, bottomY);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2;

  for (let i = -3; i <= 3; i++) {
    const t = i / 3;
    ctx.strokeStyle = i === 0 ? "rgba(0,245,255,.72)" : "rgba(0,245,255,.35)";
    ctx.beginPath();
    ctx.moveTo(center + t * topHalf, topY);
    ctx.lineTo(center + t * bottomHalf, bottomY);
    ctx.stroke();
  }

  const span = bottomY - topY;
  for (let i = -2; i < 20; i++) {
    const y = topY + ((roadOffset * 0.6 + i * 48) % span);
    const p = (y - topY) / span;
    const half = topHalf + (bottomHalf - topHalf) * p;

    ctx.strokeStyle = "rgba(244,247,255,.13)";
    ctx.beginPath();
    ctx.moveTo(center - half, y);
    ctx.lineTo(center + half, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawShip() {
  const s = ship.size;
  const x = ship.x;
  const y = ship.y;

  ctx.save();
  ctx.translate(x, y);

  // engine trail
  ctx.shadowColor = C.gold;
  ctx.shadowBlur = 20;
  const trail = ctx.createLinearGradient(0, s * 0.25, 0, s * 1.4);
  trail.addColorStop(0, "rgba(255,200,87,.95)");
  trail.addColorStop(1, "rgba(255,200,87,0)");
  ctx.fillStyle = trail;
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, s * 0.22);
  ctx.lineTo(0, s * 1.38);
  ctx.lineTo(s * 0.22, s * 0.22);
  ctx.closePath();
  ctx.fill();

  // side glow
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 26;
  ctx.fillStyle = "rgba(0,245,255,.28)";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.22, s * 0.9, s * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // ship body
  const body = ctx.createLinearGradient(-s * 0.5, -s, s * 0.5, s * 0.8);
  body.addColorStop(0, C.white);
  body.addColorStop(0.35, C.cyan);
  body.addColorStop(1, C.blue);

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.95);
  ctx.lineTo(s * 0.62, s * 0.72);
  ctx.lineTo(0, s * 0.34);
  ctx.lineTo(-s * 0.62, s * 0.72);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,.75)";
  ctx.stroke();

  // cockpit
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(5,11,46,.88)";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.24, s * 0.23, s * 0.31, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.gold;
  ctx.beginPath();
  ctx.arc(0, s * 0.18, s * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawAsteroids() {
  for (const a of asteroids) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.shadowColor = C.danger;
    ctx.shadowBlur = 20;

    const g = ctx.createRadialGradient(-a.r * .4, -a.r * .4, 2, 0, 0, a.r);
    g.addColorStop(0, "#FF8AA5");
    g.addColorStop(0.5, C.danger);
    g.addColorStop(1, C.purple);
    ctx.fillStyle = g;

    ctx.beginPath();
    for (let i = 0; i < a.sides; i++) {
      const angle = Math.PI * 2 * i / a.sides;
      const rr = a.r * randomSeeded(a.x + a.y + i, 0.72, 1.04);
      const px = Math.cos(angle) * rr;
      const py = Math.sin(angle) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

function drawCollectibles() {
  for (const c of starsToCollect) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 22;
    ctx.fillStyle = C.gold;

    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? c.r : c.r * 0.43;
      const a = Math.PI * 2 * i / 10 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawTip() {
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = C.white;
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Drag / Arrow keys to move. Avoid asteroids. Collect stars.", 18, 28);
  ctx.restore();
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      vx: random(-170, 170),
      vy: random(-190, 120),
      life: random(0.35, 0.9),
      max: 0.9,
      r: random(2, 5),
      color
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

function moveBy(amount) {
  if (state !== "playing") {
    startGame();
    return;
  }
  ship.targetX += amount;
}

function setShipFromPointer(e) {
  const rect = canvas.getBoundingClientRect();
  ship.targetX = clamp(e.clientX - rect.left, ship.size, W - ship.size);
}

document.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "KeyA"].includes(e.code)) {
    e.preventDefault();
    moveBy(-W * 0.09);
  }
  if (["ArrowRight", "KeyD"].includes(e.code)) {
    e.preventDefault();
    moveBy(W * 0.09);
  }
  if (["Space", "Enter"].includes(e.code) && state !== "playing") {
    e.preventDefault();
    startGame();
  }
  if (e.code === "KeyR" && state === "over") {
    startGame();
  }
});

canvas.parentElement.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (state !== "playing") {
    startGame();
    return;
  }
  dragging = true;
  setShipFromPointer(e);
});

canvas.parentElement.addEventListener("pointermove", (e) => {
  if (!dragging || state !== "playing") return;
  e.preventDefault();
  setShipFromPointer(e);
});

canvas.parentElement.addEventListener("pointerup", () => {
  dragging = false;
});

canvas.parentElement.addEventListener("pointercancel", () => {
  dragging = false;
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomSeeded(seed, min, max) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const n = x - Math.floor(x);
  return min + n * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

window.addEventListener("resize", resize);

resize();
draw();
