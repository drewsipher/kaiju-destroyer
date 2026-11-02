// save.js — the profile in localStorage:
//   meta: progress that lasts across runs (best scores, wins, bosses ever beaten -> colour unlocks)
//   run:  the current playthrough (see run.js), or null
//   colors: chosen carapace / eye colour and pattern
import { LEVELS } from './data/levels.js';

const KEY = 'kaiju.save.v3', OLD = 'mtm.save.v1';
const fresh = () => ({ v: 3, meta: { best: 0, wins: 0, ngMax: 0, levelBest: [], bosses: [], lastParts: [] }, run: null, colors: { body: '#3f8a3a', eyes: '#e53935', pattern: 'none' } });

// older saves: keep scores and wins, start a fresh run (the evolution system changed completely)
function migrate(s) {
  const p = fresh();
  const V1 = ['leaf', 'yard', 'picnic', 'suburb', 'downtown', 'army', 'mega', 'end'];
  const idOf = (i) => ((s.v || 1) < 2 ? V1[i] : LEVELS[i] && LEVELS[i].id);
  p.meta.best = s.best || 0; p.meta.wins = s.wins || 0;
  (s.levelBest || []).forEach((v, i) => { const j = LEVELS.findIndex((L) => L.id === idOf(i)); if (v && j >= 0) p.meta.levelBest[j] = v; });
  if (s.colors) p.colors = { ...p.colors, ...s.colors };
  return p;
}

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 3) return { ...fresh(), ...s, meta: { ...fresh().meta, ...s.meta } };
    const old = JSON.parse(localStorage.getItem(OLD));
    if (old && typeof old === 'object') return migrate(old);
  } catch (e) { /* corrupt or blocked */ }
  return fresh();
}
export function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage blocked */ } }
export function reset() { const p = fresh(); save(p); return p; }
