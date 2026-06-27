// Camino Galáctico Final
// Clean cosmic runner by Nexora Games
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
  danger: "#FF3D7F",
  purple: "#8A2CFF"
};

let W = 960;
let H = 540;
let DPR = 1;
let state = "start";
let raf = null;
let last = 0;

let score = 0;
let best = Number(localStorage.getItem("caminoGalacticoCleanBest") || 0);
bestEl.textContent = best;

const player = {
  x: 120,
  y: 0,
  r: 24,
  vy: 0,
  grounded: true,
  trail: []
};

let ground = 0;
let speed = 420;
let obstacles = [];
let coins = [];
let stars = [];
let particles = [];
let spawnTimer = 0;
let coinTimer = 0;
let roadOffset = 0;

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * DPR);
  canvas.height = Math.floor(rect.height * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  W = rect.width;
  H = rect.height;
  ground = H * 0.76;

  player.x = Math.max(82, W * 0.16);
  player.r = Math.max(18, Math.min(28, W * 0.035));
  if (state !== "playing") {
    player.y = ground - player.r;
  }

  stars = Array.from({ length: Math.floor(W / 9) }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.55,
    r: Math.random() * 1.7 + 0.35,
    a: Math.random() * 0.65 + 0.25,
    v: Math.random() * 18 + 8
  }));

  draw();
}

function reset() {
  score = 0;
  speed = Math.max(380, W * 0.48);
  obstacles = [];
  coins = [];
  particles = [];
  spawnTimer = 0.8;
  coinTimer = 1.0;
  roadOffset = 0;

  player.y = ground - player.r;
  player.vy = 0;
  player.grounded = true;
  player.trail = [];
  scoreEl.textContent = "0";
}

function start() {
  reset();
  state = "playing";
  startScreen.classList.remove("active");
  gameOverScreen.classList.remove("active");
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function end() {
  state = "over";
  cancelAnimationFrame(raf);

  best = Math.max(best, Math.floor(score));
  localStorage.setItem("caminoGalacticoCleanBest", String(best));

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

function jump() {
  if (state !== "playing") {
    start();
    return;
  }

  if (player.grounded) {
    player.vy = -Math.max(720, H * 1.22);
    player.grounded = false;
    burst(player.x, player.y + player.r, C.cyan, 12);
  }
}

function update(dt) {
  score += dt * 16;
  speed += dt * 7;
  scoreEl.textContent = Math.floor(score);
  roadOffset += speed * dt;

  player.vy += Math.max(1800, H * 3.0) * dt;
  player.y += player.vy * dt;

  if (player.y >= ground - player.r) {
    player.y = ground - player.r;
    player.vy = 0;
    player.grounded = true;
  }

  player.trail.unshift({ x: player.x, y: player.y, r: player.r, life: 1 });
  player.trail = player.trail.slice(0, 12);
  player.trail.forEach(t => {
    t.x -= speed * dt * 0.34;
    t.life -= dt * 2.2;
  });
  player.trail = player.trail.filter(t => t.life > 0);

  spawnTimer -= dt;
  coinTimer -= dt;

  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = Math.max(0.78, random(1.05, 1.55) - score / 1300);
  }

  if (coinTimer <= 0) {
    spawnCoin();
    coinTimer = random(0.75, 1.1);
  }

  obstacles.forEach(o => o.x -= speed * dt);
  coins.forEach(c => {
    c.x -= speed * dt;
    c.spin += dt * 4;
  });

  obstacles = obstacles.filter(o => o.x + o.w > -80);
  coins = coins.filter(c => !c.dead && c.x + c.r > -50);

  for (const s of stars) {
    s.x -= s.v * dt;
    if (s.x < -5) {
      s.x = W + 10;
      s.y = Math.random() * H * 0.55;
    }
  }

  updateParticles(dt);
  checkCollisions();
}

function spawnObstacle() {
  const h = random(42, 72) * Math.max(0.85, Math.min(1.15, W / 900));
  const w = h * random(0.72, 0.95);

  obstacles.push({
    x: W + 60,
    y: ground - h,
    w,
    h,
    angle: random(-0.1, 0.1)
  });
}

function spawnCoin() {
  const high = Math.random() > 0.45;
  coins.push({
    x: W + 50,
    y: high ? ground - random(120, 190) : ground - random(58, 95),
    r: Math.max(10, player.r * 0.48),
    spin: Math.random() * 6,
    dead: false
  });
}

function checkCollisions() {
  for (const o of obstacles) {
    const pad = player.r * 0.35;
    const closestX = clamp(player.x, o.x, o.x + o.w);
    const closestY = clamp(player.y, o.y, o.y + o.h);
    const dx = player.x - closestX;
    const dy = player.y - closestY;

    if (dx * dx + dy * dy < (player.r - pad) * (player.r - pad)) {
      burst(player.x, player.y, C.danger, 24);
      end();
      return;
    }
  }

  for (const c of coins) {
    const dx = player.x - c.x;
    const dy = player.y - c.y;
    if (dx * dx + dy * dy < (player.r + c.r) * (player.r + c.r)) {
      c.dead = true;
      score += 40;
      burst(c.x, c.y, C.gold, 14);
    }
  }
}

function draw() {
  drawBackground();
  drawRoad();
  drawCoins();
  drawObstacles();
  drawPlayer();
  drawParticles();

  if (state === "playing") drawTip();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#020617");
  g.addColorStop(0.52, C.navy);
  g.addColorStop(1, "#020817");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const nebula = ctx.createRadialGradient(W * 0.68, H * 0.22, 0, W * 0.68, H * 0.22, W * 0.58);
  nebula.addColorStop(0, "rgba(0,245,255,.18)");
  nebula.addColorStop(0.38, "rgba(30,123,255,.08)");
  nebula.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  for (const s of stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // planet horizon
  const hy = H * 0.33;
  ctx.save();
  ctx.strokeStyle = "rgba(255,200,87,.86)";
  ctx.lineWidth = 3;
  ctx.shadowColor = C.gold;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(-50, hy + 32);
  ctx.quadraticCurveTo(W * 0.5, hy - 14, W + 50, hy + 32);
  ctx.stroke();

  ctx.fillStyle = C.gold;
  ctx.beginPath();
  ctx.arc(W * 0.74, hy + 18, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRoad() {
  ctx.save();

  const roadTop = ground + player.r * 0.9;
  const roadBottom = H + 80;
  const roadH = roadBottom - roadTop;

  const roadG = ctx.createLinearGradient(0, roadTop, W, roadBottom);
  roadG.addColorStop(0, "rgba(0,245,255,.17)");
  roadG.addColorStop(0.55, "rgba(30,123,255,.22)");
  roadG.addColorStop(1, "rgba(255,200,87,.1)");

  ctx.fillStyle = roadG;
  ctx.beginPath();
  ctx.moveTo(-80, roadBottom);
  ctx.lineTo(W + 80, roadBottom);
  ctx.lineTo(W * 0.63, roadTop);
  ctx.lineTo(W * 0.12, roadTop);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(0,245,255,.9)";
  ctx.lineWidth = 3;
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 15;

  ctx.beginPath();
  ctx.moveTo(W * 0.12, roadTop);
  ctx.lineTo(-80, roadBottom);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(W * 0.63, roadTop);
  ctx.lineTo(W + 80, roadBottom);
  ctx.stroke();

  // moving road lines
  ctx.lineWidth = 2;
  ctx.shadowBlur = 7;
  for (let i = -2; i < 20; i++) {
    const y = roadTop + ((roadOffset * 0.5 + i * 42) % roadH);
    const p = (y - roadTop) / roadH;
    const left = lerp(W * 0.12, -80, p);
    const right = lerp(W * 0.63, W + 80, p);
    ctx.strokeStyle = "rgba(244,247,255,.14)";
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  // ground line
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = C.cyan;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, ground + player.r);
  ctx.lineTo(W, ground + player.r);
  ctx.stroke();

  ctx.restore();
}

function drawPlayer() {
  ctx.save();

  // trail
  for (const t of player.trail) {
    ctx.globalAlpha = Math.max(0, t.life) * 0.35;
    ctx.fillStyle = C.cyan;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * t.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // comet tail
  ctx.shadowColor = C.gold;
  ctx.shadowBlur = 18;
  const tail = ctx.createLinearGradient(player.x - player.r * 4, player.y, player.x, player.y);
  tail.addColorStop(0, "rgba(255,200,87,0)");
  tail.addColorStop(0.42, "rgba(255,200,87,.62)");
  tail.addColorStop(1, "rgba(0,245,255,.95)");
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(player.x - player.r * 4.2, player.y);
  ctx.quadraticCurveTo(player.x - player.r * 1.4, player.y - player.r * 1.2, player.x, player.y - player.r * .55);
  ctx.quadraticCurveTo(player.x - player.r * .3, player.y, player.x, player.y + player.r * .55);
  ctx.quadraticCurveTo(player.x - player.r * 1.4, player.y + player.r * 1.2, player.x - player.r * 4.2, player.y);
  ctx.fill();

  // main orb
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 26;
  const orb = ctx.createRadialGradient(player.x - player.r * .35, player.y - player.r * .45, 2, player.x, player.y, player.r * 1.25);
  orb.addColorStop(0, C.white);
  orb.addColorStop(0.35, C.cyan);
  orb.addColorStop(0.72, C.blue);
  orb.addColorStop(1, "#08164A");

  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  // shine
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.beginPath();
  ctx.arc(player.x + player.r * .32, player.y - player.r * .38, player.r * .16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacles() {
  for (const o of obstacles) {
    ctx.save();
    ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
    ctx.rotate(o.angle);
    ctx.shadowColor = C.danger;
    ctx.shadowBlur = 24;

    const g = ctx.createLinearGradient(-o.w/2, -o.h/2, o.w/2, o.h/2);
    g.addColorStop(0, C.danger);
    g.addColorStop(1, C.purple);
    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.moveTo(0, -o.h / 2);
    ctx.lineTo(o.w / 2, o.h / 2);
    ctx.lineTo(-o.w / 2, o.h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

function drawCoins() {
  for (const c of coins) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.spin);
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 22;
    ctx.fillStyle = C.gold;

    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? c.r : c.r * .45;
      const a = Math.PI * 2 * i / 10 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawTip() {
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = C.white;
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Tap / Space to jump", 18, 28);
  ctx.restore();
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      vx: random(-170, 170),
      vy: random(-190, 70),
      life: random(.35, .85),
      max: .85,
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
    p.vy += 250 * dt;
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

function random(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

window.addEventListener("resize", resize);

document.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
    e.preventDefault();
    jump();
  }
  if (e.code === "Enter" && state !== "playing") start();
  if (e.code === "KeyR" && state === "over") start();
});

canvas.parentElement.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  jump();
});

startBtn.addEventListener("click", start);
restartBtn.addEventListener("click", start);

resize();
draw();
