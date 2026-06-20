// engine.js — simulation physique

const MAX_SPEED = 4;
const TRAIL_MAX = 24;
const WANDER_NOISE = 0.3;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function steer(obj, tx, ty, strength = 0.12) {
  const dx = tx - obj.x;
  const dy = ty - obj.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  obj.vx += (dx / d) * strength;
  obj.vy += (dy / d) * strength;
}

function limitSpeed(obj) {
  const s = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
  if (s > MAX_SPEED) {
    obj.vx = (obj.vx / s) * MAX_SPEED;
    obj.vy = (obj.vy / s) * MAX_SPEED;
  }
}

function seekBehavior(obj, target) {
  steer(obj, target.x, target.y, 0.15);
}

function fleeBehavior(obj, target) {
  const dx = obj.x - target.x;
  const dy = obj.y - target.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const strength = clamp(200 / d, 0.05, 0.4);
  obj.vx += (dx / d) * strength;
  obj.vy += (dy / d) * strength;
}

function orbitBehavior(obj, target, t) {
  const ORBIT_R = 120;
  const angle = t * 0.02 + obj.id.charCodeAt(4) * 0.5;
  const tx = target.x + Math.cos(angle) * ORBIT_R;
  const ty = target.y + Math.sin(angle) * ORBIT_R;
  steer(obj, tx, ty, 0.18);
}

function wanderBehavior(obj) {
  obj.vx += (Math.random() - 0.5) * WANDER_NOISE;
  obj.vy += (Math.random() - 0.5) * WANDER_NOISE;
}

function bounceWalls(obj, W, H) {
  const r = obj.radius || 18;
  if (obj.x < r) { obj.x = r; obj.vx = Math.abs(obj.vx); }
  if (obj.x > W - r) { obj.x = W - r; obj.vx = -Math.abs(obj.vx); }
  if (obj.y < r) { obj.y = r; obj.vy = Math.abs(obj.vy); }
  if (obj.y > H - r) { obj.y = H - r; obj.vy = -Math.abs(obj.vy); }
}

function bounceObstacles(obj, obstacles) {
  for (const obs of Object.values(obstacles)) {
    const r = obj.radius || 18;
    const left = obs.x - obs.w / 2;
    const right = obs.x + obs.w / 2;
    const top = obs.y - obs.h / 2;
    const bottom = obs.y + obs.h / 2;
    if (obj.x + r > left && obj.x - r < right && obj.y + r > top && obj.y - r < bottom) {
      // push out
      const overlapL = obj.x + r - left;
      const overlapR = right - (obj.x - r);
      const overlapT = obj.y + r - top;
      const overlapB = bottom - (obj.y - r);
      const min = Math.min(overlapL, overlapR, overlapT, overlapB);
      if (min === overlapL) { obj.x = left - r; obj.vx = -Math.abs(obj.vx); }
      else if (min === overlapR) { obj.x = right + r; obj.vx = Math.abs(obj.vx); }
      else if (min === overlapT) { obj.y = top - r; obj.vy = -Math.abs(obj.vy); }
      else { obj.y = bottom + r; obj.vy = Math.abs(obj.vy); }
    }
  }
}

export function step(world, W = 800, H = 600) {
  if (world.paused) return;

  const objects = Object.values(world.objects);
  const t = Date.now();
  const spd = world.speed;

  for (const obj of objects) {
    const target = obj.targetId ? world.objects[obj.targetId] : null;

    switch (obj.behavior) {
      case 'seek':
        if (target) seekBehavior(obj, target);
        else wanderBehavior(obj);
        break;
      case 'flee':
        if (target) fleeBehavior(obj, target);
        else wanderBehavior(obj);
        break;
      case 'orbit':
        if (target) orbitBehavior(obj, target, t);
        else wanderBehavior(obj);
        break;
      default:
        wanderBehavior(obj);
    }

    limitSpeed(obj);
    obj.vx *= 0.97;
    obj.vy *= 0.97;

    obj.x += obj.vx * spd;
    obj.y += obj.vy * spd;
    obj.age++;

    bounceWalls(obj, W, H);
    bounceObstacles(obj, world.obstacles);

    obj.trail.push({ x: obj.x, y: obj.y });
    if (obj.trail.length > TRAIL_MAX) obj.trail.shift();
  }
}
