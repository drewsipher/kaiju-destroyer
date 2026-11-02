// hud.js — the in-game heads-up display (DOM). Values are only written when they change.
import { fmtLen, fmtNum } from './util.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = $('hud');
    this.cache = {};
    this.bannerT = 0;
    this.boss = null;
  }
  show(v) { this.el.hidden = !v; if (!v) { $('banner').classList.remove('show'); $('bossbar').hidden = true; } }
  set(id, prop, v) {
    const k = id + prop;
    if (this.cache[k] === v) return;
    this.cache[k] = v;
    const el = $(id);
    if (prop === 'text') el.textContent = v; else if (prop === 'w') el.style.width = v; else if (prop === 'cls') el.className = v; else if (prop === 'h') el.style.height = v;
  }
  setup(game, levelNum) {
    this.cache = {};
    const L = game.level;
    $('hudLevel').textContent = 'Level ' + levelNum + ': ' + L.name;
    $('hudGoal').textContent = 'Grow to ' + fmtLen(L.goal * L.unit) + ' to face the boss';
    const st = game.player.stats;
    $('ab-spit').hidden = !st.acid; $('ab-roar').hidden = !st.roar; $('ab-beam').hidden = !st.beam; $('ab-web').hidden = !st.silk;
    $('bossbar').hidden = true; this.boss = null;
    $('power').textContent = 'Power ×' + st.power.toFixed(1) + (game.ng ? '  ·  NG+' + (game.ng > 1 ? game.ng : '') : '');
  }
  banner(text, dur = 2.5, style = '') {
    const b = $('banner');
    b.textContent = text; b.className = 'show ' + style; this.bannerT = dur;
  }
  bossBar(boss) { this.boss = boss; $('bossbar').hidden = false; $('bossName').textContent = boss.def.name; }
  update(g) {
    const p = g.player, L = g.level, dt = 1 / 60;
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $('banner').classList.remove('show'); }
    this.set('hpFill', 'w', Math.max(0, p.hp / p.stats.maxHp * 100).toFixed(1) + '%');
    this.set('hpText', 'text', Math.ceil(Math.max(0, p.hp)) + ' / ' + p.stats.maxHp);
    const prog = Math.min(1, (p.size - 1) / (L.goal - 1));
    this.set('growFill', 'w', (prog * 100).toFixed(1) + '%');
    this.set('sizeText', 'text', fmtLen(p.size * L.unit));
    this.set('score', 'text', fmtNum(g.score));
    const mult = g.comboMult();
    this.set('combo', 'text', g.combo > 1 ? g.combo + ' combo  x' + mult.toFixed(1) : '');
    this.set('frenzyFill', 'w', (p.frenzyT > 0 ? p.frenzyT / p.stats.frenzyTime * 100 : p.frenzy * 100).toFixed(1) + '%');
    this.set('frenzyBox', 'cls', 'meter frenzy' + (p.frenzy >= 1 ? ' ready' : '') + (p.frenzyT > 0 ? ' active' : ''));
    this.set('staminaBox', 'cls', p.stats.flight ? 'meter stamina' : 'meter stamina off');
    this.set('staminaFill', 'w', (p.stamina * 100).toFixed(0) + '%');
    this.set('dnaCount', 'text', '🧬 ' + g.stats.dna);
    const cds = { chomp: [p.cd.chomp, 0.3], dash: [p.cd.dash, 1.1], stomp: [p.cd.stomp, 0.9], spit: [p.cd.spit, 0.55], roar: [p.cd.roar, 8], web: [p.cd.web, 4], beam: [p.beamT > 0 ? 0 : p.cd.beam, 9] };
    for (const k in cds) this.set('cd-' + k, 'h', (Math.min(1, cds[k][0] / cds[k][1]) * 100).toFixed(0) + '%');
    if (this.boss) {
      const b = this.boss;
      this.set('bossFill', 'w', Math.max(0, b.hp / b.maxHp * 100).toFixed(1) + '%');
      if (b.dead || b.dying) { $('bossbar').hidden = true; this.boss = null; }
    }
    const hint = g.phase === 'rampage' ? `RAMPAGE ${Math.ceil(g.rampageT)}s · everything ×2 points · Enter to finish early`
      : g.phase === 'grow' && g.time < 14 ? 'A/D move · Space jump · Click to CHOMP · Shift dash · Q stomp · W climb buildings' : '';
    this.set('hint', 'text', hint);
  }
}
