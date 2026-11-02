// run.js — one playthrough ("run") of the campaign: the hatchling you chose, the parts you were
// drafted, where they sit, your evolution ranks and DNA. Every run rolls different eggs and drafts,
// and parts you used last run are offered less often, so each run grows a different kaiju.
import { PARTS, SOCKETS, SOCKET_ORDER, partsOf } from './data/parts.js';
import { computeStats, rankOf } from './data/skills.js';
import { LEVELS } from './data/levels.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weightedPick(list, w) {
  let total = 0; const ws = list.map((x) => { const v = Math.max(0, w(x)); total += v; return v; });
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

export function newRun(ng = 0, heirloom = null) {
  return { ng, dna: ng * 4, ranks: {}, parts: [], design: null, cleared: [], unlocked: 0, score: 0, draft: null, heirloom, started: Date.now() };
}

export const maxTier = (run) => (run.ng > 0 ? 3 : run.cleared.length < 3 ? 1 : run.cleared.length < 7 ? 2 : 3);
export const openSockets = (run) => SOCKET_ORDER.filter((s) => SOCKETS[s].unlock <= run.cleared.length);

// three random hatchlings to choose from at the start of a run
export function eggs(meta) {
  const last = new Set(meta.lastParts || []);
  const tier1 = (slot) => partsOf(slot).filter((id) => PARTS[id].tier === 1 && id !== 'tail_none');
  const bodies = tier1('body').sort(() => Math.random() - 0.5);
  const out = [];
  for (let i = 0; i < 3; i++) {
    const body = bodies.find((b) => !out.some((o) => o.body === b) && !last.has(b)) || bodies[i];
    const head = weightedPick(tier1('head'), (h) => (last.has(h) ? 0.3 : 1));
    const legs = Math.random() < 0.5 ? 'legs_walker' : pick(tier1('legs'));
    const tail = Math.random() < 0.5 ? 'tail_none' : pick(tier1('tail'));
    const att = weightedPick(partsOf('attach').filter((a) => PARTS[a].tier === 1 && PARTS[a].sockets.some((s) => SOCKETS[s].unlock === 0)), (a) => (last.has(a) ? 0.3 : 1));
    const sock = PARTS[att].sockets.find((s) => SOCKETS[s].unlock === 0);
    out.push({ body, head, legs, tail, sockets: { [sock]: att } });
  }
  return out;
}

export function startWith(run, design) {
  run.design = JSON.parse(JSON.stringify(design));
  run.parts = [design.body, design.head, design.legs, design.tail, ...Object.values(design.sockets)];
  if (!run.parts.includes('tail_none')) run.parts.push('tail_none');
  // the heirloom is always worn: it takes a socket even if that means storing the egg's own part
  const h = run.heirloom;
  if (h && PARTS[h] && !run.parts.includes(h)) {
    run.parts.push(h);
    const P = PARTS[h];
    if (P.slot !== 'attach') run.design[P.slot] = h;
    else { const s = P.sockets.find((k) => openSockets(run).includes(k)); if (s) run.design.sockets[s] = h; }
  }
}

// N random parts you don't own yet, deeper tiers as the run goes on
export function draftOptions(run, meta) {
  const n = 3 + rankOf(run.ranks, 'genome') + (run.ng > 0 ? 1 : 0);
  const last = new Set(meta.lastParts || []), tier = maxTier(run);
  const SLOTW = { attach: 1.3, head: 0.9, body: 0.7, legs: 0.8, tail: 0.8 };
  let pool = Object.keys(PARTS).filter((id) => !run.parts.includes(id) && PARTS[id].tier <= tier && id !== 'tail_none');
  const out = [];
  while (out.length < n && pool.length) {
    const id = weightedPick(pool, (p) => SLOTW[PARTS[p].slot] * (PARTS[p].tier === tier ? 1.7 : 1) * (last.has(p) ? 0.35 : 1) * (out.some((o) => PARTS[o].slot === PARTS[p].slot) ? 0.5 : 1));
    out.push(id); pool = pool.filter((p) => p !== id);
  }
  return out;
}

// put a newly gained part on the body; returns a short message about where it went
export function equipNew(run, id) {
  const P = PARTS[id], d = run.design;
  if (P.slot !== 'attach') { d[P.slot] = id; return `${P.name} replaces your old ${P.slot}.`; }
  const open = openSockets(run);
  const free = P.sockets.find((s) => open.includes(s) && !d.sockets[s]);
  if (free) { d.sockets[free] = id; return `${P.name} grows on your ${SOCKETS[free].name.toLowerCase()}.`; }
  return `${P.name} is stored. Place it in the Body Lab (all fitting sockets are full).`;
}

export function place(run, socket, id) {
  const d = run.design;
  for (const s in d.sockets) if (d.sockets[s] === id) delete d.sockets[s];
  if (id) d.sockets[socket] = id; else delete d.sockets[socket];
}

export function statsFor(run, levelIndex) { return computeStats(run.ranks, run.design, { level: levelIndex, ng: run.ng }); }
export function extrasFor(run) { return { jaw: rankOf(run.ranks, 'jaws'), kaiju: rankOf(run.ranks, 'kaiju') }; }
export const levelCount = () => LEVELS.length;
