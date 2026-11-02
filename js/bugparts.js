// bugparts.js — builds the player's kaiju from its Body Lab design (parts.js).
// A body builder lays out the torso and reports anchor points (neck, hips, rear, sockets); the head,
// legs, tail and socket attachments are then built at those anchors. The finished model faces +x,
// is ~1 unit long and stands on y = 0. userData.update(dt, state) animates it, userData.chomp()
// snaps the jaws, userData.recoil() kicks the bio-cannon.
import * as THREE from 'three';
import { part, mat, glowMat, GEO } from './models.js';

const PI = Math.PI;
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// ---------------- BODIES ----------------
// each returns anchors: neck [x,y], hips {x0,x1,y,z}, rear [x,y], sockets {name: {p:[x,y,z], r:[rx,ry,rz]}},
// abdomen {p,s} (ellipsoid used for colour patterns)
const BODIES = {
  body_beetle(b, C) {
    part(b, 'sphere', C.main, [0.62, 0.38, 0.42], [-0.3, 0.34, 0]);
    part(b, 'sphere', C.belly, [0.5, 0.2, 0.34], [-0.28, 0.24, 0]);
    part(b, 'sphere', C.main, [0.32, 0.28, 0.3], [0.04, 0.36, 0]);
    part(b, 'box', C.dark, [0.02, 0.02, 0.3], [-0.3, 0.53, 0], [0, PI / 2, 0]);
    return { neck: [0.2, 0.38], hips: { x0: 0.14, x1: -0.14, y: 0.3, z: 0.12 }, rear: [-0.6, 0.36],
      sockets: { back: { p: [-0.28, 0.52, 0] }, rump: { p: [-0.52, 0.45, 0], r: [0, 0, 0.6] }, shoulders: { p: [0.04, 0.47, 0.12], r: [0.5, 0, 0] } },
      abdomen: { p: [-0.3, 0.34, 0], s: [0.62, 0.38, 0.42] } };
  },
  body_mantis(b, C) {
    part(b, 'sphere', C.main, [0.62, 0.2, 0.22], [-0.36, 0.42, 0], [0, 0, 0.2]);
    part(b, 'sphere', C.belly, [0.5, 0.12, 0.18], [-0.34, 0.37, 0], [0, 0, 0.2]);
    part(b, 'cyl', C.main, [0.1, 0.42, 0.1], [0.12, 0.5, 0], [0, 0, -0.9]);
    part(b, 'sphere', C.main, [0.2, 0.16, 0.16], [-0.02, 0.42, 0]);
    return { neck: [0.3, 0.6], hips: { x0: 0.04, x1: -0.1, y: 0.38, z: 0.07 }, rear: [-0.64, 0.5],
      sockets: { back: { p: [-0.3, 0.53, 0] }, rump: { p: [-0.55, 0.53, 0], r: [0, 0, 0.6] }, shoulders: { p: [0.18, 0.56, 0.07], r: [0.5, 0, 0] } },
      abdomen: { p: [-0.36, 0.42, 0], s: [0.62, 0.2, 0.22] } };
  },
  body_spider(b, C) {
    part(b, 'sphere', C.main, [0.62, 0.55, 0.55], [-0.38, 0.47, 0]);
    part(b, 'sphere', C.dark, [0.36, 0.26, 0.32], [0.05, 0.33, 0]);
    for (let i = 0; i < 3; i++) part(b, 'sphere', C.light, [0.12, 0.04, 0.12], [-0.3 - i * 0.1, 0.74 - i * 0.03, (i % 2 ? 0.06 : -0.06)]);
    return { neck: [0.22, 0.36], hips: { x0: 0.13, x1: -0.03, y: 0.32, z: 0.12 }, rear: [-0.68, 0.42],
      sockets: { back: { p: [-0.36, 0.74, 0] }, rump: { p: [-0.6, 0.6, 0], r: [0, 0, 0.9] }, shoulders: { p: [0.05, 0.44, 0.13], r: [0.5, 0, 0] } },
      abdomen: { p: [-0.38, 0.47, 0], s: [0.62, 0.55, 0.55] } };
  },
  body_wasp(b, C) {
    part(b, 'sphere', C.main, [0.34, 0.3, 0.3], [0.02, 0.42, 0]);
    part(b, 'cyl', C.dark, [0.05, 0.14, 0.05], [-0.18, 0.4, 0], [0, 0, PI / 2]);
    part(b, 'sphere', C.main, [0.56, 0.3, 0.3], [-0.45, 0.36, 0], [0, 0, 0.15]);
    part(b, 'cone', C.dark, [0.12, 0.16, 0.12], [-0.76, 0.31, 0], [0, 0, PI / 2 + 0.15]);
    for (let i = 0; i < 2; i++) part(b, 'cyl', C.dark, [0.29, 0.05, 0.29], [-0.4 - i * 0.14, 0.37 - i * 0.02, 0], [0, 0, PI / 2 + 0.15]);
    return { neck: [0.2, 0.44], hips: { x0: 0.1, x1: -0.06, y: 0.36, z: 0.1 }, rear: [-0.72, 0.32],
      sockets: { back: { p: [0.0, 0.58, 0] }, rump: { p: [-0.42, 0.52, 0], r: [0, 0, 0.4] }, shoulders: { p: [0.06, 0.53, 0.11], r: [0.5, 0, 0] } },
      abdomen: { p: [-0.45, 0.36, 0], s: [0.56, 0.3, 0.3] } };
  },
  body_grub(b, C) {
    const segs = [[0.12, 0.38, 0.4], [-0.1, 0.5, 0.5], [-0.34, 0.56, 0.54], [-0.58, 0.48, 0.48], [-0.76, 0.34, 0.34]];
    segs.forEach(([x, h, w], i) => { part(b, 'sphere', i % 2 ? C.belly : C.main, [0.3, h, w], [x, h / 2 + 0.08, 0]); });
    return { neck: [0.25, 0.32], hips: { x0: 0.12, x1: -0.1, y: 0.18, z: 0.16 }, rear: [-0.88, 0.25],
      sockets: { back: { p: [-0.32, 0.64, 0] }, rump: { p: [-0.6, 0.56, 0], r: [0, 0, 0.6] }, shoulders: { p: [0.1, 0.5, 0.14], r: [0.5, 0, 0] } },
      abdomen: { p: [-0.34, 0.36, 0], s: [0.7, 0.56, 0.54] } };
  },
  body_scorpion(b, C) {
    for (let i = 0; i < 5; i++) part(b, 'box', i % 2 ? C.dark : C.main, [0.17, 0.16, 0.36 - i * 0.02], [0.18 - i * 0.16, 0.26, 0], [0, 0, 0.05]);
    part(b, 'sphere', C.belly, [0.8, 0.12, 0.3], [-0.15, 0.2, 0]);
    return { neck: [0.3, 0.28], hips: { x0: 0.18, x1: -0.34, y: 0.24, z: 0.16 }, rear: [-0.55, 0.3],
      sockets: { back: { p: [-0.15, 0.35, 0] }, rump: { p: [-0.42, 0.35, 0], r: [0, 0, 0.4] }, shoulders: { p: [0.15, 0.35, 0.15], r: [0.6, 0, 0] } },
      abdomen: { p: [-0.15, 0.26, 0], s: [0.8, 0.18, 0.36] } };
  },
  body_crab(b, C) {
    part(b, 'sphere', C.main, [0.62, 0.32, 0.78], [-0.05, 0.34, 0]);
    part(b, 'sphere', C.belly, [0.55, 0.16, 0.7], [-0.05, 0.26, 0]);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) part(b, 'cone', C.dark, [0.04, 0.08, 0.04], [0.12 - i * 0.12, 0.42, s * 0.36], [s * 1.2, 0, 0]);
    return { neck: [0.27, 0.36], hips: { x0: 0.14, x1: -0.24, y: 0.3, z: 0.3 }, rear: [-0.36, 0.32],
      sockets: { back: { p: [-0.05, 0.5, 0] }, rump: { p: [-0.28, 0.45, 0], r: [0, 0, 0.6] }, shoulders: { p: [0.12, 0.42, 0.3], r: [0.8, 0, 0] } },
      abdomen: { p: [-0.05, 0.34, 0], s: [0.62, 0.32, 0.78] } };
  },
  body_centipede(b, C) {
    for (let i = 0; i < 8; i++) part(b, 'sphere', i % 2 ? C.dark : C.main, [0.2, 0.2, 0.26], [0.28 - i * 0.15, 0.2 + Math.sin(i * 0.9) * 0.01, 0]);
    return { neck: [0.38, 0.22], hips: { x0: 0.28, x1: -0.77, y: 0.18, z: 0.1 }, rear: [-0.88, 0.22],
      sockets: { back: { p: [-0.25, 0.31, 0] }, rump: { p: [-0.6, 0.31, 0], r: [0, 0, 0.3] }, shoulders: { p: [0.2, 0.3, 0.1], r: [0.6, 0, 0] } },
      abdomen: { p: [-0.25, 0.2, 0], s: [1.1, 0.2, 0.26] }, manyLegs: true };
  }
};

// ---------------- HEADS ----------------
// built at the neck; return { jaws: [{g, side, mode}], crown:{p}, cheeks:{p} }
function mandibles(h, C, x, y, z, k) {
  const jaws = [];
  for (const s of [-1, 1]) {
    const p = grp(h, x, y, s * z);
    part(p, 'cone', C.jaw, [0.05 * k, 0.16 * k, 0.05 * k], [0.07 * k, 0, 0], [0, 0, -PI / 2]);
    part(p, 'cone', C.jaw, [0.035 * k, 0.08 * k, 0.035 * k], [0.13 * k, 0, -s * 0.03 * k], [-s * 1.2, 0, -PI / 2]);
    jaws.push({ g: p, side: s, mode: 'y' });
  }
  return jaws;
}
function eyePair(h, C, x, y, z, r, glow) {
  for (const s of [-1, 1]) {
    part(h, 'sphere', glow ? glowMat(C.eye) : C.eye, [r, r, r * 0.9], [x, y, s * z]);
    part(h, 'sphere', '#ffffff', [r * 0.3, r * 0.3, r * 0.3], [x + r * 0.35, y + r * 0.25, s * (z + r * 0.25)]);
  }
}
function antennae(h, C, x, y, len = 0.32, feathery = false) {
  for (const s of [-1, 1]) {
    part(h, 'cyl', C.leg, [0.015, len, 0.015], [x, y + len * 0.4, s * 0.06], [s * 0.35, 0, -0.6]);
    if (feathery) for (let i = 0; i < 5; i++) part(h, 'box', C.light, [0.012, 0.09, 0.012], [x + 0.03 + i * 0.03, y + 0.06 + i * 0.045, s * (0.08 + i * 0.012)], [s * 0.4, 0, 0.6]);
  }
}
const HEADS = {
  head_ant(h, C, X) {
    part(h, 'sphere', C.dark, [0.27, 0.24, 0.27], [0, 0, 0]);
    eyePair(h, C, 0.07, 0.05, 0.1, 0.11, X.glowEyes); antennae(h, C, 0.1, 0.12);
    return { jaws: mandibles(h, C, 0.12, -0.07, 0.06, X.jaw), crown: { p: [-0.02, 0.12, 0] }, cheeks: { p: [0.0, -0.01, 0.13], r: [1.3, 0, 0] } };
  },
  head_rhino(h, C, X) {
    part(h, 'sphere', C.dark, [0.3, 0.2, 0.3], [0, 0, 0]);
    part(h, 'box', C.dark, [0.2, 0.05, 0.34], [-0.05, 0.08, 0], [0, 0, 0.3]);
    part(h, 'cone', C.horn, [0.08, 0.3, 0.08], [0.16, 0.12, 0], [0, 0, -0.55]);
    eyePair(h, C, 0.09, 0.02, 0.12, 0.07, X.glowEyes);
    return { jaws: mandibles(h, C, 0.13, -0.07, 0.07, X.jaw * 0.8), crown: { p: [-0.08, 0.12, 0] }, cheeks: { p: [0, -0.02, 0.15], r: [1.3, 0, 0] } };
  },
  head_mantis(h, C, X) {
    const m = part(h, 'cone', C.main, [0.34, 0.24, 0.16], [0.02, 0.02, 0], [PI / 2, 0, PI]); m.rotation.set(PI / 2, PI / 2, 0);
    for (const s of [-1, 1]) part(h, 'sphere', X.glowEyes ? glowMat(C.eye) : C.eye, [0.13, 0.14, 0.12], [0.0, 0.07, s * 0.15]);
    antennae(h, C, 0.03, 0.12, 0.38);
    return { jaws: mandibles(h, C, 0.1, -0.1, 0.03, X.jaw * 0.7), crown: { p: [-0.02, 0.1, 0] }, cheeks: { p: [0, 0, 0.17], r: [1.3, 0, 0] } };
  },
  head_fly(h, C, X) {
    part(h, 'sphere', C.dark, [0.24, 0.22, 0.24], [0, 0, 0]);
    for (const s of [-1, 1]) part(h, 'sphere', X.glowEyes ? glowMat(C.eye) : mat('#b3261e'), [0.17, 0.2, 0.14], [0.04, 0.03, s * 0.1]);
    const pro = grp(h, 0.1, -0.08, 0);
    part(pro, 'cyl', C.leg, [0.04, 0.16, 0.04], [0.04, -0.06, 0], [0, 0, 0.5]);
    part(pro, 'sphere', C.light, [0.07, 0.05, 0.09], [0.08, -0.13, 0]);
    antennae(h, C, 0.09, 0.08, 0.14);
    return { jaws: [{ g: pro, side: 1, mode: 'z' }], crown: { p: [-0.03, 0.12, 0] }, cheeks: { p: [-0.02, -0.03, 0.13], r: [1.3, 0, 0] } };
  },
  head_stalk(h, C, X) {
    part(h, 'sphere', C.dark, [0.24, 0.2, 0.24], [0, 0, 0]);
    for (const s of [-1, 1]) {
      part(h, 'cyl', C.leg, [0.025, 0.4, 0.025], [0.02, 0.04, s * 0.2], [PI / 2, 0, 0]);
      part(h, 'sphere', X.glowEyes ? glowMat(C.eye) : C.eye, [0.09, 0.09, 0.09], [0.03, 0.05, s * 0.4]);
    }
    return { jaws: mandibles(h, C, 0.1, -0.06, 0.05, X.jaw * 0.9), crown: { p: [-0.02, 0.1, 0] }, cheeks: { p: [0, -0.04, 0.12], r: [1.3, 0, 0] } };
  },
  head_moth(h, C, X) {
    part(h, 'sphere', C.light, [0.28, 0.26, 0.28], [0, 0, 0]);
    for (let i = 0; i < 8; i++) part(h, 'sphere', C.light, [0.08, 0.08, 0.08], [-0.06 + (i % 3) * 0.06, 0.08 + (i % 2) * 0.04, (i - 4) * 0.03]);
    eyePair(h, C, 0.08, 0.04, 0.1, 0.1, X.glowEyes); antennae(h, C, 0.06, 0.12, 0.34, true);
    return { jaws: mandibles(h, C, 0.11, -0.09, 0.04, X.jaw * 0.6), crown: { p: [-0.04, 0.14, 0] }, cheeks: { p: [0, -0.02, 0.14], r: [1.3, 0, 0] } };
  },
  head_tick(h, C, X) {
    part(h, 'sphere', C.dark, [0.2, 0.16, 0.22], [0, 0, 0]);
    part(h, 'cone', C.horn, [0.06, 0.18, 0.06], [0.14, -0.04, 0], [0, 0, -PI / 2 - 0.3]);
    for (let i = 0; i < 3; i++) part(h, 'cone', C.horn, [0.02, 0.05, 0.02], [0.12 + i * 0.03, -0.02 - i * 0.012, 0], [0, 0, -0.4]);
    eyePair(h, C, 0.04, 0.05, 0.08, 0.05, X.glowEyes);
    return { jaws: mandibles(h, C, 0.08, -0.06, 0.06, X.jaw * 0.7), crown: { p: [-0.02, 0.08, 0] }, cheeks: { p: [0, -0.02, 0.1], r: [1.3, 0, 0] } };
  },
  head_skull(h, C, X) {
    part(h, 'box', C.dark, [0.34, 0.22, 0.28], [0.02, 0.04, 0]);
    part(h, 'box', C.dark, [0.18, 0.1, 0.24], [0.2, 0.0, 0]);
    for (const s of [-1, 1]) part(h, 'box', C.dark, [0.16, 0.05, 0.05], [0.04, 0.13, s * 0.1], [0, 0, 0.15]);
    eyePair(h, C, 0.15, 0.09, 0.09, 0.06, true);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) part(h, 'cone', '#f2ead8', [0.025, 0.06, 0.025], [0.12 + i * 0.05, -0.06, s * 0.08], [0, 0, PI]);
    const jaw = grp(h, -0.05, -0.08, 0), jk = 1 + (X.jaw - 1) * 0.35; // the skull's jaw grows more slowly
    part(jaw, 'box', C.dark, [0.34 * jk, 0.07, 0.24], [0.18 * jk, -0.02, 0]);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) part(jaw, 'cone', '#f2ead8', [0.025, 0.06, 0.025], [0.12 + i * 0.06 * jk, 0.03, s * 0.08]);
    return { jaws: [{ g: jaw, side: 1, mode: 'z' }], crown: { p: [-0.06, 0.16, 0] }, cheeks: { p: [-0.02, 0.02, 0.15], r: [1.3, 0, 0] } };
  },
  head_hydra(h, C, X) {
    const out = { jaws: [], crown: { p: [-0.02, 0.12, 0.12] }, cheeks: { p: [0, -0.01, 0.25], r: [1.3, 0, 0] } };
    for (const [z, k, ry] of [[0.12, 1, 0], [-0.14, 0.85, 0.35]]) {
      const hh = grp(h, z < 0 ? -0.04 : 0, 0, z); hh.scale.setScalar(k); hh.rotation.y = ry;
      part(hh, 'sphere', C.dark, [0.27, 0.24, 0.27], [0, 0, 0]);
      eyePair(hh, C, 0.07, 0.05, 0.1, 0.1, X.glowEyes);
      out.jaws.push(...mandibles(hh, C, 0.12, -0.07, 0.06, X.jaw));
      hh.userData.lag = z < 0 ? 0.25 : 0; (out.heads = out.heads || []).push(hh);
    }
    return out;
  }
};

// ---------------- LEGS ----------------
// a two-segment leg whose foot reaches the ground: hip at (x, y, side*z)
function leg(parent, C, x, y, z, side, thigh, thick, splay, color, rake = 0) {
  const p = grp(parent, x, y, side * z);
  part(p, 'leg', color || C.leg, [thick, thigh, thick], [0, 0, 0], [-side * splay, 0, rake]);
  const kx = Math.sin(rake) * thigh, ky = -thigh * Math.cos(splay), kz = side * thigh * Math.sin(splay);
  const shin = Math.max(0.05, y + ky);
  const knee = grp(p, -kx, ky, kz);
  part(knee, 'leg', color || C.leg, [thick * 0.8, shin, thick * 0.8], [0, 0, 0], [side * 0.08, 0, 0]);
  return p;
}
function spread(A, n) { const xs = []; for (let i = 0; i < n; i++) xs.push(n === 1 ? A.hips.x0 : A.hips.x0 + (A.hips.x1 - A.hips.x0) * i / (n - 1)); return xs; }
const LEGS = {
  legs_walker(b, C, A, lift) { const L = []; for (const x of spread(A, A.manyLegs ? 6 : 3)) for (const s of [-1, 1]) L.push(leg(b, C, x, A.hips.y + lift, A.hips.z, s, 0.2, 0.035, 1.0)); return L; },
  legs_runner(b, C, A, lift) { const L = []; for (const x of spread(A, 3)) for (const s of [-1, 1]) L.push(leg(b, C, x, A.hips.y + lift, A.hips.z, s, 0.28, 0.025, 0.9)); return L; },
  legs_jumper(b, C, A, lift) {
    const L = []; for (const x of spread(A, 2)) for (const s of [-1, 1]) L.push(leg(b, C, x, A.hips.y + lift, A.hips.z, s, 0.18, 0.03, 1.0));
    for (const s of [-1, 1]) { const p = grp(b, A.hips.x1 - 0.05, A.hips.y + lift, s * (A.hips.z + 0.04)); part(p, 'leg', C.main, [0.07, 0.42, 0.07], [0, 0, 0], [0, 0, 2.4]); part(p, 'leg', C.leg, [0.04, 0.5, 0.04], [-0.28, 0.32, 0], [0, 0, 0.55]); L.push(p); }
    return L;
  },
  legs_crab(b, C, A, lift) { const L = []; for (const x of spread(A, 3)) for (const s of [-1, 1]) L.push(leg(b, C, x, A.hips.y + lift, A.hips.z, s, 0.22, 0.07, 1.2, C.dark)); return L; },
  legs_stilt(b, C, A, lift) { const L = []; for (const x of spread(A, 3)) for (const s of [-1, 1]) L.push(leg(b, C, x, A.hips.y + lift, A.hips.z, s, 0.32, 0.03, 0.75)); return L; },
  legs_spider(b, C, A, lift) { const L = []; for (const x of spread(A, 4)) for (const s of [-1, 1]) L.push(leg(b, C, x, A.hips.y + lift, A.hips.z, s, 0.38, 0.032, 1.25)); return L; },
  legs_many(b, C, A, lift) { const L = []; const n = A.manyLegs ? 10 : 7; const xs = spread({ hips: { x0: A.hips.x0, x1: Math.min(A.hips.x1, -0.5) } }, n); for (const x of xs) for (const s of [-1, 1]) L.push(leg(b, C, x, A.hips.y + lift, A.hips.z, s, 0.13, 0.025, 1.1)); return L; }
};
const LIFT = { legs_walker: 0, legs_runner: 0.06, legs_jumper: 0.02, legs_crab: 0.02, legs_stilt: 0.16, legs_spider: 0.1, legs_many: -0.03 };

// ---------------- TAILS ----------------
const TAILS = {
  tail_none() { return null; },
  tail_stinger(t, C) { part(t, 'cone', '#2a2a2a', [0.08, 0.26, 0.08], [-0.1, 0, 0], [0, 0, 1.9]); part(t, 'sphere', glowMat('#b6ff3b'), [0.05, 0.05, 0.05], [-0.22, -0.04, 0]); },
  tail_pincers(t, C) { for (const s of [-1, 1]) part(t, 'cone', C.dark, [0.05, 0.28, 0.05], [-0.13, 0, s * 0.05], [s * 0.4, 0, PI / 2 + 0.1]); },
  tail_spinneret(t) { for (const s of [-1, 1]) part(t, 'cone', '#f4f0e6', [0.05, 0.11, 0.05], [-0.04, -0.06, s * 0.04], [0, 0, 2.3]); part(t, 'cyl', mat('#ffffff', { opacity: 0.5 }), [0.006, 0.4, 0.006], [-0.1, -0.25, 0], [0, 0, 0.3]); },
  tail_club(t, C) {
    part(t, 'cyl', C.dark, [0.07, 0.24, 0.07], [-0.1, 0, 0], [0, 0, 1.4]);
    part(t, 'dodec', '#3a3530', [0.2, 0.17, 0.17], [-0.24, -0.04, 0]);
    for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; part(t, 'cone', C.horn, [0.035, 0.09, 0.035], [-0.24 + Math.cos(a) * 0.08, -0.04 + Math.sin(a) * 0.08, 0], [0, 0, a - PI / 2]); }
  },
  tail_whip(t, C) {
    const segs = []; let g = t;
    for (let i = 0; i < 7; i++) { const s = grp(g, i ? -0.08 : 0, 0, 0); part(s, 'sphere', C.main, [0.1 - i * 0.01, 0.06 - i * 0.005, 0.06 - i * 0.005], [-0.04, 0, 0]); if (i % 2) part(s, 'cone', C.horn, [0.02, 0.06, 0.02], [-0.04, 0.04, 0]); segs.push(s); g = s; }
    return (tt) => segs.forEach((s, i) => { s.rotation.z = Math.sin(tt * 4 - i * 0.6) * 0.15 + (i ? 0.05 : 0.2); });
  },
  tail_scorpion(t, C) {
    const segs = []; let g = t;
    for (let i = 0; i < 6; i++) { const s = grp(g, i ? -0.09 : 0, 0, 0); s.rotation.z = i ? -0.42 : 0.5; part(s, 'sphere', i % 2 ? C.dark : C.main, [0.11, 0.08, 0.08], [-0.045, 0, 0]); segs.push(s); g = s; }
    part(g, 'sphere', C.main, [0.1, 0.08, 0.08], [-0.08, 0, 0]); part(g, 'cone', '#2a2a2a', [0.04, 0.12, 0.04], [-0.06, -0.08, 0], [0, 0, 0.2]);
    return (tt) => { segs[0].rotation.z = 0.5 + Math.sin(tt * 2) * 0.08; };
  },
  tail_fan(t, C) { for (let i = -2; i <= 2; i++) part(t, 'sphere', i % 2 ? C.dark : C.main, [0.2, 0.025, 0.08], [-0.12, 0, i * 0.04], [0, i * 0.35, 0]); }
};

// ---------------- ATTACHMENTS ----------------
// built in socket space: +y points away from the body, +x forward. `side` is ±1 for paired sockets.
const ATTACH = {
  att_horn(a, C, X, sock) { part(a, 'cone', C.horn, [0.08, 0.3, 0.08], [0.03, 0.13, 0], [0, 0, sock === 'crown' ? -0.4 : 0.2]); },
  att_spikes(a, C) { for (let i = 0; i < 4; i++) part(a, 'cone', C.horn, [0.045, 0.14, 0.045], [0.12 - i * 0.09, 0.06, (i % 2 ? 0.03 : -0.03)], [0, 0, 0.35]); },
  att_wings(a, C, X, sock, side, anims) {
    const wl = 0.6;
    for (const s of side ? [side] : [-1, 1]) {
      const w = grp(a, 0, 0.02, s * 0.04);
      const m = new THREE.Mesh(GEO.wingFlat, mat('#bfe3ff', { opacity: 0.6, side: THREE.DoubleSide }));
      m.scale.set(wl, 1, wl * 0.9); m.rotation.y = s * 0.3; w.add(m);
      const base = -(a.userData.tilt || 0);
      anims.push((t, st) => { w.rotation.x = base - s * (st.airborne || st.flying ? 0.4 + Math.sin(t * 70) * 0.7 : 0.08); });
    }
  },
  att_plates(a, C) { for (let i = 0; i < 3; i++) part(a, 'box', '#1e1e24', [0.13, 0.06, 0.3], [0.1 - i * 0.12, 0.02 - i * 0.01, 0], [0, 0, 0.12]); },
  att_eyes(a, C) {
    for (let i = 0; i < 3; i++) { const x = (i - 1) * 0.07, y = 0.03 + (i === 1 ? 0.03 : 0); part(a, 'sphere', '#f4f0e6', [0.07, 0.07, 0.07], [x, y, 0]); part(a, 'sphere', C.eye, [0.035, 0.035, 0.035], [x + 0.02, y + 0.02, 0.025]); }
  },
  att_glow(a, C, X, sock, side, anims) {
    const bulbs = [];
    for (let i = 0; i < 3; i++) bulbs.push(part(a, 'sphere', mat('#aaffee', { emissive: '#5affd8', ei: 1.5 }), [0.07, 0.07, 0.07], [(i - 1) * 0.08, 0.02, (i % 2 ? 0.03 : -0.03)]));
    anims.push((t) => bulbs.forEach((b, i) => b.scale.setScalar(0.06 + Math.sin(t * 3 + i * 2) * 0.012)));
  },
  att_thorns(a, C) { for (let i = 0; i < 5; i++) { const ang = (i / 4 - 0.5) * 1.6; part(a, 'cone', '#5a3a2a', [0.035, 0.13, 0.035], [Math.sin(ang) * 0.05, 0.05, Math.cos(ang) * 0.06], [Math.sin(ang) * 0.5, 0, Math.cos(ang) * 0.2]); } },
  att_quills(a, C) { for (let i = 0; i < 12; i++) part(a, 'cone', '#d8d0bc', [0.02, 0.24, 0.02], [0.08 - (i % 6) * 0.06, 0.06, (i < 6 ? 0.06 : -0.06)], [(i < 6 ? 0.5 : -0.5), 0, 1.0]); },
  att_eggs(a, C, X, sock, side, anims) {
    const eggs = [];
    for (let i = 0; i < 5; i++) eggs.push(part(a, 'sphere', mat('#f4ecc8', { opacity: 0.85, emissive: '#c8b870', ei: 0.3 }), [0.09, 0.09, 0.09], [(i % 3 - 1) * 0.08, 0.03 + Math.floor(i / 3) * 0.06, (i % 2 ? 0.07 : -0.07)]));
    anims.push((t) => eggs.forEach((e, i) => e.scale.setScalar(0.09 * (1 + Math.sin(t * 3 + i) * 0.1))));
  },
  att_scythes(a, C, X, sock, side, anims) {
    part(a, 'box', C.leg, [0.26, 0.05, 0.05], [0.12, 0.04, 0], [0, 0, 0.5]);
    const blade = grp(a, 0.23, 0.11, 0);
    part(blade, 'box', C.dark, [0.05, 0.3, 0.035], [0.02, -0.14, 0], [0, 0, 0.25]);
    for (let k = 0; k < 4; k++) part(blade, 'cone', C.horn, [0.02, 0.06, 0.02], [0.05, -0.06 - k * 0.06, 0], [0, 0, -PI / 2]);
    anims.push((t, st, chomp) => { blade.rotation.z = chomp > 0 ? Math.sin(chomp * PI) * 1.6 : Math.sin(t * 1.5) * 0.08; });
  },
  att_claws(a, C, X, sock, side, anims) {
    part(a, 'box', C.dark, [0.2, 0.06, 0.06], [0.1, 0.03, 0], [0, 0, 0.3]);
    const claw = grp(a, 0.22, 0.08, 0);
    part(claw, 'sphere', C.main, [0.18, 0.12, 0.1], [0.06, 0, 0]);
    part(claw, 'cone', C.dark, [0.05, 0.14, 0.05], [0.16, 0.03, 0], [0, 0, -PI / 2]);
    const pin = grp(claw, 0.1, -0.03, 0); part(pin, 'cone', C.dark, [0.04, 0.12, 0.04], [0.06, 0, 0], [0, 0, -PI / 2 - 0.3]);
    anims.push((t, st, chomp) => { pin.rotation.z = chomp > 0 ? Math.sin(chomp * PI) * 0.7 : 0.15; claw.rotation.z = chomp > 0 ? -Math.sin(chomp * PI) * 0.4 : 0; });
  },
  att_tentacles(a, C, X, sock, side, anims) {
    for (const k of [-1, 1]) {
      const segs = []; let g = grp(a, 0, 0, k * 0.03);
      for (let i = 0; i < 6; i++) { const s = grp(g, 0, i ? 0.06 : 0, 0); part(s, 'sphere', C.light, [0.05 - i * 0.005, 0.08, 0.05 - i * 0.005], [0, 0.03, 0]); segs.push(s); g = s; }
      anims.push((t) => segs.forEach((s, i) => { s.rotation.z = Math.sin(t * 2.5 + i * 0.7 + k) * 0.35; }));
    }
  },
  att_antlers(a, C) {
    for (const s of [-1, 1]) {
      const g = grp(a, 0, 0.02, s * 0.06); g.rotation.x = s * 0.5;
      part(g, 'cyl', '#c8b89a', [0.025, 0.3, 0.025], [0, 0.15, 0]);
      for (let i = 0; i < 3; i++) part(g, 'cyl', '#c8b89a', [0.018, 0.13, 0.018], [0.04, 0.1 + i * 0.07, 0], [0, 0, -0.9]);
    }
  },
  att_tusks(a, C) { part(a, 'cone', '#f2ead8', [0.05, 0.25, 0.05], [0.12, -0.02, 0], [0, 0, -PI / 2 + 0.6]); },
  att_mane(a, C, X, sock, side, anims) {
    const f = [];
    for (let i = 0; i < 9; i++) f.push(part(a, 'cyl', C.light, [0.012, 0.22, 0.012], [-0.06 + (i % 3) * 0.04, 0.1, (i - 4) * 0.025], [(i - 4) * 0.12, 0, 0.6]));
    anims.push((t) => f.forEach((m, i) => { m.rotation.z = 0.6 + Math.sin(t * 3 + i) * 0.15; }));
  },
  att_crystals(a) { for (let i = 0; i < 4; i++) part(a, 'ico', mat('#c8f4ff', { emissive: '#6fd8ff', ei: 0.8 }), [0.06, 0.18 - i * 0.02, 0.06], [(i - 1.5) * 0.06, 0.07, (i % 2 ? 0.04 : -0.04)], [0, 0, (i - 1.5) * 0.25]); },
  att_batwings(a, C, X, sock, side, anims) {
    for (const s of side ? [side] : [-1, 1]) {
      const w = grp(a, 0, 0.02, s * 0.05);
      const arm = grp(w, 0, 0, 0);
      // three finger bones fanning back and outward, with the membrane stretched beneath them
      for (let f = 0; f < 3; f++) { const fg = grp(arm, 0, 0.01, 0); fg.rotation.y = s * (0.25 + f * 0.35); part(fg, 'cyl', C.dark, [0.018, 0.55, 0.018], [-0.27, 0, 0], [0, 0, PI / 2]); }
      const mem = new THREE.Mesh(GEO.wingFlat, mat(shade(C.mainRaw, 0.35), { opacity: 0.85, side: THREE.DoubleSide }));
      mem.scale.set(0.6, 1, 1.6); mem.rotation.y = s * 0.55; arm.add(mem);
      const base = -(a.userData.tilt || 0);
      anims.push((t, st) => { w.rotation.x = base - s * (st.airborne || st.flying ? 0.5 + Math.sin(t * 18) * 0.6 : 0.25); });
    }
  },
  att_sail(a, C) {
    for (let i = 0; i < 7; i++) part(a, 'cyl', C.horn, [0.015, 0.2 + Math.sin(i / 6 * PI) * 0.22, 0.015], [0.18 - i * 0.06, (0.2 + Math.sin(i / 6 * PI) * 0.22) / 2, 0]);
    const s = new THREE.Mesh(GEO.wing, mat('#c0392b', { opacity: 0.8, side: THREE.DoubleSide })); s.scale.set(0.42, 0.75, 1); s.position.set(-0.2, 0.12, 0); a.add(s);
  },
  att_fins(a, C, X, sock, side, anims) {
    const fins = [];
    for (let i = 0; i < 5; i++) fins.push(part(a, 'cone', mat('#9fe8ff', { emissive: '#3fb8ff', ei: 0.6 }), [0.04, 0.18 + Math.sin(i / 4 * PI) * 0.1, 0.12], [0.16 - i * 0.08, 0.08 + Math.sin(i / 4 * PI) * 0.04, 0], [0, 0, 0.15]));
    anims.push((t, st) => fins.forEach((f, i) => { f.material.emissiveIntensity = st.beam ? 2.5 : 0.5 + Math.sin(t * 4 - i * 0.6) * 0.3; }));
  },
  att_cannon(a, C, X, sock, side, anims) {
    const g = grp(a, 0, 0.06, 0);
    part(g, 'sphere', C.light, [0.16, 0.14, 0.14], [0, 0, 0]);
    const barrel = grp(g, 0.05, 0.02, 0);
    part(barrel, 'cyl', C.dark, [0.07, 0.22, 0.07], [0.1, 0.02, 0], [0, 0, -PI / 2 + 0.3]);
    part(barrel, 'sphere', glowMat('#9dff3a'), [0.05, 0.05, 0.05], [0.21, 0.05, 0]);
    anims.push((t, st, chomp, kick) => { barrel.position.x = 0.05 - kick * 0.05; });
  },
  att_storm(a, C, X, sock, side, anims) {
    const tips = [];
    for (const s of [-1, 1]) { part(a, 'cyl', C.leg, [0.015, 0.4, 0.015], [0.05, 0.18, s * 0.05], [s * 0.3, 0, -0.35]); tips.push(part(a, 'sphere', mat('#bff4ff', { emissive: '#7fd8ff', ei: 1.5 }), [0.05, 0.05, 0.05], [0.12, 0.37, s * 0.11])); }
    let flick = 0;
    anims.push((t, st, chomp, kick, dt) => { if ((flick -= dt) <= 0) { flick = 0.05 + Math.random() * 0.15; tips.forEach((m) => m.scale.setScalar(0.03 + Math.random() * 0.05)); } });
  }
};

function place(g, s, side) {
  const p = s.p, r = s.r || [0, 0, 0];
  g.position.set(p[0], p[1], (p[2] || 0) * (side || 1));
  g.rotation.set(r[0] * (side || 1), r[1] || 0, r[2] || 0);
}

// ---------------- assembly ----------------
export function buildBug(design, colors = {}, extras = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const mainRaw = colors.body || '#3f8a3a';
  const C = { mainRaw, main: mainRaw, dark: shade(mainRaw, 0.55), belly: shade(mainRaw, 0.75), light: shade(mainRaw, 1.35), leg: shade(mainRaw, 0.4), eye: colors.eyes || '#e53935', horn: '#e8e2d0' };
  C.jaw = (extras.jaw || 0) >= 3 ? '#2a2a2a' : C.leg;
  const X = { jaw: 1 + (extras.jaw || 0) * 0.18, glowEyes: extras.kaiju || colors.pattern === 'spots' };
  const anims = [];
  const A = (BODIES[design.body] || BODIES.body_beetle)(body, C);
  const lift = LIFT[design.legs] ?? 0;
  body.position.y = lift;

  // head
  const head = grp(body, A.neck[0], A.neck[1], 0);
  const H = (HEADS[design.head] || HEADS.head_ant)(head, C, X);
  const heads = H.heads || [head];
  // legs (attached to the outer group so they aren't lifted with the body)
  const legHolder = grp(g, 0, 0, 0);
  const legs = (LEGS[design.legs] || LEGS.legs_walker)(legHolder, C, A, lift);
  // tail
  const tail = grp(body, A.rear[0], A.rear[1], 0);
  const tailAnim = (TAILS[design.tail] || TAILS.tail_none)(tail, C);
  if (tailAnim) anims.push(tailAnim);
  // colour pattern on the abdomen
  pattern(body, C, A.abdomen, colors.pattern);
  // kaiju crest
  if (extras.kaiju) for (let i = 0; i < 7; i++) part(body, 'cone', '#2a2a30', [0.06, 0.16 + Math.sin(i / 6 * PI) * 0.16, 0.16], [A.abdomen.p[0] + 0.35 - i * 0.12, A.abdomen.p[1] + A.abdomen.s[1] * 0.45 + Math.sin(i / 6 * PI) * 0.06, 0], [0, 0, 0.25]);
  // socket attachments
  const sockets = { ...A.sockets, crown: H.crown, cheeks: H.cheeks };
  for (const sock in design.sockets || {}) {
    const id = design.sockets[sock], fn = ATTACH[id], S = sockets[sock];
    if (!fn || !S) continue;
    const parent = sock === 'crown' || sock === 'cheeks' ? (heads[0]) : body;
    const pair = sock === 'shoulders' || sock === 'cheeks';
    for (const side of pair ? [-1, 1] : [0]) {
      const a = new THREE.Group(); parent.add(a); place(a, S, side);
      a.userData.tilt = a.rotation.x; // wings cancel this so they fold flat along the back
      fn(a, C, X, sock, side, anims);
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  let chompT = 0, kick = 0, t = 0;
  g.userData.chomp = () => { chompT = 1; };
  g.userData.recoil = () => { kick = 1; };
  g.userData.update = (dt, st) => {
    t += dt * (st.frenzy ? 1.6 : 1);
    chompT = Math.max(0, chompT - dt * 5); kick = Math.max(0, kick - dt * 6);
    const walk = st.moving && !st.airborne ? 1 : 0;
    const fast = design.legs === 'legs_many' ? 34 : 22;
    legs.forEach((l, i) => { l.rotation.z = Math.sin(t * fast + (i % 2 ? PI : 0) + (i >> 1) * 1.1) * (walk ? 0.5 : st.airborne ? 0.25 : 0.04); });
    const open = chompT > 0 ? Math.sin(chompT * PI) : 0.12 + Math.sin(t * 3) * 0.05;
    for (const j of H.jaws) { if (j.mode === 'y') j.g.rotation.y = j.side * open * 0.9; else j.g.rotation.z = -open * 0.6; }
    heads.forEach((h, i) => {
      const lag = h.userData.lag || 0, k = Math.max(0, chompT - lag) / (1 - lag);
      h.rotation.z = k > 0 ? -Math.sin(k * PI) * 0.35 : Math.sin(t * 2 + i) * 0.04;
    });
    body.position.y = lift + (walk ? Math.abs(Math.sin(t * fast)) * 0.02 : 0);
    for (const fn of anims) fn(t, st, chompT, kick, dt);
  };
  return g;
}

function pattern(body, C, ab, pat) {
  if (!pat || pat === 'none') return;
  const [x, y] = ab.p, [sx, sy, sz] = ab.s;
  // bands: thin discs sized to the ellipsoid's cross-section at that point, so they hug any body shape
  const band = (m, k, w) => { const t = Math.sqrt(Math.max(0, 1 - k * k)); part(body, 'cyl', m, [sy * t * 1.04, w, sz * t * 1.04], [x + k * sx * 0.5, y, 0], [0, 0, PI / 2]); };
  if (pat === 'stripes' || pat === 'glowstripes') {
    const sc = pat === 'glowstripes' ? glowMat('#7ff3ff') : mat(C.mainRaw === '#d4a017' ? '#151515' : '#f2c230');
    for (const k of [-0.45, -0.1, 0.25]) band(sc, k, 0.045);
  } else if (pat === 'spots') {
    for (let i = 0; i < 6; i++) part(body, 'sphere', glowMat('#6effe0'), [0.06, 0.04, 0.06], [x - sx * 0.35 + (i % 3) * sx * 0.25, y + sy * 0.45, (i < 3 ? 0.1 : -0.1) * sz * 2]);
  } else if (pat === 'tiger') {
    for (const k of [-0.7, -0.4, -0.1, 0.2, 0.5]) band(mat('#151515'), k, 0.03);
  } else if (pat === 'magma') {
    for (let i = 0; i < 7; i++) part(body, 'box', glowMat('#ff8a1e'), [0.2, 0.012, 0.025], [x - sx * 0.35 + (i % 4) * sx * 0.2, y + sy * 0.48, (i % 2 ? 0.1 : -0.08)], [0, (i % 3 - 1) * 0.9, 0]);
  } else if (pat === 'crown') {
    for (let i = 0; i < 5; i++) part(body, 'cone', '#c9a227', [0.04, 0.14, 0.04], [x + sx * 0.3 - i * 0.06, y + sy * 0.5, (i - 2) * 0.04], [0, 0, 0.3]);
  }
}
