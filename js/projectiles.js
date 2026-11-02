// projectiles.js — bullets, shells, missiles, bombs, webs, gas, lasers, the player's acid, and
// area attacks (telegraphed strikes, shockwaves, rolling ground waves, frog tongues).
// Speeds and sizes scale with the bug (vs = view scale) so fights read the same at every size.
import * as THREE from 'three';
import { GEO, mat, glowMat } from './models.js';
import { rand, clamp, sign } from './util.js';

const TYPES = {
  bullet:  { speed: 24, r: 0.05, color: '#ffe066', glow: 1, stretch: 4, life: 2.5 },
  laser:   { speed: 40, r: 0.09, color: '#ff3b3b', glow: 1, stretch: 6, life: 1.5 },
  feather: { speed: 15, r: 0.12, color: '#1e1e26', stretch: 3, life: 2.5 },
  web:     { speed: 11, r: 0.22, color: '#f2f2f2', life: 2.5, slow: 2 },
  gas:     { speed: 3.5, r: 0.7, color: '#9bd35a', opacity: 0.45, life: 4, dot: 1, slow: 0.5 },
  shell:   { speed: 0, r: 0.14, color: '#3a3a3a', gravity: 1, explode: 1.0, life: 6 },
  bomb:    { speed: 0, r: 0.16, color: '#2a2a2a', gravity: 1, explode: 1.0, life: 6 },
  missile: { speed: 9, r: 0.12, color: '#e8e8e8', homing: 2.2, explode: 0.8, life: 4.5, smoke: 1, stretch: 3 },
  acid:    { speed: 18, r: 0.16, color: '#9dff3a', glow: 1, gravity: 0.6, life: 3, friendly: 1, splash: 0.9 },
  bubble:  { speed: 7, r: 0.22, color: '#bfe8ff', opacity: 0.55, life: 3, wobble: 1 },
  hay:     { speed: 0, r: 0.3, color: '#d9b44a', gravity: 1, explode: 0.9, life: 6 },
  silk:    { speed: 22, r: 0.14, color: '#ffffff', glow: 1, gravity: 0.25, life: 2, friendly: 1 },
  quill:   { speed: 26, r: 0.07, color: '#e8e2d0', stretch: 5, life: 1.2, friendly: 1 },
  wave:    { speed: 13, r: 0.5, color: '#8a6a3a', life: 1.1, ground: 1 }
};

export class Projectiles {
  constructor(game) { this.g = game; this.list = []; this.strikes = []; this.tongues = []; this.puddles = []; }
  get vs() { return this.g.player.size; }
  makeMesh(t, r) {
    const T = TYPES[t];
    const m = new THREE.Mesh(T.homing || t === 'missile' ? GEO.cone : GEO.lowSphere, T.glow ? glowMat(T.color) : mat(T.color, T.opacity ? { opacity: T.opacity } : {}));
    m.scale.set(r * 2 * (T.stretch || 1), r * 2, r * 2);
    if (t === 'missile') m.scale.set(r * 2, r * 2 * (T.stretch || 1), r * 2);
    this.g.scene.add(m);
    return m;
  }
  // a shooter (entity) fires at the player. opts: spread, dmg, tx, ty, angle, from ('eye'|'top'), up
  fire(e, type, opts = {}) {
    const g = this.g, p = g.player, vs = this.vs, T = TYPES[type];
    if (!T) return;
    const sx = e.x + e.dir * e.w * 0.8, sy = opts.from === 'top' ? e.y + e.h : opts.from === 'eye' ? e.y + e.h * 0.9 : e.y + e.h * (e.flying ? 0.3 : 0.6);
    const tx = opts.tx != null ? opts.tx : p.x, ty = opts.ty != null ? opts.ty : p.y + p.h() * 0.5;
    const r = Math.max(T.r * vs, Math.min(e.size * 0.08, vs * 0.2));
    const pr = { type, T, x: sx, y: sy, r, dmg: opts.dmg != null ? opts.dmg : (e.def.dmg || 5), hostile: true, life: T.life, t: 0, src: e };
    if (T.gravity) {
      if (type === 'bomb') { pr.vx = e.vx * 0.6; pr.vy = 0; }
      else { // lob to land on the target
        const tt = clamp(Math.abs(tx - sx) / (vs * 9), 0.8, 2.2), gr = g.gravity() * T.gravity;
        pr.vx = (tx - sx) / tt; pr.vy = (ty - sy) / tt + 0.5 * gr * tt;
      }
    } else {
      let a = opts.angle != null ? opts.angle : Math.atan2(ty - sy, tx - sx);
      if (opts.up) a = Math.PI / 2 + rand(-0.5, 0.5);
      a += opts.spread || 0;
      const sp = T.speed * vs * (opts.speedMul || 1);
      pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp;
    }
    pr.mesh = this.makeMesh(type, r);
    this.list.push(pr);
    if (type === 'bullet') g.sfx('bullet', sx, 0.5);
    else if (type === 'laser') g.sfx('laser', sx, 0.3);
    else if (type === 'missile') g.sfx('missile', sx, 0.6);
    else if (type === 'shell') g.sfx('cannon', sx, 0.6);
    else if (type === 'feather' || type === 'web') g.sfx('spit', sx, 0.6);
    g.fx.sparks(sx, sy, 0.5, 3, vs * 0.5, T.color, 4, 0.2);
  }
  // the player spits acid toward (tx, ty)
  acid(x, y, tx, ty, n, dmg, puddles) {
    const vs = this.vs;
    const base = Math.atan2(ty - y, tx - x);
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i / (n - 1) - 0.5) * 0.5 : 0);
      const sp = TYPES.acid.speed * vs * rand(0.9, 1.1);
      const pr = { type: 'acid', T: TYPES.acid, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + vs * 2, r: TYPES.acid.r * vs, dmg, hostile: false, life: 3, t: 0, puddle: puddles };
      pr.mesh = this.makeMesh('acid', pr.r);
      this.list.push(pr);
    }
    this.g.sfx('acid', x);
  }
  // the player's other projectiles (silk web shot, quill burst): type, origin, angle, damage
  friendly(type, x, y, angle, dmg, rank = 1) {
    const T = TYPES[type], vs = this.vs, sp = T.speed * vs;
    const pr = { type, T, x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, r: T.r * vs, dmg, hostile: false, life: T.life, t: 0, rank };
    pr.mesh = this.makeMesh(type, pr.r);
    this.list.push(pr);
  }
  // rolling ground shockwave
  wave(x, dir, dmg, hostile) {
    const vs = this.vs;
    for (const d of dir ? [dir] : [-1, 1]) {
      const pr = { type: 'wave', T: TYPES.wave, x, y: 0, vx: d * TYPES.wave.speed * vs, vy: 0, r: vs * 0.6, dmg, hostile, life: TYPES.wave.life, t: 0, hit: new Set() };
      pr.mesh = null;
      this.list.push(pr);
    }
  }
  tongue(e, tx, ty, dmg, reachMul = 1) {
    const g = this.g;
    const sx = e.x + e.dir * e.w * 0.9, sy = e.y + e.h * 0.55;
    const len = Math.min(Math.hypot(tx - sx, ty - sy), (e.def.range || 6) * reachMul + e.size);
    const ang = Math.atan2(ty - sy, tx - sx);
    const m = new THREE.Mesh(GEO.cyl, mat('#e86a8a'));
    m.rotation.z = ang - Math.PI / 2;
    g.scene.add(m);
    this.tongues.push({ e, sx, sy, ang, len, dmg, t: 0, m, hit: false, w: Math.max(e.size * 0.08, this.vs * 0.12) });
    g.sfx('tongue', sx);
  }
  // telegraphed hit at ground x after a delay. kind: bomb | orbital | bullets
  strike(x, delay, width, dmg, kind) {
    const g = this.g, vs = this.vs;
    const col = kind === 'orbital' ? '#ff3b3b' : kind === 'erupt' ? '#7fd8ff' : '#ffcc33';
    const m = new THREE.Mesh(GEO.cyl, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, depthWrite: false }));
    m.scale.set(width * 2, vs * 14, 0.1); m.position.set(x, vs * 7, 0.6);
    g.scene.add(m);
    this.strikes.push({ x, delay, t: 0, width, dmg, kind, m });
  }
  update(dt) {
    const g = this.g, p = g.player, vs = this.vs;
    for (const pr of this.list) {
      pr.t += dt; pr.life -= dt;
      const T = pr.T;
      if (T.gravity) pr.vy -= g.gravity() * T.gravity * dt;
      if (T.wobble) pr.vy += Math.sin(pr.t * 9) * vs * 6 * dt;
      if (T.homing && pr.hostile && pr.t > 0.25) {
        const want = Math.atan2(p.y + p.h() * 0.5 - pr.y, p.x - pr.x), cur = Math.atan2(pr.vy, pr.vx);
        let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        const na = cur + clamp(d, -T.homing * dt, T.homing * dt), sp = Math.hypot(pr.vx, pr.vy) * (1 + dt * 0.4);
        pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
      }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.mesh) {
        pr.mesh.position.set(pr.x, pr.y, 0.5);
        const a = Math.atan2(pr.vy, pr.vx);
        pr.mesh.rotation.z = pr.type === 'missile' ? a - Math.PI / 2 : a;
        if (pr.type === 'gas') pr.mesh.scale.setScalar(pr.r * 2 * (1 + pr.t * 0.3));
      }
      // walls stop every projectile, in both directions
      if (pr.x < g.bounds.min || pr.x > g.bounds.max) {
        pr.x = clamp(pr.x, g.bounds.min, g.bounds.max);
        g.fx.sparks(pr.x, pr.y, 0.5, 6, vs * 0.5, '#d8cfc0', 5, 0.3);
        if (T.explode || pr.type === 'acid') this.impact(pr); else if (Math.random() < 0.3) g.sfx('thud', pr.x, 0.3, 1.6);
        pr.life = 0; if (pr.mesh) pr.mesh.visible = false; continue;
      }
      if (T.smoke && Math.random() < dt * 30) g.fx.puff(pr.x - pr.vx * 0.02, pr.y - pr.vy * 0.02, 0.5, 1, pr.r * 1.5, '#cccccc', 0.2);
      if (pr.type === 'acid' && Math.random() < dt * 20) g.fx.sparks(pr.x, pr.y, 0.5, 1, vs * 0.5, '#9dff3a', 1, 0.3);
      if (pr.type === 'wave') {
        if (Math.random() < dt * 40) g.fx.burst(pr.x, 0, 0.5, 1, vs * 0.4, ['#8a6a3a', '#6b5030'], 0.5);
        for (const e of g.entities) if (!pr.hit.has(e) && !e.dead && !e.dying && e.y < vs * 0.8 && Math.abs(e.x - pr.x) < e.w + pr.r) {
          if (pr.hostile) continue;
          pr.hit.add(e); e.hurt(pr.dmg, { knock: vs * 4, dirX: sign(pr.vx), cause: 'quake' }); if (!e.isStructure) e.stun = Math.max(e.stun, 0.8);
        }
        if (pr.hostile && !pr.hit.has(p) && p.y < vs * 0.6 && Math.abs(p.x - pr.x) < p.size * 0.5 + pr.r) { pr.hit.add(p); p.hurt(pr.dmg, null, sign(pr.vx) * vs * 6); }
        continue;
      }
      // collisions
      if (pr.hostile) {
        if (pr.x > p.x - p.size * 0.5 - pr.r && pr.x < p.x + p.size * 0.5 + pr.r && pr.y > p.y - pr.r && pr.y < p.y + p.h() + pr.r) {
          if (T.dot) { p.hurt(pr.dmg * dt * 1.5, null, 0, true); p.slow = Math.max(p.slow, T.slow); continue; }
          p.hurt(pr.dmg, null, sign(pr.vx) * vs * 3);
          if (T.slow) { p.slow = Math.max(p.slow, T.slow); g.fx.pop('WEBBED!', p.x, p.y + p.h() * 1.4, 'info', '#ffffff'); }
          this.impact(pr); pr.life = 0; continue;
        }
      } else {
        for (const e of g.entities) {
          if (e.dead || e.dying || e.eaten) continue;
          if (e.distTo(pr.x, pr.y) < pr.r) { this.impact(pr, e); pr.life = 0; break; }
        }
      }
      if (pr.y < pr.r * 0.5 && pr.life > 0) { this.impact(pr); pr.life = 0; }
    }
    // remove spent
    let w = 0;
    for (const pr of this.list) { if (pr.life > 0) this.list[w++] = pr; else if (pr.mesh) g.scene.remove(pr.mesh); }
    this.list.length = w;
    // telegraphed strikes
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i]; s.t += dt;
      s.m.material.opacity = 0.12 + (Math.sin(s.t * 30) * 0.5 + 0.5) * 0.2 * (s.t / s.delay);
      if (s.t >= s.delay) {
        g.scene.remove(s.m); s.m.material.dispose(); this.strikes.splice(i, 1);
        if (s.kind === 'orbital') { g.fx.sparks(s.x, vs * 4, 0.5, 40, vs, '#ff6a6a', 10, 0.5); g.fx.ring(s.x, 0.1, s.width * 2, '#ff3b3b'); g.sfx('laser', s.x, 0.8, 0.5); }
        else if (s.kind === 'erupt') { g.fx.burst(s.x, 0, 0.5, 20, vs * 0.4, ['#9fd8e8', '#e8f8ff', '#5a8aa0'], 1.6); g.fx.puff(s.x, 0, 0.5, 6, vs * 0.6, '#e8f8ff', 2); g.sfx('splash', s.x, 1); }
        else if (s.kind === 'bomb') { g.fx.explode(s.x, 0.2, vs * 0.8); g.sfx('boom', s.x, 0.6); }
        else { g.fx.puff(s.x, 0, 0.5, 4, vs * 0.4, '#b8a27a'); g.sfx('bullet', s.x, 0.4); }
        if (Math.abs(p.x - s.x) < s.width + p.size * 0.4 && p.y < vs * (s.kind === 'orbital' ? 20 : s.kind === 'erupt' ? 3 : 2)) p.hurt(s.dmg, null, sign(p.x - s.x) * vs * 4);
        g.fx.shake(s.kind === 'bullets' ? 0.05 : 0.25);
      }
    }
    // tongues: shoot out, hit, retract
    for (let i = this.tongues.length - 1; i >= 0; i--) {
      const tg = this.tongues[i]; tg.t += dt;
      const k = tg.t < 0.18 ? tg.t / 0.18 : Math.max(0, 1 - (tg.t - 0.18) / 0.25);
      const L = tg.len * k;
      tg.m.scale.set(tg.w, L, tg.w);
      tg.m.position.set(tg.sx + Math.cos(tg.ang) * L / 2, tg.sy + Math.sin(tg.ang) * L / 2, 0.6);
      if (!tg.hit && tg.t >= 0.15 && tg.t < 0.25) {
        const ex = tg.sx + Math.cos(tg.ang) * L, ey = tg.sy + Math.sin(tg.ang) * L;
        if (Math.abs(p.x - ex) < p.size * 0.6 && ey > p.y - p.size * 0.3 && ey < p.y + p.h() + p.size * 0.3) {
          tg.hit = true; p.hurt(tg.dmg, tg.e, -sign(Math.cos(tg.ang)) * vs * 8);
          g.fx.pop('THWAP!', ex, ey, 'pow', '#ff7aa2');
        }
      }
      if (tg.t > 0.45 || tg.e.dead || tg.e.dying) { g.scene.remove(tg.m); this.tongues.splice(i, 1); }
    }
    // acid puddles hurt whatever stands in them
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const pd = this.puddles[i]; pd.t += dt;
      pd.m.scale.set(pd.r * 2, pd.r * 0.12, pd.r * 1.2);
      if (Math.random() < dt * 10) g.fx.sparks(pd.x + rand(-pd.r, pd.r), 0.1, 0.5, 1, vs * 0.4, '#9dff3a', 2, 0.5);
      for (const e of g.entities) if (!e.dead && !e.dying && e.y < pd.r && Math.abs(e.x - pd.x) < pd.r + e.w) e.hurt(pd.dmg * dt, { quiet: true, cause: 'acid' });
      if (pd.t > 3) { g.scene.remove(pd.m); this.puddles.splice(i, 1); }
    }
  }
  impact(pr, hitEnt) {
    const g = this.g, vs = this.vs, T = pr.T;
    if (pr.type === 'silk') { // wraps everything nearby in webbing
      const R = vs * (0.9 + 0.3 * pr.rank);
      g.fx.sparks(pr.x, pr.y, 0.5, 14, vs * 0.6, '#ffffff', 4, 0.5);
      g.sfx('web', pr.x);
      for (const e of g.entities) if (!e.dead && !e.dying && !e.isStructure && e.distTo(pr.x, pr.y) < R) {
        e.stun = Math.max(e.stun, e.kind === 'boss' ? 0.8 + 0.3 * pr.rank : 2.5 + pr.rank); e.webbed = e.stun; e.vx = 0;
        e.hurt(pr.dmg, { quiet: e.kind !== 'boss', cause: 'web' });
        g.fx.pop('WEBBED!', e.cx, e.y + e.h, 'info');
      }
      return;
    }
    if (pr.type === 'acid') {
      const R = vs * T.splash;
      g.fx.sparks(pr.x, pr.y, 0.5, 12, vs * 0.6, '#9dff3a', 5, 0.5);
      g.sfx('sizzle', pr.x, 0.7);
      if (hitEnt) hitEnt.hurt(pr.dmg, { cause: 'acid', crit: g.player.rollCrit() });
      for (const e of g.entities) if (e !== hitEnt && !e.dead && !e.dying && e.distTo(pr.x, pr.y) < R) e.hurt(pr.dmg * 0.5, { cause: 'acid' });
      if (pr.puddle) {
        const m = new THREE.Mesh(GEO.sphere, glowMat('#7ae82a'));
        m.position.set(pr.x, 0.02, 0.3); g.scene.add(m);
        this.puddles.push({ x: pr.x, r: vs * 0.9, dmg: pr.dmg * 0.8, t: 0, m });
      }
      return;
    }
    if (T.explode) {
      const R = vs * T.explode;
      g.fx.explode(pr.x, Math.max(pr.y, 0.1), vs * 0.7);
      g.sfx('boom', pr.x, 0.6);
      g.fx.shake(0.15);
      const p = g.player;
      if (pr.hostile) {
        const dx = p.x - pr.x, dy = p.y + p.h() * 0.5 - pr.y;
        if (Math.hypot(dx, dy) < R + p.size * 0.5) p.hurt(pr.dmg, null, sign(dx) * vs * 4);
      } else {
        for (const e of g.entities) if (!e.dead && !e.dying && e.distTo(pr.x, pr.y) < R) e.hurt(pr.dmg, { cause: 'blast' });
      }
      return;
    }
    g.fx.sparks(pr.x, pr.y, 0.5, 4, vs * 0.4, T.color, 3, 0.25);
    if (hitEnt) hitEnt.hurt(pr.dmg, { cause: 'shot' });
  }
  // the roar turns nearby hostile projectiles around
  reflect(x, y, radius) {
    let n = 0;
    for (const pr of this.list) {
      if (!pr.hostile || pr.type === 'wave') continue;
      if (Math.hypot(pr.x - x, pr.y - y) < radius) { pr.hostile = false; pr.vx = -pr.vx * 1.2; pr.vy = Math.abs(pr.vy) * 0.5; pr.dmg *= 3; n++; }
    }
    return n;
  }
  clear() {
    const g = this.g;
    for (const pr of this.list) if (pr.mesh) g.scene.remove(pr.mesh);
    for (const s of this.strikes) g.scene.remove(s.m);
    for (const t of this.tongues) g.scene.remove(t.m);
    for (const pd of this.puddles) g.scene.remove(pd.m);
    this.list.length = 0; this.strikes.length = 0; this.tongues.length = 0; this.puddles.length = 0;
  }
}
