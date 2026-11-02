// walls.js — the indestructible walls that mark the edges of the play area, one style per level
// (boulders, brick, logs, dry-stone fence, concrete, steel blast wall, containers, obsidian).
// The left wall follows you through the level, jumping forward only while it's off-screen; boss
// arenas raise a second wall out of the ground. Walls block you, enemies and every projectile.
// Built at unit height (1 = wall height) and scaled with the bug every frame.
import * as THREE from 'three';
import { part, mat, glowMat } from './models.js';

const HEIGHT = 7;      // wall height in bug sizes
const THICK = 0.3;     // thickness (x) in wall units
export const wallHalf = (size) => THICK * HEIGHT * size * 0.5;

const texCache = {};
function tex(kind) {
  if (texCache[kind]) return texCache[kind];
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const x = cv.getContext('2d');
  const r = (a, b) => a + Math.random() * (b - a);
  if (kind === 'brick') {
    x.fillStyle = '#d8cfc0'; x.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 16; row++) for (let i = -1; i < 5; i++) {
      x.fillStyle = `hsl(${r(4, 14)}, ${r(45, 60)}%, ${r(32, 42)}%)`;
      x.fillRect(i * 64 + (row % 2) * 32 + 2, row * 16 + 2, 60, 12);
    }
  } else if (kind === 'stone' || kind === 'drystone') {
    x.fillStyle = kind === 'drystone' ? '#6a6250' : '#55575a'; x.fillRect(0, 0, 256, 256);
    let y = 0;
    while (y < 256) {
      const h = r(14, 30); let xx = -r(0, 30);
      while (xx < 256) {
        const w = r(24, 60), l = r(40, 62);
        x.fillStyle = kind === 'drystone' ? `hsl(40, ${r(8, 18)}%, ${l}%)` : `hsl(210, ${r(3, 8)}%, ${l}%)`;
        x.beginPath(); x.ellipse(xx + w / 2, y + h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2); x.fill();
        xx += w;
      }
      y += h;
    }
  } else if (kind === 'concrete') {
    x.fillStyle = '#9a9a96'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(0,0,0,${r(0.02, 0.08)})`; x.fillRect(r(0, 256), r(0, 256), r(1, 4), r(1, 4)); }
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#111' : '#f2c230'; x.beginPath(); x.moveTo(i * 40 - 40, 256); x.lineTo(i * 40, 216); x.lineTo(i * 40 + 20, 216); x.lineTo(i * 40 - 20, 256); x.fill(); }
    x.fillStyle = '#7a7a76'; for (let i = 1; i < 4; i++) x.fillRect(0, i * 52, 256, 2);
  } else if (kind === 'steel') {
    x.fillStyle = '#4a5048'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#3e443c' : '#565c54'; x.fillRect(i * 32, 0, 32, 256); }
    for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#111' : '#e8b81e'; x.beginPath(); x.moveTo(i * 32 - 32, 40); x.lineTo(i * 32, 0); x.lineTo(i * 32 + 16, 0); x.lineTo(i * 32 - 16, 40); x.fill(); }
    x.fillStyle = '#2a2e28'; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { x.beginPath(); x.arc(16 + i * 44, 60 + j * 34, 3, 0, 7); x.fill(); }
  } else if (kind === 'container') {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 32; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.15)'; x.fillRect(i * 8, 0, 4, 256); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  texCache[kind] = t;
  return t;
}

// the face the camera actually sees: the texture is cropped (not squashed) to the wall's width
const facadeCache = {};
function facade(g, kind, color = '#ffffff', front = 0.35) {
  const key = kind + color;
  if (!facadeCache[key]) {
    const t = tex(kind).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(THICK, 1); t.needsUpdate = true;
    facadeCache[key] = mat(color, { map: t });
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(THICK * 1.002, 1), facadeCache[key]);
  m.position.set(0, 0.5, front + 0.002); g.add(m);
  return m;
}
// each builder makes a wall in unit space: x in [-THICK/2, THICK/2], y in [0, 1], z in [-1.1, 0.35]
const D = 1.45, Z = -0.375;
const STYLES = {
  boulders(g, c) {
    part(g, 'box', mat('#ffffff', { map: tex('stone') }), [THICK * 0.8, 0.95, D], [0, 0.47, Z]);
    facade(g, 'stone', '#ffffff', 0.35 - 0.0).scale.set(0.8, 0.95, 1);
    for (let i = 0; i < 9; i++) part(g, 'dodec', i % 3 ? (c || '#7a7a74') : '#5f625e', [0.3 + Math.random() * 0.15, 0.25 + Math.random() * 0.1, 0.3], [(Math.random() - 0.5) * 0.1, 0.12 + (i % 4) * 0.27, 0.32 - Math.floor(i / 4) * 0.35], [Math.random() * 3, Math.random() * 3, 0]);
    for (let i = 0; i < 4; i++) part(g, 'cone', '#4f8a2e', [0.03, 0.15, 0.03], [0.05, 1.0, 0.25 - i * 0.12], [0, 0, (i - 2) * 0.2]);
  },
  brick(g) {
    part(g, 'box', mat('#ffffff', { map: tex('brick') }), [THICK, 1, D], [0, 0.5, Z]);
    facade(g, 'brick');
    part(g, 'box', '#b8b0a2', [THICK * 1.25, 0.05, D + 0.04], [0, 1.02, Z]);
    for (let i = 0; i < 3; i++) part(g, 'box', '#8a3a2a', [THICK * 1.15, 1.05, 0.1], [0, 0.52, 0.3 - i * 0.6]);
  },
  logs(g) {
    for (let i = 0; i < 7; i++) {
      const y = 0.08 + i * 0.135, off = i % 2 ? 0.07 : 0;
      part(g, 'cyl', '#7a5232', [0.15, D, 0.15], [off - 0.035, y, Z], [Math.PI / 2, 0, 0]);
      part(g, 'cyl', '#d8b886', [0.13, 0.02, 0.13], [off - 0.035, y, Z + D / 2 + 0.005], [Math.PI / 2, 0, 0]);
    }
    for (const z of [0.3, -1.0]) part(g, 'cyl', '#5a3a22', [0.06, 1.1, 0.06], [0.1, 0.55, z]);
  },
  drystone(g) {
    part(g, 'box', mat('#ffffff', { map: tex('drystone') }), [THICK, 0.92, D], [0, 0.46, Z]);
    facade(g, 'drystone').scale.set(1, 0.92, 1);
    for (let i = 0; i < 12; i++) part(g, 'box', i % 2 ? '#8a8270' : '#a09882', [THICK * 1.2, 0.05, 0.14], [0, 0.94 + (i % 2) * 0.02, 0.3 - i * 0.12], [0.3 * (i % 3 - 1), 0, 0.15 * (i % 2 ? 1 : -1)]);
    for (let i = 0; i < 6; i++) part(g, 'sphere', '#5a8a3a', [0.12, 0.05, 0.12], [0, 1.0, 0.25 - i * 0.24]);
  },
  concrete(g) {
    part(g, 'box', mat('#ffffff', { map: tex('concrete') }), [THICK, 1, D], [0, 0.5, Z]);
    facade(g, 'concrete');
    for (let i = 0; i < 6; i++) part(g, 'cyl', '#6a4a3a', [0.012, 0.12, 0.012], [0, 1.05, 0.25 - i * 0.25], [0, 0, 0.3 * (i % 2 ? 1 : -1)]);
    for (let i = 0; i < 3; i++) part(g, 'box', '#2a2a2a', [THICK * 1.05, 0.01, 0.4], [0, 0.6 + i * 0.12, 0.15]);
  },
  steel(g) {
    part(g, 'box', mat('#ffffff', { map: tex('steel') }), [THICK, 1, D], [0, 0.5, Z]);
    facade(g, 'steel');
    for (let i = 0; i < 4; i++) part(g, 'box', '#3a3e38', [THICK * 1.3, 1.02, 0.06], [0, 0.51, 0.32 - i * 0.48]);
    for (let i = 0; i < 12; i++) part(g, 'torus', '#888', [0.05, 0.05, 0.05], [0, 1.04, 0.3 - i * 0.12], [0, Math.PI / 2, 0]);
  },
  containers(g) {
    const cols = ['#c0392b', '#2e86c1', '#f39c12', '#27ae60'];
    for (let i = 0; i < 4; i++) { part(g, 'box', mat(cols[i % 4], { map: tex('container') }), [THICK, 0.25, D * (i % 2 ? 0.95 : 1)], [0, 0.125 + i * 0.25, Z + (i % 2 ? 0.04 : 0)]); const f = facade(g, 'container', cols[i % 4], Z + D * (i % 2 ? 0.95 : 1) / 2 + (i % 2 ? 0.04 : 0)); f.scale.set(1, 0.25, 1); f.position.y = 0.125 + i * 0.25; }
  },
  obsidian(g) {
    part(g, 'box', '#2a2030', [THICK * 0.8, 0.7, D], [0, 0.35, Z]);
    for (let i = 0; i < 9; i++) part(g, 'cone', i % 2 ? '#3a2c48' : '#241a2e', [0.2 + Math.random() * 0.12, 0.75 + Math.random() * 0.4, 0.2], [(Math.random() - 0.5) * 0.12, 0.42, 0.3 - i * 0.17], [0, Math.random() * 3, (Math.random() - 0.5) * 0.25]);
    for (let i = 0; i < 6; i++) part(g, 'box', glowMat('#ff6a2e'), [0.02, 0.18 + Math.random() * 0.15, 0.02], [(Math.random() - 0.5) * 0.15, 0.15 + i * 0.13, 0.37], [0, 0, (Math.random() - 0.5) * 1.2]);
    part(g, 'ico', mat('#c88aff', { emissive: '#8a3aff', ei: 0.8 }), [0.12, 0.3, 0.12], [0, 1.05, 0.2]);
  }
};

export class Walls {
  constructor(scene, style, color) {
    this.scene = scene; this.style = STYLES[style] ? style : 'boulders'; this.color = color;
    this.walls = {};
  }
  make() {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    STYLES[this.style](inner, this.color);
    inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(g);
    return { g, inner, x: 0, k: 0, up: false };
  }
  // place a wall (side 'left' | 'right') at x; `rise` animates it up out of the ground
  set(side, x, rise = false) {
    let w = this.walls[side];
    if (!w) w = this.walls[side] = this.make();
    w.x = x; w.up = true;
    if (!rise) w.k = 1; else w.k = 0;
  }
  lower(side) { const w = this.walls[side]; if (w) w.up = false; }
  isUp(side) { const w = this.walls[side]; return !!(w && w.up); }
  x(side) { return this.walls[side] ? this.walls[side].x : null; }
  update(dt, size, onRumble) {
    for (const side in this.walls) {
      const w = this.walls[side];
      const k0 = w.k;
      w.k = Math.max(0, Math.min(1, w.k + (w.up ? dt / 0.9 : -dt / 1.1)));
      if (k0 !== w.k && onRumble) onRumble(w.x, w.k);
      const S = size * HEIGHT;
      w.g.scale.setScalar(S);
      w.g.position.set(w.x + (side === 'left' ? -1 : 1) * THICK * S * 0.5, -S * (1 - w.k), 0);
      w.g.visible = w.k > 0.001;
    }
  }
  dispose() { for (const s in this.walls) this.scene.remove(this.walls[s].g); this.walls = {}; }
}
