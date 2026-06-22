// parser.js — texte → intention

const SHAPES = ['carré','carre','cercle','triangle','étoile','etoile','losange',
                 'square','circle','star','diamond'];
const COLORS = ['rouge','bleu','vert','jaune','violet','orange','blanc','rose','cyan',
                'red','blue','green','yellow','purple','white','pink'];
const BEHAVIORS = {
  'suit':'seek','follow':'seek','follows':'seek','seek':'seek',
  'fuit':'flee','fuis':'flee','flee':'flee','flees':'flee','évite':'flee','evite':'flee',
  'tourne autour':'orbit','orbit':'orbit','orbite':'orbit','tourne':'orbit',
  'wander':'wander','erre':'wander','déambule':'wander','deambule':'wander',
  'volent ensemble':'flock','flock':'flock','essaiment':'flock',
};

export const COLOR_MAP = {
  rouge:'#e74c3c', red:'#e74c3c',
  bleu:'#3498db', blue:'#3498db',
  vert:'#2ecc71', green:'#2ecc71',
  jaune:'#f1c40f', yellow:'#f1c40f',
  violet:'#9b59b6', purple:'#9b59b6',
  orange:'#e67e22',
  blanc:'#ecf0f1', white:'#ecf0f1',
  rose:'#fd79a8', pink:'#fd79a8',
  cyan:'#00cec9',
};

export const SHAPE_MAP = {
  carré:'square', carre:'square', square:'square',
  cercle:'circle', circle:'circle',
  triangle:'triangle',
  étoile:'star', etoile:'star', star:'star',
  losange:'diamond', diamond:'diamond',
};

function normalize(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/['']/g,' ').trim();
}

function findShape(text) {
  for (const s of SHAPES) {
    if (text.includes(normalize(s))) return SHAPE_MAP[normalize(s)] || 'circle';
  }
  return null;
}

function findColor(text) {
  for (const c of COLORS) { if (text.includes(normalize(c))) return c; }
  return null;
}

function findBehavior(text) {
  for (const [kw, beh] of Object.entries(BEHAVIORS)) {
    if (text.includes(normalize(kw))) return beh;
  }
  return null;
}

export function parse(input, state) {
  const raw = normalize(input);

  // ── WORLD COMMANDS ────────────────────────────────────────────
  if (/efface tout|clear all|reset|vide tout|tout effacer/.test(raw))
    return { type: 'CLEAR_ALL' };
  if (/pause|stop|arrête|arrete/.test(raw))
    return { type: 'PAUSE' };
  if (/reprend|resume|play|continue|demarre|démarre/.test(raw))
    return { type: 'RESUME' };
  if (/accélère|accelere|faster|plus vite|rapide/.test(raw))
    return { type: 'SPEED', delta: +0.5 };
  if (/ralentis|slower|moins vite|lent/.test(raw))
    return { type: 'SPEED', delta: -0.5 };
  if (/obstacle|mur|wall|bloc\b/.test(raw))
    return { type: 'ADD_OBSTACLE' };

  // ── NEW: FLOCK / SWARM ────────────────────────────────────────
  if (/essaim|swarm|nuee|nuée|envol|troupeau/.test(raw)) {
    const shape = findShape(raw) || 'circle';
    const color = findColor(raw);
    const qty = /vingt|20/.test(raw) ? 20 : /quinze|15/.test(raw) ? 15
              : /dix\b|10\b/.test(raw) ? 10 : 12;
    return { type: 'CREATE_FLOCK', shape, color: COLOR_MAP[color] || '#f39c12', quantity: qty };
  }

  // ── NEW: GRAVITY WELL ─────────────────────────────────────────
  if (/vortex|trou noir|attracteur|gravit/.test(raw))
    return { type: 'ADD_GRAVITY_WELL', repel: false };
  if (/repuls|répuls|anti.gravit|repouss/.test(raw))
    return { type: 'ADD_GRAVITY_WELL', repel: true };

  // ── NEW: PULSE ────────────────────────────────────────────────
  if (/pulse|puls\b|vibr|oscill/.test(raw)) {
    const shape = findShape(raw);
    const color = findColor(raw);
    return { type: 'SET_PULSE', shape, color };
  }

  // ── NEW: EXPLODE ──────────────────────────────────────────────
  if (/explosion|big bang|chaos|scatter|disperse|éclate/.test(raw))
    return { type: 'EXPLODE' };

  // ── NEW: RANDOM SCENE ─────────────────────────────────────────
  if (/scène|scene|surprise|aleatoire|aléatoire|demo/.test(raw))
    return { type: 'RANDOM_SCENE' };

  // ── DESTRUCTION ───────────────────────────────────────────────
  if (/efface|supprime|enlève|enleve|delete|remove/.test(raw)) {
    return { type: 'DESTROY', shape: findShape(raw), color: findColor(raw) };
  }

  // ── BEHAVIOR (relation) ───────────────────────────────────────
  const behavior = findBehavior(raw);
  if (behavior) {
    let subjectText = raw, targetText = raw;
    for (const kw of Object.keys(BEHAVIORS)) {
      const nkw = normalize(kw);
      const idx = raw.indexOf(nkw);
      if (idx !== -1 && BEHAVIORS[kw] === behavior) {
        subjectText = raw.slice(0, idx);
        targetText = raw.slice(idx + nkw.length);
        break;
      }
    }
    const subjectShape = findShape(subjectText) || findShape(raw);
    const subjectColor = findColor(subjectText);
    const targetShape = findShape(targetText);
    const targetColor = findColor(targetText);
    return {
      type: 'SET_BEHAVIOR',
      subject: { shape: subjectShape, color: subjectColor },
      behavior,
      target: (targetShape || targetColor) ? { shape: targetShape, color: targetColor } : null,
    };
  }

  // ── CREATION ──────────────────────────────────────────────────
  const shape = findShape(raw);
  const color = findColor(raw);
  if (shape || color) {
    const quantity = /\bdeux\b|2\b/.test(raw) ? 2 : /\btrois\b|3\b/.test(raw) ? 3 : 1;
    return { type: 'CREATE', shape: shape || 'circle', color: COLOR_MAP[color] || '#ecf0f1', quantity };
  }

  return { type: 'UNKNOWN', raw };
}
