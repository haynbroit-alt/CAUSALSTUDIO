// state.js — mémoire objets persistants

let _nextId = 1;

export function createId() {
  return `obj_${_nextId++}`;
}

export function createObject({ shape = 'circle', color = '#ecf0f1', x, y, vx, vy } = {}) {
  return {
    id: createId(),
    shape,
    color,
    x: x ?? Math.random() * 700 + 50,
    y: y ?? Math.random() * 500 + 50,
    vx: vx ?? (Math.random() - 0.5) * 2,
    vy: vy ?? (Math.random() - 0.5) * 2,
    radius: shape === 'circle' ? 18 : 20,
    behavior: 'wander',
    targetId: null,
    trail: [],
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

export class WorldState {
  constructor() {
    this.objects = {};    // id → object
    this.obstacles = {};  // id → obstacle
    this.speed = 1.0;
    this.paused = false;
  }

  add(obj) {
    this.objects[obj.id] = obj;
    return obj;
  }

  addObstacle(obs) {
    this.obstacles[obs.id] = obs;
    return obs;
  }

  remove(id) {
    delete this.objects[id];
  }

  clear() {
    this.objects = {};
    this.obstacles = {};
    _nextId = 1;
  }

  findByShapeColor(shape, color) {
    return Object.values(this.objects).filter(o =>
      (!shape || o.shape === shape) && (!color || o.color === color)
    );
  }

  snapshot() {
    return Object.values(this.objects).map(o => ({
      id: o.id,
      shape: o.shape,
      color: o.color,
      behavior: o.behavior,
      targetId: o.targetId,
      x: Math.round(o.x),
      y: Math.round(o.y),
    }));
  }
}
