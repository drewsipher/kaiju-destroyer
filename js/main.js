// main.js — boots the renderer and runs the app state machine:
// title -> intro -> playing <-> paused -> results / death -> evolve -> next level ... -> victory
import './models-extra.js';
import { Renderer } from './render.js';
import { FX } from './fx.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { World } from './world.js';
import { Game } from './game.js';
import { LEVELS } from './data/levels.js';
import * as Run from './run.js';
import * as Lab from './lab.js';
import * as Save from './save.js';
import * as UI from './ui.js';
import { sfx, music } from './sound.js';

const canvas = document.getElementById('view');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const hud = new HUD();
const fx = new FX(renderer.scene, renderer.camera, document.getElementById('pops'));
const world = new World(renderer.scene);
const ctx = { renderer, input, hud, fx, world };
let profile = Save.load();
let shadows = true;
try { shadows = localStorage.getItem('mtm.shadows') !== '0'; } catch (e) { /* ignore */ }
renderer.r.shadowMap.enabled = shadows;

let game = null, state = 'title', levelIdx = 0;
const persist = () => Save.save(profile);

const settings = {
  get(k) { return k === 'sound' ? sfx.on : k === 'music' ? sfx.musicOn : k === 'ink' ? renderer.ink : k === 'shadows' ? shadows : false; },
  set(k, v) {
    if (k === 'sound') sfx.setOn(v);
    else if (k === 'music') sfx.setMusic(v);
    else if (k === 'ink') renderer.setInk(v);
    else if (k === 'shadows') { shadows = v; renderer.r.shadowMap.enabled = v; renderer.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); try { localStorage.setItem('mtm.shadows', v ? '1' : '0'); } catch (e) { /* ignore */ } }
  },
  reset() { profile = Save.reset(); }
};

function endGame() { if (game) { game.dispose(); game = null; } hud.show(false); }

function toTitle() {
  endGame(); state = 'title'; music.stop();
  showBackdrop();
  const run = profile.run;
  UI.title(profile, {
    cont: () => startLevel(run.unlocked),
    newGame: () => (run && run.design ? UI.confirmNew(() => beginRun(0, null), toTitle) : beginRun(0, null)),
    play: (i) => startLevel(i),
    lab: () => openLab(toTitle),
    settings
  });
}

// a living diorama behind the menus
function showBackdrop() {
  world.load(LEVELS[0]);
  renderer.r.setClearColor(LEVELS[0].fog);
  const cam = renderer.camera;
  cam.position.set(0, 3, 14); cam.lookAt(0, 2, 0); cam.near = 0.1; cam.far = 1000; cam.updateProjectionMatrix();
  world.update(0, 1, 20);
}

// a new run: roll three eggs (different every time), pick one, go
function beginRun(ng, heirloom) {
  endGame(); showBackdrop();
  if (profile.run && profile.run.parts.length) profile.meta.lastParts = profile.run.parts.slice();
  profile.run = Run.newRun(ng, heirloom);
  persist();
  const designs = Run.eggs(profile.meta);
  Lab.hatch(profile, designs, (d) => {
    Run.startWith(profile.run, d);
    persist();
    startLevel(0);
  });
}

function startLevel(i) {
  if (!profile.run || !profile.run.design) return beginRun(0, null); // no kaiju yet: hatch one first
  endGame(); UI.hide();
  const run = profile.run;
  levelIdx = Math.min(i, LEVELS.length - 1);
  const L = LEVELS[levelIdx];
  state = 'intro';
  world.load(L);
  UI.intro(L, levelIdx, run, () => {
    UI.hide();
    const p = { stats: Run.statsFor(run, levelIdx), design: run.design, colors: profile.colors, extras: Run.extrasFor(run), ng: run.ng };
    game = new Game(ctx, L, levelIdx, p, { onComplete, onDeath, onVictory });
    hud.setup(game, levelIdx + 1); hud.show(true);
    hud.banner(L.name.toUpperCase(), 2.2);
    state = 'playing';
  });
}

// DNA is scarce: a first clear pays 2 + rank bonus, replays only pay for helixes you pick up
function dnaFor(r, first) {
  const rank = UI.rankFor(r.score, LEVELS[levelIdx].par * (1 + 0.5 * profile.run.ng));
  const bonus = { S: 3, A: 2, B: 1, C: 0 }[rank];
  return { rank, dna: (first ? 2 + bonus : 0) + r.dna };
}

function recordClear(r) {
  const run = profile.run, meta = profile.meta;
  const first = !run.cleared.includes(levelIdx);
  const { rank, dna } = dnaFor(r, first);
  run.dna += dna;
  if (first) { run.cleared.push(levelIdx); run.score += r.score; run.draft = Run.draftOptions(run, meta); }
  run.unlocked = Math.max(run.unlocked, Math.min(LEVELS.length - 1, levelIdx + 1));
  meta.levelBest[levelIdx] = Math.max(meta.levelBest[levelIdx] || 0, r.score);
  meta.best = Math.max(meta.best, run.score);
  const boss = LEVELS[levelIdx].boss;
  if (!meta.bosses.includes(boss)) meta.bosses.push(boss);
  persist();
  return { rank, dna };
}

function onComplete(r) {
  const { rank, dna } = recordClear(r);
  state = 'results'; music.stop();
  const again = () => UI.results(LEVELS[levelIdx], levelIdx, r, rank, dna, profile, h);
  const h = {
    draft: () => Lab.draft(profile, (msg) => { persist(); openLab(again, msg); }),
    lab: () => openLab(again), next: () => startLevel(levelIdx + 1), retry: () => startLevel(levelIdx), menu: toTitle
  };
  again();
}

function onDeath(r) {
  profile.run.dna += r.dna; persist();
  state = 'death'; music.stop();
  const again = () => UI.death(LEVELS[levelIdx], levelIdx, r, r.dna, profile, h);
  const h = { retry: () => startLevel(levelIdx), lab: () => openLab(again), menu: toTitle };
  again();
}

function onVictory(r) {
  recordClear(r);
  const run = profile.run, meta = profile.meta;
  meta.wins = (meta.wins || 0) + 1;
  meta.ngMax = Math.max(meta.ngMax || 0, run.ng + 1);
  meta.lastParts = run.parts.slice();
  run.draft = null;
  persist();
  state = 'victory'; music.stop();
  endGame(); showBackdrop();
  sfx.play('levelup');
  UI.victory(r, profile, run.score, {
    ngplus: () => Lab.heirloom(profile, (keep) => beginRun(run.ng + 1, keep)),
    menu: toTitle
  });
}

function openLab(back, note) {
  const prev = state; state = 'evolve';
  Lab.lab(profile, levelIdx, persist, () => { state = prev; persist(); back(); }, note);
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused'; music.stop();
    UI.pause({ resume: togglePause, restart: () => startLevel(levelIdx), menu: toTitle });
  } else if (state === 'paused') {
    UI.hide(); state = 'playing'; music.start(game.level.music);
  }
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (input.hit('pause') && (state === 'playing' || state === 'paused')) togglePause();
  let hurt = 0, frenzy = 0;
  if (state === 'playing' && game) {
    game.update(dt);
  }
  if (state === 'playing' && game) {
    hurt = game.player.hurtFlash * 0.6 + (game.player.hp < game.player.stats.maxHp * 0.25 ? 0.12 + Math.sin(now / 150) * 0.05 : 0);
    frenzy = game.player.frenzyT > 0 ? 1 : 0;
  } else if (!game) {
    // drift the backdrop camera slowly
    const cam = renderer.camera;
    cam.position.x += dt * 1.5; cam.lookAt(cam.position.x, 2, 0);
    world.update(cam.position.x, 1, 20);
  }
  renderer.render(now / 1000, hurt, frenzy);
  input.endFrame();
}

// debug hooks for testing from the console
window.MTM = { renderer, get game() { return game; }, get profile() { return profile; }, startLevel, toTitle, grow: (n) => game && game.player.addMass(n), dna: (n) => { if (profile.run) { profile.run.dna += n; persist(); } } };

toTitle();
requestAnimationFrame(frame);
