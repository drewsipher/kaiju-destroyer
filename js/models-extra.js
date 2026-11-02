// models-extra.js — models for the pond, farm and harbor levels. Each builder registers itself
// into BUILDERS from models.js, so entities and scenery can use it by name like any other model.
import * as THREE from 'three';
import { BUILDERS, part, mat, glowMat, leg, walkAnim, finalize, eyes, windowTex } from './models.js';
import { rand, TAU } from './util.js';

// ---------- pond life ----------
function tadpole(o) {
  const g = new THREE.Group();
  const c = o.color || '#2e2a24';
  part(g, 'sphere', c, [0.7, 0.5, 0.55], [0.35, 0.25, 0]);
  const tail = new THREE.Group(); tail.position.set(0, 0.25, 0); g.add(tail);
  part(tail, 'sphere', mat(c, { opacity: 0.8 }), [1.1, 0.3, 0.06], [-0.5, 0, 0]);
  eyes(g, 0.55, 0.36, 0.15, 0.08);
  finalize(g);
  g.userData.anim = (t, moving) => { tail.rotation.y = Math.sin(t * (moving ? 18 : 5)) * 0.5; };
  return g;
}

function newt(o) {
  const g = new THREE.Group(), legs = [];
  const c = o.color || '#c8641e', belly = o.belly || '#f2a83a';
  part(g, 'sphere', c, [1.4, 0.32, 0.4], [0, 0.3, 0]);
  part(g, 'sphere', belly, [1.2, 0.18, 0.34], [0, 0.22, 0]);
  part(g, 'sphere', c, [0.45, 0.28, 0.36], [0.8, 0.35, 0]);
  const tail = new THREE.Group(); tail.position.set(-0.65, 0.3, 0); g.add(tail);
  part(tail, 'cone', c, [0.28, 1.4, 0.18], [-0.65, 0, 0], [0, 0, Math.PI / 2]);
  eyes(g, 0.95, 0.45, 0.13, 0.08, '#111', o.glowEyes);
  if (o.spots) for (let i = 0; i < 7; i++) part(g, 'sphere', o.spots, [0.1, 0.05, 0.1], [rand(-0.5, 0.6), 0.45, rand(-0.12, 0.12)]);
  for (const [x, s] of [[0.45, -1], [0.45, 1], [-0.4, -1], [-0.4, 1]]) legs.push(leg(g, x, 0.28, s * 0.15, 0.35, 0.08, c, s, 0.9));
  finalize(g);
  const walk = walkAnim(legs, 14, 0.6);
  g.userData.anim = (t, moving) => { walk(t, moving); tail.rotation.y = Math.sin(t * (moving ? 10 : 2)) * 0.3; };
  return g;
}

// giant water bug: flat oval body and huge grabbing forelegs
function waterbug(o) {
  const g = new THREE.Group(), legs = [], arms = [];
  const c = o.color || '#5a4630', d = o.dark || '#3a2c1c';
  part(g, 'sphere', c, [2.2, 0.45, 1.1], [0, 0.45, 0]);
  for (let i = 0; i < 4; i++) part(g, 'box', d, [0.08, 0.05, 0.9], [-0.6 + i * 0.35, 0.66, 0]);
  part(g, 'sphere', d, [0.6, 0.35, 0.6], [1.05, 0.5, 0]);
  eyes(g, 1.25, 0.62, 0.2, 0.11, '#111', o.glowEyes);
  part(g, 'cone', d, [0.08, 0.4, 0.08], [1.45, 0.42, 0], [0, 0, -Math.PI / 2 - 0.4]);
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(0.95, 0.5, s * 0.35); g.add(arm);
    part(arm, 'box', d, [0.8, 0.16, 0.16], [0.4, 0.05, 0], [0, 0, 0.5]);
    const fore = new THREE.Group(); fore.position.set(0.72, 0.4, 0); arm.add(fore);
    part(fore, 'box', c, [0.7, 0.14, 0.14], [0.3, -0.15, 0], [0, 0, -0.9]);
    part(fore, 'cone', '#e8e2d0', [0.08, 0.3, 0.08], [0.55, -0.45, 0], [0, 0, Math.PI * 0.8]);
    arms.push(arm);
    for (const x of [0.1, -0.5]) legs.push(leg(g, x, 0.45, s * 0.5, 0.75, 0.07, d, s, 0.9));
  }
  finalize(g);
  const walk = walkAnim(legs, 10, 0.4);
  g.userData.grab = 0;
  g.userData.anim = (t, moving) => {
    walk(t, moving);
    const k = g.userData.grab;
    arms.forEach((a) => { a.rotation.z = k > 0 ? -0.6 + Math.sin(k * Math.PI) * 1.3 : Math.sin(t * 2) * 0.1; });
  };
  return g;
}

// ---------- farm ----------
function farm(o) {
  const g = new THREE.Group();
  let spin = null;
  switch (o.kind) {
    case 'hay': part(g, 'cyl', '#d9b44a', [1, 1.3, 1], [0, 0.5, 0], [Math.PI / 2, 0, 0]); for (const z of [-0.4, 0.4]) part(g, 'torus', '#b8902a', [1.02, 1.02, 0.4], [0, 0.5, z]); break;
    case 'pumpkin': for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(g, 'sphere', '#e8801e', [0.55, 0.8, 0.55], [Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.22]); } part(g, 'cyl', '#4a6a1e', [0.08, 0.25, 0.08], [0, 0.85, 0]); break;
    case 'corn':
      part(g, 'cyl', '#7aa83a', [0.08, 2, 0.08], [0, 1, 0]);
      for (let i = 0; i < 4; i++) part(g, 'sphere', '#6a9a2e', [0.9, 0.06, 0.18], [0.3 * (i % 2 ? 1 : -1), 0.6 + i * 0.35, 0], [0, 0, (i % 2 ? -0.5 : 0.5)]);
      part(g, 'sphere', '#f2d14a', [0.18, 0.45, 0.18], [0.1, 1.3, 0.05], [0, 0, -0.3]);
      break;
    case 'scarecrow':
      part(g, 'cyl', '#7a5a3a', [0.08, 2, 0.08], [0, 1, 0]); part(g, 'cyl', '#7a5a3a', [0.07, 1.4, 0.07], [0, 1.45, 0], [0, 0, Math.PI / 2]);
      part(g, 'box', '#4a6ab0', [0.45, 0.6, 0.3], [0, 1.25, 0]); part(g, 'sphere', '#e8d8a8', [0.36, 0.38, 0.36], [0, 1.78, 0]);
      part(g, 'cyl', '#8a5a2a', [0.7, 0.05, 0.7], [0, 1.95, 0]); part(g, 'cyl', '#8a5a2a', [0.36, 0.3, 0.36], [0, 2.1, 0]);
      break;
    case 'barn': {
      part(g, 'box', '#a8322a', [2.2, 1.4, 1.5], [0, 0.7, 0]);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.75, 1, 4, 1), mat('#5a2a22')); roof.scale.set(2.4, 0.9, 2.1); roof.position.set(0, 1.85, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
      part(g, 'box', '#ffffff', [0.9, 0.9, 0.02], [0, 0.45, 0.76]); part(g, 'box', '#a8322a', [0.8, 0.8, 0.03], [0, 0.45, 0.76]);
      part(g, 'box', '#ffffff', [1.1, 0.06, 0.03], [0, 0.45, 0.77], [0, 0, 0.78]); part(g, 'box', '#ffffff', [1.1, 0.06, 0.03], [0, 0.45, 0.77], [0, 0, -0.78]);
      part(g, 'box', '#ffffff', [0.35, 0.35, 0.02], [0, 1.25, 0.76]);
      break;
    }
    case 'windmill': {
      part(g, 'cyl', '#d8d0c0', [0.35, 3, 0.35], [0, 1.5, 0]);
      for (let i = 0; i < 5; i++) part(g, 'box', '#888', [0.04, 3, 0.04], [Math.cos(i) * 0.12, 1.5, Math.sin(i) * 0.12]);
      spin = new THREE.Group(); spin.position.set(0, 3.05, 0.25); g.add(spin);
      for (let i = 0; i < 6; i++) part(spin, 'box', '#e8e2d0', [0.12, 0.8, 0.02], [0, 0.45, 0], [0, 0, i / 6 * TAU]).position.set(Math.sin(-i / 6 * TAU) * 0.45, Math.cos(i / 6 * TAU) * 0.45, 0);
      part(g, 'box', '#c9302c', [0.6, 0.3, 0.04], [-0.4, 3.05, -0.05]);
      break;
    }
    case 'grainsilo':
      part(g, 'cyl', '#b8c0c8', [1, 3, 1], [0, 1.5, 0]); part(g, 'sphere', '#9aa4ae', [1, 0.6, 1], [0, 3, 0]);
      for (let i = 0; i < 5; i++) part(g, 'torus', '#8a949e', [1.02, 1.02, 0.4], [0, 0.4 + i * 0.6, 0], [Math.PI / 2, 0, 0]);
      break;
    case 'trough': part(g, 'box', '#7a5a3a', [1.6, 0.4, 0.5], [0, 0.35, 0]); part(g, 'box', '#4a8ac0', [1.5, 0.05, 0.4], [0, 0.52, 0]); break;
  }
  finalize(g, { by: o.by });
  if (spin) g.userData.anim = (t) => { spin.rotation.z = t * 1.2; };
  return g;
}

// tractor, combine harvester and the crop-duster biplane
function machine(o) {
  const g = new THREE.Group(), wheels = [];
  let reel = null, prop = null;
  const c = o.color || '#2e8b3a';
  const wheel = (x, z, r, w) => { const m = part(g, 'cyl', '#1c1c1c', [r * 2, w, r * 2], [x, r, z], [Math.PI / 2, 0, 0]); part(g, 'cyl', '#e8c03a', [r, w * 1.05, r], [x, r, z], [Math.PI / 2, 0, 0]); wheels.push(m); };
  if (o.kind === 'tractor') {
    part(g, 'box', c, [1.3, 0.5, 0.6], [0.2, 0.75, 0]); part(g, 'box', c, [0.7, 0.7, 0.7], [-0.35, 1.0, 0]);
    part(g, 'box', '#9fc9e8', [0.6, 0.45, 0.72], [-0.35, 1.55, 0]); part(g, 'box', c, [0.75, 0.06, 0.75], [-0.35, 1.8, 0]);
    part(g, 'cyl', '#333', [0.07, 0.6, 0.07], [0.55, 1.25, 0.15]);
    for (const z of [-0.4, 0.4]) { wheel(-0.4, z, 0.55, 0.25); wheel(0.6, z, 0.3, 0.2); }
  } else if (o.kind === 'combine') {
    part(g, 'box', c, [2.4, 1.3, 1.4], [-0.3, 1.2, 0]); part(g, 'box', '#9fc9e8', [0.7, 0.6, 0.8], [0.55, 2.1, 0]); part(g, 'box', c, [0.8, 0.08, 0.9], [0.55, 2.45, 0]);
    part(g, 'cyl', '#c9b23a', [0.25, 1.6, 0.25], [-0.9, 2.3, 0.3], [0, 0, 1.0]);
    part(g, 'box', '#d8c04a', [0.5, 0.5, 2.6], [1.35, 0.55, 0]);
    reel = new THREE.Group(); reel.position.set(1.55, 0.75, 0); g.add(reel);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(reel, 'box', '#c62828', [0.06, 0.06, 2.5], [Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0]); }
    part(reel, 'cyl', '#888', [0.1, 2.5, 0.1], [0, 0, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) part(g, 'cone', '#ccc', [0.12, 0.35, 0.12], [1.65, 0.3, -1.1 + i * 0.32], [0, 0, -Math.PI / 2]);
    for (const z of [-0.6, 0.6]) { wheel(0.2, z, 0.6, 0.3); wheel(-1.2, z, 0.4, 0.25); }
  } else if (o.kind === 'biplane') {
    part(g, 'cyl', c, [0.4, 2, 0.4], [0, 0.6, 0], [0, 0, Math.PI / 2]);
    part(g, 'box', '#e8c03a', [0.6, 0.05, 2.6], [0.2, 0.9, 0]); part(g, 'box', '#e8c03a', [0.6, 0.05, 2.4], [0.2, 0.35, 0]);
    for (const z of [-1, 1]) part(g, 'cyl', '#555', [0.03, 0.55, 0.03], [0.2, 0.62, z]);
    part(g, 'box', c, [0.4, 0.4, 0.05], [-0.95, 0.85, 0]); part(g, 'box', c, [0.3, 0.05, 0.9], [-0.95, 0.62, 0]);
    prop = new THREE.Group(); prop.position.set(1.05, 0.6, 0); g.add(prop);
    part(prop, 'box', '#333', [0.04, 1, 0.08], [0, 0, 0]);
    part(g, 'box', '#d8d8d8', [0.5, 0.15, 0.3], [0.1, 0.25, 0]);
  }
  finalize(g);
  g.userData.anim = (t, moving) => {
    if (moving) for (const w of wheels) w.rotation.y = t * 6;
    if (reel) reel.rotation.z = -t * 6;
    if (prop) prop.rotation.x = t * 40;
  };
  return g;
}

// ---------- harbor ----------
// o.kind: patrol | destroyer | cargo | battleship | tug
function ship(o) {
  const g = new THREE.Group(), turrets = [];
  const c = o.color || '#6d7a86', deck = o.deck || '#8a929a';
  const L = { patrol: 2.2, tug: 1.6, destroyer: 4, cargo: 5, battleship: 6 }[o.kind] || 3;
  const W = L * 0.18;
  part(g, 'box', c, [L, 0.5, W], [0, 0.25, 0]);
  part(g, 'cone', c, [W * 1.4, L * 0.16, 0.5], [L / 2 + L * 0.07, 0.25, 0], [Math.PI / 2, 0, -Math.PI / 2]).scale.set(W * 1.4, L * 0.16, 0.5);
  part(g, 'box', '#8a2a22', [L, 0.1, W * 1.01], [0, 0.04, 0]);
  part(g, 'box', deck, [L * 0.98, 0.04, W * 0.95], [0, 0.52, 0]);
  if (o.kind === 'cargo') {
    const cols = ['#c0392b', '#2e86c1', '#f39c12', '#27ae60', '#8e44ad'];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) part(g, 'box', cols[(i + j * 3) % 5], [0.55, 0.32, W * 0.8], [-L * 0.3 + i * 0.6, 0.72 + j * 0.33, 0]);
    part(g, 'box', '#e8e8e8', [0.6, 0.9, W * 0.9], [-L * 0.42, 0.95, 0]);
  } else if (o.kind === 'tug') {
    part(g, 'box', '#e8e8e8', [0.6, 0.45, W * 0.8], [-0.1, 0.77, 0]); part(g, 'cyl', '#c0392b', [0.15, 0.4, 0.15], [-0.1, 1.15, 0]);
  } else {
    const tw = o.kind === 'battleship' ? 3 : o.kind === 'destroyer' ? 2 : 1;
    part(g, 'box', deck, [L * 0.22, 0.6, W * 0.7], [-L * 0.05, 0.85, 0]);
    part(g, 'box', deck, [L * 0.12, 0.45, W * 0.5], [-L * 0.05, 1.35, 0]);
    part(g, 'cyl', '#555', [0.04, 0.8, 0.04], [-L * 0.05, 1.9, 0]);
    if (o.kind !== 'patrol') part(g, 'cyl', '#3a3f45', [0.25, 0.5, 0.25], [-L * 0.2, 1.1, 0]);
    const xs = tw === 3 ? [L * 0.3, L * 0.17, -L * 0.3] : tw === 2 ? [L * 0.28, -L * 0.3] : [L * 0.3];
    for (const x of xs) {
      const t = new THREE.Group(); t.position.set(x, 0.65, 0); g.add(t);
      part(t, 'sphere', c, [W * 0.75, 0.3, W * 0.65], [0, 0.1, 0]);
      const n = o.kind === 'battleship' ? 3 : 1;
      for (let k = 0; k < n; k++) part(t, 'cyl', '#2a2e36', [0.07, W * 1.3, 0.07], [W * 0.65, 0.15, (k - (n - 1) / 2) * 0.1], [0, 0, -Math.PI / 2]);
      turrets.push(t);
    }
  }
  finalize(g);
  g.userData.turrets = turrets;
  g.userData.anim = (t) => { g.userData.inner.rotation.x = Math.sin(t * 1.3) * 0.03; g.userData.inner.position.y = Math.sin(t * 1.7) * 0.01; };
  return g;
}

function harbor(o) {
  const g = new THREE.Group();
  let spin = null;
  switch (o.kind) {
    case 'container': part(g, 'box', o.color || '#c0392b', [2, 0.85, 0.85], [0, 0.42, 0]); for (let i = 0; i < 9; i++) part(g, 'box', '#222', [0.03, 0.8, 0.86], [-0.9 + i * 0.22, 0.42, 0]); break;
    case 'stack': {
      const cols = ['#c0392b', '#2e86c1', '#f39c12', '#27ae60', '#7f8c8d'];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) part(g, 'box', cols[(i * 2 + j) % 5], [2, 0.85, 0.85], [i * 2.05 - 1, 0.42 + j * 0.86, 0]);
      break;
    }
    case 'crane':
      for (const x of [-0.6, 0.6]) for (const z of [-0.4, 0.4]) part(g, 'box', '#e8a81e', [0.15, 3, 0.15], [x, 1.5, z]);
      part(g, 'box', '#e8a81e', [1.4, 0.3, 1], [0, 3.1, 0]); part(g, 'box', '#e8a81e', [4.2, 0.25, 0.3], [0.8, 3.4, 0]);
      part(g, 'box', '#555', [0.6, 0.5, 0.6], [-0.2, 3.5, 0]); part(g, 'cyl', '#333', [0.03, 1.6, 0.03], [2.6, 2.55, 0]);
      part(g, 'box', '#2e86c1', [1, 0.42, 0.42], [2.6, 1.6, 0]);
      break;
    case 'lighthouse':
      part(g, 'cyl', '#efe6d2', [0.9, 3, 0.9], [0, 1.5, 0]).scale.set(0.9, 3, 0.9);
      for (let i = 0; i < 3; i++) part(g, 'cyl', '#c62828', [0.86 - i * 0.04, 0.35, 0.86 - i * 0.04], [0, 0.5 + i * 0.9, 0]);
      part(g, 'cyl', glowMat('#ffe9a8'), [0.6, 0.45, 0.6], [0, 3.25, 0]); part(g, 'cone', '#c62828', [0.8, 0.45, 0.8], [0, 3.7, 0]);
      spin = new THREE.Group(); spin.position.set(0, 3.25, 0); g.add(spin);
      part(spin, 'cone', new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: 0.25, depthWrite: false }), [0.6, 3, 0.6], [1.5, 0, 0], [0, 0, Math.PI / 2]);
      break;
    case 'bollard': part(g, 'cyl', '#333', [0.5, 0.6, 0.5], [0, 0.3, 0]); part(g, 'cyl', '#333', [0.7, 0.12, 0.7], [0, 0.62, 0]); break;
  }
  finalize(g, { by: o.by });
  if (spin) g.userData.anim = (t) => { spin.rotation.y = t * 1.2; };
  return g;
}

Object.assign(BUILDERS, { tadpole, newt, waterbug, farm, machine, ship, harbor });
void windowTex;
