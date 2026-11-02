// world.js — sky, fog, ground and endless background scenery for the current level.
// Scenery is generated in deterministic chunks as the camera moves and recycled behind it.
// Add a scenery kind: add a case to makeDecor() and list it in a level's `decor`.
import * as THREE from 'three';
import { build, part, mat, glowMat } from './models.js';

const CHUNK = 40;
// default size range (level units) per scenery kind; a level's decor entry may override with [kind, density, color, min, max]
const SIZES = {
  grass: [2, 6], mushroom: [2, 5], leaf: [3, 7], pebble: [1, 3], flower: [3, 7], tree: [14, 30], bush: [3, 7], table: [6, 8], blanket: [6, 10],
  house: [18, 26], fence: [3, 4], reeds: [3, 7], lily: [2, 4], cattail: [4, 8], cornrow: [1.2, 2], farmhouse: [6, 10], hayfield: [0.8, 1.4], farship: [6, 14], cranebg: [5, 9], skyline: [20, 70], dune: [10, 30], mesa: [15, 40], cactus: [1.5, 3], smoke: [10, 30], lava: [8, 20]
};

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

function groundTexture(c1, c2) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  x.fillStyle = c1; x.fillRect(0, 0, 256, 256);
  const base = new THREE.Color(c1);
  for (let i = 0; i < 900; i++) {
    const c = base.clone().multiplyScalar(0.75 + Math.random() * 0.5);
    x.fillStyle = '#' + c.getHexString(); x.globalAlpha = 0.5;
    const r = 2 + Math.random() * 10;
    x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, r, r * 0.5, 0, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  void c2;
  return t;
}
function skyTexture(top, bottom) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
  const x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  x.fillStyle = gr; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group(); scene.add(this.root);
    this.chunks = new Map();
    this.level = null;
  }
  load(level) {
    this.clear();
    this.level = level;
    const sc = this.scene;
    sc.background = skyTexture(level.sky[0], level.sky[1]);
    sc.fog = new THREE.Fog(level.fog, 30, 300);
    // ground: a huge textured plane that slides with the camera (texture offset keeps it still)
    this.gtex = groundTexture(level.ground, level.ground2);
    this.gtex.repeat.set(200, 60);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 1200), mat('#ffffff', { map: this.gtex }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.position.set(0, 0, -500);
    this.ground.receiveShadow = true;
    this.root.add(this.ground);
    // a strip along the play line (soil path, road, scorched rock)
    this.strip = new THREE.Mesh(new THREE.PlaneGeometry(4000, 7), mat(level.ground2));
    this.strip.rotation.x = -Math.PI / 2; this.strip.position.set(0, 0.01, 0.5);
    this.strip.receiveShadow = true;
    this.root.add(this.strip);
    if (level.final) { // a cracked, glowing planet surface
      this.strip.material = glowMat('#ff5a1e');
      this.strip.scale.y = 0.15;
    }
  }
  clear() {
    for (const c of this.chunks.values()) this.root.remove(c);
    this.chunks.clear();
    while (this.root.children.length) this.root.remove(this.root.children[0]);
  }
  update(camX, scale, viewW) {
    // fog and ground follow the growing bug
    this.scene.fog.near = 25 * scale; this.scene.fog.far = 160 * scale + 120;
    const gx = Math.round(camX / 20) * 20;
    this.ground.position.x = gx; this.gtex.offset.x = gx / 20;
    this.strip.position.x = gx; this.strip.scale.y = (this.level.final ? 0.15 : 1) * Math.max(1, scale * 0.8);
    // keep chunks around the camera; far scenery needs a wider band because of perspective
    const reach = viewW * 2 + 120;
    const a = Math.floor((camX - reach) / CHUNK), b = Math.floor((camX + reach) / CHUNK);
    for (let i = a; i <= b; i++) if (!this.chunks.has(i)) this.makeChunk(i);
    for (const [i, c] of this.chunks) if (i < a - 2 || i > b + 2) { this.root.remove(c); this.chunks.delete(i); }
  }
  makeChunk(i) {
    const g = new THREE.Group(), r = rng(i * 7919 + this.level.id.length * 104729 + 13);
    for (const d of this.level.decor) {
      const [kind, density, color, mn, mx] = d;
      const n = Math.floor(density * 1.1 + r());
      for (let k = 0; k < n; k++) {
        const range = SIZES[kind] || [3, 6];
        const size = (mn || range[0]) + r() * ((mx || range[1]) - (mn || range[0]));
        const far = kind === 'skyline' || kind === 'mesa' || kind === 'dune' || kind === 'smoke' || kind === 'farship' || kind === 'cranebg';
        const z = far ? -(40 + r() * 200) : -(6 + r() * 70);
        const m = this.makeDecor(kind, color, r);
        if (!m) continue;
        m.scale.setScalar(size);
        m.position.set(i * CHUNK + r() * CHUNK, 0, z);
        if (z < -30) m.traverse((o) => { o.castShadow = false; });
        g.add(m);
      }
    }
    this.root.add(g);
    this.chunks.set(i, g);
  }
  makeDecor(kind, color, r) {
    switch (kind) {
      case 'grass': return build('plant', { kind: 'grass', color });
      case 'mushroom': return build('blob', { shape: 'mushroom', color });
      case 'leaf': { const m = build('blob', { shape: 'leaf', color }); m.rotation.y = r() * 3; return m; }
      case 'pebble': return build('blob', { shape: 'rock', color });
      case 'flower': return build('plant', { kind: 'flower', color });
      case 'tree': return build('plant', { kind: 'tree', color });
      case 'bush': return build('plant', { kind: 'bush', color });
      case 'cactus': return build('plant', { kind: 'cactus' });
      case 'table': return build('prop', { kind: 'bench' });
      case 'house': return build('building', { kind: 'house', w: 2, h: 1.6, d: 1.2, color, roof: r() < 0.5 ? '#7a2e2a' : '#3a4a5a', by: 'w' });
      case 'fence': return build('prop', { kind: 'fence' });
      case 'skyline': {
        const tall = r() < 0.35;
        return build('building', tall ? { kind: 'tower', w: 1, h: 3 + r() * 2, d: 1, color, lit: this.level.night ? '#ffd27f' : '#cfe3f2' }
          : { w: 1, h: 1 + r() * 2, d: 1, color, lit: this.level.night ? '#ffd27f' : '#cfe3f2' });
      }
      case 'blanket': { const g = new THREE.Group(); part(g, 'box', color, [1, 0.01, 0.8], [0, 0.005, 0]); part(g, 'box', '#ffffff', [0.12, 0.012, 0.8], [0.2, 0.006, 0]); part(g, 'box', '#ffffff', [1, 0.012, 0.12], [0, 0.006, 0.1]); return g; }
      case 'dune': { const g = new THREE.Group(); part(g, 'sphere', color, [2, 0.5, 1.2], [0, 0, 0]); return g; }
      case 'mesa': { const g = new THREE.Group(); part(g, 'cyl', color, [1.2, 0.7, 0.9], [0, 0.35, 0]); part(g, 'cyl', color, [0.8, 0.4, 0.7], [0.1, 0.85, 0]); return g; }
      case 'smoke': {
        const g = new THREE.Group();
        for (let k = 0; k < 5; k++) part(g, 'sphere', mat(color, { opacity: 0.55 }), [0.35 + k * 0.08, 0.3 + k * 0.06, 0.3], [k * 0.08, k * 0.28, 0]);
        g.userData.smoke = true;
        return g;
      }
      case 'reeds': return build('plant', { kind: 'grass', color });
      case 'cattail': { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const x = (r() - 0.5) * 0.4; part(g, 'cyl', '#5a8a3a', [0.03, 1, 0.03], [x, 0.5, 0]); part(g, 'cyl', color, [0.09, 0.22, 0.09], [x, 0.9, 0]); } return g; }
      case 'lily': { const g = new THREE.Group(); part(g, 'cyl', color, [1, 0.02, 1], [0, 0.01, 0]); if (r() < 0.4) part(g, 'sphere', '#f2a8c8', [0.25, 0.18, 0.25], [0.1, 0.1, 0]); return g; }
      case 'cornrow': { const g = new THREE.Group(); for (let k = 0; k < 6; k++) { const m = build('farm', { kind: 'corn' }); m.position.set(k * 0.35 - 1, 0, (r() - 0.5) * 0.3); g.add(m); } return g; }
      case 'farmhouse': return build('farm', { kind: r() < 0.6 ? 'barn' : 'windmill', by: 'h' });
      case 'hayfield': return build('farm', { kind: 'hay' });
      case 'farship': return build('ship', { kind: r() < 0.5 ? 'cargo' : 'destroyer', color });
      case 'cranebg': return build('harbor', { kind: 'crane', by: 'h' });
      case 'lava': { const g = new THREE.Group(); part(g, 'sphere', glowMat(color), [1.4, 0.03, 0.5], [0, 0.01, 0]); return g; }
    }
    return null;
  }
}
