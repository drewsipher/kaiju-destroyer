// player.js — the bug: movement, climbing, eating, attacks, abilities, growth and damage.
// Everything scales with this.size so the same code plays the same whether you are a mite or a kaiju.
import * as THREE from 'three';
import { buildBug } from './bugparts.js';
import { clamp, sign, rand, choose } from './util.js';
import { GEO } from './models.js';

export class Player {
  constructor(game, stats, design, colors, extras) {
    this.g = game; this.stats = stats; this.design = design; this.colors = colors;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.mass = 1; this.size = 1; this.shownSize = 1;
    this.hp = stats.maxHp; this.facing = 1;
    this.onGround = true; this.jumpsLeft = stats.jumps; this.climbing = null; this.stamina = 1;
    this.cd = { chomp: 0, spit: 0, dash: 0, stomp: 0, roar: 0, beam: 0, web: 0 };
    this.brood = []; this.broodT = 3; this.cannonT = 1;
    this.dashT = 0; this.stomping = false; this.invuln = 0; this.slow = 0; this.hurtFlash = 0;
    this.frenzy = 0; this.frenzyT = 0; this.beamT = 0; this.revives = stats.revive; this.dead = false;
    this.aimX = 1; this.aimY = 0;
    this.model = buildBug(design, colors, extras);
    game.scene.add(this.model);
    // atomic breath beam
    this.beamMesh = new THREE.Mesh(GEO.cyl, new THREE.MeshBasicMaterial({ color: '#8fe8ff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.beamMesh.visible = false; game.scene.add(this.beamMesh);
  }
  dispose() { this.g.scene.remove(this.model); this.g.scene.remove(this.beamMesh); for (const b of this.brood) this.g.scene.remove(b.mesh); }
  pumped() { return this.stats.adrenaline > 0 && this.hp < this.stats.maxHp * 0.35; }
  h() { return this.size * 0.62; }
  eatRatio() { return this.stats.eatRatio * (this.frenzyT > 0 ? 1.15 : 1); }
  // everything you deal is based on this: size, evolutions, frenzy, adrenaline and the level's power scale
  biteDamage() { const st = this.stats; return 4 * this.size * st.biteDmg * st.power * (this.frenzyT > 0 ? 2 : 1) * (this.pumped() ? 1 + 0.3 * st.adrenaline : 1); }
  rollCrit() { return Math.random() < this.stats.crit; }
  mouth() { return { x: this.x + this.facing * this.size * 0.55, y: this.y + this.size * 0.35 }; }

  update(dt, input) {
    const g = this.g, st = this.stats, s = this.size;
    for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
    this.invuln = Math.max(0, this.invuln - dt); this.slow = Math.max(0, this.slow - dt); this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2);
    if (this.frenzyT > 0) { this.frenzyT -= dt; if (this.frenzyT <= 0) g.fx.pop('frenzy over', this.x, this.y + this.h() * 2, 'info'); }
    if (st.regen) this.heal(st.maxHp * st.regen / 100 * dt);

    // aim at the mouse (or straight ahead if the mouse hasn't been used)
    const mw = g.mouseWorld;
    const ax = mw.x - this.x, ay = mw.y - (this.y + this.h() * 0.5);
    const al = Math.hypot(ax, ay) || 1;
    if (g.input.mouse.moved) { this.aimX = ax / al; this.aimY = ay / al; } else { this.aimX = this.facing; this.aimY = 0; }

    // horizontal movement
    let mx = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
    const speed = 6.5 * s * st.speed * (this.frenzyT > 0 ? 1.4 : 1) * (this.slow > 0 ? 0.45 : 1) * (this.pumped() ? 1 + 0.1 * st.adrenaline : 1);
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.dashHits();
      if (this.dashT <= 0) { this.vx *= 0.3; if (st.tailclub) this.tailSmash(); }
    } else {
      const accel = this.onGround ? 14 : 6;
      this.vx += (mx * speed - this.vx) * Math.min(1, accel * dt);
      if (mx) this.facing = mx;
    }

    // climbing tall structures (Rampage style): hold W / Up against a building
    const wall = this.wallAt();
    const upHeld = input.held('up');
    if (this.climbing && (!wall || wall !== this.climbing || input.hit('jump'))) {
      if (input.hit('jump')) { this.vy = this.jumpV() * 0.85; this.vx = -this.facing * speed * 0.8; }
      this.climbing = null;
    } else if (!this.climbing && wall && upHeld && this.y < wall.y + wall.h - s * 0.2) {
      this.climbing = wall; this.jumpsLeft = st.jumps;
    }
    if (this.climbing) {
      const w = this.climbing;
      this.vy = upHeld ? s * 4 * st.speed * st.climb : input.held('down') ? -s * 4 : 0;
      this.facing = sign(w.x - this.x) || this.facing;
      if (this.y + this.vy * dt > w.y + w.h) { this.y = w.y + w.h; this.vy = 0; this.climbing = null; this.onGround = true; }
      if (Math.random() < dt * 6 && Math.abs(this.vy) > 0) g.sfx('skitter', this.x, 0.3);
    }

    // jumping, double jumps, gliding and flight
    const jumpHit = input.hit('jump') || (upHeld && !wall && input.hit('up'));
    if (!this.climbing) {
      if (jumpHit) {
        if (this.onGround) { this.vy = this.jumpV(); this.onGround = false; g.sfx('boing', this.x, 0.25, 1.6); }
        else if (this.jumpsLeft > 1) { this.jumpsLeft--; this.vy = this.jumpV() * 0.9; g.sfx('whoosh', this.x, 0.5, 1.4); g.fx.puff(this.x, this.y, 0, 4, s * 0.4, '#ffffff'); }
      }
      const jumpHeld = input.held('jump') || upHeld;
      this.flyingNow = false;
      // true flight only on Space, so holding W to climb can't launch you skyward
      if (st.flight && input.held('jump') && !this.onGround && this.stamina > 0 && this.vy < this.jumpV() * 0.4) {
        this.vy += (s * 9 - this.vy) * Math.min(1, dt * 5); this.stamina -= dt * 0.28; this.flyingNow = true;
        if (Math.random() < dt * 8) g.sfx('buzz', this.x, 0.25, 1.5);
      } else if (st.glide && jumpHeld && this.vy < -s * 2) { this.vy = -s * 2; this.flyingNow = true; }
      if (!this.stomping) this.vy -= g.gravity() * dt * (this.vy < 0 ? 1.25 : 1);
    }
    if (this.onGround) this.stamina = Math.min(1, this.stamina + dt * 0.5);

    // ground pound
    if ((input.hit('stomp') || (input.hit('down') && !this.onGround && !this.climbing)) && this.cd.stomp <= 0 && !this.stomping) {
      this.climbing = null;
      if (this.onGround) { this.vy = this.jumpV() * 0.55; this.onGround = false; this.stompQueued = true; }
      else this.startStomp();
    }
    if (this.stompQueued && this.vy < 0) { this.stompQueued = false; this.startStomp(); }

    // sanity limits: knockbacks can't stack into a launch, and there's a ceiling above the tallest building
    const vmax = s * (this.dashT > 0 ? 30 : 20);
    this.vx = clamp(this.vx, -vmax, vmax); this.vy = Math.min(this.vy, s * 16);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (g.ceiling && this.y > g.ceiling) { this.y = g.ceiling; this.vy = Math.min(0, this.vy); }
    // land on the ground or on rooftops
    const wasAir = !this.onGround;
    this.onGround = false;
    if (this.y <= 0) { this.y = 0; this.vy = Math.max(0, this.vy); this.onGround = true; }
    else if (this.vy <= 0 && !this.climbing) {
      for (const e of g.entities) {
        if (!e.isStructure || e.dying || e.dead) continue;
        const top = e.y + e.h;
        if (Math.abs(this.x - e.x) < e.w * 0.9 && this.y <= top && this.y - this.vy * dt >= top - s * 0.05) { this.y = top; this.vy = 0; this.onGround = true; this.roof = e; break; }
      }
    }
    if (this.onGround) { this.jumpsLeft = st.jumps; if (wasAir && this.stomping) this.landStomp(); else if (wasAir) g.sfx('thud', this.x, 0.3, 1.5); }

    // arena walls (boss fights) and the left edge of the level
    const L = g.bounds.min, R = g.bounds.max;
    if (this.x < L) { this.x = L; this.vx = Math.max(0, this.vx); }
    if (this.x > R) { this.x = R; this.vx = Math.min(0, this.vx); }

    // actions
    const m = input.mouse;
    if ((m.left || input.held('chomp')) && this.cd.chomp <= 0) this.chomp();
    if ((m.right || input.held('spit')) && this.cd.spit <= 0 && st.acid > 0) this.spit();
    if (input.hit('dash') && this.cd.dash <= 0) this.dash(mx);
    if (input.hit('roar') && st.roar && this.cd.roar <= 0) this.roar();
    if ((input.hit('beam') || (input.held('beam') && this.beamT <= 0)) && st.beam && this.cd.beam <= 0) { this.beamT = 1.6 + 0.6 * st.beam; this.cd.beam = 9; g.sfx('roar', this.x, 0.6, 0.7); }
    if (input.hit('frenzy') && this.frenzy >= 1) this.startFrenzy();
    if (input.hit('web') && st.silk && this.cd.web <= 0) {
      this.cd.web = 4;
      const m = this.mouth();
      g.proj.friendly('silk', m.x, m.y, Math.atan2(g.mouseWorld.y - m.y, g.mouseWorld.x - m.x) + 0.05, this.biteDamage() * 0.3, st.silk);
      g.sfx('web', this.x); this.model.userData.chomp();
    }
    this.updateBrood(dt);
    if (st.cannon) this.updateCannon(dt);
    this.updateBeam(dt);
    this.vacuum();

    // contact damage from spikes
    if (st.spikes) for (const e of g.entities) if (e.hostile && !e.dying && !e.dead && e.distTo(this.x, this.y + this.h() * 0.5) < s * 0.45 && (e.spikeCd = (e.spikeCd || 0) - dt) <= 0) { e.spikeCd = 0.5; e.hurt(this.biteDamage() * 0.35 * st.spikes, { cause: 'spikes' }); }

    // model
    this.shownSize += (this.size - this.shownSize) * Math.min(1, dt * 4);
    const md = this.model;
    md.scale.setScalar(this.shownSize);
    md.position.set(this.x, this.y, 0.2);
    const targetRot = this.facing > 0 ? 0 : Math.PI;
    md.rotation.y += (targetRot - md.rotation.y) * Math.min(1, dt * 14);
    md.rotation.z = this.climbing ? this.facing * 1.35 : this.dashT > 0 ? -0.1 * this.facing : 0;
    if (this.climbing) md.position.x = this.x - this.facing * s * 0.25;
    md.visible = !(this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0);
    md.userData.update(dt, { moving: Math.abs(this.vx) > s * 0.5 || (this.climbing && this.vy !== 0), airborne: !this.onGround && !this.climbing, flying: this.flyingNow, frenzy: this.frenzyT > 0, beam: this.beamT > 0 });
  }
  jumpV() { return Math.sqrt(2 * this.g.gravity() * this.size * 2.6 * this.stats.jump); }
  wallAt() {
    for (const e of this.g.entities) {
      if (!e.isStructure || e.dying || e.dead || e.h < this.size * 1.2) continue;
      if (Math.abs(this.x - e.x) < e.w + this.size * 0.3 && this.y < e.y + e.h) return e;
    }
    return null;
  }

  // ---- eating & biting ----
  chomp() {
    const g = this.g, s = this.size;
    this.cd.chomp = this.frenzyT > 0 ? 0.16 : 0.3;
    this.model.userData.chomp();
    if (Math.abs(this.aimX) > 0.2 && !this.climbing) this.facing = sign(this.aimX);
    if (this.onGround && !this.climbing) this.vx += this.facing * s * 3;
    const cx = this.x + this.aimX * s * 0.6, cy = this.y + this.h() * 0.5 + this.aimY * s * 0.5;
    const st = this.stats, r = s * (0.55 + st.jawSize * 0.04 + st.reach + st.claws * 0.25);
    let ate = 0, hit = 0;
    const targets = g.entities.filter((e) => !e.dead && !e.dying && !e.eaten && e.distTo(cx, cy) < r).sort((a, b) => a.distTo(cx, cy) - b.distTo(cx, cy));
    for (const e of targets) {
      if (e.kind === 'pickup') { g.pickup(e); continue; }
      if (e.edibleBy(this)) { if (ate < (st.twinhead ? 7 : 4)) { g.eat(e); ate++; } }
      else if (hit < (st.twinhead ? 3 : 2)) {
        hit++;
        const tough = e.isStructure || /vehicle|ship|machine|aircraft|mech/.test(e.def.model);
        const crit = this.rollCrit(), dmg = this.biteDamage() * (st.claws ? 1.4 : 1) * (tough && st.structBite ? 2 : 1);
        e.hurt(dmg, { crit, poison: st.poison, knock: s * 2, dirX: this.facing, cause: 'bite' });
        if (st.bossStun && e.kind === 'boss') e.stun = Math.max(e.stun, 0.12);
        if (st.twinhead) e.hurt(dmg * 0.7, { poison: st.poison, cause: 'bite' });
        if (st.storm) this.chainLightning(e, dmg * 0.6);
        if (st.claws) g.fx.sparks(e.cx, e.cy, 0.5, 6, s * 0.5, '#ffffff', 8, 0.2);
      }
    }
    // Spiked Whip: the tail lashes whatever is behind you
    if (st.whip) for (const e of g.entities) if (!e.dead && !e.dying && !e.eaten && e.kind !== 'pickup' && e.distTo(this.x - this.facing * s * 0.8, this.y + this.h() * 0.4) < s * 0.6) { e.hurt(this.biteDamage() * 0.6, { knock: s * 3, dirX: -this.facing, cause: 'whip' }); hit++; }
    if (ate) { g.sfx('gulp', this.x, 0.8, 1 / Math.sqrt(s)); }
    if (hit) { g.sfx('crunch', this.x, 0.8); g.fx.hitstop(0.04); g.fx.shake(0.08); g.fx.pop(choose(['CHOMP!', 'CRUNCH!', 'MUNCH!', 'GNASH!']), cx, cy + s * 0.3, 'pow'); }
    if (!ate && !hit) g.sfx('chomp', this.x, 0.5);
  }
  // swallow small things you touch
  vacuum() {
    const g = this.g, lim = this.size * (this.stats.vacuum + (this.frenzyT > 0 ? 0.2 : 0)), cx = this.x, cy = this.y + this.h() * 0.5, r = this.size * (0.5 + this.stats.magnet * 0.3);
    for (const e of g.entities) {
      if (e.dead || e.dying || e.eaten) continue;
      if (e.kind === 'pickup' && e.distTo(cx, cy) < r) { g.pickup(e); continue; }
      if (e.size <= lim && e.edibleBy(this) && e.distTo(cx, cy) < r) { g.eat(e); g.sfx('gulp', this.x, 0.4, 1.3); }
    }
  }
  spit() {
    const st = this.stats, s = this.size;
    this.cd.spit = Math.max(0.3, 0.6 - st.acid * 0.05);
    if (Math.abs(this.aimX) > 0.2) this.facing = sign(this.aimX);
    // one glob per rank, plus one more every 4 levels of the campaign
    const m = this.mouth(), n = Math.min(8, st.acid + st.levelBonus);
    this.g.proj.acid(m.x, m.y, this.g.mouseWorld.x, this.g.mouseWorld.y, n, this.biteDamage() * 0.7, st.acid >= 4);
    this.model.userData.chomp();
    void s;
  }
  dash(mx) {
    const s = this.size;
    this.cd.dash = 1.1 * Math.max(0.4, 1 - this.stats.dashCd);
    const dir = mx || this.facing;
    this.facing = dir;
    this.dashT = 0.22; this.vx = dir * s * 24; this.invuln = Math.max(this.invuln, 0.25);
    this.dashHit = new Set();
    this.climbing = null;
    this.g.sfx('dash', this.x);
    this.g.fx.puff(this.x, this.y, 0, 5, s * 0.5, '#d8d0c0');
  }
  dashHits() {
    const g = this.g, s = this.size, st = this.stats;
    for (const e of g.entities) {
      if (e.dead || e.dying || e.eaten || this.dashHit.has(e)) continue;
      if (e.distTo(this.x + this.facing * s * 0.4, this.y + this.h() * 0.5) > s * 0.55) continue;
      this.dashHit.add(e);
      if (e.kind === 'pickup') { g.pickup(e); continue; }
      if (e.edibleBy(this) && e.size < s * 0.5) { g.eat(e); continue; }
      let dmg = this.biteDamage() * 1.2 * st.dashDmg;
      if (e.isStructure || /vehicle/.test(e.def.model)) dmg *= st.ramStructures;
      if (st.spikes) dmg *= 1.3;
      e.hurt(dmg, { crit: this.rollCrit(), knock: s * 8, dirX: this.facing, cause: 'dash' });
      g.fx.shake(0.12); g.fx.hitstop(0.03);
      g.sfx('heavy', this.x, 0.7);
    }
  }
  // Bio-Cannon: a living turret that fires at the nearest enemy on its own
  updateCannon(dt) {
    const g = this.g, s = this.size;
    this.cannonT -= dt;
    if (this.cannonT > 0) return;
    let tgt = null, best = g.viewW * 0.5;
    for (const e of g.entities) {
      if (e.dead || e.dying || e.eaten || !e.hostile || e.hidden) continue;
      const d = Math.hypot(e.cx - this.x, e.cy - this.y);
      if (d < best) { best = d; tgt = e; }
    }
    if (!tgt) { this.cannonT = 0.3; return; }
    this.cannonT = 1.3 / (1 + this.stats.cannonRate);
    this.g.proj.acid(this.x, this.y + this.h() * 1.1, tgt.cx, tgt.cy + s * 0.3, 1, this.biteDamage() * 0.45, false);
    this.model.userData.recoil();
  }
  startStomp() { this.stomping = true; this.vy = -this.size * 30; this.g.sfx('whoosh', this.x, 0.6); }
  landStomp() {
    const g = this.g, s = this.size, st = this.stats;
    this.stomping = false; this.cd.stomp = 0.9;
    const R = s * 1.6 * (1 + (st.stomp - 1) * 0.6), dmg = this.biteDamage() * 1.6 * st.stomp;
    g.shockwave(this.x, 0, R, dmg, false);
    if (st.quake) g.groundWave(this.x, 0, dmg * 0.7, false);
    if (st.quills) { for (let i = 0; i < 9; i++) g.proj.friendly('quill', this.x, this.y + this.h(), 0.25 + i / 8 * (Math.PI - 0.5), dmg * 0.5); g.sfx('skitter', this.x, 0.8, 1.5); }
  }
  // Tail Club: a spinning smash at the end of every dash
  tailSmash() {
    const g = this.g, s = this.size;
    g.shockwave(this.x - this.facing * s * 0.5, 0, s * 1.3, this.biteDamage() * 1.3, false);
    g.fx.pop('TAIL SMASH!', this.x, this.y + this.h() * 1.8, 'pow', '#ffd23f');
  }
  // Storm Antennae: lightning arcs from the bitten target to its neighbours
  chainLightning(src, dmg) {
    const g = this.g, s = this.size;
    const near = g.entities.filter((e) => e !== src && !e.dead && !e.dying && !e.eaten && e.kind !== 'pickup' && e.distTo(src.cx, src.cy) < s * 4)
      .sort((a, b) => a.distTo(src.cx, src.cy) - b.distTo(src.cx, src.cy)).slice(0, Math.min(5, this.stats.storm));
    let from = src;
    for (const e of near) {
      g.fx.bolt(from.cx, from.cy, e.cx, e.cy, s);
      e.hurt(dmg, { cause: 'storm' });
      if (!e.isStructure && e.kind !== 'boss') e.stun = Math.max(e.stun, 0.6);
      from = e;
    }
    if (near.length) g.sfx('zap', src.x, 0.6);
  }
  // Brood Mother: little bugs hatch from your egg sacs and hunt for you
  updateBrood(dt) {
    const g = this.g, s = this.size, st = this.stats;
    if (st.brood) {
      this.broodT -= dt * (1 + 0.35 * st.broodPlus);
      if (this.broodT <= 0 && this.brood.length < st.brood) {
        this.broodT = 7;
        // broodlings are little copies of you, minus the attachments
        const mesh = buildBug({ ...this.design, sockets: {} }, { body: this.colors.body, eyes: this.colors.eyes, pattern: 'none' });
        g.scene.add(mesh);
        this.brood.push({ x: this.x - this.facing * s * 0.4, y: this.y + this.h(), vx: -this.facing * s * 3, vy: s * 6, mesh, life: 30, cd: 0, dir: this.facing, t: 0 });
        g.fx.pop('HATCH!', this.x, this.y + this.h() * 1.5, 'info');
        g.sfx('pop', this.x, 0.6, 1.8);
      }
    }
    const k = s * 0.3, bite = this.biteDamage() * (0.25 + 0.1 * st.broodPlus);
    for (let i = this.brood.length - 1; i >= 0; i--) {
      const b = this.brood[i];
      b.life -= dt; b.cd -= dt; b.t += dt;
      // nearest living target near the player
      let tgt = null, best = g.viewW * 0.45;
      for (const e of g.entities) {
        if (e.dead || e.dying || e.eaten || e.kind === 'pickup' || e.isStructure || e.hidden) continue;
        const d = Math.abs(e.x - b.x);
        if (d < best && Math.abs(e.x - this.x) < g.viewW * 0.6) { best = d; tgt = e; }
      }
      const tx = tgt ? tgt.x : this.x - this.facing * s * (0.8 + (i % 3) * 0.4);
      const dx = tx - b.x;
      b.dir = sign(dx);
      const onGround = b.y <= 0.001;
      b.vx += (sign(dx) * Math.min(1, Math.abs(dx) / s) * s * 9 - b.vx) * Math.min(1, dt * 6);
      if (onGround && tgt && tgt.y > k && Math.abs(dx) < s) b.vy = s * 8;
      b.vy -= g.gravity() * dt;
      b.x += b.vx * dt; b.y = Math.max(0, b.y + b.vy * dt); if (b.y === 0) b.vy = Math.max(0, b.vy);
      if (tgt && b.cd <= 0 && tgt.distTo(b.x, b.y + k * 0.3) < k * 0.8) {
        b.cd = 0.5; b.mesh.userData.chomp();
        if (tgt.edibleBy(this) && tgt.size < k * 1.5) g.eat(tgt); else tgt.hurt(bite, { quiet: true, cause: 'brood' });
        g.fx.sparks(tgt.cx, tgt.cy, 0.5, 2, s * 0.3, '#fff2a8', 4, 0.2);
      }
      b.mesh.scale.setScalar(k * Math.min(1, b.t * 3) * (b.life < 0.5 ? b.life * 2 : 1));
      b.mesh.position.set(b.x, b.y, 0.35);
      b.mesh.rotation.y = b.dir > 0 ? 0 : Math.PI;
      b.mesh.userData.update(dt, { moving: Math.abs(b.vx) > s, airborne: b.y > 0.01 });
      if (b.life <= 0) { g.scene.remove(b.mesh); g.fx.puff(b.x, b.y, 0.5, 3, k, '#e8e2d0'); this.brood.splice(i, 1); }
    }
  }
  roar() {
    const g = this.g, s = this.size;
    this.cd.roar = 8;
    const st = this.stats, R = s * (5 + st.roar * 1.5 + st.roarSize * 4 + st.levelBonus);
    g.sfx('roar', this.x, 1, Math.max(0.5, 1.2 - s * 0.05));
    g.fx.ring(this.x, this.y + this.h(), R, '#ffffff', 0.6); g.fx.ring(this.x, this.y + this.h(), R * 0.7, '#ffe066', 0.5);
    g.fx.shake(0.5);
    g.fx.pop('ROOOAAAR!', this.x, this.y + this.h() * 2.5, 'big', '#ffe066');
    for (const e of g.entities) {
      if (e.dead || e.dying || e.isStructure) continue;
      if (e.distTo(this.x, this.y) < R) { e.stun = Math.max(e.stun, e.kind === 'boss' ? 0.8 + st.roar * 0.3 : 2 + st.roar * 0.5); e.hurt(this.biteDamage() * 0.5, { quiet: true, cause: 'roar' }); if (!e.flying && e.kind !== 'boss') e.vx = sign(e.x - this.x) * s * 4; }
    }
    const n = g.proj.reflect(this.x, this.y + this.h() * 0.5, R);
    if (n) g.fx.pop('DEFLECT x' + n, this.x, this.y + this.h() * 1.6, 'pow', '#7fd8ff');
  }
  updateBeam(dt) {
    const g = this.g, s = this.size, b = this.beamMesh;
    if (this.beamT <= 0) { b.visible = false; return; }
    this.beamT -= dt;
    const m = this.mouth();
    const len = s * (16 + 4 * this.stats.beam);
    const ex = m.x + this.aimX * len, ey = m.y + this.aimY * len;
    if (Math.abs(this.aimX) > 0.2) this.facing = sign(this.aimX);
    b.visible = true;
    const w = s * (0.25 + Math.sin(g.time * 40) * 0.04);
    b.scale.set(w, len, w);
    b.position.set((m.x + ex) / 2, (m.y + ey) / 2, 0.5);
    b.rotation.z = Math.atan2(ey - m.y, ex - m.x) - Math.PI / 2;
    g.fx.shake(0.12);
    if (Math.random() < dt * 8) g.sfx('beam', this.x, 0.6);
    const dps = this.biteDamage() * (3 + 1.5 * this.stats.beam) * this.stats.beamPower;
    for (const e of g.entities) {
      if (e.dead || e.dying || e.eaten) continue;
      // distance from entity centre to the beam segment
      const px = e.cx - m.x, py = e.cy - m.y, t = clamp(px * this.aimX + py * this.aimY, 0, len);
      const d = Math.hypot(px - this.aimX * t, py - this.aimY * t);
      if (d < w * 2 + Math.min(e.w, e.h / 2)) {
        e.hurt(dps * dt, { quiet: true, cause: 'beam' });
        if (Math.random() < dt * 15) g.fx.sparks(e.cx, e.cy, 0.5, 3, s * 0.6, '#8fe8ff', 6, 0.4);
      }
    }
    // the ground glows where it hits
    if (ey < 0.2) g.fx.sparks(m.x + this.aimX * (m.y / Math.max(0.01, -this.aimY)), 0.1, 0.5, 2, s * 0.5, '#bff4ff', 5, 0.3);
  }
  startFrenzy() {
    const g = this.g;
    this.frenzy = 0; this.frenzyT = this.stats.frenzyTime;
    g.sfx('frenzy', this.x); g.fx.pop('FEEDING FRENZY!', this.x, this.y + this.h() * 2.2, 'big', '#ff5af0');
    g.fx.ring(this.x, this.y + this.h() * 0.5, this.size * 3, '#ff5af0');
  }

  // ---- health & growth ----
  heal(n) { this.hp = Math.min(this.stats.maxHp, this.hp + n); }
  hurt(dmg, src, knockX = 0, quiet = false) {
    const g = this.g;
    if (this.dead || g.finale) return;
    if (this.invuln > 0 || this.dashT > 0) return;
    dmg *= (1 - this.stats.armor) * (g.enemyDmg || 1);
    if (!src && this.stats.reflect && Math.random() < this.stats.reflect) { g.fx.pop('DEFLECT!', this.x, this.y + this.h() * 1.4, 'pow', '#7fd8ff'); g.sfx('shatter', this.x, 0.5); this.invuln = 0.2; return; }
    if (!src && this.stats.dazzle) dmg *= 1 - this.stats.dazzle;
    this.hp -= dmg;
    if (!quiet) {
      this.invuln = 0.45; this.hurtFlash = Math.min(1, 0.4 + dmg / 30);
      g.sfx('hurt', this.x, 0.8); g.fx.shake(0.2 + Math.min(0.4, dmg / 40));
      g.fx.pop('-' + Math.ceil(dmg), this.x, this.y + this.h() * 1.4, 'dmg', '#ff4040');
      if (knockX && !this.stats.heavy) { this.vx += knockX; this.vy = Math.max(this.vy, this.size * 4); }
      if (this.stats.spikes && src && src.hurt && !src.dying) src.hurt(this.biteDamage() * 0.8 * this.stats.spikes, { cause: 'spikes' });
    }
    if (this.hp <= 0) {
      if (this.revives > 0) {
        this.revives--; this.hp = this.stats.maxHp * 0.5; this.invuln = 2;
        g.fx.pop('SECOND MOLT!', this.x, this.y + this.h() * 2, 'big', '#8dff5a'); g.sfx('heal', this.x);
        g.fx.burst(this.x, this.y + this.h() * 0.5, 0, 30, this.size * 0.5, [this.colors.body, '#e8e2d0'], 1);
      } else { this.dead = true; g.onPlayerDeath(); }
    }
  }
  addMass(m) {
    const g = this.g, before = this.size;
    this.mass += m * this.stats.growth;
    const cap = g.level.goal * 1.3;
    this.size = Math.min(cap, Math.sqrt(this.mass));
    if (this.size >= cap) this.mass = cap * cap;
    if (Math.floor(this.size * 2) > Math.floor(before * 2)) {
      g.sfx('grow', this.x, 0.8, 1.6 / Math.sqrt(this.size));
      g.fx.pop('GROWING!', this.x, this.y + this.h() * 2.2, 'big', '#8dff5a');
      g.fx.ring(this.x, this.y + this.h() * 0.5, this.size * 1.5, '#8dff5a');
      this.heal(this.stats.maxHp * 0.1);
      g.onGrow(this.size);
    }
  }
}
