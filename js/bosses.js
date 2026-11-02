// bosses.js — one "brain" per boss: init(e, game), update(e, dt, game), optional onDeath.
// Bosses are ordinary entities (entities.js) whose thinking is delegated here. Each brain is a
// little state machine of telegraphed attacks built from shared game actions:
//   game.shoot(e, type, opts)   game.tongue(e, x, y, dmg)   game.strike(x, delay, width, dmg)
//   game.spawn(id, x, y)        game.shockwave(x, y, radius, dmg, fromBoss)
import { rand, sign, choose, clamp } from './util.js';

const face = (e, p) => { e.dir = sign(p.x - e.x); };
const enraged = (e) => e.hp < e.maxHp * 0.5;
const ground = (e) => e.y <= 0.001;

// pick the next attack from a weighted table, avoiding the same one twice
function pick(e, table) {
  let total = 0; for (const k in table) if (k !== e.last) total += table[k];
  let r = Math.random() * total;
  for (const k in table) { if (k === e.last) continue; r -= table[k]; if (r <= 0) { e.last = k; return k; } }
  return Object.keys(table)[0];
}
function begin(e, state, windup) { e.state = state; e.timer = windup; e.flash = Math.min(windup, 0.5); }

export const BOSSES = {
  // 1. leaps across the arena and spits webs
  wolfspider: {
    init(e) { e.state = 'walk'; e.timer = 2; },
    update(e, dt, g) {
      const p = g.player; e.timer -= dt; face(e, p);
      const spd = (enraged(e) ? 1.4 : 1) * e.size * 0.9;
      switch (e.state) {
        case 'walk':
          e.vx = e.dir * spd;
          if (e.distTo(p.x, p.y) < e.size * 0.3 && e.cd <= 0) { p.hurt(e.def.dmg * 0.7, e); e.cd = 1; g.sfx('hit', e.x); }
          e.cd -= dt;
          if (e.timer <= 0) { const a = pick(e, { pounce: 3, web: 2, brood: enraged(e) ? 1 : 0.3 }); begin(e, a, 0.6); g.sfx('screech', e.x, 0.5, 0.8); }
          break;
        case 'pounce':
          e.vx *= 0.8;
          if (e.timer <= 0) {
            const dx = p.x - e.x, t = 0.9;
            e.vx = dx / t; e.vy = g.gravity() * t / 2; e.state = 'air'; e.timer = t + 0.2;
          }
          break;
        case 'air':
          if (ground(e) && e.timer < t0(e)) { g.shockwave(e.x, 0, e.size * 0.9, e.def.dmg, true); e.vx = 0; e.state = 'walk'; e.timer = rand(1.4, 2.4); }
          break;
        case 'web':
          e.vx = 0;
          if (e.timer <= 0) { for (let i = -1; i <= 1; i++) g.shoot(e, 'web', { spread: i * 0.18 }); e.state = 'walk'; e.timer = rand(1.5, 2.5); g.sfx('web', e.x); }
          break;
        case 'brood':
          e.vx = 0;
          if (e.timer <= 0) { for (let i = 0; i < 3; i++) g.spawn('spiderling', e.x + rand(-1, 1) * e.w, 0, 1.4); e.state = 'walk'; e.timer = 2; }
          break;
      }
    }
  },
  // pond boss: lunges to grab with its forelegs, blows bubble volleys, dives under and erupts beneath you
  waterbug: {
    init(e) { e.state = 'stalk'; e.timer = 1.8; },
    update(e, dt, g) {
      const p = g.player, s = p.size; e.timer -= dt;
      const ud = e.mesh.userData;
      if (ud.grab > 0) ud.grab = Math.max(0, ud.grab - dt * 2.2);
      switch (e.state) {
        case 'stalk':
          face(e, p); e.vx = e.dir * s * (enraged(e) ? 1.6 : 1.1) * (Math.abs(p.x - e.x) > e.w * 1.2 ? 1 : 0.2);
          if (e.timer <= 0) { const a = pick(e, { grab: 3, bubbles: 2, dive: enraged(e) ? 2 : 1 }); begin(e, a, a === 'grab' ? 0.5 : 0.6); }
          break;
        case 'grab':
          e.vx = -e.dir * s * 0.8;
          if (e.timer <= 0) { e.state = 'lunge'; e.timer = 0.45; e.vx = e.dir * s * 11; ud.grab = 1; g.sfx('snip', e.x, 0.8, 0.6); e.hit = false; }
          break;
        case 'lunge':
          if (!e.hit && e.distTo(p.x, p.y + p.h() * 0.5) < s * 0.6) { e.hit = true; p.hurt(e.def.dmg, e, -e.dir * s * 6); g.fx.pop('GRABBED!', p.x, p.y + p.h() * 1.5, 'pow', '#ff7a5a'); }
          if (e.timer <= 0) { e.vx = 0; e.state = 'stalk'; e.timer = rand(1.2, 2); }
          break;
        case 'bubbles':
          e.vx = 0; face(e, p);
          if (e.timer <= 0) { for (let i = -2; i <= 2; i++) g.shoot(e, 'bubble', { spread: i * 0.14 + rand(-0.05, 0.05), dmg: e.def.dmg * 0.4 }); g.sfx('splash', e.x); e.state = 'stalk'; e.timer = rand(1.4, 2.2); }
          break;
        case 'dive':
          e.vx = 0;
          if (e.timer <= 0) { e.state = 'under'; e.timer = 1.4; e.hidden = true; e.mesh.visible = false; g.fx.puff(e.x, 0, 0.5, 10, e.size * 0.3, '#9fd8e8'); g.sfx('splash', e.x); g.strike(p.x, 1.1, s * 0.9, e.def.dmg, 'erupt'); e.tx = p.x; }
          break;
        case 'under':
          e.stun = 0;
          if (e.timer <= 0.25 && e.hidden) { e.hidden = false; e.x = e.tx; e.mesh.visible = true; e.vy = g.gravity() * 0.25; }
          if (e.timer <= 0) { e.state = 'stalk'; e.timer = 1.5; }
          break;
      }
    }
  },
  // 2. huge hops that shake the ground, long tongue lashes, swallows flies to heal
  toad: {
    init(e) { e.state = 'sit'; e.timer = 1.5; },
    update(e, dt, g) {
      const p = g.player; e.timer -= dt; face(e, p);
      switch (e.state) {
        case 'sit':
          e.vx *= 0.85;
          if (e.timer <= 0 && ground(e)) { const a = pick(e, { hop: 3, tongue: 3, slam: enraged(e) ? 2 : 1 }); begin(e, a, a === 'tongue' ? 0.55 : 0.4); }
          break;
        case 'hop': case 'slam':
          if (e.timer <= 0) {
            const dx = clamp(p.x - e.x, -g.viewW * 0.5, g.viewW * 0.5), t = e.state === 'slam' ? 1.2 : 0.75;
            e.vx = dx / t; e.vy = g.gravity() * t / 2; e.big = e.state === 'slam'; e.state = 'air'; e.timer = t;
            g.sfx('boing', e.x, 0.7, 0.5);
          }
          break;
        case 'air':
          if (ground(e) && e.timer < 0.6) { g.shockwave(e.x, 0, e.size * (e.big ? 1.6 : 0.9), e.def.dmg * (e.big ? 1 : 0.6), true); e.vx = 0; e.state = 'sit'; e.timer = rand(0.8, 1.6); }
          break;
        case 'tongue':
          if (e.timer <= 0) { g.tongue(e, p.x, p.y + p.h() * 0.5, e.def.dmg, 1.6); e.state = 'sit'; e.timer = enraged(e) ? 0.9 : 1.5; }
          break;
      }
    }
  },
  // 3. circles overhead, swoops, fires feather volleys, lands to peck
  crow: {
    init(e, g) { e.flying = true; e.homeY = g.player.size * 3.2; e.y = e.homeY; e.state = 'circle'; e.timer = 2; },
    update(e, dt, g) {
      const p = g.player; e.timer -= dt; face(e, p);
      const s = g.player.size;
      e.homeY = s * 3.2;
      switch (e.state) {
        case 'circle': {
          const tx = p.x + Math.sin(e.t * 0.8) * s * 4;
          e.vx += (clamp(tx - e.x, -1, 1) * s * 6 - e.vx) * dt * 2;
          e.vy = (e.homeY + Math.sin(e.t * 2) * s * 0.4 - e.y) * 2;
          if (e.timer <= 0) { const a = pick(e, { swoop: 3, feathers: 2.5, land: 1 }); begin(e, a, 0.5); g.sfx('caw', e.x, 0.8); }
          break;
        }
        case 'swoop':
          if (e.timer <= 0) { e.state = 'diving'; e.timer = 1.3; e.tx = p.x; e.ty = p.y + p.h() * 0.4; }
          else e.vx *= 0.9, e.vy = (e.homeY + s - e.y) * 2;
          break;
        case 'diving': {
          const ax = e.tx - e.x, ay = e.ty - e.cy, l = Math.hypot(ax, ay) || 1, sp = s * (enraged(e) ? 14 : 11);
          e.vx = ax / l * sp; e.vy = ay / l * sp;
          if (e.distTo(p.x, p.y + p.h() * 0.5) < s * 0.6) { p.hurt(e.def.dmg, e); e.state = 'circle'; e.timer = 2; }
          if (l < s * 0.5 || e.timer <= 0) { e.state = 'circle'; e.timer = 2; }
          break;
        }
        case 'feathers':
          e.vx *= 0.9; e.vy = (e.homeY - e.y) * 2;
          if (e.timer <= 0) { for (let i = -2; i <= 2; i++) g.shoot(e, 'feather', { spread: i * 0.12 }); e.state = 'circle'; e.timer = rand(1.5, 2.5); }
          break;
        case 'land':
          e.vy = -s * 6; e.vx *= 0.9;
          if (e.y <= 0) { e.y = 0; e.vy = 0; e.state = 'peck'; e.timer = 3.5; g.sfx('stomp', e.x, 0.6); }
          break;
        case 'peck':
          e.vy = 0; e.vx = e.dir * s * 1.5;
          if (e.distTo(p.x, p.y) < s * 0.4 && e.cd <= 0) { p.hurt(e.def.dmg * 0.8, e); e.cd = 0.8; g.sfx('hit', e.x); }
          e.cd -= dt;
          if (e.timer <= 0) { e.state = 'circle'; e.timer = 2; g.sfx('whoosh', e.x); }
          break;
      }
      if (e.y < 0) e.y = 0;
    }
  },
  // 4. rams back and forth, sprays poison gas, lobs bug bombs
  van: {
    init(e) { e.state = 'drive'; e.timer = 2; },
    update(e, dt, g) {
      const p = g.player, s = p.size; e.timer -= dt;
      switch (e.state) {
        case 'drive':
          face(e, p); e.vx = e.dir * s * 1.5;
          if (e.timer <= 0) { const a = pick(e, { ram: 3, gas: 2, bombs: 2 }); begin(e, a, 0.7); if (a === 'ram') g.sfx('siren', e.x, 0.8); }
          break;
        case 'ram':
          e.vx = -e.dir * s * 1.2;
          if (e.timer <= 0) { e.state = 'ramming'; e.timer = 1.6; e.vx = e.dir * s * (enraged(e) ? 13 : 10); g.sfx('charge', e.x, 0.6); }
          break;
        case 'ramming':
          if (e.distTo(p.x, p.y) < s * 0.3 && e.cd <= 0) { p.hurt(e.def.dmg, e, e.dir * s * 12); e.cd = 1; }
          e.cd -= dt;
          if (e.timer <= 0) { e.state = 'drive'; e.timer = rand(1.5, 2.5); }
          break;
        case 'gas':
          e.vx = 0;
          if (e.timer <= 0) { for (let i = 0; i < 4; i++) g.shoot(e, 'gas', { spread: (i - 1.5) * 0.15 }); e.state = 'drive'; e.timer = 2; g.sfx('hiss', e.x); }
          break;
        case 'bombs':
          e.vx = 0;
          if (e.timer <= 0) { for (let i = 0; i < 3; i++) g.shoot(e, 'shell', { tx: p.x + (i - 1) * s * 1.6, dmg: e.def.dmg * 0.6 }); e.state = 'drive'; e.timer = 2; g.sfx('cannon', e.x, 0.5); }
          break;
      }
    }
  },
  // farm boss: charges with its spinning reel, hurls hay bales, sprays pesticide, calls in crop dusters
  combine: {
    init(e) { e.state = 'drive'; e.timer = 2; },
    update(e, dt, g) {
      const p = g.player, s = p.size; e.timer -= dt;
      switch (e.state) {
        case 'drive':
          face(e, p); e.vx = e.dir * s * 1.2;
          if (e.distTo(p.x, p.y) < s * 0.3 && e.cd <= 0) { p.hurt(e.def.dmg * 0.6, e, e.dir * s * 6); e.cd = 0.8; g.fx.pop('SHRED!', p.x, p.y + p.h() * 1.4, 'pow', '#ff5a5a'); }
          e.cd -= dt;
          if (e.timer <= 0) { const a = pick(e, { harvest: 3, hay: 2.5, spray: 2, dusters: enraged(e) ? 1.4 : 0.6 }); begin(e, a, 0.8); g.sfx('charge', e.x, 0.4, 1.3); }
          break;
        case 'harvest':
          e.vx = -e.dir * s * 0.8;
          if (e.timer <= 0) { e.state = 'harvesting'; e.timer = 1.8; e.vx = e.dir * s * (enraged(e) ? 9 : 7); }
          break;
        case 'harvesting':
          if (e.distTo(p.x, p.y) < s * 0.35 && e.cd <= 0) { p.hurt(e.def.dmg, e, e.dir * s * 10); e.cd = 0.8; g.fx.pop('HARVESTED!', p.x, p.y + p.h() * 1.4, 'big', '#ff5a5a'); }
          e.cd -= dt;
          if (Math.random() < dt * 20) g.fx.burst(e.x + e.dir * e.w, 0.3 * s, 0.5, 2, s * 0.3, ['#d9b44a', '#7aa83a'], 1);
          if (e.timer <= 0) { e.state = 'drive'; e.timer = rand(1.5, 2.5); }
          break;
        case 'hay':
          e.vx = 0;
          if (e.timer <= 0) { const n = enraged(e) ? 4 : 3; for (let i = 0; i < n; i++) g.shoot(e, 'hay', { tx: p.x + (i - (n - 1) / 2) * s * 1.5, dmg: e.def.dmg * 0.6, from: 'top' }); g.sfx('whoosh', e.x); e.state = 'drive'; e.timer = 2; }
          break;
        case 'spray':
          e.vx = 0;
          if (e.timer <= 0) { for (let i = 0; i < 5; i++) g.shoot(e, 'gas', { spread: (i - 2) * 0.12, dmg: 8 }); g.sfx('hiss', e.x); e.state = 'drive'; e.timer = 2; }
          break;
        case 'dusters':
          if (e.timer <= 0) { g.spawn('duster', p.x - g.viewW * 0.6, 0); if (enraged(e)) g.spawn('duster', p.x + g.viewW * 0.6, 0); e.state = 'drive'; e.timer = 2.2; }
          break;
      }
    }
  },
  // 5. hovering gunship: strafing bullet streams and homing missile salvos
  gunship: {
    init(e, g) { e.flying = true; e.homeY = g.player.size * 3; e.y = e.homeY; e.state = 'hover'; e.timer = 2; },
    update(e, dt, g) {
      const p = g.player, s = p.size; e.timer -= dt; face(e, p);
      e.homeY = e.state === 'low' ? s * 0.9 : s * 2.6;
      const tx = e.state === 'low' ? p.x - e.dir * s * 1.5 : p.x - e.dir * s * 5;
      e.vx += (clamp(tx - e.x, -1, 1) * s * 4 - e.vx) * dt * 2;
      e.vy = (e.homeY + Math.sin(e.t * 1.7) * s * 0.4 - e.y) * 2;
      e.mesh.rotation.z = -e.vx * 0.02 / s;
      switch (e.state) {
        case 'hover':
          if (e.timer <= 0) { const a = pick(e, { guns: 3, missiles: 2, strafe: 1.5, low: 2 }); begin(e, a, 0.6); if (a === 'low') { e.timer = 3.5; g.fx.pop('IT\'S COMING LOW!', e.cx, e.y + e.h, 'pow', '#ffd23f'); } }
          break;
        case 'low':
          e.cd -= dt; if (e.cd <= 0) { g.shoot(e, 'bullet', { spread: rand(-0.1, 0.1), dmg: 2 }); e.cd = 0.15; }
          if (e.timer <= 0) { e.state = 'hover'; e.timer = 1.5; }
          break;
        case 'guns':
          if (e.timer <= 0) { e.state = 'firing'; e.timer = enraged(e) ? 2.2 : 1.6; e.cd = 0; }
          break;
        case 'firing':
          e.cd -= dt; if (e.cd <= 0) { g.shoot(e, 'bullet', { spread: rand(-0.06, 0.06), dmg: 3 }); e.cd = 0.08; }
          if (e.timer <= 0) { e.state = 'hover'; e.timer = rand(1, 2); }
          break;
        case 'missiles':
          if (e.timer <= 0) { const n = enraged(e) ? 6 : 4; for (let i = 0; i < n; i++) setTimeout(() => !e.dead && !e.dying && g.shoot(e, 'missile', { dmg: 8 }), i * 160); e.state = 'hover'; e.timer = 2.5; }
          break;
        case 'strafe':
          if (e.timer <= 0) { for (let i = -3; i <= 3; i++) g.strike(p.x + i * s * 1.3, 0.9 + (i + 3) * 0.08, s * 0.5, 8, 'bullets'); e.state = 'hover'; e.timer = 2.5; }
          break;
      }
    }
  },
  // 6. slow armored giant: twin artillery, machine guns and called-in air strikes
  mammoth: {
    init(e) { e.state = 'roll'; e.timer = 2; },
    update(e, dt, g) {
      const p = g.player, s = p.size; e.timer -= dt; face(e, p);
      const tur = e.mesh.userData.turret;
      if (tur) tur.rotation.z = Math.atan2(p.y - e.cy, Math.abs(p.x - e.x)) * 0.5;
      switch (e.state) {
        case 'roll':
          e.vx = e.dir * s * 0.6 * (Math.abs(p.x - e.x) > s * 4 ? 1 : -0.5);
          if (e.timer <= 0) { const a = pick(e, { cannon: 3, guns: 2, airstrike: 1.5, crush: 1 }); begin(e, a, 0.6); }
          break;
        case 'cannon':
          e.vx = 0;
          if (e.timer <= 0) { g.shoot(e, 'shell', { tx: p.x, dmg: e.def.dmg * 0.7 }); g.shoot(e, 'shell', { tx: p.x + p.vx * 0.8, dmg: e.def.dmg * 0.7 }); g.sfx('cannon', e.x); g.fx.shake(0.3); e.state = 'roll'; e.timer = rand(1.5, 2.2); }
          break;
        case 'guns':
          if (e.timer <= 0) { e.state = 'firing'; e.timer = 1.8; e.cd = 0; }
          break;
        case 'firing':
          e.cd -= dt; if (e.cd <= 0) { g.shoot(e, 'bullet', { spread: rand(-0.08, 0.08), dmg: 3 }); e.cd = 0.09; }
          if (e.timer <= 0) { e.state = 'roll'; e.timer = 1.5; }
          break;
        case 'airstrike':
          if (e.timer <= 0) { g.sfx('warning', e.x, 0.6); for (let i = 0; i < 6; i++) g.strike(p.x + (i - 2.5) * s * 1.4 * e.dir, 1.2 + i * 0.15, s * 0.6, 12, 'bomb'); e.state = 'roll'; e.timer = 3; }
          break;
        case 'crush':
          if (e.timer <= 0) { e.state = 'charging'; e.timer = 1.4; e.vx = e.dir * s * 7; g.sfx('charge', e.x); }
          break;
        case 'charging':
          if (e.distTo(p.x, p.y) < s * 0.3 && e.cd <= 0) { p.hurt(e.def.dmg, e, e.dir * s * 10); e.cd = 1; }
          e.cd -= dt;
          if (e.timer <= 0) { e.state = 'roll'; e.timer = 2; }
          break;
      }
    }
  },
  // harbor boss: broadside shell salvos, deck guns, cruise missiles, depth-charge strikes and ramming
  battleship: {
    init(e) { e.state = 'cruise'; e.timer = 2; },
    update(e, dt, g) {
      const p = g.player, s = p.size; e.timer -= dt; face(e, p);
      const tur = e.mesh.userData.turrets || [];
      for (const t of tur) t.rotation.z = Math.atan2(p.y + p.h() - e.cy, Math.abs(p.x - e.x)) * 0.6;
      switch (e.state) {
        case 'cruise':
          e.vx = e.dir * s * 0.7 * (Math.abs(p.x - e.x) > s * 5 ? 1 : -0.6);
          if (e.timer <= 0) { const a = pick(e, { broadside: 3, guns: 2, missiles: 2, charges: 1.5, ram: 1 }); begin(e, a, 0.8); g.sfx('siren', e.x, 0.6, 0.6); }
          break;
        case 'broadside':
          e.vx = 0;
          if (e.timer <= 0) {
            const n = enraged(e) ? 9 : 6;
            for (let i = 0; i < n; i++) setTimeout(() => { if (!e.dead && !e.dying) { g.shoot(e, 'shell', { tx: g.player.x + rand(-1.5, 1.5) * s, dmg: e.def.dmg * 0.55, from: 'top' }); g.fx.shake(0.15); } }, i * 120);
            g.sfx('cannon', e.x, 1, 0.7); e.state = 'cruise'; e.timer = 2.4;
          }
          break;
        case 'guns':
          if (e.timer <= 0) { e.state = 'firing'; e.timer = 2; e.cd = 0; }
          break;
        case 'firing':
          e.cd -= dt; if (e.cd <= 0) { g.shoot(e, 'bullet', { spread: rand(-0.1, 0.1), dmg: 3, from: 'top' }); e.cd = 0.07; }
          if (e.timer <= 0) { e.state = 'cruise'; e.timer = 1.5; }
          break;
        case 'missiles':
          if (e.timer <= 0) { const n = enraged(e) ? 6 : 4; for (let i = 0; i < n; i++) setTimeout(() => !e.dead && !e.dying && g.shoot(e, 'missile', { dmg: 9, up: 1, from: 'top' }), i * 150); e.state = 'cruise'; e.timer = 2.5; }
          break;
        case 'charges':
          if (e.timer <= 0) { for (let i = 0; i < 5; i++) g.strike(p.x + (i - 2) * s * 1.5, 1.2 + i * 0.12, s * 0.6, 12, 'erupt'); e.state = 'cruise'; e.timer = 2.6; }
          break;
        case 'ram':
          if (e.timer <= 0) { e.state = 'ramming'; e.timer = 1.6; e.vx = e.dir * s * 8; g.sfx('bellow', e.x, 0.6, 0.5); }
          break;
        case 'ramming':
          if (e.distTo(p.x, p.y) < s * 0.3 && e.cd <= 0) { p.hurt(e.def.dmg, e, e.dir * s * 12); e.cd = 1; }
          e.cd -= dt;
          if (Math.random() < dt * 25) g.fx.puff(e.x + e.dir * e.w, 0, 0.5, 1, s * 0.4, '#e8f4ff', 0.6);
          if (e.timer <= 0) { e.state = 'cruise'; e.timer = 2; }
          break;
      }
    }
  },
  // 7. walking mech: sweeping eye laser, missile barrages, ground pound and drone escorts
  titan: {
    init(e) { e.state = 'walk'; e.timer = 2; },
    update(e, dt, g) {
      const p = g.player, s = p.size; e.timer -= dt; face(e, p);
      switch (e.state) {
        case 'walk':
          e.vx = e.dir * s * 0.8 * (Math.abs(p.x - e.x) > s * 2.5 ? 1 : 0);
          if (e.timer <= 0) { const a = pick(e, { laser: 3, barrage: 2.5, pound: 2, drones: enraged(e) ? 1.2 : 0.5 }); begin(e, a, a === 'laser' ? 0.9 : 0.6); g.sfx('zap', e.x, 0.5); }
          break;
        case 'laser':
          e.vx = 0;
          if (e.timer <= 0) { e.state = 'lasering'; e.timer = 1.4; e.cd = 0; }
          break;
        case 'lasering':
          e.cd -= dt;
          if (e.cd <= 0) { e.cd = 0.05; const k = 1 - e.timer / 1.4; g.shoot(e, 'laser', { tx: e.x + e.dir * s * (2 + k * 9), ty: 0, dmg: 4, from: 'eye' }); }
          if (e.timer <= 0) { e.state = 'walk'; e.timer = rand(1.4, 2.2); }
          break;
        case 'barrage':
          if (e.timer <= 0) { const n = enraged(e) ? 8 : 5; for (let i = 0; i < n; i++) setTimeout(() => !e.dead && !e.dying && g.shoot(e, 'missile', { dmg: 9, up: 1 }), i * 130); e.state = 'walk'; e.timer = 2.4; }
          break;
        case 'pound':
          if (e.timer <= 0) { e.vy = g.gravity() * 0.35; e.state = 'air'; e.timer = 0.8; }
          break;
        case 'air':
          if (ground(e) && e.timer < 0.5) { g.shockwave(e.x, 0, e.size * 1.2, e.def.dmg, true); g.groundWave(e.x, e.dir, e.def.dmg * 0.6, true); e.state = 'walk'; e.timer = 1.5; }
          break;
        case 'drones':
          if (e.timer <= 0) { for (let i = 0; i < 3; i++) g.spawn('gunship', e.x + rand(-2, 2) * s, s * 3); e.state = 'walk'; e.timer = 2; }
          break;
      }
    }
  },
  // 8. the planet's last weapon: orbital lasers, missile rings, shield phases, defenders
  core: {
    init(e) { e.state = 'idle'; e.timer = 2.5; e.shield = 0; },
    update(e, dt, g) {
      const p = g.player, s = p.size; e.timer -= dt; e.vx = 0; face(e, p);
      const orb = e.mesh.userData.orb;
      if (orb) orb.material.emissiveIntensity = 1 + Math.sin(e.t * (enraged(e) ? 10 : 4)) * 0.6;
      if (e.shield > 0) { e.shield -= dt; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.01 * dt); if (Math.random() < dt * 20) g.fx.sparks(e.cx + rand(-1, 1) * e.w, e.cy + rand(-0.5, 0.5) * e.h, 0.5, 1, s, '#7fd8ff', 3, 0.5); }
      switch (e.state) {
        case 'idle':
          if (e.timer <= 0) { const a = pick(e, { orbital: 3, ring: 2.5, beam: 2, defenders: 1.2 }); begin(e, a, 0.7); g.sfx('warning', e.x, 0.5); }
          break;
        case 'orbital':
          if (e.timer <= 0) { const n = enraged(e) ? 7 : 5; for (let i = 0; i < n; i++) g.strike(p.x + (i - (n - 1) / 2) * s * 1.6 + rand(-0.3, 0.3) * s, 1.1 + i * 0.12, s * 0.55, 14, 'orbital'); e.state = 'idle'; e.timer = 2.4; }
          break;
        case 'ring':
          if (e.timer <= 0) { const n = enraged(e) ? 10 : 7; for (let i = 0; i < n; i++) g.shoot(e, 'missile', { angle: Math.PI * (0.15 + 0.7 * i / (n - 1)), dmg: 9, from: 'top' }); g.sfx('missile', e.x); e.state = 'idle'; e.timer = 2.6; }
          break;
        case 'beam':
          if (e.timer <= 0) { e.state = 'beaming'; e.timer = 1.6; e.cd = 0; }
          break;
        case 'beaming':
          e.cd -= dt;
          if (e.cd <= 0) { e.cd = 0.05; const k = 1 - e.timer / 1.6; g.shoot(e, 'laser', { tx: e.x + e.dir * s * (10 - k * 9), ty: 0, dmg: 4, from: 'top' }); }
          if (e.timer <= 0) { e.state = 'idle'; e.timer = 2; }
          break;
        case 'defenders':
          if (e.timer <= 0) { e.shield = 4; g.fx.pop('SHIELD UP!', e.cx, e.y + e.h * 1.1, 'big', '#7fd8ff'); for (let i = 0; i < 2; i++) g.spawn(choose(['megamech', 'tank8', 'megajet']), e.x - e.dir * rand(2, 4) * s, 0); e.state = 'idle'; e.timer = 3; }
          break;
      }
    },
    onDeath(e, g) { g.finale = 0.001; }
  }
};
// the pounce lands once the spider is past the top of its arc
function t0() { return 0.9; }
