// sound.js — every sound is synthesized live with the Web Audio API (no audio files).
// Sound effect synthesis is carried over from Stickbox; new game sounds and a small procedural
// music sequencer are added below. sfx.play(name, { pan, vol, pitch }), music.start(levelMusic).
const S = { on: true, musicOn: true, vol: 0.5, ctx: null, out: null, sfxBus: null, musicBus: null, noise: null, last: {}, voices: 0 };
try { const v = localStorage.getItem('mtm.sound'); if (v != null) S.on = v === '1'; const m = localStorage.getItem('mtm.music'); if (m != null) S.musicOn = m === '1'; } catch (e) { /* storage blocked */ }

function init() {
  if (S.ctx) return S.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { S.ctx = new AC(); } catch (e) { return null; }
  const c = S.ctx;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 6;
  S.out = c.createGain(); S.out.gain.value = S.vol;
  S.out.connect(comp); comp.connect(c.destination);
  S.sfxBus = c.createGain(); S.sfxBus.connect(S.out);
  S.musicBus = c.createGain(); S.musicBus.gain.value = S.musicOn ? 0.32 : 0; S.musicBus.connect(S.out);
  const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  S.noise = buf;
  return c;
}
S.unlock = function () { const c = init(); if (c && c.state === 'suspended') c.resume(); };
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, S.unlock, { passive: true });
S.setOn = function (v) { S.on = v; try { localStorage.setItem('mtm.sound', v ? '1' : '0'); } catch (e) { /* ignore */ } };
S.setMusic = function (v) {
  S.musicOn = v; try { localStorage.setItem('mtm.music', v ? '1' : '0'); } catch (e) { /* ignore */ }
  if (S.musicBus) S.musicBus.gain.setTargetAtTime(v ? 0.32 : 0, S.ctx.currentTime, 0.1);
};

  // ---- building blocks ----
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur));
  }
  // oscillator: { type, f0, f1, dur, vol, a, vib, vibAmt, lp }
  function tone(dest, t, o) {
    const c = S.ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    if (o.vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = o.vib; lg.gain.value = o.vibAmt || o.f0 * 0.08;
      l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + 0.05);
    }
    env(g, t, o.a || 0.005, o.vol || 0.3, o.dur);
    let node = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  // filtered noise: { dur, vol, type, f0, f1, q, a }
  function noise(dest, t, o) {
    const c = S.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = S.noise; src.loop = true;
    f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.8;
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    env(g, t, o.a || 0.004, o.vol || 0.3, o.dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.05);
  }
  const R = (a, b) => a + Math.random() * (b - a);

  // ---- the sounds (p = pitch multiplier) ----
  const SOUNDS = {
    hit(d, t, p) { noise(d, t, { type: 'bandpass', f0: 2200 * p, f1: 500, q: 1.2, dur: 0.09, vol: 0.5 }); tone(d, t, { f0: 190 * p, f1: 70, dur: 0.12, vol: 0.55 }); },
    heavy(d, t, p) { noise(d, t, { f0: 1600 * p, f1: 150, dur: 0.28, vol: 0.8 }); tone(d, t, { f0: 130 * p, f1: 38, dur: 0.32, vol: 0.9 }); tone(d, t, { type: 'square', f0: 70 * p, f1: 40, dur: 0.15, vol: 0.15, lp: 400 }); },
    swing(d, t, p) { noise(d, t, { type: 'bandpass', f0: 700 * p, f1: 2600 * p, q: 2, dur: 0.14, vol: 0.22, a: 0.04 }); },
    whoosh(d, t, p) { noise(d, t, { type: 'bandpass', f0: 500 * p, f1: 2400 * p, q: 1.5, dur: 0.25, vol: 0.3, a: 0.08 }); },
    ko(d, t, p) { tone(d, t, { type: 'triangle', f0: 520 * p, f1: 110, dur: 0.6, vol: 0.35 }); tone(d, t + 0.05, { type: 'square', f0: 260 * p, f1: 60, dur: 0.55, vol: 0.08, lp: 900 }); noise(d, t, { f0: 900, f1: 100, dur: 0.3, vol: 0.4 }); },
    boom(d, t, p) { noise(d, t, { f0: 1400 * p, f1: 60, dur: 1.2, vol: 1.0 }); tone(d, t, { f0: 90 * p, f1: 28, dur: 0.9, vol: 1.0 }); },
    stomp(d, t, p) { tone(d, t, { f0: 75 * p, f1: 28, dur: 0.45, vol: 1.0 }); noise(d, t, { f0: 400, f1: 60, dur: 0.35, vol: 0.6 }); },
    step(d, t, p) { tone(d, t, { f0: 62 * p, f1: 34, dur: 0.2, vol: 0.55 }); noise(d, t, { f0: 250, f1: 80, dur: 0.12, vol: 0.25 }); },
    thud(d, t, p) { tone(d, t, { f0: 110 * p, f1: 50, dur: 0.14, vol: 0.4 }); noise(d, t, { f0: 600, f1: 100, dur: 0.08, vol: 0.2 }); },
    laser(d, t, p) { tone(d, t, { type: 'sawtooth', f0: 1500 * p, f1: 180, dur: 0.4, vol: 0.22, lp: 3000 }); tone(d, t, { type: 'square', f0: 750 * p, f1: 90, dur: 0.4, vol: 0.08, lp: 2000 }); },
    zap(d, t, p) { for (let k = 0; k < 3; k++) tone(d, t + k * 0.05, { type: 'sawtooth', f0: R(900, 1500) * p, f1: 200, dur: 0.06, vol: 0.15 }); noise(d, t, { type: 'highpass', f0: 3000, dur: 0.15, vol: 0.2 }); },
    fire(d, t, p) { noise(d, t, { type: 'bandpass', f0: 700 * p, f1: 300, q: 0.6, dur: 0.7, vol: 0.4, a: 0.05 }); noise(d, t, { type: 'highpass', f0: 4000, dur: 0.5, vol: 0.08 }); },
    freeze(d, t, p) { tone(d, t, { type: 'triangle', f0: 1600 * p, f1: 2900 * p, dur: 0.35, vol: 0.15 }); tone(d, t + 0.08, { f0: 2400 * p, f1: 3200 * p, dur: 0.4, vol: 0.1 }); noise(d, t, { type: 'highpass', f0: 5000, dur: 0.3, vol: 0.1 }); },
    shatter(d, t, p) { noise(d, t, { type: 'highpass', f0: 3500, dur: 0.25, vol: 0.35 }); for (let k = 0; k < 4; k++) tone(d, t + k * 0.03, { type: 'triangle', f0: R(1800, 3200) * p, f1: 900, dur: 0.12, vol: 0.08 }); },
    splat(d, t, p) { noise(d, t, { f0: 700 * p, f1: 90, dur: 0.2, vol: 0.5 }); tone(d, t, { f0: 240 * p, f1: 80, dur: 0.1, vol: 0.25 }); },
    splash(d, t, p) { noise(d, t, { type: 'bandpass', f0: 1300 * p, f1: 500, q: 0.7, dur: 0.4, vol: 0.35 }); },
    hiss(d, t, p) { noise(d, t, { type: 'highpass', f0: 2800 * p, dur: 0.6, vol: 0.25, a: 0.05 }); },
    spit(d, t, p) { noise(d, t, { type: 'bandpass', f0: 1800 * p, f1: 600, q: 1, dur: 0.12, vol: 0.4 }); tone(d, t, { f0: 400 * p, f1: 150, dur: 0.08, vol: 0.2 }); },
    web(d, t, p) { tone(d, t, { type: 'sawtooth', f0: 2200 * p, f1: 380, dur: 0.12, vol: 0.15, lp: 4000 }); noise(d, t, { type: 'highpass', f0: 3000, dur: 0.08, vol: 0.15 }); },
    sting(d, t, p) { tone(d, t, { type: 'sawtooth', f0: 2600 * p, f1: 700, dur: 0.09, vol: 0.18 }); noise(d, t, { type: 'bandpass', f0: 2500, f1: 800, dur: 0.08, vol: 0.3 }); },
    snip(d, t, p) { noise(d, t, { type: 'highpass', f0: 2500 * p, dur: 0.04, vol: 0.45 }); noise(d, t + 0.07, { type: 'highpass', f0: 3000 * p, dur: 0.05, vol: 0.5 }); tone(d, t + 0.07, { type: 'square', f0: 900 * p, f1: 400, dur: 0.05, vol: 0.08 }); },
    roar(d, t, p) { tone(d, t, { type: 'sawtooth', f0: 110 * p, f1: 62 * p, dur: 1.0, vol: 0.45, lp: 700, vib: 7, a: 0.06 }); tone(d, t, { type: 'sawtooth', f0: 165 * p, f1: 90 * p, dur: 0.9, vol: 0.2, lp: 900, vib: 5, a: 0.08 }); noise(d, t, { f0: 900, f1: 200, dur: 1.0, vol: 0.45, a: 0.08 }); },
    bellow(d, t, p) { tone(d, t, { type: 'sawtooth', f0: 150 * p, f1: 72 * p, dur: 1.3, vol: 0.5, lp: 520, vib: 4.5, a: 0.1 }); tone(d, t, { type: 'square', f0: 75 * p, f1: 40 * p, dur: 1.2, vol: 0.12, lp: 300, a: 0.1 }); noise(d, t, { f0: 500, f1: 150, dur: 1.1, vol: 0.3, a: 0.1 }); },
    snort(d, t, p) { noise(d, t, { type: 'bandpass', f0: 900 * p, f1: 400, q: 1.2, dur: 0.18, vol: 0.5, a: 0.02 }); noise(d, t + 0.22, { type: 'bandpass', f0: 1000 * p, f1: 350, q: 1.2, dur: 0.25, vol: 0.6, a: 0.02 }); },
    screech(d, t, p) { tone(d, t, { type: 'square', f0: 1400 * p, f1: 800 * p, dur: 0.6, vol: 0.1, lp: 3000, vib: 30, vibAmt: 120 }); noise(d, t, { type: 'bandpass', f0: 3000, q: 2, dur: 0.6, vol: 0.2, a: 0.04 }); },
    charge(d, t, p) { for (let k = 0; k < 9; k++) { tone(d, t + k * 0.13, { f0: 70 * p, f1: 35, dur: 0.12, vol: 0.6 }); noise(d, t + k * 0.13, { f0: 300, dur: 0.1, vol: 0.3 }); } },
    crash(d, t, p) { noise(d, t, { f0: 2500, f1: 100, dur: 0.7, vol: 0.9 }); tone(d, t, { type: 'square', f0: 220 * p, f1: 180, dur: 0.5, vol: 0.12, lp: 2500 }); tone(d, t, { type: 'square', f0: 331 * p, f1: 260, dur: 0.45, vol: 0.1, lp: 2500 }); tone(d, t, { f0: 80, f1: 30, dur: 0.5, vol: 0.9 }); },
    pop(d, t, p) { tone(d, t, { f0: 500 * p, f1: 1300 * p, dur: 0.08, vol: 0.3 }); },
    spawn(d, t, p) { [523, 659, 784].forEach((f, i) => tone(d, t + i * 0.05, { type: 'triangle', f0: f * p, dur: 0.09, vol: 0.18 })); },
    trash(d, t, p) { noise(d, t, { type: 'bandpass', f0: 350, q: 1, dur: 0.16, vol: 0.5 }); tone(d, t, { type: 'triangle', f0: 160 * p, f1: 90, dur: 0.18, vol: 0.3 }); },
    boing(d, t, p) { tone(d, t, { type: 'triangle', f0: 170 * p, f1: 560 * p, dur: 0.28, vol: 0.3, vib: 18, vibAmt: 30 }); },
    goal(d, t) { [523, 659, 784, 1047].forEach((f, i) => tone(d, t + i * 0.11, { type: 'square', f0: f, dur: 0.16, vol: 0.1, lp: 3000 })); },
    heal(d, t, p) { tone(d, t, { f0: 660 * p, f1: 1320 * p, dur: 0.3, vol: 0.18 }); tone(d, t + 0.1, { type: 'triangle', f0: 990 * p, f1: 1980 * p, dur: 0.3, vol: 0.12 }); },
    crit(d, t, p) { tone(d, t, { type: 'square', f0: 880 * p, f1: 1760 * p, dur: 0.15, vol: 0.12, lp: 4000 }); tone(d, t + 0.12, { type: 'square', f0: 1320 * p, dur: 0.15, vol: 0.1, lp: 4000 }); },
    wind(d, t, p) { noise(d, t, { type: 'bandpass', f0: 300 * p, f1: 1200 * p, q: 0.8, dur: 1.2, vol: 0.35, a: 0.2 }); },
    skitter(d, t, p) { for (let k = 0; k < 7; k++) noise(d, t + k * 0.06 + R(0, 0.03), { type: 'highpass', f0: R(2500, 4500) * p, dur: 0.02, vol: 0.18 }); },
    buzz(d, t, p) { for (const f of [190, 233, 281]) tone(d, t, { type: 'sawtooth', f0: f * p * R(0.97, 1.03), f1: f * p * R(0.94, 1.06), dur: 0.6, vol: 0.06, lp: 1500, vib: R(18, 30), vibAmt: f * 0.05, a: 0.12 }); },
    beat(d, t, p) { for (let k = 0; k < 6; k++) tone(d, t + k * 0.15, { f0: 95 * p, f1: 55, dur: 0.12, vol: 0.6 }); },
    // ---- Kaiju Destroyer additions ----
    chomp(d, t, p) { noise(d, t, { type: 'bandpass', f0: 1800 * p, f1: 700, q: 1.5, dur: 0.07, vol: 0.5 }); tone(d, t, { type: 'square', f0: 220 * p, f1: 90, dur: 0.07, vol: 0.12, lp: 1500 }); },
    gulp(d, t, p) { tone(d, t, { f0: 300 * p, f1: 120 * p, dur: 0.12, vol: 0.4 }); tone(d, t + 0.08, { f0: 200 * p, f1: 420 * p, dur: 0.1, vol: 0.25 }); },
    crunch(d, t, p) { for (let k = 0; k < 4; k++) noise(d, t + k * 0.025, { type: 'bandpass', f0: R(1200, 3000) * p, q: 2, dur: 0.05, vol: 0.4 }); tone(d, t, { f0: 160 * p, f1: 60, dur: 0.12, vol: 0.4 }); },
    grow(d, t, p) { [392, 523, 659, 784, 1047].forEach((f, i) => tone(d, t + i * 0.05, { type: 'triangle', f0: f * p, dur: 0.12, vol: 0.14 })); },
    levelup(d, t) { [523, 659, 784, 1047, 1319].forEach((f, i) => { tone(d, t + i * 0.09, { type: 'square', f0: f, dur: 0.18, vol: 0.09, lp: 3500 }); tone(d, t + i * 0.09, { type: 'triangle', f0: f / 2, dur: 0.2, vol: 0.12 }); }); },
    dna(d, t, p) { [880, 1175, 1568, 2093].forEach((f, i) => tone(d, t + i * 0.06, { type: 'sine', f0: f * p, dur: 0.25, vol: 0.14 })); },
    bullet(d, t, p) { noise(d, t, { type: 'highpass', f0: 1800 * p, dur: 0.05, vol: 0.35 }); tone(d, t, { type: 'square', f0: 600 * p, f1: 200, dur: 0.04, vol: 0.08 }); },
    missile(d, t, p) { noise(d, t, { type: 'bandpass', f0: 600 * p, f1: 2500 * p, q: 1, dur: 0.6, vol: 0.3, a: 0.05 }); },
    cannon(d, t, p) { noise(d, t, { f0: 2000 * p, f1: 100, dur: 0.5, vol: 0.8 }); tone(d, t, { f0: 120 * p, f1: 40, dur: 0.4, vol: 0.8 }); },
    siren(d, t, p) { tone(d, t, { type: 'square', f0: 700 * p, f1: 1000 * p, dur: 0.35, vol: 0.05, lp: 2000 }); tone(d, t + 0.35, { type: 'square', f0: 1000 * p, f1: 700 * p, dur: 0.35, vol: 0.05, lp: 2000 }); },
    warning(d, t) { for (let k = 0; k < 3; k++) { tone(d, t + k * 0.5, { type: 'sawtooth', f0: 440, f1: 330, dur: 0.4, vol: 0.18, lp: 1800 }); } },
    scream(d, t, p) { tone(d, t, { type: 'sawtooth', f0: 900 * p, f1: 1300 * p, dur: 0.35, vol: 0.07, lp: 2500, vib: 9, vibAmt: 60 }); },
    beam(d, t, p) { tone(d, t, { type: 'sawtooth', f0: 160 * p, f1: 120 * p, dur: 0.5, vol: 0.25, lp: 1600, vib: 30, vibAmt: 20 }); noise(d, t, { type: 'bandpass', f0: 2500 * p, q: 0.7, dur: 0.5, vol: 0.25 }); },
    acid(d, t, p) { noise(d, t, { type: 'bandpass', f0: 900 * p, f1: 400, q: 2, dur: 0.18, vol: 0.4 }); tone(d, t, { f0: 500 * p, f1: 200 * p, dur: 0.12, vol: 0.18 }); },
    sizzle(d, t, p) { noise(d, t, { type: 'highpass', f0: 3500 * p, dur: 0.35, vol: 0.18, a: 0.02 }); },
    dash(d, t, p) { noise(d, t, { type: 'bandpass', f0: 400 * p, f1: 1800 * p, q: 1.2, dur: 0.2, vol: 0.4, a: 0.02 }); },
    hurt(d, t, p) { tone(d, t, { type: 'square', f0: 300 * p, f1: 120, dur: 0.15, vol: 0.15, lp: 1200 }); noise(d, t, { f0: 1500, f1: 300, dur: 0.12, vol: 0.35 }); },
    collapse(d, t, p) { noise(d, t, { f0: 900 * p, f1: 80, dur: 1.6, vol: 0.9, a: 0.05 }); for (let k = 0; k < 6; k++) noise(d, t + 0.1 + k * 0.15, { type: 'bandpass', f0: R(300, 1200), q: 1, dur: 0.2, vol: 0.4 }); tone(d, t, { f0: 60, f1: 30, dur: 1.4, vol: 0.8 }); },
    frenzy(d, t) { tone(d, t, { type: 'sawtooth', f0: 110, f1: 440, dur: 0.6, vol: 0.2, lp: 2500 }); tone(d, t, { type: 'square', f0: 220, f1: 880, dur: 0.6, vol: 0.08, lp: 2500 }); },
    click(d, t, p) { tone(d, t, { type: 'triangle', f0: 900 * p, dur: 0.04, vol: 0.15 }); },
    buy(d, t) { [660, 990, 1320].forEach((f, i) => tone(d, t + i * 0.06, { type: 'triangle', f0: f, dur: 0.15, vol: 0.18 })); },
    tongue(d, t, p) { tone(d, t, { type: 'triangle', f0: 200 * p, f1: 900 * p, dur: 0.15, vol: 0.25 }); noise(d, t, { type: 'bandpass', f0: 1200, dur: 0.1, vol: 0.2 }); },
    caw(d, t, p) { tone(d, t, { type: 'sawtooth', f0: 700 * p, f1: 450 * p, dur: 0.35, vol: 0.18, lp: 2200, vib: 25, vibAmt: 40 }); noise(d, t, { type: 'bandpass', f0: 1500, q: 2, dur: 0.3, vol: 0.2 }); },
    earthcrack(d, t) { noise(d, t, { f0: 300, f1: 30, dur: 4, vol: 1, a: 0.3 }); tone(d, t, { f0: 45, f1: 20, dur: 4, vol: 1, a: 0.3 }); }
  };
  const GAP = { step: 0.08, hit: 0.035, heavy: 0.05, fire: 0.25, hiss: 0.3, freeze: 0.15, splat: 0.05, thud: 0.06, boom: 0.06, ko: 0.1, roar: 0.4, bellow: 0.5, screech: 0.4, charge: 0.8, wind: 0.6, beat: 0.6, swing: 0.05, pop: 0.03, buzz: 0.45, skitter: 0.4,
    chomp: 0.05, gulp: 0.05, crunch: 0.05, bullet: 0.045, missile: 0.15, cannon: 0.12, siren: 1.2, scream: 0.25, beam: 0.45, sizzle: 0.2, collapse: 0.3, hurt: 0.12, grow: 0.15 };

  S.play = function (name, o) {
    if (!S.on) return false;
    const fn = SOUNDS[name]; if (!fn) return false;
    const c = S.ctx; if (!c || c.state !== 'running') return false;
    const now = c.currentTime, gap = GAP[name] != null ? GAP[name] : 0.04;
    if (now - (S.last[name] || -9) < gap || S.voices > 30) return false;
    S.last[name] = now;
    o = o || {};
    const g = c.createGain(); g.gain.value = o.vol == null ? 1 : o.vol;
    if (c.createStereoPanner && o.pan) { const pn = c.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(pn); pn.connect(S.sfxBus); }
    else g.connect(S.sfxBus);
    const pitch = (o.pitch || 1) * (1 + (Math.random() - 0.5) * 0.12);
    try { fn(g, now + 0.005, pitch); } catch (e) { return false; }
    S.voices++;
    setTimeout(() => { S.voices--; try { g.disconnect(); } catch (e) { /* ignore */ } }, 2500);
    return true;
  };

  // ---- music: a tiny step sequencer (bass, drums, arpeggio) driven by a lookahead timer ----
  const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11] };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const M = S.music = { playing: false, step: 0, next: 0, timer: null, cfg: null, intensity: 0, prog: [0, 5, 3, 4] };
  function playStep() {
    const c = S.ctx, cfg = M.cfg, d = S.musicBus;
    const spb = 60 / cfg.bpm / 4; // 16th notes
    while (M.next < c.currentTime + 0.15) {
      const t = M.next, s = M.step % 16, bar = Math.floor(M.step / 16) % 4;
      const sc = SCALES[cfg.scale] || SCALES.minor;
      const deg = M.prog[bar];
      const note = (dg, oct) => cfg.root + 12 * oct + sc[((dg % 7) + 7) % 7] + 12 * Math.floor(dg / 7);
      // drums
      if (s % 4 === 0) tone(d, t, { f0: 140, f1: 40, dur: 0.18, vol: 0.9 });
      if (s === 4 || s === 12) noise(d, t, { type: 'bandpass', f0: 1800, q: 0.7, dur: 0.14, vol: 0.45 });
      if (s % 2 === 0 || M.intensity > 0) noise(d, t, { type: 'highpass', f0: 7000, dur: 0.03, vol: s % 4 === 2 ? 0.18 : 0.09 });
      // bass: driving 8ths
      if (s % 2 === 0) tone(d, t, { type: 'sawtooth', f0: midi(note(deg, 0)), dur: spb * 1.6, vol: s % 8 === 0 ? 0.32 : 0.22, lp: 500 + M.intensity * 500 });
      // arpeggio lead
      if (M.intensity > 0 || bar % 2 === 1) {
        const arp = [0, 2, 4, 7, 4, 2][s % 6];
        if (s % (M.intensity > 0 ? 1 : 2) === 0) tone(d, t, { type: 'square', f0: midi(note(deg + arp, 2)), dur: spb * 0.9, vol: 0.05, lp: 2400 });
      }
      if (s === 0 && bar === 0) tone(d, t, { type: 'triangle', f0: midi(note(deg + 4, 1)), dur: spb * 14, vol: 0.06, a: 0.2 });
      M.next += spb; M.step++;
    }
  }
  M.start = function (cfg) {
    M.cfg = cfg; M.intensity = 0;
    const c = init(); if (!c) return;
    M.next = c.currentTime + 0.1; M.step = 0;
    if (!M.timer) M.timer = setInterval(() => { if (M.playing && S.ctx.state === 'running') playStep(); }, 50);
    M.playing = true;
  };
  M.stop = function () { M.playing = false; };
  M.setIntensity = function (v) { M.intensity = v; };

export const sfx = S;
export const music = M;
