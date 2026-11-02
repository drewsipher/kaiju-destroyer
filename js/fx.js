// fx.js — particles (two instanced pools: solid debris and glowing sparks), expanding shockwave
// rings, comic-book text popups (POW!, +120, CHOMP!) and camera shake / hit-stop.
import * as THREE from 'three';
import { rand, TAU } from './util.js';
import { GEO, mat } from './models.js';

const MAX_DEBRIS = 1800, MAX_SPARK = 1200;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

class Pool {
  constructor(scene, geo, material, max) {
    this.mesh = new THREE.InstancedMesh(geo, material, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    this.max = max; this.items = [];
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, _c.set('#fff'));
    scene.add(this.mesh);
  }
  add(p) { if (this.items.length >= this.max) this.items.shift(); this.items.push(p); }
  update(dt, gravity) {
    const it = this.items;
    let w = 0;
    for (let i = 0; i < it.length; i++) {
      const p = it[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= (p.g == null ? gravity : p.g * gravity) * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < p.s * 0.4 && p.bounce !== false) { p.y = p.s * 0.4; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; p.spin *= 0.5; }
      p.rx += p.spin * dt; p.ry += p.spin * 0.7 * dt;
      it[w++] = p;
    }
    it.length = w;
    for (let i = 0; i < w; i++) {
      const p = it[i];
      const k = p.shrink ? Math.max(0.01, p.life / p.max) : Math.min(1, p.life * 3);
      _e.set(p.rx, p.ry, 0); _q.setFromEuler(_e);
      _s.set(p.s * k * (p.sx || 1), p.s * k, p.s * k); _p.set(p.x, p.y, p.z);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
      this.mesh.setColorAt(i, _c.set(p.c));
    }
    this.mesh.count = w;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  clear() { this.items.length = 0; this.mesh.count = 0; }
}

export class FX {
  constructor(scene, camera, layer) {
    this.scene = scene; this.camera = camera; this.layer = layer;
    this.debris = new Pool(scene, GEO.box, mat('#ffffff'), MAX_DEBRIS);
    const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.spark = new Pool(scene, GEO.lowSphere, sparkMat, MAX_SPARK);
    const smokeMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false });
    this.smoke = new Pool(scene, GEO.lowSphere, smokeMat, 1100);
    this.rings = [];
    this.popups = [];
    this.shakeAmt = 0; this.stop = 0;
    this.gravity = 40;
  }
  // chunks of material flying out (destruction)
  burst(x, y, z, n, size, colors, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(4, 14) * power * size;
      this.debris.add({ x: x + rand(-0.5, 0.5) * size, y: y + rand(0, 0.8) * size, z: z + rand(-0.5, 0.5) * size, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp + rand(2, 8) * size, vz: rand(-4, 4) * size,
        s: size * rand(0.12, 0.35), c: colors[i % colors.length], life: rand(0.8, 1.8), max: 1.8, spin: rand(-12, 12), rx: rand(0, 6), ry: rand(0, 6), drag: 0.6, g: 0.7 });
    }
  }
  sparks(x, y, z, n, size, color, speed = 8, life = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(0.3, 1) * speed * size;
      this.spark.add({ x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(-1, 1) * sp * 0.4, s: size * rand(0.08, 0.2), c: color, life: rand(life * 0.5, life), max: life, spin: 0, rx: 0, ry: 0, g: 0, drag: 3, shrink: true, bounce: false });
    }
  }
  puff(x, y, z, n, size, color = '#bbbbbb', rise = 1, life = 1) {
    for (let i = 0; i < n; i++) {
      this.smoke.add({ x: x + rand(-0.4, 0.4) * size, y: y + rand(0, 0.4) * size, z: z + rand(-0.3, 0.3) * size, vx: rand(-1.5, 1.5) * size, vy: rand(0.5, 2) * size * rise, vz: rand(-0.5, 0.5) * size,
        s: size * rand(0.4, 0.9), c: color, life: rand(0.6, 1.4) * life, max: 1.4 * life, spin: 0, rx: 0, ry: 0, g: 0, drag: 1.5, shrink: true, bounce: false });
    }
  }
  // a collapse's dust cloud: rolls outward along the ground and hangs in the air for seconds
  dust(cx, halfW, h, size) {
    for (let i = 0; i < 26; i++) {
      const low = i < 16;
      this.smoke.add({ x: cx + rand(-1, 1) * (halfW + size), y: low ? rand(0, 0.3) * size : rand(0.2, 0.9) * h, z: rand(-0.6, 0.6) * size,
        vx: rand(-1, 1) * size * (low ? 2.5 : 0.8), vy: rand(0.2, 0.8) * size, vz: rand(-0.4, 0.4) * size,
        s: size * rand(0.7, 1.4), c: i % 3 ? '#b8ad9c' : '#9a8f80', life: rand(2.2, 4), max: 4, spin: 0, rx: 0, ry: 0, g: 0, drag: 0.8, shrink: true, bounce: false });
    }
  }
  explode(x, y, size, colors = ['#ffcc33', '#ff6a1e', '#ff3b1e']) {
    this.sparks(x, y, 0.5, 26, size, colors[0], 10, 0.6);
    this.sparks(x, y, 0.5, 14, size * 1.4, colors[1], 6, 0.5);
    this.puff(x, y, 0, 8, size, '#555555', 1.2);
    this.ring(x, y + 0.05, size * 3, '#ffb347');
  }
  ring(x, y, radius, color = '#ffffff', dur = 0.45) {
    const m = new THREE.Mesh(GEO.torus, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = Math.PI / 2; m.position.set(x, y, 0);
    this.scene.add(m);
    this.rings.push({ m, t: 0, dur, r: radius });
  }
  // jagged lightning between two points (Storm Antennae)
  bolt(x1, y1, x2, y2, size) {
    const n = 6, pts = [];
    for (let i = 0; i <= n; i++) { const k = i / n; pts.push([x1 + (x2 - x1) * k + (i && i < n ? rand(-0.3, 0.3) * size : 0), y1 + (y2 - y1) * k + (i && i < n ? rand(-0.3, 0.3) * size : 0)]); }
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay);
      const m = new THREE.Mesh(GEO.cyl, new THREE.MeshBasicMaterial({ color: '#bff4ff', transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.scale.set(size * 0.06, len, size * 0.06); m.position.set((ax + bx) / 2, (ay + by) / 2, 0.6); m.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
      this.scene.add(m);
      this.rings.push({ m, t: 0, dur: 0.18, bolt: true });
    }
    this.sparks(x2, y2, 0.6, 4, size * 0.5, '#bff4ff', 6, 0.25);
  }
  shake(amount) { this.shakeAmt = Math.max(this.shakeAmt, amount); }
  hitstop(sec) { this.stop = Math.max(this.stop, sec); }
  // comic popup at a world position. style: 'pts' | 'pow' | 'big' | 'dmg' | 'info'
  pop(text, x, y, style = 'pts', color) {
    let el = this.popups.find((p) => !p.alive);
    if (!el) {
      if (this.popups.length > 60) return;
      const d = document.createElement('div'); d.className = 'pop'; this.layer.appendChild(d);
      el = { d, alive: false }; this.popups.push(el);
    }
    el.alive = true; el.t = 0; el.x = x; el.y = y;
    el.dur = style === 'big' ? 1.3 : style === 'pow' ? 0.7 : 0.9;
    el.d.className = 'pop ' + style;
    el.d.textContent = text;
    el.d.style.color = color || '';
    el.d.style.display = 'block';
    el.rot = style === 'pow' || style === 'big' ? rand(-14, 14) : 0;
  }
  update(dt, viewScale) {
    this.gravity = 40 * viewScale;
    this.debris.update(dt, this.gravity);
    this.spark.update(dt, this.gravity);
    this.smoke.update(dt, this.gravity);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t += dt;
      const k = r.t / r.dur;
      if (!r.bolt) r.m.scale.set(r.r * 2 * k, r.r * 2 * k, r.r * 0.6);
      r.m.material.opacity = 0.8 * (1 - k);
      if (k >= 1) { this.scene.remove(r.m); r.m.material.dispose(); this.rings.splice(i, 1); }
    }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.5);
    // popups follow their world point
    const w = window.innerWidth, h = window.innerHeight, v = new THREE.Vector3();
    for (const p of this.popups) {
      if (!p.alive) continue;
      p.t += dt;
      if (p.t >= p.dur) { p.alive = false; p.d.style.display = 'none'; continue; }
      v.set(p.x, p.y, 0).project(this.camera);
      const k = p.t / p.dur;
      const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h - k * 50;
      const sc = p.t < 0.1 ? 0.4 + p.t * 8 : 1;
      p.d.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%) rotate(${p.rot}deg) scale(${sc})`;
      p.d.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
    }
  }
  clear() {
    this.debris.clear(); this.spark.clear(); this.smoke.clear();
    for (const r of this.rings) this.scene.remove(r.m);
    this.rings.length = 0;
    for (const p of this.popups) { p.alive = false; p.d.style.display = 'none'; }
    this.shakeAmt = 0; this.stop = 0;
  }
}
