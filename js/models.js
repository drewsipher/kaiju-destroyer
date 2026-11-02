// models.js — every non-player model is built here procedurally from simple shapes (no asset files).
// build(key, opts) returns a THREE.Group normalised so its largest dimension is 1 unit and its
// bottom sits on y = 0 (entities then scale it by their size). A group may carry
// userData.anim(t, moving, ent) for leg/wing/rotor animation. Add a model: write a builder and
// register it in BUILDERS at the bottom.
import * as THREE from 'three';
import { TAU, rand } from './util.js';

// ---------- shared geometry & toon materials ----------
const G = {
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
  lowSphere: new THREE.SphereGeometry(0.5, 8, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
  cone: new THREE.ConeGeometry(0.5, 1, 12),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
  dodec: new THREE.DodecahedronGeometry(0.5, 0),
  torus: new THREE.TorusGeometry(0.5, 0.12, 8, 20),
  plane: new THREE.PlaneGeometry(1, 1)
};
// leg segment geometry: unit length pointing down from its pivot
G.leg = new THREE.CylinderGeometry(0.5, 0.35, 1, 6); G.leg.translate(0, -0.5, 0);
G.wing = new THREE.CircleGeometry(0.5, 16); G.wing.scale(1, 0.32, 1); G.wing.translate(0.5, 0, 0);
// a wing lying flat (XZ plane) that extends backwards (-x) from its hinge
G.wingFlat = G.wing.clone(); G.wingFlat.rotateX(-Math.PI / 2); G.wingFlat.rotateY(Math.PI);
export const GEO = G;

let gradient = null;
function gradientMap() {
  if (gradient) return gradient;
  const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 230, 230, 230, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}
const matCache = new Map();
// toon material, cached by colour + options
export function mat(color, o = {}) {
  const key = color + '|' + (o.emissive || '') + '|' + (o.opacity || 1) + '|' + (o.map ? o.map.uuid : '') + '|' + (o.side || 0);
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() });
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei || 1; }
  if (o.opacity && o.opacity < 1) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
  if (o.map) m.map = o.map;
  if (o.side) m.side = o.side;
  matCache.set(key, m);
  return m;
}
export const glowMat = (color) => mat(color, { emissive: color, ei: 1.2 });

// add a mesh: geometry key, colour, scale, position, optional rotation
export function part(parent, geo, color, s, p, r, o) {
  const m = new THREE.Mesh(G[geo] || geo, typeof color === 'string' ? mat(color, o) : color);
  if (s) m.scale.set(s[0], s[1], s[2]);
  if (p) m.position.set(p[0], p[1], p[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  m.castShadow = true;
  parent.add(m);
  return m;
}
// a leg: pivot at the hip, two segments (thigh out, shin down)
export function leg(parent, x, y, z, len, thick, color, side, splay = 0.6) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); parent.add(pivot);
  const thigh = part(pivot, 'leg', color, [thick, len * 0.55, thick], [0, 0, 0], [-side * splay, 0, 0]);
  const knee = new THREE.Group(); knee.position.set(0, -len * 0.55 * Math.cos(splay), side * len * 0.55 * Math.sin(splay)); pivot.add(knee);
  part(knee, 'leg', color, [thick * 0.8, len * 0.6, thick * 0.8], [0, 0, 0], [side * 0.15, 0, 0]);
  void thigh;
  return pivot;
}
export function walkAnim(legs, freq = 14, amp = 0.5) {
  return (t, moving) => {
    const a = moving ? amp : amp * 0.08;
    for (let i = 0; i < legs.length; i++) legs[i].rotation.z = Math.sin(t * freq + (i % 2 ? Math.PI : 0) + (i >> 1) * 0.9) * a;
  };
}
// scale the group so its largest dimension is 1 and its feet are on y = 0
export function finalize(g, o = {}) {
  const box = new THREE.Box3().setFromObject(g), size = new THREE.Vector3(); box.getSize(size);
  const dim = o.by === 'h' ? size.y : o.by === 'w' ? size.x : Math.max(size.x, size.y);
  const k = 1 / (dim || 1);
  const inner = new THREE.Group();
  while (g.children.length) inner.add(g.children[0]);
  inner.scale.setScalar(k);
  const c = new THREE.Vector3(); box.getCenter(c);
  inner.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  g.add(inner);
  g.userData.inner = inner;
  g.userData.dims = { w: size.x * k, h: size.y * k, d: size.z * k };
  return g;
}

// ---------- builders ----------
export function eyes(g, x, y, z, r, color = '#111', glow) {
  for (const s of [-1, 1]) {
    part(g, 'sphere', glow ? glowMat(glow) : color, [r, r, r], [x, y, z * s]);
    if (!glow) part(g, 'sphere', '#ffffff', [r * 0.3, r * 0.3, r * 0.3], [x + r * 0.32, y + r * 0.2, z * s + r * 0.15 * s]);
  }
}

// generic arthropod: o.segs [{x, r, h, c}] back->front (last = head)
function bug(o) {
  const g = new THREE.Group(), legs = [], wings = [];
  const segs = o.segs;
  segs.forEach((s, i) => {
    const m = part(g, o.box ? 'dodec' : 'sphere', s.c || o.color, [s.r * 2 * (s.l || 1), s.r * 2 * (s.h || 0.8), s.r * 2 * (s.d || 0.9)], [s.x, s.r * (s.h || 0.8) + (o.lift || 0.3), 0]);
    if (o.spots && i < segs.length - 1) for (let k = 0; k < 3; k++) part(g, 'sphere', o.spots, [s.r * 0.45, s.r * 0.2, s.r * 0.45], [s.x + rand(-0.4, 0.4) * s.r, s.r * (s.h || 0.8) * 1.75 + (o.lift || 0.3) - s.r * 0.05, rand(-0.4, 0.4) * s.r]);
    if (o.stripes && i < segs.length - 1) for (let k = -1; k <= 1; k += 2) part(g, 'cyl', o.stripes, [s.r * 1.9 * (s.h || 0.8), s.r * 0.25, s.r * 1.75 * (s.d || 0.9)], [s.x + k * s.r * 0.35, s.r * (s.h || 0.8) + (o.lift || 0.3), 0], [0, 0, Math.PI / 2]);
    void m;
  });
  const head = segs[segs.length - 1], hy = head.r * (head.h || 0.8) + (o.lift || 0.3);
  if (o.eyes !== false) eyes(g, head.x + head.r * 0.55, hy + head.r * 0.25, head.r * 0.5, head.r * 0.35, '#111', o.glowEyes);
  if (o.antenna) for (const s of [-1, 1]) part(g, 'cyl', o.legColor || '#222', [0.03, head.r * 2.4, 0.03], [head.x + head.r * 0.9, hy + head.r * 1.3, s * head.r * 0.35], [0.3 * s, 0, -0.7]);
  if (o.jaws) for (const s of [-1, 1]) part(g, 'cone', o.legColor || '#222', [head.r * 0.25, head.r * 0.8, head.r * 0.25], [head.x + head.r * 1.05, hy - head.r * 0.35, s * head.r * 0.3], [0, 0, -Math.PI / 2 - 0.4]);
  if (o.legs) {
    const legSegs = o.legSegs || [Math.max(0, segs.length - 2)];
    const per = o.legs / 2 / legSegs.length;
    for (const si of legSegs) {
      const s = segs[si];
      for (let k = 0; k < per; k++) {
        const lx = s.x + (per > 1 ? (k / (per - 1) - 0.5) * s.r * 1.4 : 0);
        for (const side of [-1, 1]) legs.push(leg(g, lx, (o.lift || 0.3) + s.r * 0.6, side * s.r * 0.6, o.legLen || 0.9, o.legThick || 0.07, o.legColor || '#222', side, o.splay || 0.7));
      }
    }
  }
  if (o.hindLegs) for (const side of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(segs[0].x + segs[0].r, (o.lift || 0.3) + segs[0].r, side * segs[0].r * 0.7); g.add(p);
    part(p, 'leg', o.legColor, [0.1, 1.1, 0.1], [0, 0, 0], [0, 0, 2.3]);
    part(p, 'leg', o.legColor, [0.08, 1.0, 0.08], [-0.8, 0.75, 0], [0, 0, 0.35]);
  }
  if (o.wings) {
    const wc = o.wings;
    const s = segs[Math.max(0, segs.length - 2)];
    for (const side of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(s.x, s.r * 1.6 + (o.lift || 0.3), side * s.r * 0.3); g.add(w);
      part(w, 'wingFlat', mat(wc, { opacity: 0.55, side: THREE.DoubleSide }), [o.wingLen || 1.6, 1, o.wingLen || 1.6], [0, 0, 0], [0, side * 0.35, 0]);
      w.userData.side = side; wings.push(w);
    }
  }
  if (o.tail) part(g, 'cone', o.color, [segs[0].r * 0.5, o.tail, segs[0].r * 0.5], [segs[0].x - o.tail * 0.5, segs[0].r + (o.lift || 0.3), 0], [0, 0, Math.PI / 2]);
  finalize(g);
  const walk = walkAnim(legs, o.legFreq || 16, o.legAmp || 0.45);
  g.userData.anim = (t, moving) => {
    walk(t, moving);
    for (const w of wings) w.rotation.x = -w.userData.side * (0.3 + Math.sin(t * 60) * 0.6);
  };
  return g;
}

function blob(o) {
  const g = new THREE.Group();
  const sh = o.shape || 'sphere';
  if (sh === 'rock') part(g, 'dodec', o.color, [1, 0.7, 0.9], [0, 0.35, 0], [rand(0, 3), rand(0, 3), 0]);
  else if (sh === 'crumb') { part(g, 'ico', o.color, [1, 0.6, 0.8], [0, 0.3, 0], [rand(0, 3), rand(0, 3), 0]); part(g, 'ico', o.color2 || o.color, [0.5, 0.4, 0.5], [0.3, 0.55, 0.1]); }
  else if (sh === 'drop') part(g, 'sphere', mat(o.color, { opacity: 0.6, emissive: '#3a6f9a', ei: 0.3 }), [1, 0.8, 1], [0, 0.4, 0]);
  else if (sh === 'berry') { part(g, 'sphere', o.color, [1, 1, 1], [0, 0.5, 0]); part(g, 'cone', '#2e6b1e', [0.3, 0.3, 0.3], [0, 1.05, 0]); }
  else if (sh === 'grapes') { for (let i = 0; i < 7; i++) part(g, 'sphere', o.color, [0.4, 0.4, 0.4], [rand(-0.3, 0.3), 0.25 + i * 0.1, rand(-0.2, 0.2)]); }
  else if (sh === 'seed') part(g, 'sphere', o.color, [1, 0.45, 0.5], [0, 0.22, 0], [0, 0, 0.2]);
  else if (sh === 'leaf') { part(g, 'sphere', o.color, [1, 0.06, 0.55], [0, 0.03, 0]); part(g, 'box', o.color2 || '#2d5a1b', [1, 0.07, 0.04], [0, 0.05, 0]); }
  else if (sh === 'cookie') { part(g, 'cyl', o.color, [1, 0.22, 1], [0, 0.11, 0]); for (let i = 0; i < 5; i++) part(g, 'sphere', '#3b2314', [0.14, 0.1, 0.14], [rand(-0.35, 0.35), 0.22, rand(-0.35, 0.35)]); g.rotation.x = 0; }
  else if (sh === 'sandwich') { part(g, 'box', '#e8c07a', [1, 0.18, 0.8], [0, 0.09, 0]); part(g, 'box', '#5aa83a', [1.05, 0.06, 0.85], [0, 0.2, 0]); part(g, 'box', '#d9534f', [0.95, 0.08, 0.78], [0, 0.27, 0]); part(g, 'box', '#e8c07a', [1, 0.18, 0.8], [0, 0.4, 0]); }
  else if (sh === 'apple') { part(g, 'sphere', o.color, [1, 0.92, 1], [0, 0.46, 0]); part(g, 'cyl', '#5b3a1a', [0.05, 0.25, 0.05], [0, 0.98, 0]); part(g, 'sphere', '#3f8a3a', [0.3, 0.06, 0.15], [0.12, 1.0, 0]); }
  else if (sh === 'can') { part(g, 'cyl', o.color, [0.55, 1, 0.55], [0, 0.5, 0]); part(g, 'cyl', '#cfd6da', [0.5, 0.05, 0.5], [0, 1.0, 0]); part(g, 'cyl', '#ffffff', [0.56, 0.25, 0.56], [0, 0.55, 0]); }
  else if (sh === 'mushroom') { part(g, 'cyl', '#efe6d2', [0.3, 0.7, 0.3], [0, 0.35, 0]); part(g, 'sphere', o.color, [1, 0.55, 1], [0, 0.75, 0]); for (let i = 0; i < 5; i++) part(g, 'sphere', '#ffffff', [0.12, 0.06, 0.12], [rand(-0.3, 0.3), 0.98, rand(-0.3, 0.3)]); }
  else if (sh === 'donut') { part(g, 'torus', o.color, [1, 1, 1.6], [0, 0.2, 0], [Math.PI / 2, 0, 0]); part(g, 'torus', o.color2 || '#ff8fb8', [1.02, 1.02, 0.9], [0, 0.26, 0], [Math.PI / 2, 0, 0]); }
  else part(g, 'sphere', o.color, [1, 1, 1], [0, 0.5, 0]);
  return finalize(g);
}

function snail() {
  const g = new THREE.Group();
  part(g, 'sphere', '#c9b38a', [1.6, 0.35, 0.5], [0, 0.17, 0]);
  part(g, 'sphere', '#9a5a2a', [1, 1, 0.7], [-0.15, 0.75, 0]);
  part(g, 'torus', '#6e3b17', [0.6, 0.6, 1.8], [-0.15, 0.75, 0]);
  for (const s of [-1, 1]) { part(g, 'cyl', '#c9b38a', [0.06, 0.5, 0.06], [0.75, 0.5, s * 0.1], [0, 0, -0.4]); part(g, 'sphere', '#222', [0.1, 0.1, 0.1], [0.85, 0.74, s * 0.1]); }
  return finalize(g);
}

function plant(o) {
  const g = new THREE.Group();
  if (o.kind === 'flower') {
    part(g, 'cyl', '#3d7a2a', [0.08, 1.6, 0.08], [0, 0.8, 0]);
    part(g, 'sphere', '#4a8f35', [0.5, 0.06, 0.2], [0.2, 0.7, 0], [0, 0, 0.5]);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; part(g, 'sphere', o.color, [0.42, 0.16, 0.22], [Math.cos(a) * 0.25, 1.65 + Math.sin(a) * 0.25, 0.05], [0, 0, a]); }
    part(g, 'sphere', '#f2c94c', [0.3, 0.3, 0.2], [0, 1.65, 0.1]);
  } else if (o.kind === 'tree') {
    part(g, 'cyl', '#6b4a2b', [0.35, 2.2, 0.35], [0, 1.1, 0]);
    for (let i = 0; i < 4; i++) part(g, 'ico', o.color || '#3f7f32', [1.6 - i * 0.2, 1.3, 1.4], [rand(-0.4, 0.4), 2.4 + i * 0.5, rand(-0.3, 0.3)], [rand(0, 3), rand(0, 3), 0]);
  } else if (o.kind === 'pine') {
    part(g, 'cyl', '#5a3d22', [0.3, 1, 0.3], [0, 0.5, 0]);
    for (let i = 0; i < 3; i++) part(g, 'cone', o.color || '#2f5f2a', [1.8 - i * 0.45, 1.3, 1.8 - i * 0.45], [0, 1.4 + i * 0.75, 0]);
  } else if (o.kind === 'grass') {
    for (let i = 0; i < 5; i++) part(g, 'cone', o.color || '#4f8a2e', [0.12, rand(1.5, 3), 0.05], [rand(-0.4, 0.4), 0.8, rand(-0.2, 0.2)], [0, 0, rand(-0.25, 0.25)]);
  } else if (o.kind === 'bush') {
    for (let i = 0; i < 5; i++) part(g, 'ico', o.color || '#3c7a30', [rand(0.7, 1.1), rand(0.6, 0.9), 0.8], [rand(-0.6, 0.6), rand(0.3, 0.6), rand(-0.3, 0.3)]);
  } else if (o.kind === 'cactus') {
    part(g, 'cyl', '#5d8a3a', [0.4, 2, 0.4], [0, 1, 0]); part(g, 'cyl', '#5d8a3a', [0.25, 0.8, 0.25], [0.4, 1.1, 0], [0, 0, 0.9]);
  }
  return finalize(g);
}

// four-legged animals (mouse, squirrel, cat, dog, raccoon)
function animal(o) {
  const g = new THREE.Group(), legs = [];
  const c = o.color, c2 = o.color2 || c;
  part(g, 'sphere', c, [1.4, 0.7, 0.7], [0, 0.85, 0]);
  part(g, 'sphere', c2, [0.9, 0.4, 0.55], [0, 0.65, 0]);
  const head = new THREE.Group(); head.position.set(0.85, 1.15, 0); g.add(head);
  part(head, 'sphere', c, [0.6, 0.55, 0.55], [0, 0, 0]);
  part(head, 'sphere', c2, [0.4 * (o.snout || 1), 0.28, 0.32], [0.3, -0.08, 0]);
  part(head, 'sphere', '#1a1a1a', [0.1, 0.08, 0.1], [0.3 + 0.2 * (o.snout || 1), -0.02, 0]);
  for (const s of [-1, 1]) {
    part(head, 'sphere', '#111', [0.1, 0.12, 0.1], [0.2, 0.1, s * 0.18]);
    if (o.ears === 'round') part(head, 'sphere', c, [0.32, 0.32, 0.08], [-0.05, 0.3, s * 0.2]);
    else if (o.ears === 'flop') part(head, 'sphere', c2, [0.18, 0.4, 0.1], [-0.12, 0.05, s * 0.3], [0.3 * s, 0, 0]);
    else part(head, 'cone', c, [0.18, 0.3, 0.1], [-0.05, 0.32, s * 0.17]);
  }
  for (const [x, s] of [[0.45, -1], [0.45, 1], [-0.45, -1], [-0.45, 1]]) {
    const p = new THREE.Group(); p.position.set(x, 0.75, s * 0.22); g.add(p);
    part(p, 'leg', c, [0.2, 0.75, 0.2]); legs.push(p);
  }
  if (o.tail === 'bushy') part(g, 'sphere', c2, [0.5, 1.1, 0.4], [-0.85, 1.35, 0], [0, 0, 0.5]);
  else if (o.tail === 'ringed') { for (let i = 0; i < 4; i++) part(g, 'sphere', i % 2 ? '#2a2a2a' : c, [0.3, 0.3, 0.3], [-0.8 - i * 0.2, 0.95 + i * 0.1, 0]); }
  else part(g, 'cyl', c, [0.08, o.tailLen || 0.8, 0.08], [-0.9, 1.0, 0], [0, 0, o.tail === 'up' ? 0.5 : 1.1]);
  if (o.mask) part(head, 'box', '#2a2a2a', [0.3, 0.12, 0.6], [0.15, 0.08, 0]);
  if (o.collar) part(g, 'torus', o.collar, [0.55, 0.55, 0.8], [0.6, 1.0, 0], [0, Math.PI / 2, 0.6]);
  finalize(g);
  g.userData.anim = (t, moving) => {
    const a = moving ? 0.6 : 0.02;
    legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 12 + (i === 0 || i === 3 ? 0 : Math.PI)) * a; });
    head.rotation.z = Math.sin(t * 3) * 0.05;
  };
  return g;
}

function frog(o) {
  const g = new THREE.Group();
  const c = o.color || '#5b9a3a';
  part(g, 'sphere', c, [1.3, 0.75, 1], [0, 0.45, 0], [0, 0, 0.25]);
  part(g, 'sphere', '#d9e8a8', [1, 0.4, 0.8], [0.1, 0.3, 0]);
  const jaw = part(g, 'sphere', c, [0.7, 0.25, 0.8], [0.45, 0.45, 0]);
  for (const s of [-1, 1]) {
    part(g, 'sphere', c, [0.35, 0.35, 0.35], [0.35, 0.95, s * 0.28]);
    part(g, 'sphere', '#f2d43b', [0.24, 0.24, 0.2], [0.45, 1.0, s * 0.33]);
    part(g, 'sphere', '#111', [0.12, 0.14, 0.1], [0.53, 1.0, s * 0.37]);
    part(g, 'sphere', c, [0.9, 0.3, 0.3], [-0.45, 0.2, s * 0.5]);
    part(g, 'sphere', c, [0.3, 0.6, 0.2], [0.4, 0.2, s * 0.45]);
  }
  if (o.warts) for (let i = 0; i < 9; i++) part(g, 'sphere', o.warts, [0.12, 0.08, 0.12], [rand(-0.5, 0.4), 0.82, rand(-0.4, 0.4)]);
  finalize(g);
  g.userData.anim = (t) => { jaw.position.y = 0.45 + Math.sin(t * 4) * 0.02; };
  return g;
}

function bird(o) {
  const g = new THREE.Group(), wings = [];
  const c = o.color;
  part(g, 'sphere', c, [1.2, 0.65, 0.6], [0, 0.6, 0]);
  part(g, 'sphere', o.color2 || c, [0.5, 0.5, 0.5], [0.6, 0.85, 0]);
  part(g, 'cone', o.beak || '#e0a92b', [0.14, 0.4, 0.14], [0.95, 0.82, 0], [0, 0, -Math.PI / 2]);
  for (const s of [-1, 1]) {
    part(g, 'sphere', '#111', [0.1, 0.1, 0.1], [0.75, 0.95, s * 0.2]);
    const w = new THREE.Group(); w.position.set(0.1, 0.8, s * 0.25); g.add(w);
    part(w, 'sphere', o.wingColor || c, [0.8, 0.1, 1.1], [0, 0, s * 0.5]);
    w.userData.side = s; wings.push(w);
    part(g, 'cyl', '#d08c2a', [0.05, 0.4, 0.05], [0, 0.15, s * 0.12]);
  }
  part(g, 'box', o.wingColor || c, [0.6, 0.06, 0.4], [-0.75, 0.62, 0], [0, 0, 0.2]);
  finalize(g);
  g.userData.anim = (t) => { for (const w of wings) w.rotation.x = w.userData.side * Math.sin(t * 14) * 0.7; };
  return g;
}

function person(o) {
  const g = new THREE.Group();
  const skin = o.skin || '#e0b18a';
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0, 0.95, s * 0.12); g.add(p);
    part(p, 'leg', o.pants || '#2b3f6b', [0.17, 0.95, 0.17]); legs.push(p);
    part(p, 'box', '#222', [0.28, 0.1, 0.18], [0.06, -0.95, 0]);
  }
  part(g, 'box', o.shirt || '#c0392b', [0.32, 0.65, 0.42], [0, 1.28, 0]);
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0, 1.55, s * 0.27); g.add(p);
    part(p, 'leg', o.shirt || '#c0392b', [0.12, 0.6, 0.12]); arms.push(p);
  }
  part(g, 'sphere', skin, [0.32, 0.36, 0.32], [0.02, 1.8, 0]);
  part(g, 'sphere', '#111', [0.05, 0.05, 0.05], [0.17, 1.84, 0.07]);
  part(g, 'sphere', '#111', [0.05, 0.05, 0.05], [0.17, 1.84, -0.07]);
  if (o.hat === 'helmet') part(g, 'sphere', o.hatColor || '#4b5320', [0.38, 0.22, 0.38], [0, 1.95, 0]);
  else if (o.hat === 'cap') { part(g, 'sphere', o.hatColor || '#1e3a8a', [0.34, 0.16, 0.34], [0, 1.95, 0]); part(g, 'box', o.hatColor || '#1e3a8a', [0.2, 0.03, 0.2], [0.18, 1.92, 0]); }
  else part(g, 'sphere', o.hair || '#4a2f1b', [0.34, 0.18, 0.34], [-0.02, 1.95, 0]);
  if (o.gun) part(g, 'box', '#222', [0.5, 0.08, 0.08], [0.3, 1.35, 0.15]);
  if (o.tank) { part(g, 'cyl', '#d4d4d4', [0.22, 0.6, 0.22], [-0.25, 1.3, 0]); part(g, 'cyl', '#555', [0.05, 0.7, 0.05], [0.35, 1.25, 0.2], [0, 0, 1.3]); }
  if (o.mask) part(g, 'box', '#333', [0.1, 0.18, 0.25], [0.18, 1.74, 0]);
  finalize(g);
  g.userData.anim = (t, moving) => {
    const a = moving ? 0.7 : 0.03;
    legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 11 + i * Math.PI) * a; });
    arms.forEach((l, i) => { l.rotation.z = o.gun ? -1.2 : Math.sin(t * 11 + i * Math.PI + Math.PI) * a * (o.panic ? 2 : 1) + (o.panic ? Math.PI : 0); });
  };
  return g;
}

function wheel(g, x, z, r, w) { return part(g, 'cyl', '#1c1c1c', [r * 2, w, r * 2], [x, r, z], [Math.PI / 2, 0, 0]); }

function vehicle(o) {
  const g = new THREE.Group(), wheels = [];
  const c = o.color || '#c0392b';
  let turret = null;
  const k = o.kind;
  if (k === 'car' || k === 'police' || k === 'van' || k === 'taxi') {
    const L = k === 'van' ? 2.4 : 2.2, H = k === 'van' ? 0.95 : 0.5;
    part(g, 'box', c, [L, 0.5, 1], [0, 0.55, 0]);
    part(g, 'box', k === 'van' ? c : '#9fc9e8', [L * (k === 'van' ? 0.95 : 0.55), H, 0.92], [k === 'van' ? -0.05 : -0.1, 0.8 + H / 2, 0]);
    if (k !== 'van') part(g, 'box', c, [L * 0.5, 0.06, 0.94], [-0.1, 1.06, 0]);
    else part(g, 'box', '#9fc9e8', [0.3, 0.4, 0.94], [L * 0.43, 1.3, 0]);
    if (k === 'police') { part(g, 'box', '#ffffff', [L * 0.6, 0.25, 1.01], [0, 0.6, 0]); part(g, 'box', '#e53935', [0.15, 0.12, 0.3], [-0.1, 1.15, -0.18], null, { emissive: '#e53935' }); part(g, 'box', '#1e88e5', [0.15, 0.12, 0.3], [-0.1, 1.15, 0.18], null, { emissive: '#1e88e5' }); }
    if (k === 'taxi') part(g, 'box', '#222', [0.3, 0.15, 0.2], [-0.1, 1.15, 0]);
    if (k === 'van') { part(g, 'box', '#ffffff', [1.6, 0.35, 1.01], [-0.3, 1.2, 0]); part(g, 'cone', '#3a3a3a', [0.4, 0.5, 0.4], [-0.3, 1.2, 0.51], [Math.PI / 2, 0, 0]); }
    part(g, 'box', '#ffe9a8', [0.05, 0.12, 0.25], [L / 2, 0.6, 0.3], null, { emissive: '#ffe9a8' });
    for (const x of [-L * 0.32, L * 0.32]) for (const z of [-0.5, 0.5]) wheels.push(wheel(g, x, z, 0.28, 0.2));
  } else if (k === 'bus') {
    part(g, 'box', c, [4, 1.5, 1.1], [0, 1.05, 0]);
    part(g, 'box', '#9fc9e8', [3.7, 0.45, 1.12], [0, 1.35, 0]);
    for (const x of [-1.4, 1.3]) for (const z of [-0.55, 0.55]) wheels.push(wheel(g, x, z, 0.32, 0.2));
  } else if (k === 'jeep') {
    part(g, 'box', c, [1.8, 0.55, 1], [0, 0.6, 0]);
    part(g, 'box', '#3a3a2a', [0.05, 0.4, 0.9], [0.3, 1.05, 0]);
    part(g, 'cyl', '#222', [0.06, 0.6, 0.06], [-0.4, 1.15, 0]); part(g, 'box', '#222', [0.7, 0.08, 0.08], [-0.15, 1.45, 0]);
    for (const x of [-0.6, 0.6]) for (const z of [-0.5, 0.5]) wheels.push(wheel(g, x, z, 0.3, 0.22));
  } else if (k === 'tank' || k === 'mammoth' || k === 'rocket') {
    const big = k === 'mammoth' ? 1.4 : 1;
    part(g, 'box', '#2b2b22', [2.6 * big, 0.55, 1.3 * big], [0, 0.3, 0]);
    for (let i = 0; i < 6; i++) for (const z of [-0.62 * big, 0.62 * big]) wheels.push(wheel(g, -1.05 * big + i * 0.42 * big, z, 0.22, 0.18));
    part(g, 'box', c, [2.4 * big, 0.45, 1.25 * big], [0, 0.75, 0]);
    turret = new THREE.Group(); turret.position.set(-0.1, 1.1, 0); g.add(turret);
    if (k === 'rocket') {
      part(turret, 'box', c, [1.2, 0.6, 1], [0, 0.1, 0], [0, 0, 0.5]);
      for (let i = 0; i < 6; i++) part(turret, 'cyl', '#ddd', [0.18, 1.2, 0.18], [0, 0.2 + (i % 3) * 0.2, -0.25 + (i >> 1) * 0.0 + (i < 3 ? -0.15 : 0.15)], [0, 0, -1.07]);
    } else {
      part(turret, 'sphere', c, [1.3 * big, 0.6, 1.0 * big], [0, 0.15, 0]);
      const barrel = part(turret, 'cyl', '#2f3324', [0.14 * big, 1.8 * big, 0.14 * big], [1.2 * big, 0.2, 0], [0, 0, -Math.PI / 2]);
      if (k === 'mammoth') { part(turret, 'cyl', '#2f3324', [0.14 * big, 1.8 * big, 0.14 * big], [1.2 * big, 0.2, 0.3], [0, 0, -Math.PI / 2]); part(turret, 'box', '#333', [0.4, 0.5, 0.8], [-0.5, 0.6, 0]); }
      void barrel;
    }
  }
  finalize(g);
  g.userData.turret = turret;
  g.userData.anim = (t, moving) => { if (moving) for (const w of wheels) w.rotation.y = t * 8; };
  return g;
}

function aircraft(o) {
  const g = new THREE.Group(), rotors = [];
  const c = o.color || '#5a6470';
  if (o.kind === 'heli' || o.kind === 'gunship') {
    const big = o.kind === 'gunship' ? 1.3 : 1;
    part(g, 'sphere', c, [1.6 * big, 0.8 * big, 0.8 * big], [0, 0.8, 0]);
    part(g, 'sphere', '#9fc9e8', [0.6, 0.45, 0.7 * big], [0.55 * big, 0.9, 0]);
    part(g, 'cyl', c, [0.15, 1.6, 0.15], [-1.3 * big, 0.95, 0], [0, 0, Math.PI / 2]);
    part(g, 'box', c, [0.3, 0.5, 0.06], [-2.05 * big, 1.1, 0]);
    const r = new THREE.Group(); r.position.set(0, 1.3 * big, 0); g.add(r);
    part(r, 'box', '#222', [3.6 * big, 0.04, 0.18], [0, 0, 0]); part(r, 'box', '#222', [0.18, 0.04, 3.6 * big], [0, 0, 0]);
    rotors.push(r);
    part(g, 'box', '#333', [1.2, 0.05, 0.1], [0, 0.35, 0.3]); part(g, 'box', '#333', [1.2, 0.05, 0.1], [0, 0.35, -0.3]);
    if (o.kind === 'gunship') for (const s of [-1, 1]) { part(g, 'box', '#3a3f45', [0.5, 0.08, 0.9], [0, 0.7, s * 0.7]); part(g, 'cyl', '#ddd', [0.15, 0.7, 0.15], [0.1, 0.6, s * 1.05], [0, 0, Math.PI / 2]); }
  } else { // jet / bomber
    const L = o.kind === 'bomber' ? 3 : 2.4;
    part(g, 'cyl', c, [0.4, L, 0.4], [0, 0.5, 0], [0, 0, Math.PI / 2]);
    part(g, 'cone', c, [0.4, 0.6, 0.4], [L / 2 + 0.3, 0.5, 0], [0, 0, -Math.PI / 2]);
    part(g, 'box', c, [0.9, 0.06, o.kind === 'bomber' ? 3.6 : 2.2], [-0.1, 0.45, 0]);
    part(g, 'box', c, [0.5, 0.6, 0.06], [-L / 2 + 0.1, 0.85, 0], [0, 0, -0.3]);
    part(g, 'sphere', '#9fc9e8', [0.5, 0.25, 0.25], [L * 0.3, 0.7, 0]);
    part(g, 'sphere', glowMat('#ff9a3c'), [0.25, 0.25, 0.25], [-L / 2 - 0.05, 0.5, 0]);
  }
  finalize(g);
  g.userData.anim = (t) => { for (const r of rotors) r.rotation.y = t * 25; };
  return g;
}

// window texture for buildings, cached by style
const texCache = new Map();
export function windowTex(cols, rows, lit, wall) {
  const key = cols + 'x' + rows + lit + wall;
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas'); cv.width = cols * 16; cv.height = rows * 16;
  const x = cv.getContext('2d');
  x.fillStyle = wall; x.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    x.fillStyle = Math.random() < 0.3 ? lit : '#1d2a38';
    x.fillRect(i * 16 + 3, j * 16 + 3, 10, 10);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  texCache.set(key, t);
  return t;
}

function building(o) {
  const g = new THREE.Group();
  const w = o.w || 1, h = o.h || 2, d = o.d || 0.8, c = o.color || '#8a8f99';
  if (o.kind === 'house') {
    part(g, 'box', c, [w, h * 0.6, d], [0, h * 0.3, 0]);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.75, 1, 4, 1), mat(o.roof || '#7a2e2a'));
    roof.scale.set(w * 0.95, h * 0.45, d * 1.3); roof.position.set(0, h * 0.6 + h * 0.22, 0); roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    part(g, 'box', '#5a3b22', [w * 0.18, h * 0.3, 0.02], [0, h * 0.15, d / 2]);
    for (const s of [-1, 1]) part(g, 'box', '#9fc9e8', [w * 0.18, h * 0.16, 0.02], [s * w * 0.3, h * 0.38, d / 2], null, { emissive: '#3a5a7a', ei: 0.3 });
  } else if (o.kind === 'bunker') {
    part(g, 'sphere', c, [w, h * 1.6, d], [0, 0, 0]);
    part(g, 'box', '#111', [w * 0.4, h * 0.12, 0.05], [0, h * 0.45, d * 0.45]);
  } else if (o.kind === 'radar') {
    part(g, 'box', '#5a5f4a', [w * 0.6, h * 0.25, d], [0, h * 0.125, 0]);
    part(g, 'cyl', '#777', [0.15, h * 0.5, 0.15], [0, h * 0.5, 0]);
    const dish = new THREE.Group(); dish.position.set(0, h * 0.78, 0); g.add(dish);
    part(dish, 'sphere', '#cfd4d8', [w * 0.9, w * 0.9, 0.18], [0, 0, 0], [0, 0, 0]);
    g.userData.spin = dish;
  } else if (o.kind === 'silo') {
    part(g, 'cyl', '#9ea39a', [w, h * 0.85, w], [0, h * 0.425, 0]);
    part(g, 'cone', '#d9534f', [w * 0.6, h * 0.25, w * 0.6], [0, h * 0.95, 0]);
    part(g, 'box', '#222', [w * 0.2, h * 0.3, 0.02], [0, h * 0.3, w * 0.51]);
  } else if (o.kind === 'core') { // planetary defense core
    part(g, 'cyl', '#3a3f4a', [w, h * 0.3, w], [0, h * 0.15, 0]);
    part(g, 'cyl', '#555c6a', [w * 0.6, h * 0.5, w * 0.6], [0, h * 0.55, 0]);
    const orb = part(g, 'sphere', glowMat('#ff3b3b'), [w * 0.5, w * 0.5, w * 0.5], [0, h * 0.85, 0]);
    part(g, 'cyl', '#2a2e36', [w * 0.12, h * 0.6, w * 0.12], [w * 0.25, h * 1.05, 0], [0, 0, -0.9]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(g, 'box', '#2a2e36', [w * 0.1, h * 0.35, w * 0.1], [Math.cos(a) * w * 0.45, h * 0.45, Math.sin(a) * w * 0.45]); }
    g.userData.orb = orb;
  } else if (o.kind === 'tower') { // tall tapered skyscraper with spire
    const tex = windowTex(5, Math.round(h / w * 5), o.lit || '#ffe08a', c);
    part(g, 'box', mat('#ffffff', { map: tex }), [w, h * 0.7, d], [0, h * 0.35, 0]);
    part(g, 'box', mat('#ffffff', { map: tex }), [w * 0.7, h * 0.22, d * 0.7], [0, h * 0.81, 0]);
    part(g, 'cyl', '#c9ced3', [0.05, h * 0.12, 0.05], [0, h * 0.98, 0]);
  } else { // generic office block
    const tex = windowTex(Math.max(2, Math.round(w * 3)), Math.max(2, Math.round(h * 3)), o.lit || '#ffe08a', c);
    part(g, 'box', mat('#ffffff', { map: tex }), [w, h, d], [0, h / 2, 0]);
    part(g, 'box', '#555', [w * 1.04, 0.06, d * 1.04], [0, h, 0]);
    if (o.antenna) part(g, 'cyl', '#999', [0.04, h * 0.2, 0.04], [w * 0.2, h * 1.1, 0]);
  }
  finalize(g, { by: o.by || 'h' });
  if (g.userData.spin) g.userData.anim = (t) => { g.userData.spin.rotation.y = t * 1.5; };
  return g;
}

function prop(o) {
  const g = new THREE.Group();
  switch (o.kind) {
    case 'mailbox': part(g, 'cyl', '#555', [0.1, 1, 0.1], [0, 0.5, 0]); part(g, 'box', '#2a5db0', [0.6, 0.35, 0.3], [0, 1.15, 0]); part(g, 'box', '#e53935', [0.04, 0.2, 0.05], [0.1, 1.4, 0.16]); break;
    case 'trashcan': part(g, 'cyl', '#7d8a8f', [0.7, 1, 0.7], [0, 0.5, 0]); part(g, 'cyl', '#6a767a', [0.78, 0.1, 0.78], [0, 1.03, 0]); break;
    case 'hydrant': part(g, 'cyl', '#d32f2f', [0.35, 0.8, 0.35], [0, 0.4, 0]); part(g, 'sphere', '#d32f2f', [0.36, 0.3, 0.36], [0, 0.82, 0]); part(g, 'cyl', '#d32f2f', [0.15, 0.6, 0.15], [0, 0.5, 0], [Math.PI / 2, 0, 0]); break;
    case 'gnome': part(g, 'cone', '#c62828', [0.45, 0.7, 0.45], [0, 1.25, 0]); part(g, 'sphere', '#f1c27d', [0.3, 0.3, 0.3], [0, 0.9, 0]); part(g, 'cone', '#eeeeee', [0.3, 0.45, 0.2], [0.05, 0.62, 0], [0, 0, Math.PI]); part(g, 'cyl', '#1e5aa8', [0.45, 0.6, 0.4], [0, 0.35, 0]); break;
    case 'basket': part(g, 'box', '#b07a3a', [1.2, 0.7, 0.8], [0, 0.35, 0]); part(g, 'torus', '#8a5a2a', [0.8, 0.8, 0.8], [0, 0.7, 0]); part(g, 'box', '#e53935', [1.22, 0.1, 0.82], [0, 0.6, 0]); break;
    case 'cooler': part(g, 'box', '#1e88e5', [1.3, 0.8, 0.8], [0, 0.4, 0]); part(g, 'box', '#ffffff', [1.32, 0.18, 0.82], [0, 0.85, 0]); break;
    case 'bench': part(g, 'box', '#8a5a2a', [2, 0.1, 0.6], [0, 0.5, 0]); part(g, 'box', '#8a5a2a', [2, 0.4, 0.08], [0, 0.85, -0.28]); for (const x of [-0.85, 0.85]) part(g, 'box', '#333', [0.08, 0.5, 0.6], [x, 0.25, 0]); break;
    case 'lamp': part(g, 'cyl', '#444', [0.08, 3, 0.08], [0, 1.5, 0]); part(g, 'sphere', glowMat('#ffe9a8'), [0.3, 0.2, 0.3], [0.15, 3, 0]); break;
    case 'fence': for (let i = 0; i < 5; i++) part(g, 'box', '#efe6d2', [0.15, 1, 0.08], [i * 0.4 - 0.8, 0.5, 0]); part(g, 'box', '#efe6d2', [2, 0.1, 0.06], [0, 0.7, 0]); break;
    case 'hose': part(g, 'torus', '#2e7d32', [1, 1, 1.5], [0, 0.15, 0], [Math.PI / 2, 0, 0]); part(g, 'torus', '#2e7d32', [0.8, 0.8, 1.5], [0, 0.3, 0], [Math.PI / 2, 0, 0]); break;
    case 'barricade': part(g, 'box', '#c9b23a', [1.6, 0.3, 0.2], [0, 0.8, 0]); part(g, 'box', '#222', [1.6, 0.1, 0.21], [0, 0.8, 0]); for (const x of [-0.6, 0.6]) part(g, 'box', '#666', [0.1, 0.9, 0.5], [x, 0.45, 0]); break;
    case 'sandbags': for (let i = 0; i < 7; i++) part(g, 'sphere', '#b8a27a', [0.7, 0.35, 0.5], [(i % 4) * 0.6 - 0.9 + (i > 3 ? 0.3 : 0), i > 3 ? 0.5 : 0.17, 0]); break;
    case 'helix': { // DNA pickup
      for (let i = 0; i < 10; i++) { const a = i * 0.7; part(g, 'sphere', glowMat('#ffd54f'), [0.14, 0.14, 0.14], [Math.cos(a) * 0.25, i * 0.1, Math.sin(a) * 0.25]); part(g, 'sphere', glowMat('#4fc3f7'), [0.14, 0.14, 0.14], [-Math.cos(a) * 0.25, i * 0.1, -Math.sin(a) * 0.25]); }
      break;
    }
    case 'heart': part(g, 'sphere', glowMat('#ff5a7a'), [0.6, 0.6, 0.4], [-0.18, 0.6, 0]); part(g, 'sphere', glowMat('#ff5a7a'), [0.6, 0.6, 0.4], [0.18, 0.6, 0]); part(g, 'cone', glowMat('#ff5a7a'), [0.75, 0.6, 0.4], [0, 0.25, 0], [0, 0, Math.PI]); break;
    default: part(g, 'box', '#888', [1, 1, 1], [0, 0.5, 0]);
  }
  finalize(g);
  if (o.kind === 'helix' || o.kind === 'heart') g.userData.anim = (t) => { g.userData.inner.rotation.y = t * 2; };
  return g;
}

// bipedal war machine (mech trooper and the Titan boss)
function mech(o) {
  const g = new THREE.Group(), legs = [];
  const c = o.color || '#6d7a86', c2 = o.color2 || '#3c444c';
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0, 2, s * 0.45); g.add(p);
    part(p, 'leg', c2, [0.45, 1.1, 0.45]); part(p, 'box', c, [0.5, 0.9, 0.5], [0.1, -1.5, 0]); part(p, 'box', c2, [0.9, 0.2, 0.6], [0.15, -1.95, 0]);
    legs.push(p);
  }
  part(g, 'box', c, [1.6, 1.3, 1.3], [0, 2.7, 0]);
  part(g, 'box', c2, [0.7, 0.5, 0.7], [0.3, 3.55, 0]);
  part(g, 'box', glowMat(o.eye || '#ff3b3b'), [0.1, 0.15, 0.5], [0.66, 3.6, 0]);
  for (const s of [-1, 1]) {
    part(g, 'box', c2, [0.5, 0.5, 0.5], [0, 3.1, s * 0.95]);
    part(g, 'cyl', c2, [0.25, 1.3, 0.25], [0.6, 2.7, s * 1.0], [0, 0, -Math.PI / 2]);
    if (o.missiles) part(g, 'box', '#2a2e36', [0.8, 0.6, 0.5], [-0.5, 3.6, s * 0.6]);
  }
  finalize(g);
  g.userData.anim = (t, moving) => { const a = moving ? 0.45 : 0.02; legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 5 + i * Math.PI) * a; }); };
  return g;
}

function worm(o) {
  const g = new THREE.Group(), segs = [];
  const n = o.n || 9;
  for (let i = 0; i < n; i++) segs.push(part(g, 'sphere', i === n - 3 ? (o.band || o.color) : o.color, [0.42, 0.36, 0.36], [i * 0.3, 0.18, 0]));
  if (o.eyes) eyes(g, (n - 1) * 0.3 + 0.12, 0.28, 0.1, 0.08);
  finalize(g);
  g.userData.anim = (t, moving) => { segs.forEach((s, i) => { s.position.y = 0.18 + Math.max(0, Math.sin(t * (moving ? 9 : 2) - i * 0.8)) * 0.12; }); };
  return g;
}

export const BUILDERS = { bug, blob, snail, plant, animal, frog, bird, person, vehicle, aircraft, building, prop, mech, worm };

export function build(key, opts = {}) {
  const fn = BUILDERS[key];
  if (!fn) { console.warn('no model builder', key); return blob({ color: '#f0f' }); }
  return fn(opts);
}
