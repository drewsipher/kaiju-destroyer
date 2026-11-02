// data/skills.js — the Evolution tree. Every node has ranks; each rank costs more DNA than the last
// (cost + rank * step), so a single run can only afford a fraction of the tree.
//   pos: [column, row] in its branch   max: ranks   req: [[id, rank], ...] needed before rank 1
//   fx: stat change PER RANK (merged by computeStats)   ranks: optional text per rank
// computeStats() also folds in the equipped Body Lab parts (parts.js) and the level power scale.
import { PARTS } from './parts.js';

export const BRANCHES = [
  { id: 'pred', name: 'Predator', color: '#c0392b', blurb: 'Bite, venom and ramming' },
  { id: 'shell', name: 'Carapace', color: '#4f7d9a', blurb: 'Health, armor and recovery' },
  { id: 'meta', name: 'Metabolism', color: '#d68910', blurb: 'Growth, hunger and score' },
  { id: 'power', name: 'Powers', color: '#7d3c98', blurb: 'Acid, stomp, roar, web, lightning, breath' },
  { id: 'mut', name: 'Mutagenics', color: '#16a085', blurb: 'Make your body parts stronger' }
];

export const SKILLS = {
  // ---- PREDATOR ----
  jaws:     { branch: 'pred', pos: [0, 0], max: 5, cost: 2, step: 2, name: 'Crushing Bite', desc: '+15% bite damage per rank. Your jaws visibly grow.', fx: { biteDmg: 0.15, jawSize: 1 } },
  gullet:   { branch: 'pred', pos: [0, 1], max: 3, cost: 3, step: 3, req: [['jaws', 1]], name: 'Wide Gullet', desc: 'Swallow things 8% bigger per rank.', fx: { eatRatio: 0.08 } },
  apex:     { branch: 'pred', pos: [0, 2], max: 1, cost: 10, req: [['jaws', 4], ['gullet', 2]], name: 'Apex Predator', desc: '+35% damage to everything, and bosses are stunned by your bites.', fx: { biteDmg: 0.35, bossStun: 1 } },
  bloodlust:{ branch: 'pred', pos: [1, 0], max: 3, cost: 2, step: 2, name: 'Bloodlust', desc: '+5% critical hit chance per rank.', fx: { crit: 0.05 } },
  venom:    { branch: 'pred', pos: [1, 1], max: 3, cost: 3, step: 2, req: [['bloodlust', 1]], name: 'Venom Glands', desc: 'Bites poison. Each rank makes poison deadlier.', fx: { poison: 1 } },
  ram:      { branch: 'pred', pos: [2, 0], max: 3, cost: 2, step: 2, name: 'Battering Ram', desc: 'Dashes deal +50% damage and smash structures harder per rank.', fx: { dashDmg: 0.5, ramStructures: 0.5 } },
  reflexes: { branch: 'pred', pos: [2, 1], max: 3, cost: 2, step: 3, req: [['ram', 1]], name: 'Reflexes', desc: 'Dash recharges 15% faster per rank.', fx: { dashCd: 0.15 } },

  // ---- CARAPACE ----
  hide:     { branch: 'shell', pos: [0, 0], max: 5, cost: 1, step: 2, name: 'Thick Hide', desc: '+25 max health per rank.', fx: { maxHp: 25 } },
  chitin:   { branch: 'shell', pos: [0, 1], max: 4, cost: 3, step: 2, req: [['hide', 1]], name: 'Chitin', desc: 'Take 6% less damage per rank.', fx: { armor: 0.06 } },
  bulk:     { branch: 'shell', pos: [0, 2], max: 1, cost: 6, req: [['chitin', 2]], name: 'Immovable', desc: 'Knockback no longer moves you.', fx: { heavy: 1 } },
  regen:    { branch: 'shell', pos: [1, 0], max: 3, cost: 3, step: 3, name: 'Regeneration', desc: 'Heal 0.6% of your health per second per rank.', fx: { regen: 0.6 } },
  molt:     { branch: 'shell', pos: [1, 1], max: 2, cost: 6, step: 6, req: [['regen', 1]], name: 'Second Molt', desc: 'Once per level per rank, shed your skin instead of dying.', fx: { revive: 1 } },
  spines:   { branch: 'shell', pos: [2, 0], max: 3, cost: 2, step: 2, name: 'Hardened Spines', desc: 'Spikes, thorns and horns hurt attackers 50% more per rank (needs a spiky part).', fx: { spikeDmg: 0.5 } },

  // ---- METABOLISM ----
  growth:   { branch: 'meta', pos: [0, 0], max: 5, cost: 1, step: 2, name: 'Fast Metabolism', desc: 'Grow 12% faster per rank.', fx: { growth: 0.12 } },
  frenzy:   { branch: 'meta', pos: [0, 1], max: 3, cost: 2, step: 2, req: [['growth', 1]], name: 'Feeding Frenzy', desc: 'Frenzy (F) charges 30% faster and lasts 1.5s longer per rank.', fx: { frenzyGain: 0.3, frenzyTime: 1.5 } },
  adrenaline:{ branch: 'meta', pos: [0, 2], max: 2, cost: 4, step: 4, req: [['frenzy', 1]], name: 'Adrenaline', desc: 'Below 35% health: +30% damage and +10% speed per rank.', fx: { adrenaline: 1 } },
  vacuum:   { branch: 'meta', pos: [1, 0], max: 3, cost: 2, step: 2, name: 'Vacuum Maw', desc: 'Slurp up bigger things just by touching them; biomass comes to you.', fx: { vacuum: 0.08, magnet: 0.5 } },
  stomach:  { branch: 'meta', pos: [1, 1], max: 2, cost: 3, step: 3, req: [['vacuum', 1]], name: 'Iron Stomach', desc: 'Eating heals 60% more per rank.', fx: { healOnEat: 0.6 } },
  glutton:  { branch: 'meta', pos: [2, 0], max: 4, cost: 2, step: 2, name: 'Glutton', desc: '+15% points per rank.', fx: { scoreMult: 0.15 } },

  // ---- POWERS ----
  acid:     { branch: 'power', pos: [0, 0], max: 5, cost: 3, step: 2, name: 'Acid Spit', desc: 'Right-click to spit acid. Each rank adds a glob; rank 4+ leaves burning puddles.', fx: { acid: 1 } },
  stomp:    { branch: 'power', pos: [1, 0], max: 4, cost: 2, step: 2, name: 'Seismic Stomp', desc: 'Ground pound (Q) hits 40% harder and wider per rank. Rank 3+ sends shockwaves along the ground.', fx: { stomp: 0.4 } },
  roar:     { branch: 'power', pos: [2, 0], max: 4, cost: 3, step: 2, name: 'Kaiju Roar', desc: 'Press E: stun everything nearby and bat missiles back. Bigger and longer per rank.', fx: { roar: 1 } },
  silk:     { branch: 'power', pos: [0, 1], max: 3, cost: 3, step: 3, name: 'Silk Shot', desc: 'Press T: a web that sticks enemies in place. Wider and longer per rank.', fx: { silk: 1 } },
  storm:    { branch: 'power', pos: [1, 1], max: 3, cost: 4, step: 3, req: [['stomp', 1]], name: 'Storm Bite', desc: 'Bites arc lightning into 1/2/3 more enemies.', fx: { storm: 1 } },
  beam:     { branch: 'power', pos: [2, 1], max: 3, cost: 7, step: 5, req: [['roar', 2]], name: 'Atomic Breath', desc: 'Press R: a devastating beam where you aim. Longer and stronger per rank.', fx: { beam: 1 } },

  // ---- MUTAGENICS (boost your parts) ----
  wingmuscle:{ branch: 'mut', pos: [0, 0], max: 3, cost: 3, step: 3, name: 'Wing Muscles', desc: 'With wings: rank 1 an extra jump, rank 2 gliding, rank 3 true flight.', fx: { wingMuscle: 1 } },
  brood:    { branch: 'mut', pos: [1, 0], max: 3, cost: 3, step: 3, name: 'Brood Chambers', desc: 'With egg sacs: +1 broodling per rank, and they hatch faster and bite harder.', fx: { broodPlus: 1 } },
  gland:    { branch: 'mut', pos: [2, 0], max: 3, cost: 3, step: 3, name: 'Gland Pressure', desc: 'With a bio-cannon: it fires 30% faster per rank.', fx: { cannonRate: 0.3 } },
  prism:    { branch: 'mut', pos: [0, 1], max: 2, cost: 4, step: 4, name: 'Refraction', desc: 'With prism crystals: +10% chance per rank to shrug off shots.', fx: { prism: 0.1 } },
  genome:   { branch: 'mut', pos: [1, 1], max: 2, cost: 5, step: 5, name: 'Adaptive Genome', desc: 'Mutation drafts offer one more choice per rank.', fx: { draftPlus: 1 } },
  kaiju:    { branch: 'mut', pos: [2, 1], max: 1, cost: 14, req: [['hide', 3], ['jaws', 3]], name: 'Kaiju Form', desc: 'The final form: +25% damage, +60 health, 10% less damage, and a towering crest.', fx: { biteDmg: 0.25, maxHp: 60, armor: 0.1, kaiju: 1 } }
};

export const BASE_STATS = {
  maxHp: 100, armor: 0, heavy: 0, speed: 1, jump: 1, jumps: 1, glide: 0, flight: 0, climb: 1,
  biteDmg: 1, eatRatio: 0.8, vacuum: 0.3, magnet: 0, growth: 1, regen: 0, healOnEat: 1, reach: 0, sight: 0,
  dashDmg: 1, dashCd: 0, ramStructures: 1, structBite: 0, spikes: 0, spikeDmg: 1, poison: 0, stomp: 1, quake: 0,
  acid: 0, roar: 0, roarSize: 0, beam: 0, beamPower: 1, silk: 0, storm: 0, frenzyGain: 1, frenzyTime: 6, scoreMult: 1,
  revive: 0, crit: 0, claws: 0, tailclub: 0, whip: 0, adrenaline: 0, brood: 0, broodPlus: 0, twinhead: 0, dazzle: 0,
  quills: 0, wings: 0, wingMuscle: 0, glideAlways: 0, cannon: 0, cannonRate: 0, reflect: 0, prism: 0, draftPlus: 0,
  bossStun: 0, jawSize: 0, kaiju: 0, power: 1
};

export const cost = (id, rank) => SKILLS[id].cost + rank * (SKILLS[id].step || 0); // price of the NEXT rank
export const rankOf = (ranks, id) => ranks[id] || 0;
export function reqMet(id, ranks) { return (SKILLS[id].req || []).every(([r, n]) => rankOf(ranks, r) >= n); }
export function canBuy(id, ranks, dna) {
  const sk = SKILLS[id], r = rankOf(ranks, id);
  return !!sk && r < sk.max && reqMet(id, ranks) && dna >= cost(id, r);
}
// total DNA ever spent (for refunds)
export function spent(ranks) { let n = 0; for (const id in ranks) for (let r = 0; r < ranks[id]; r++) n += cost(id, r); return n; }

// equipped parts as a list of [partId, socket|null]
export function equipped(design) {
  const out = [[design.body], [design.head], [design.legs], [design.tail]];
  for (const s in design.sockets || {}) if (design.sockets[s]) out.push([design.sockets[s], s]);
  return out.filter(([id]) => id && PARTS[id]);
}

// all stats for the player: base + ranks + parts + level/NG+ power scaling
export function computeStats(ranks, design, ctx = {}) {
  const s = { ...BASE_STATS };
  const add = (fx, k = 1) => { for (const key in fx) s[key] = (s[key] || 0) + fx[key] * k; };
  for (const id in ranks) if (SKILLS[id]) add(SKILLS[id].fx, ranks[id]);
  for (const [id, sock] of equipped(design)) { const P = PARTS[id]; add(P.fx); if (sock && P.at && P.at[sock]) add(P.at[sock]); }
  // part + mutagenic synergies
  if (s.wings) { s.jumps += s.wings + (s.wingMuscle >= 1 ? 1 : 0); if (s.wingMuscle >= 2) s.glide = 1; if (s.wingMuscle >= 3) s.flight = 1; }
  if (s.glideAlways) s.glide = 1;
  if (s.brood) s.brood += s.broodPlus;
  if (s.beamFree && !s.beam) s.beam = 1;
  s.reflect += s.reflect > 0 ? s.prism : 0;
  if (s.spikes) s.spikes *= s.spikeDmg;
  if (s.stomp >= 1.8) s.quake = 1;
  // powers scale with how far into the campaign you are (and New Game+)
  s.power = 1 + 0.1 * (ctx.level || 0) + 0.3 * (ctx.ng || 0);
  s.levelBonus = Math.floor((ctx.level || 0) / 4);
  s.scoreMult *= 1 + 0.5 * (ctx.ng || 0);
  s.armor = Math.max(-0.2, Math.min(0.65, s.armor));
  s.maxHp = Math.max(40, Math.round(s.maxHp));
  s.speed = Math.max(0.5, s.speed);
  return s;
}
