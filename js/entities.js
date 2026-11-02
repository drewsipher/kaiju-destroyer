// entities.js — runtime for everything that isn't the player: creatures, vehicles, buildings,
// pickups, biomass orbs and bosses. Behaviour is chosen by def.ai (see data/entities.js);
// bosses hand their thinking to bosses.js.
import * as THREE from 'three';
import { build, GEO, glowMat } from './models.js';
import { ENTITIES } from './data/entities.js';
import { rand, clamp, sign, choose } from './util.js';
import { BOSSES } from './bosses.js';

const _box = new THREE.Box3();
let nextId = 1;

export class Entity {
  constructor(game, id, x, y, scaleMul = 1) {
    const def = ENTITIES[id];
    this.game = game; this.def = def; this.type = id; this.uid = nextId++;
    this.size = def.size * scaleMul;
    this.maxHp = this.hp = def.kind === 'boss' ? def.hp * clamp(game.level.goal / 4.5, 0.65, 1.2) * (game.enemyHp || 1) : Math.max(1, def.hp * (def.kind === 'structure' ? scaleMul : scaleMul * scaleMul) * (def.kind === 'food' || def.kind === 'pickup' ? 1 : (game.enemyHp || 1)));
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.dir = Math.random() < 0.5 ? -1 : 1;
    this.t = rand(0, 10); this.cd = rand(0.5, 2); this.timer = rand(0, 2); this.state = 'idle';
    this.stun = 0; this.poison = 0; this.flash = 0; this.dead = false; this.eaten = 0; this.dying = 0;
    this.kind = def.kind; this.hostile = !!def.dmg;
    this.isStructure = def.kind === 'structure' || !!def.structureLike;
    this.flying = !!def.fly;
    this.mesh = build(def.model, def.opts);
    this.mesh.scale.setScalar(this.size);
    const dims = this.mesh.userData.dims || { w: 1, h: 1, d: 1 };
    this.w = dims.w * this.size / 2; this.h = dims.h * this.size; this.d = dims.d * this.size;
    this.z = this.isStructure ? -this.d / 2 - 0.2 : (def.kind === 'boss' ? 0 : rand(-0.4, 0.4) * Math.min(1, this.size));
    if (this.flying) { this.homeY = rand(def.fly[0], def.fly[1]) * game.flyScale(); this.y = this.homeY; }
    this.mesh.position.set(x, this.y, this.z);
    this.mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    game.scene.add(this.mesh);
    if (def.kind === 'boss') { this.brain = BOSSES[def.boss]; this.brain.init(this, game); }
  }
  get cx() { return this.x; }
  get cy() { return this.y + this.h / 2; }
  edibleBy(p) {
    return !this.isStructure && this.kind !== 'boss' && this.kind !== 'pickup' && this.size <= p.size * p.eatRatio();
  }
  // distance from a point to this entity's box (0 if inside)
  distTo(px, py) {
    const dx = Math.max(this.x - this.w - px, 0, px - (this.x + this.w));
    const dy = Math.max(this.y - py, 0, py - (this.y + this.h));
    return Math.hypot(dx, dy);
  }
  hurt(dmg, opts = {}) {
    if (this.dead || this.dying || this.hidden) return false;
    const g = this.game;
    dmg *= this.def.armor || 1;
    if (this.shield > 0) dmg *= 0.15;
    if (opts.crit) dmg *= 2;
    this.hp -= dmg; this.flash = 0.12;
    if (opts.poison) this.poison = Math.max(this.poison, 3);
    if (opts.knock && !this.isStructure && this.kind !== 'boss') { this.vx += opts.knock * (opts.dirX || sign(this.x - g.player.x)); this.vy += Math.abs(opts.knock) * 0.5; }
    if (!opts.quiet) {
      g.fx.pop(Math.ceil(dmg) + (opts.crit ? '!' : ''), this.cx + rand(-0.3, 0.3) * this.w, this.y + this.h, opts.crit ? 'pow' : 'dmg', opts.crit ? '#ffd23f' : null);
      g.fx.sparks(this.cx, this.cy, 0.5, 5, Math.min(this.size, g.player.size), this.isStructure ? '#d8cfc0' : '#fff2a8', 6, 0.3);
    }
    if (this.hostile && !this.isStructure && this.kind !== 'boss') this.state = 'chase';
    if (this.hp <= 0) { this.destroy(opts.cause || 'hit'); return true; }
    return false;
  }
  // knocked out / smashed: effects, points and biomass orbs
  destroy(cause) {
    const g = this.game, def = this.def;
    this.dying = 0.0001;
    const isMetal = /vehicle|aircraft|mech|ship|machine/.test(def.model) || def.kind === 'boss' && !['bug', 'frog', 'bird', 'waterbug'].includes(def.model);
    const colors = [];
    this.mesh.traverse((o) => { if (o.isMesh && o.material && o.material.color && colors.length < 6) colors.push('#' + o.material.color.getHexString()); });
    const vs = g.player.size;
    const away = sign(this.x - g.player.x);
    if (this.isStructure) {
      // the structure breaks into its real pieces; dust billows up and hangs in the air
      g.debris.shatter(this, 1, away);
      g.fx.burst(this.cx, this.y + this.h * 0.5, this.z + this.d / 2, Math.min(40, 12 + this.size * 2), Math.min(this.size * 0.3, vs * 0.5), colors.length ? colors : ['#888'], 0.8);
      g.fx.dust(this.cx, this.w, this.h, Math.min(this.size, vs * 3));
      g.sfx('collapse', this.x, Math.min(1, 0.5 + this.size / vs * 0.2));
      g.fx.shake(Math.min(0.8, 0.2 + this.size / vs * 0.08));
    } else if (isMetal) {
      g.fx.explode(this.cx, this.cy, Math.min(this.size, vs * 1.5));
      g.debris.shatter(this, this.kind === 'boss' ? 2.2 : 1.8, away);
      g.fx.burst(this.cx, this.cy, 0.5, 10, Math.min(this.size * 0.4, vs * 0.5), colors.length ? colors : ['#555'], 1.2);
      g.sfx('boom', this.x, 0.8);
      g.fx.shake(0.3);
    } else {
      g.fx.burst(this.cx, this.cy, 0.5, 8, Math.min(this.size * 0.5, vs * 0.5), colors.length ? colors : ['#7a5'], 0.8);
      g.sfx('splat', this.x);
      if (this.kind === 'boss') g.debris.shatter(this, 1.4, away);
      else { g.debris.tumble(this, away, cause === 'stomp' || cause === 'dash' ? 1.4 : 1); this.mesh = new THREE.Group(); this.tumbled = true; }
    }
    const word = def.say || (this.isStructure ? choose(['SMASH!', 'CRASH!', 'WHAM!']) : isMetal ? choose(['KABOOM!', 'BLAM!']) : choose(['SPLAT!', 'SQUISH!', 'POW!']));
    g.fx.pop(word, this.cx, this.y + this.h * 0.8, this.size > vs * 2 ? 'big' : 'pow');
    g.addScore(def.pts, this.cx, this.y + this.h, false);
    // biomass: a share of the growth eating it would give
    const n = Math.max(1, Math.min(10, Math.round((def.drops || 1) * (0.7 + Math.min(this.size, vs) / vs))));
    const mass = g.massValue(this.size) * 0.6;
    for (let i = 0; i < n; i++) g.spawnOrb(this.cx + rand(-this.w, this.w), this.y + this.h * rand(0.2, 0.8), mass / n);
    if (def.spawnsOnDeath) for (let i = 0; i < 3; i++) g.spawn(def.spawnsOnDeath, this.cx + rand(-this.w, this.w), this.y + rand(0, this.h * 0.5));
    if (this.brain && this.brain.onDeath) this.brain.onDeath(this, g);
    g.onKill(this, cause);
  }
  update(dt) {
    const g = this.game, p = g.player, def = this.def;
    this.t += dt;
    if (this.eaten > 0) { // being swallowed: shrink into the bug's mouth
      this.eaten += dt * 7;
      const k = Math.max(0, 1 - this.eaten);
      const m = p.mouth();
      this.x += (m.x - this.x) * Math.min(1, dt * 14); this.y += (m.y - this.y - this.h * 0.3) * Math.min(1, dt * 14);
      this.mesh.scale.setScalar(this.size * k);
      this.mesh.position.set(this.x, this.y, this.z);
      if (this.eaten >= 1) this.dead = true;
      return;
    }
    if (this.dying) { // the pieces now live in debris.js; this entity is finished
      this.dead = true;
      return;
    }
    if (this.flash > 0) this.flash -= dt;
    if (this.poison > 0) { this.poison -= dt; this.hurt(this.maxHp * 0.06 * dt + p.biteDamage() * 0.4 * dt, { quiet: true, cause: 'poison' }); if (Math.random() < dt * 8) g.fx.sparks(this.cx, this.cy, 0.5, 1, Math.min(this.size, p.size), '#b6ff3b', 2, 0.6); if (this.dying) return; }
    if (this.stun > 0) { this.stun -= dt; this.vx *= 0.9; }
    else if (this.brain) this.brain.update(this, dt, g);
    else this.think(dt, g, p, def);

    // physics
    if (!this.flying || this.dying) {
      if (this.y > 0 || this.vy > 0) { this.vy -= g.gravity() * dt; }
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; } else this.grounded = false;
    } else this.y += this.vy * dt;
    this.x += this.vx * dt;
    if (this.grounded && !this.flying) this.vx *= Math.exp(-dt * 0.5);

    // visuals
    const moving = Math.abs(this.vx) > 0.05 * this.size || this.flying;
    const m = this.mesh;
    m.position.set(this.x, this.y + (def.float ? Math.sin(this.t * 3) * this.size * 0.2 + this.size * 0.4 : 0), this.z);
    if (!this.isStructure && !def.float) m.rotation.y += (((this.dir > 0 ? 0 : Math.PI) - m.rotation.y)) * Math.min(1, dt * 10);
    if (this.flying && !this.brain) m.rotation.z = clamp(this.vy * 0.03 / Math.max(0.3, this.size), -0.5, 0.5) * this.dir;
    const sx = this.flash > 0 ? 1.12 : 1;
    m.scale.set(this.size * sx, this.size * (this.flash > 0 ? 0.9 : 1), this.size);
    if (m.userData.anim) m.userData.anim(this.t, moving, this);
  }
  // ---------- ordinary AI ----------
  think(dt, g, p, def) {
    const dx = p.x - this.x, adx = Math.abs(dx), sp = def.speed || 0;
    const scared = !!def.flee || (!def.proj && this.size * 2.2 < p.size && this.kind !== 'pickup');
    const view = g.viewW;
    this.cd -= dt; this.timer -= dt;
    switch (def.ai) {
      case 'static': break;
      case 'wander': case 'flee': {
        const nearFear = adx < Math.max(view * 0.35, this.size * 6) && scared && p.size > this.size * 0.9;
        if (nearFear && (def.ai === 'flee' || def.flee)) {
          this.dir = -sign(dx); this.vx = this.dir * sp * 1.5;
          if (def.scream && Math.random() < dt * 0.6) { g.sfx('scream', this.x, 0.5); g.fx.pop(choose(['AAAH!', 'RUN!', 'HELP!', 'EEK!']), this.cx, this.y + this.h * 1.3, 'info'); }
        } else {
          if (this.timer <= 0) { this.timer = rand(1, 3); this.state = Math.random() < 0.6 ? 'walk' : 'idle'; this.dir = Math.random() < 0.5 ? -1 : 1; }
          this.vx = this.state === 'walk' ? this.dir * sp * 0.5 : 0;
        }
        if (def.siren && Math.random() < dt * 0.4) g.sfx('siren', this.x, 0.4);
        break;
      }
      case 'hunter': case 'hopper': {
        if (scared && adx < view * 0.4) { this.dir = -sign(dx); if (def.ai === 'hopper') this.hop(-sign(dx), sp); else this.vx = this.dir * sp * 1.3; break; }
        const aggro = adx < view * 0.7;
        if (!aggro) { this.vx = 0; break; }
        this.dir = sign(dx);
        const reach = def.range + p.size * 0.4;
        const d = this.distTo(p.x, p.y + p.h() * 0.5);
        if (this.state === 'windup') {
          this.vx *= 0.8;
          if (this.timer <= 0) {
            this.state = 'chase'; this.cd = def.cd;
            if (d < reach * 1.25) p.hurt(def.dmg, this);
            g.fx.pop(choose(['CHOMP!', 'BITE!', 'SNAP!', 'WHACK!']), (this.cx + p.x) / 2, this.y + this.h, 'pow', '#ff5a5a');
            g.sfx('hit', this.x);
            this.vx = this.dir * sp * 1.5;
          }
        } else if (d < reach && this.cd <= 0) {
          this.state = 'windup'; this.timer = 0.35; this.flash = 0.35;
        } else if (def.shootRange && d > reach * 1.5 && d < def.shootRange * g.viewScale() && this.cd <= 0 && g.onScreen(this)) {
          this.cd = def.cd * 1.8; g.shoot(this, def.proj);
        } else {
          if (def.ai === 'hopper') this.hop(this.dir, sp); else this.vx = this.dir * sp;
        }
        break;
      }
      case 'shooter': {
        const range = (def.range || 20) * g.viewScale() * 0.5 + this.size * 2;
        if (scared && !def.proj) { this.vx = -sign(dx) * sp; break; }
        this.dir = sign(dx);
        if (this.flying) {
          const want = p.x - this.dir * range * 0.6;
          this.vx += (clamp(want - this.x, -1, 1) * sp - this.vx) * dt * 2;
          this.vy = (this.homeY + Math.sin(this.t * 1.5) * this.size * 0.5 - this.y) * 2;
        } else if (sp > 0) {
          const want = adx > range * 0.8 ? 1 : adx < range * 0.4 ? -1 : 0;
          this.vx = this.dir * want * sp;
        }
        if (this.cd <= 0 && adx < range * 1.2 && g.onScreen(this)) { this.cd = def.cd * rand(0.8, 1.3); g.shoot(this, def.proj); }
        if (def.siren && Math.random() < dt * 0.4) g.sfx('siren', this.x, 0.4);
        break;
      }
      case 'flyer': {
        if (this.timer <= 0) { this.timer = rand(2, 4); this.dir = Math.random() < 0.7 ? sign(dx) : -sign(dx); }
        this.vx = this.dir * sp;
        this.vy = (this.homeY + Math.sin(this.t * 2) * this.size - this.y) * 2;
        if (scared && adx < view * 0.3) { this.dir = -sign(dx); this.vx = this.dir * sp * 1.4; }
        break;
      }
      case 'diver': {
        if (scared && adx < view * 0.3 && this.state !== 'dive') { this.dir = -sign(dx); this.vx = this.dir * sp; this.vy = (this.homeY - this.y) * 2; break; }
        if (this.state === 'dive') {
          const ty = p.y + p.h() * 0.5, tx = p.x;
          const ax = tx - this.x, ay = ty - this.cy, l = Math.hypot(ax, ay) || 1;
          this.vx = ax / l * sp * 2; this.vy = ay / l * sp * 2; this.dir = sign(this.vx);
          if (this.distTo(p.x, p.y + p.h() * 0.5) < p.size * 0.5 + this.size * 0.3) { p.hurt(def.dmg, this); this.state = 'climb'; this.timer = 1.5; g.sfx('sting', this.x); }
          if (this.timer <= 0) { this.state = 'climb'; this.timer = 1.5; }
        } else {
          this.dir = sign(dx);
          this.vx = (clamp(dx, -6, 6) / 6) * sp;
          this.vy = (this.homeY + Math.sin(this.t * 3) * this.size * 0.5 - this.y) * 2.5;
          if (this.state !== 'climb' && this.cd <= 0 && adx < view * 0.4) { this.state = 'dive'; this.timer = 1.2; this.cd = def.cd; g.sfx(this.size < p.size * 0.6 ? 'buzz' : 'whoosh', this.x, 0.5); }
          if (this.state === 'climb' && this.timer <= 0) this.state = 'idle';
        }
        break;
      }
      case 'bomber': {
        if (this.state === 'idle') { this.state = 'run'; this.dir = sign(dx) || 1; g.sfx('whoosh', this.x, 0.6); }
        this.vx = this.dir * sp * g.viewScale() * 0.4;
        this.vy = (this.homeY - this.y) * 2;
        if (this.cd <= 0 && adx < view * 0.25 && g.onScreen(this)) { this.cd = def.cd; g.shoot(this, def.proj); }
        if ((this.x - p.x) * this.dir > view * 1.2) this.dead = true;
        break;
      }
      case 'tongue': {
        this.dir = sign(dx);
        const reach = def.range + this.size;
        const d = this.distTo(p.x, p.y + p.h() * 0.5);
        if (scared) { this.hop(-sign(dx), sp); break; }
        if (this.state === 'windup') {
          if (this.timer <= 0) { this.state = 'idle'; this.cd = def.cd; g.tongue(this, p.x, p.y + p.h() * 0.5, def.dmg); }
        } else if (d < reach && this.cd <= 0) { this.state = 'windup'; this.timer = 0.45; this.flash = 0.45; }
        else if (d > reach && adx < view * 0.6) this.hop(this.dir, sp);
        break;
      }
    }
  }
  hop(dir, sp) {
    if (!this.grounded || this.cd > 0) return;
    this.dir = dir;
    this.vx = dir * sp * 1.6; this.vy = Math.sqrt(2 * this.game.gravity() * this.size * 1.2);
    this.cd = rand(0.4, 0.9);
  }
  remove() { this.game.scene.remove(this.mesh); }
}

// ---------- biomass orbs (growth pickups dropped by anything destroyed) ----------
const orbGeo = GEO.lowSphere;
export class Orb {
  constructor(game, x, y, mass) {
    this.game = game; this.mass = mass; this.dead = false;
    this.x = x; this.y = y; this.vx = rand(-1, 1) * game.player.size * 3; this.vy = rand(1, 3) * game.player.size * 3;
    this.r = Math.max(0.12, Math.sqrt(mass) * 0.6) * 0.5;
    this.mesh = new THREE.Mesh(orbGeo, glowMat('#8dff5a'));
    this.mesh.scale.setScalar(this.r * 2);
    this.t = 0;
    game.scene.add(this.mesh);
  }
  update(dt) {
    const g = this.game, p = g.player;
    this.t += dt;
    const dx = p.x - this.x, dy = p.y + p.h() * 0.5 - this.y, d = Math.hypot(dx, dy);
    const pull = p.size * (3 + p.stats.magnet * 5) + (this.t > 6 ? 1e9 : 0);
    if (d < pull && this.t > 0.35) { const k = (p.size * 25) / (d + 0.01); this.vx += dx * k * dt; this.vy += dy * k * dt; this.vx *= 0.9; this.vy *= 0.9; }
    else { this.vy -= g.gravity() * 0.5 * dt; if (this.y < this.r) { this.y = this.r; this.vy = Math.abs(this.vy) * 0.4; this.vx *= 0.8; } }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (d < p.size * 0.6 + this.r && this.t > 0.2) { this.dead = true; g.collectOrb(this); }
    this.mesh.position.set(this.x, this.y + Math.sin(this.t * 6) * this.r * 0.3, 0.4);
    if (this.t > 14) this.dead = true;
  }
  remove() { this.game.scene.remove(this.mesh); }
}
