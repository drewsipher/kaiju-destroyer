// game.js — one level being played: owns the player, entities, projectiles, spawning, scoring,
// the boss fight and the camera. main.js creates a Game per level and listens for its callbacks:
//   onComplete(result), onDeath(result), onVictory(result)
import * as THREE from 'three';
import { Player } from './player.js';
import { Entity, Orb } from './entities.js';
import { Projectiles } from './projectiles.js';
import { World } from './world.js';
import { Debris } from './debris.js';
import { Walls, wallHalf } from './walls.js';
import { ENTITIES } from './data/entities.js';
import { rand, clamp, weighted, sign } from './util.js';
import { sfx, music } from './sound.js';

const _v = new THREE.Vector3(), _ray = new THREE.Raycaster(), _plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), _hit = new THREE.Vector3();

export class Game {
  constructor(ctx, level, levelIndex, profile, cb) {
    this.ctx = ctx; this.level = level; this.levelIndex = levelIndex; this.cb = cb;
    this.scene = ctx.renderer.scene; this.camera = ctx.renderer.camera; this.fx = ctx.fx; this.input = ctx.input; this.hud = ctx.hud;
    this.world = ctx.world; this.world.load(level);
    this.entities = []; this.orbs = [];
    this.proj = new Projectiles(this);
    this.debris = new Debris(this);
    this.walls = new Walls(this.scene, level.wall || 'boulders');
    this.rampageT = 0;
    // enemies toughen through the campaign and much more in New Game+
    this.ng = profile.ng || 0;
    this.enemyHp = (1 + 0.06 * levelIndex) * (1 + 0.6 * this.ng);
    this.enemyDmg = 1 + 0.45 * this.ng;
    this.player = new Player(this, profile.stats, profile.design, profile.colors, profile.extras);
    this.time = 0; this.score = 0; this.combo = 0; this.comboT = 0; this.maxCombo = 0;
    this.stats = { eaten: 0, smashed: 0, dna: 0, hits: 0 };
    this.phase = 'grow'; this.phaseT = 0; this.boss = null; this.finale = 0;
    this.bounds = { min: -8, max: Infinity };
    this.maxX = 0; this.nextStructX = 8; this.spawnT = 0; this.helixAt = [0.45, 0.85].map((k) => 1 + (level.goal - 1) * k);
    this.camX = 0; this.camY = 2; this.camDist = 12; this.viewW = 20;
    this.mouseWorld = { x: 1, y: 0.5 };
    this.dead = false; this.over = false;
    this.ctx.renderer.r.setClearColor(level.fog);
    music.start(level.music);
    this.updateCamera(1, true);
    this.walls.set('left', -this.viewW * 0.7);
    this.bounds.min = -this.viewW * 0.7 + wallHalf(1);
    // a few things to eat right away
    for (let i = 0; i < 10; i++) this.spawnCreature(rand(3, this.viewW * 0.9));
  }
  dispose() {
    for (const e of this.entities) e.remove();
    for (const o of this.orbs) o.remove();
    this.proj.clear(); this.fx.clear(); this.player.dispose(); this.world.clear(); this.debris.dispose(); this.walls.dispose();
    this.entities.length = 0; this.orbs.length = 0;
  }
  // ---------- helpers used by entities / projectiles / bosses ----------
  gravity() { return 40 * this.player.size; }
  viewScale() { return this.player.size; }
  onScreen(e) { return Math.abs(e.x - this.camX) < this.viewW * 0.55; }
  flyScale() { return 1 + (this.player.size - 1) * 0.25; }
  // growth per meal: kept low so each level is a long rampage before the boss shows up
  massValue(size) { const s = Math.min(size, this.player.size * 1.5); return 0.16 * s * s; }
  sfx(name, x, vol = 1, pitch = 1) {
    const dx = x == null ? 0 : (x - this.camX) / Math.max(1, this.viewW * 0.5);
    const far = Math.abs(dx) > 1.3 ? 0.35 : 1;
    sfx.play(name, { pan: clamp(dx, -1, 1) * 0.8, vol: vol * far, pitch });
  }
  spawn(id, x, y = 0, scaleMul = 1) {
    if (!ENTITIES[id]) return null;
    const e = new Entity(this, id, x, y, scaleMul);
    this.entities.push(e);
    return e;
  }
  spawnOrb(x, y, mass) { if (this.orbs.length < 120) this.orbs.push(new Orb(this, x, y, mass)); else this.player.addMass(mass); }
  shoot(e, type, opts) { this.proj.fire(e, type, opts); }
  tongue(e, x, y, dmg, reach) { this.proj.tongue(e, x, y, dmg, reach); }
  strike(x, delay, width, dmg, kind) { this.proj.strike(x, delay, width, dmg, kind); }
  groundWave(x, dir, dmg, hostile) { this.proj.wave(x, dir, dmg, hostile); }
  shockwave(x, y, R, dmg, hostile) {
    const p = this.player;
    this.fx.ring(x, y + 0.05, R, hostile ? '#ff9a5a' : '#ffffff');
    this.fx.burst(x, 0, 0.5, 14, Math.min(R * 0.15, p.size * 0.4), [this.level.ground, this.level.ground2], 1);
    this.fx.puff(x, 0, 0.5, 6, R * 0.3, '#c8b8a0', 0.6);
    this.fx.shake(hostile ? 0.45 : 0.35);
    this.sfx('stomp', x, 1, hostile ? 0.6 : 1);
    if (hostile) {
      if (Math.abs(p.x - x) < R + p.size * 0.4 && p.y < R * 0.6) p.hurt(dmg, null, sign(p.x - x) * p.size * 8);
    } else {
      this.fx.pop('BOOM!', x, R * 0.5, 'pow');
      for (const e of this.entities) if (!e.dead && !e.dying && !e.eaten && e.distTo(x, y) < R) {
        const crit = p.rollCrit();
        e.hurt(dmg, { crit, knock: p.size * 6, dirX: sign(e.x - x), cause: 'stomp' });
        if (!e.isStructure && e.kind !== 'boss') { e.stun = Math.max(e.stun, 1); e.vy = p.size * 6; }
      }
    }
  }
  // ---------- scoring ----------
  addScore(pts, x, y, eaten) {
    this.combo++; this.comboT = 2.5; this.maxCombo = Math.max(this.maxCombo, this.combo);
    const mult = this.comboMult();
    const n = Math.round(pts * this.player.stats.scoreMult * mult * (this.phase === 'rampage' ? 2 : 1));
    this.score += n;
    this.fx.pop('+' + n, x, y, 'pts', mult > 1 ? '#ffd23f' : null);
    if (this.combo % 10 === 0) this.fx.pop(this.combo + ' COMBO!', this.player.x, this.player.y + this.player.h() * 2.6, 'big', '#ffd23f');
    const p = this.player;
    if (p.frenzyT <= 0 && p.frenzy < 1) {
      p.frenzy = Math.min(1, p.frenzy + (eaten ? 0.04 : 0.05) * p.stats.frenzyGain);
      if (p.frenzy >= 1) { this.fx.pop('FRENZY READY! [F]', p.x, p.y + p.h() * 2.6, 'big', '#ff5af0'); this.sfx('crit', p.x); }
    }
  }
  comboMult() { return 1 + Math.min(4, Math.floor(this.combo / 5) * 0.5); }
  eat(e) {
    const p = this.player;
    e.eaten = 0.0001;
    this.stats.eaten++;
    p.addMass(this.massValue(e.size));
    p.heal((e.def.heal || 0) + p.stats.healOnEat * 1.5 + e.size / p.size * 4 * p.stats.healOnEat);
    this.addScore(e.def.pts, e.cx, e.y + e.h + p.size * 0.2, true);
    this.fx.sparks(e.cx, e.cy, 0.5, 4, p.size * 0.5, '#fff6c8', 4, 0.25);
    if (e.size > p.size * 0.5) { this.fx.pop('GULP!', e.cx, e.y + e.h + p.size * 0.6, 'pow'); this.fx.shake(0.08); }
    if (e.def.scream) this.sfx('scream', e.x, 0.4, 1.3);
  }
  collectOrb(o) {
    this.player.addMass(o.mass);
    this.fx.sparks(o.x, o.y, 0.5, 3, this.player.size * 0.4, '#8dff5a', 3, 0.3);
    this.sfx('pop', o.x, 0.35, 1 + Math.random() * 0.5);
  }
  pickup(e) {
    if (e.eaten || e.dead) return;
    e.eaten = 0.0001;
    const p = this.player;
    if (e.def.pickup === 'dna') {
      this.stats.dna++;
      this.fx.pop('+1 DNA', e.cx, e.cy + p.size, 'big', '#ffd54f'); this.sfx('dna', e.x);
    } else if (e.def.pickup === 'heal') {
      p.heal(p.stats.maxHp * 0.35);
      this.fx.pop('+HEALTH', e.cx, e.cy + p.size, 'pow', '#ff7a9a'); this.sfx('heal', e.x);
    }
    this.score += e.def.pts;
  }
  onKill(e) {
    if (e.isStructure) this.stats.smashed++;
    if (e === this.boss) {
      this.phase = 'cleared'; this.phaseT = 0;
      this.fx.pop('BOSS DESTROYED!', e.cx, e.y + e.h * 1.2, 'big', '#ffd23f');
      this.fx.hitstop(0.25); this.fx.shake(1);
      this.sfx('collapse', e.x, 1); this.sfx('levelup', e.x, 1);
      this.hud.banner(this.level.final ? 'THE CORE IS CRACKING...' : 'RAMPAGE! EVERYTHING ×2 POINTS', 3.5);
      if (!this.level.final) {
        // after the boss: the arena opens up for a timed rampage before the level ends
        this.phase = 'rampage'; this.rampageT = 40; this.walls.lower('right'); this.bounds.max = Infinity;
        this.nextStructX = Math.max(this.nextStructX, this.player.x + this.viewW * 0.6);
      }
      this.spawn('helix', e.x, e.y + e.h * 0.5, this.player.size);
      music.setIntensity(0);
    }
  }
  onGrow(size) {
    if (this.helixAt.length && size >= this.helixAt[0]) {
      this.helixAt.shift();
      const p = this.player;
      this.spawn('helix', p.x + p.facing * this.viewW * 0.4, p.size * 1.2, p.size);
    }
  }
  onPlayerDeath() {
    this.dead = true; this.phaseT = 0;
    const p = this.player;
    this.fx.burst(p.x, p.y + p.h() * 0.5, 0, 40, p.size * 0.6, [p.colors.body, '#222', '#e8e2d0'], 1.2);
    this.sfx('ko', p.x, 1, 0.6);
    p.model.visible = false;
    this.hud.banner('SQUASHED!', 2.5);
  }
  result() {
    return { score: this.score, eaten: this.stats.eaten, smashed: this.stats.smashed, dna: this.stats.dna, maxCombo: this.maxCombo, time: this.time, size: this.player.size };
  }

  // ---------- spawning ----------
  suit(def) {
    const r = def.size / this.player.size;
    if (def.kind === 'pickup') return 1;
    return r < 0.08 ? 0.05 : r < 0.2 ? 0.5 : r <= 1.4 ? 1.4 : r <= 2.5 ? 0.7 : r <= 4 ? 0.2 : r <= 7 ? 0.05 : 0;
  }
  spawnCreature(x) {
    const pick = weighted(this.level.spawns, ([id, w]) => w * this.suit(ENTITIES[id]));
    if (!pick) return;
    const def = ENTITIES[pick[0]];
    if (def.ai === 'bomber' && this.entities.some((e) => e.def.ai === 'bomber' && !e.dead)) return;
    this.spawn(pick[0], x, 0, def.kind === 'pickup' ? this.player.size : rand(0.85, 1.2));
  }
  spawner(dt) {
    const p = this.player, vw = this.viewW;
    // creatures: keep a lively population around the camera
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 0.3;
      let n = 0;
      for (const e of this.entities) if (!e.isStructure && e.kind !== 'boss' && Math.abs(e.x - this.camX) < vw * 1.5) n++;
      const target = (this.phase === 'grow' ? 16 : this.phase === 'rampage' ? 20 : 6) + this.levelIndex;
      if (n < target) {
        const ahead = Math.random() < 0.75;
        let x = ahead ? this.camX + vw * rand(0.55, 0.95) : this.camX - vw * rand(0.55, 0.8);
        if (this.phase === 'boss') x = clamp(x, this.bounds.min + p.size, this.bounds.max - p.size);
        if (x > this.bounds.min + p.size && x < this.bounds.max - p.size) this.spawnCreature(x);
      }
    }
    // structures along the ground ahead
    if (this.level.structures.length && (this.phase === 'grow' || this.phase === 'rampage')) {
      if (this.nextStructX < this.bounds.min) this.nextStructX = this.bounds.min + p.size * 3;
      while (this.nextStructX < this.camX + vw * 1.3) {
        const pick = weighted(this.level.structures, ([id, w]) => { const r = ENTITIES[id].size / p.size; return w * (r > 14 ? 0 : r > 7 ? 0.25 : r < 0.25 ? 0.2 : 1); });
        if (!pick) { this.nextStructX += vw; break; }
        const e = this.spawn(pick[0], this.nextStructX, 0, rand(0.9, 1.15));
        this.nextStructX += e.w * 2 + rand(0.6, 2.6) * Math.max(p.size * 1.6, e.w * 0.8);
      }
    }
    // cull what's far behind or far ahead
    for (const e of this.entities) {
      if (e.kind === 'boss' || e.dead) continue;
      if (e.x < this.camX - vw * 1.7 || e.x > this.camX + vw * 3) { e.dead = true; e.culled = true; }
    }
  }

  // ---------- main update ----------
  update(dt) {
    const fx = this.fx;
    if (fx.stop > 0) { fx.stop -= dt; dt *= 0.05; }
    this.time += dt;
    const p = this.player;
    this.updateMouse();
    if (!this.dead && !this.finale) p.update(dt, this.input);
    else if (this.finale) p.model.userData.update(dt, { moving: false, airborne: false });
    for (const e of this.entities) e.update(dt);
    // walls are solid for everything that moves
    const bmin = this.bounds.min, bmax = this.bounds.max;
    for (const e of this.entities) {
      if (e.isStructure || e.dying || e.eaten || e.kind === 'pickup') continue;
      if (e.x - e.w < bmin) { e.x = bmin + e.w; e.vx = Math.abs(e.vx) * 0.3; }
      if (e.x + e.w > bmax) { e.x = bmax - e.w; e.vx = -Math.abs(e.vx) * 0.3; }
    }
    this.debris.update(dt);
    this.walls.update(dt, p.shownSize, (x, k) => { if (Math.random() < 0.3) { this.fx.puff(x, 0, 0.5, 2, p.size, '#b8ad9c', 0.6, 1.5); this.fx.shake(0.15); } });
    // a ceiling just above the tallest nearby building, so nothing can launch you into the sky
    let top = p.size * 10;
    for (const e of this.entities) if (e.isStructure && !e.dying && Math.abs(e.x - p.x) < this.viewW) top = Math.max(top, e.y + e.h + p.size * 4);
    this.ceiling = top;
    for (const o of this.orbs) o.update(dt);
    this.proj.update(dt);
    // drop finished things
    let w = 0;
    for (const e of this.entities) { if (e.dead) e.remove(); else this.entities[w++] = e; }
    this.entities.length = w;
    w = 0;
    for (const o of this.orbs) { if (o.dead) o.remove(); else this.orbs[w++] = o; }
    this.orbs.length = w;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    if (!this.finale) this.spawner(dt);
    this.updatePhase(dt);
    this.updateCamera(dt);
    this.world.update(this.camX, p.size, this.viewW);
    fx.update(dt, p.size);
    this.hud.update(this);
  }
  updatePhase(dt) {
    const p = this.player, L = this.level;
    this.phaseT += dt;
    this.maxX = Math.max(this.maxX, p.x);
    if (this.phase === 'grow' || this.phase === 'rampage') {
      this.leftWall();
      this.bounds.max = Infinity;
      if (this.phase === 'rampage') this.updateRampage(dt);
      else if (p.size >= L.goal) {
        this.phase = 'warn'; this.phaseT = 0;
        this.hud.banner('WARNING: ' + ENTITIES[L.boss].name.toUpperCase() + ' APPROACHES', 3, 'warn');
        this.sfx('warning', p.x, 1); music.setIntensity(1);
      }
    } else if (this.phase === 'warn') {
      if (this.phaseT > 2.6) {
        this.phase = 'boss'; this.phaseT = 0;
        const bx = p.x + this.viewW * 0.42;
        this.boss = this.spawn(L.boss, bx, 0, L.goal);
        this.boss.dir = -1;
        // the arena: two walls rise out of the ground; anything caught outside them is gone
        const lo = bx - this.viewW * 1.1, hi = bx + this.viewW * 0.35;
        this.walls.set('left', lo, true); this.walls.set('right', hi, true);
        this.bounds.min = lo + wallHalf(p.size); this.bounds.max = hi - wallHalf(p.size);
        for (const e of this.entities) if (e !== this.boss && (e.x < this.bounds.min || e.x > this.bounds.max)) e.dead = true;
        this.sfx('collapse', bx, 0.8, 0.5); this.fx.shake(0.6);
        this.hud.bossBar(this.boss);
      }
    } else if (this.phase === 'boss') {
      const b = this.boss;
      if (b && !b.dying) b.x = clamp(b.x, this.bounds.min + b.w, this.bounds.max - b.w * 0.5);
    } else if (this.phase === 'cleared') {
      this.runFinale(dt);
    } else if (this.phase === 'done') {
      if (this.phaseT > 2.8 && !this.over) { this.over = true; this.cb.onComplete(this.result()); }
    }
    if (this.dead && !this.over) { this.phaseT += 0; this.deadT = (this.deadT || 0) + dt; if (this.deadT > 2.2) { this.over = true; this.cb.onDeath(this.result()); } }
  }
  // the left wall keeps you moving forward, but it only jumps ahead while it's off-screen
  leftWall() {
    const p = this.player, cur = this.walls.x('left');
    const target = this.maxX - this.viewW * 1.0;
    if (cur == null || (target > cur && cur < this.camX - this.viewW * 0.62)) this.walls.set('left', target);
    this.bounds.min = this.walls.x('left') + wallHalf(p.size);
  }
  updateRampage(dt) {
    this.rampageT -= dt;
    if (this.rampageT <= 0 || this.input.hit('finish')) {
      this.phase = 'done'; this.phaseT = 0;
      this.hud.banner('LEVEL CLEAR!', 2.6); this.sfx('levelup', this.player.x, 1);
    }
  }
  runFinale(dt) {
    this.finale += dt;
    const p = this.player, s = p.size;
    this.fx.shake(0.6 + this.finale * 0.1);
    if (Math.random() < dt * 14) { const x = this.camX + rand(-0.6, 0.6) * this.viewW; this.fx.explode(x, rand(0, 0.5) * s, s * rand(0.8, 2)); this.sfx('boom', x, 0.7, 0.6); }
    if (Math.random() < dt * 4) this.fx.burst(this.camX + rand(-0.5, 0.5) * this.viewW, 0, 0.5, 10, s * 0.5, ['#ff5a1e', '#3a2620', '#ffcc33'], 2);
    if (this.finale > 0.5 && !this.cracked) { this.cracked = true; this.sfx('earthcrack', p.x, 1); this.hud.banner('YOU ATE THE WORLD', 4, 'big'); }
    this.ctx.renderer.post.uniforms.hurt.value = 0;
    if (this.finale > 5.5 && !this.over) { this.over = true; this.cb.onVictory(this.result()); }
  }
  updateMouse() {
    const m = this.input.mouse, r = this.ctx.renderer.r.domElement;
    _v.set((m.x / r.clientWidth) * 2 - 1, -(m.y / r.clientHeight) * 2 + 1, 0.5);
    _ray.setFromCamera(_v, this.camera);
    if (_ray.ray.intersectPlane(_plane, _hit)) { this.mouseWorld.x = _hit.x; this.mouseWorld.y = _hit.y; }
  }
  updateCamera(dt, snap) {
    const p = this.player, cam = this.camera, s = p.shownSize;
    let dist = (s * 11 + 3) * (1 + p.stats.sight);
    let tx = p.x + p.facing * s * 1.5;
    if (this.boss && !this.boss.dead && this.phase === 'boss') {
      const span = Math.abs(this.boss.x - p.x);
      dist = Math.max(dist, span * 0.85 + s * 4);
      tx = (p.x + this.boss.x) / 2;
    }
    const ty = Math.max(s * 2.3, p.y * 0.7 + s * 1.5);
    dist = Math.max(dist, ty * 2.6); // zoom out when high up so the ground never leaves the screen
    const k = snap ? 1 : Math.min(1, dt * 4);
    this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k; this.camDist += (dist - this.camDist) * (snap ? 1 : Math.min(1, dt * 2));
    const sh = this.fx.shakeAmt * s * 0.35;
    cam.position.set(this.camX + rand(-sh, sh), this.camY + rand(-sh, sh), this.camDist);
    cam.lookAt(this.camX, this.camY - s * 0.25, 0);
    cam.near = Math.max(0.05, this.camDist * 0.05); cam.far = this.camDist * 30 + 600;
    cam.updateProjectionMatrix();
    this.viewW = 2 * this.camDist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;
    this.ctx.renderer.aimSun(this.camX, 0, Math.max(s, this.camDist / 11));
  }
}
