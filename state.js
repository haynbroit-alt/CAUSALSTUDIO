// state.js — mémoire objets persistants

let _nextId = 1;

export function createId() {
  return `obj_${_nextId++}`;
}

export function createObject({ shape = 'circle', color = '#ecf0f1', x, y, vx, vy, group } = {}) {
  return {
    id: createId(),
    shape,
    color,
    x: x ?? Math.random() * 700 + 50,
    y: y ?? Math.random() * 500 + 50,
    vx: vx ?? (Math.random() - 0.5) * 2,
    vy: vy ?? (Math.random() - 0.5) * 2,
    radius: shape === 'circle' ? 16 : 18,
    behavior: 'wander',
    targetId: null,
    trail: [],
    age: 0,
    group: group || null,
    pulsePhase: Math.random() * Math.PI * 2,
    pulse: false,
    speed: 0,
  };
}

export function createGravityWell({ x, y, strength = 110, color = '#9b59b6', repel = false } = {}) {
  return {
    id: createId(),
    x: x ?? Math.random() * 600 + 100,
    y: y ?? Math.random() * 400 + 100,
    strength,
    color,
    repel,
    age: 0,
  };
}

export function createObstacle({ x, y } = {}) {
  return {
    id: createId(),
    shape: 'obstacle',
    color: '#636e72',
    x: x ?? Math.random() * 600 + 100,
    y: y ?? Math.random() * 400 + 100,
    w: 60 + Math.random() * 60,
    h: 60 + Math.random() * 60,
    static: true,
  };
}

export function createFlock(n = 12, shape = 'circle', color = '#f39c12', cx, cy) {
  const groupId = `flock_${_nextId}`;
  const objects = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i + Math.random() * 0.5;
    const r = 80 + Math.random() * 60;
    const obj = createObject({
      shape, color,
      x: (cx || 400) + Math.cos(angle) * r,
      y: (cy || 300) + Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      group: groupId,
    });
    obj.behavior = 'flock';
    objects.push(obj);
  }
  return objects;
}

export class WorldState {
  constructor() {
    this.objects = {};
    this.obstacles = {};
    this.gravityWells = {};
    this.bursts = [];
    this.speed = 1.0;
    this.paused = false;
  }

  add(obj) { this.objects[obj.id] = obj; return obj; }
  addObstacle(obs) { this.obstacles[obs.id] = obs; return obs; }
  addGravityWell(well) { this.gravityWells[well.id] = well; return well; }

  remove(id) { delete this.objects[id]; }

  addBurst(x, y, color) {
    this.bursts.push({ x, y, color, age: 0, maxAge: 38 });
  }

  clear() {
    this.objects = {};
    this.obstacles = {};
    this.gravityWells = {};
    this.bursts = [];
    _nextId = 1;
  }

  findByShapeColor(shape, color) {
    return Object.values(this.objects).filter(o =>
      (!shape || o.shape === shape) && (!color || o.color === color)
    );
  }

  snapshot() {
    return Object.values(this.objects).map(o => ({
      id: o.id, shape: o.shape, color: o.color,
      behavior: o.behavior, targetId: o.targetId, group: o.group,
      x: Math.round(o.x), y: Math.round(o.y),
    }));
  }
}
