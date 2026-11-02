// util.js — small math helpers shared by every module.
export const TAU = Math.PI * 2;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const choose = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const sign = (v) => (v < 0 ? -1 : 1);
export const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
export function weighted(list, wfn) {
  let total = 0; const ws = list.map((it) => { const w = Math.max(0, wfn(it)); total += w; return w; });
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
// human readable length in metres -> "3.2 mm", "45 cm", "1.2 km"
export function fmtLen(m) {
  if (m < 0.01) return (m * 1000).toFixed(1) + ' mm';
  if (m < 1) return (m * 100).toFixed(m < 0.1 ? 1 : 0) + ' cm';
  if (m < 1000) return m.toFixed(m < 10 ? 1 : 0) + ' m';
  return (m / 1000).toFixed(m < 10000 ? 2 : 0) + ' km';
}
export const fmtNum = (n) => Math.floor(n).toLocaleString('en-US');
