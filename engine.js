// engine.js — simulation physique

const MAX_SPEED = 4.5;
const TRAIL_MAX = 32;
const WANDER_NOISE = 0.28;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function steer(obj, tx, ty, strength = 0.12) {
  const dx = tx - obj.x, dy = ty - obj.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  obj.vx += (dx / d) * strength;
  obj.vy += (dy / d) * strength;
}

function limitSpeed(obj) {
  const s = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
  obj.speed = s;
  if (s > MAX_SPEED) {
    obj.vx = (obj.vx / s) * MAX_SPEED;
    obj.vy = (obj.vy / s) * MAX_SPEED;
  }
}

// ── BEHAVIORS ────────────────────────────────────────────────────

function seekBehavior(obj, target) {
  steer(obj, target.x, target.y, 0.15);
}

function fleeBehavior(obj, target) {
  const dx = obj.x - target.x, dy = obj.y - target.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  obj.vx += (dx / d) * clamp(200 / d, 0.05, 0.5);
  obj.vy += (dy / d) * clamp(200 / d, 0.05, 0.5);
}

function orbitBehavior(obj, target, t) {
  const angle = t * 0.02 + parseInt(obj.id.slice(4) || 0) * 0.5;
  steer(obj, target.x + Math.cos(angle) * 120, target.y + Math.sin(angle) * 120, 0.18);
}

function wanderBehavior(obj) {
  obj.vx += (Math.random() - 0.5) * WANDER_NOISE;
  obj.vy += (Math.random() - 0.5) * WANDER_NOISE;
}

function flockBehavior(obj, allObjects) {
  const RANGE = 130, SEP_RANGE = 34;
  const peers = Object.values(allObjects).filter(o =>
    o.id !== obj.id && o.behavior === 'flock' &&
    (!obj.group || !o.group || obj.group === o.group)
  );
  const inRange = peers.filter(o => {
    const dx = o.x - obj.x, dy = o.y - obj.y;
    return dx * dx + dy * dy < RANGE * RANGE;
  });

  if (inRange.length === 0) { wanderBehavior(obj); return; }

  let sepX = 0, sepY = 0, alignX = 0, alignY = 0, cohX = 0, cohY = 0;
  for (const o of inRange) {
    const dx = o.x - obj.x, dy = o.y - obj.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < SEP_RANGE) {
      sepX -= (dx / d) * (SEP_RANGE / d);
      sepY -= (dy / d) * (SEP_RANGE / d);
    }
    alignX += o.vx; alignY += o.vy;
    cohX += o.x; cohY += o.y;
  }
  const n = inRange.length;
  obj.vx += sepX * 0.10 + (alignX / n - obj.vx) * 0.04 + (cohX / n - obj.x) * 0.006;
  obj.vy += sepY * 0.10 + (alignY / n - obj.vy) * 0.04 + (cohY / n - obj.y) * 0.006;
}

function applyGravityWells(obj, wells) {
  for (const well of Object.values(wells)) {
    const dx = well.x - obj.x, dy = well.y - obj.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 400) continue; // avoid singularity
    const d = Math.sqrt(d2);
    const force = clamp((well.strength * 600) / d2, 0, 0.9);
    const dir = well.repel ? -1 : 1;
    obj.vx += (dx / d) * force * dir;
    obj.vy += (dy / d) * force * dir;
  }
}

// ── COLLISIONS ────────────────────────────────────────────────────

function bounceWalls(obj, W, H) {
  const r = obj.radius || 16;
  if (obj.x < r) { obj.x = r; obj.vx = Math.abs(obj.vx); }
  if (obj.x > W - r) { obj.x = W - r; obj.vx = -Math.abs(obj.vx); }
  if (obj.y < r) { obj.y = r; obj.vy = Math.abs(obj.vy); }
  if (obj.y > H - r) { obj.y = H - r; obj.vy = -Math.abs(obj.vy); }
}

function bounceObstacles(obj, obstacles) {
  for (const obs of Object.values(obstacles)) {
    const r = obj.radius || 16;
    const l = obs.x - obs.w / 2, ri = obs.x + obs.w / 2;
    const t = obs.y - obs.h / 2, b = obs.y + obs.h / 2;
    if (obj.x + r > l && obj.x - r < ri && obj.y + r > t && obj.y - r < b) {
      const oL = obj.x + r - l, oR = ri - (obj.x - r);
      const oT = obj.y + r - t, oB = b - (obj.y - r);
      const m = Math.min(oL, oR, oT, oB);
      if (m === oL) { obj.x = l - r; obj.vx = -Math.abs(obj.vx); }
      else if (m === oR) { obj.x = ri + r; obj.vx = Math.abs(obj.vx); }
      else if (m === oT) { obj.y = t - r; obj.vy = -Math.abs(obj.vy); }
      else { obj.y = b + r; obj.vy = Math.abs(obj.vy); }
    }
  }
}

// ── MAIN STEP ─────────────────────────────────────────────────────

export function step(world, W = 800, H = 600) {
  if (world.paused) return;
  const t = Date.now();
  const spd = world.speed;
  const hasWells = Object.keys(world.gravityWells).length > 0;

  for (const obj of Object.values(world.objects)) {
    const target = obj.targetId ? world.objects[obj.targetId] : null;

    if (hasWells) applyGravityWells(obj, world.gravityWells);

    switch (obj.behavior) {
      case 'seek':   if (target) seekBehavior(obj, target); else wanderBehavior(obj); break;
      case 'flee':   if (target) fleeBehavior(obj, target); else wanderBehavior(obj); break;
      case 'orbit':  if (target) orbitBehavior(obj, target, t); else wanderBehavior(obj); break;
      case 'flock':  flockBehavior(obj, world.objects); break;
      default:       wanderBehavior(obj);
    }

    limitSpeed(obj);
    obj.vx *= 0.97;
    obj.vy *= 0.97;
    obj.x += obj.vx * spd;
    obj.y += obj.vy * spd;
    obj.age++;

    if (obj.pulse) obj.pulsePhase += 0.10;

    bounceWalls(obj, W, H);
    bounceObstacles(obj, world.obstacles);

    obj.trail.push({ x: obj.x, y: obj.y });
    if (obj.trail.length > TRAIL_MAX) obj.trail.shift();
  }

  // Expire bursts
  for (let i = world.bursts.length - 1; i >= 0; i--) {
    if (++world.bursts[i].age >= world.bursts[i].maxAge) world.bursts.splice(i, 1);
  }
}
