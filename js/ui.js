// ui.js — menus and overlay screens: title, settings, how-to-play, level intro, results, game over,
// pause and victory. The creature screens (hatch, mutation draft, Body Lab, Evolution) are in lab.js.
import { LEVELS } from './data/levels.js';
import { fmtLen, fmtNum } from './util.js';
import { sfx } from './sound.js';
import { previews } from './lab.js';

export const root = () => document.getElementById('screens');
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function show(html, cls = '', cardCls = '') {
  previews.clear();
  const r = root();
  r.innerHTML = `<div class="screen ${cls}"><div class="card ${cardCls}">${html}</div></div>`;
  r.hidden = false;
  return r;
}
export function on(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', () => { sfx.play('click'); fn(); }); }
export function hide() { const r = root(); r.hidden = true; r.innerHTML = ''; previews.clear(); }
const ngTag = (ng) => (ng ? ` <span class="ng">NG+${ng > 1 ? ng : ''}</span>` : '');

export function title(profile, h) {
  const run = profile.run, meta = profile.meta;
  const lv = LEVELS.map((L, i) => {
    const open = run && i <= run.unlocked;
    return `<button class="lvl ${open ? '' : 'locked'}" data-lv="${i}" ${open ? '' : 'disabled'}>${i + 1}. ${esc(L.name)}${meta.levelBest[i] ? `<small>${fmtNum(meta.levelBest[i])}</small>` : ''}</button>`;
  }).join('');
  show(`
    <h1 class="logo">Kaiju <span>Destroyer</span></h1>
    <p class="tag">Hatch as a speck. Eat everything. Mutate. Become the monster that ate the world.</p>
    <div class="row">
      ${run && run.design ? `<button id="bCont" class="big">Continue: Level ${run.unlocked + 1}${ngTag(run.ng)}</button>` : ''}
      <button id="bNew" class="big">${run && run.design ? 'New Game' : 'Hatch!'}</button>
    </div>
    <div class="row">
      ${run && run.design ? '<button id="bLab">🧬 Body Lab &amp; Evolution</button>' : ''}
      <button id="bHelp">How to Play</button>
      <button id="bSettings">Settings</button>
    </div>
    ${run && run.design ? `<h3>Levels this run</h3><div class="levels">${lv}</div>` : ''}
    <p class="small">${meta.best ? `Best run: <b>${fmtNum(meta.best)}</b>` : ''}${meta.wins ? ` · World eaten ${meta.wins}×` : ''}${meta.bosses.length ? ` · ${meta.bosses.length} bosses defeated (colors unlocked)` : ''}</p>
  `, 'title');
  on('bCont', h.cont); on('bNew', h.newGame); on('bLab', h.lab); on('bHelp', () => help(() => title(profile, h))); on('bSettings', () => settings(h.settings, () => title(profile, h)));
  root().querySelectorAll('.lvl:not(.locked)').forEach((b) => b.addEventListener('click', () => { sfx.play('click'); h.play(+b.dataset.lv); }));
}

export function confirmNew(onYes, onNo) {
  show(`<h2>Start over?</h2><p>Your current kaiju, its parts and its evolution will be lost. Best scores and unlocked colors are kept.</p>
    <div class="row"><button id="bYes" class="big">Hatch a new kaiju</button><button id="bNo" class="big">Keep playing</button></div>`);
  on('bYes', onYes); on('bNo', onNo);
}

export function settings(s, back) {
  const row = (id, label, v) => `<button id="${id}" class="toggle ${v ? 'on' : ''}">${label}: ${v ? 'ON' : 'OFF'}</button>`;
  show(`
    <h2>Settings</h2>
    <div class="col">
      ${row('tSound', 'Sound effects', s.get('sound'))}
      ${row('tMusic', 'Music', s.get('music'))}
      ${row('tInk', 'Ink outlines (turn off for speed)', s.get('ink'))}
      ${row('tShadows', 'Shadows (turn off for speed)', s.get('shadows'))}
      <button id="tReset" class="danger">Erase all save data</button>
    </div>
    <div class="row"><button id="bBack" class="big">Back</button></div>`);
  const tog = (id, key) => on(id, () => { s.set(key, !s.get(key)); settings(s, back); });
  tog('tSound', 'sound'); tog('tMusic', 'music'); tog('tInk', 'ink'); tog('tShadows', 'shadows');
  on('tReset', () => { if (confirm('Erase all progress, scores and unlocks?')) { s.reset(); back(); } });
  on('bBack', back);
}

export function help(back) {
  show(`
    <h2>How to Play</h2>
    <div class="cols2">
      <div>
        <h3>Move</h3>
        <ul>
          <li><kbd>A</kbd><kbd>D</kbd> / arrows: crawl</li>
          <li><kbd>Space</kbd> / <kbd>W</kbd>: jump (wings add jumps, gliding and flight)</li>
          <li><kbd>W</kbd> against a tall building: <b>climb it</b>. Rooftops are solid</li>
          <li><kbd>Shift</kbd>: dash (you can't be hurt while dashing)</li>
        </ul>
        <h3>Eat &amp; destroy</h3>
        <ul>
          <li><b>Left-click</b> / <kbd>J</kbd>: CHOMP toward the mouse</li>
          <li>Smashed things drop green <b>biomass</b>: collect it to grow</li>
          <li><kbd>Q</kbd> (or <kbd>S</kbd> in the air): ground pound</li>
          <li>Powers: <b>right-click</b> acid, <kbd>E</kbd> roar, <kbd>T</kbd> web, <kbd>R</kbd> atomic breath, <kbd>F</kbd> frenzy</li>
        </ul>
      </div>
      <div>
        <h3>Your kaiju</h3>
        <ul>
          <li>Each run you <b>hatch</b> from one of three random eggs</li>
          <li>Clearing a level gives a <b>Mutation Draft</b>: pick one of several random new parts. Deeper tiers appear later in the run</li>
          <li>In the <b>Body Lab</b>, swap bodies, heads, legs and tails, and choose which <b>socket</b> each attachment grows from. More sockets open as you clear levels</li>
          <li><b>DNA</b> 🧬 is rare: earn it from level ranks and golden helixes, and spend it on <b>Evolution</b> ranks</li>
          <li>Your power grows each level. Beat the game to start <b>New Game+</b> with a brand-new kaiju</li>
        </ul>
      </div>
    </div>
    <div class="row"><button id="bBack" class="big">Got it!</button></div>`);
  on('bBack', back);
}

export function intro(L, idx, run, onGo) {
  show(`
    <p class="kicker">Level ${idx + 1} of ${LEVELS.length}${run.ng ? ` · New Game+${run.ng > 1 ? run.ng : ''}` : ''}</p>
    <h1>${esc(L.name)}</h1>
    <p class="tag">${esc(L.sub)}</p>
    <p>You are <b>${fmtLen(L.unit)}</b> long. Grow to <b>${fmtLen(L.unit * L.goal)}</b> and the boss will come for you.</p>
    <p class="small">Power ×${(1 + 0.1 * idx + 0.3 * run.ng).toFixed(1)}${run.ng ? ` · enemies ×${(1 + 0.6 * run.ng).toFixed(1)} health` : ''}</p>
    <div class="row"><button id="bGo" class="big">Go! (Space)</button></div>`, 'intro');
  const go = () => { window.removeEventListener('keydown', key); onGo(); };
  const key = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); go(); } };
  window.addEventListener('keydown', key);
  on('bGo', go);
}

export function rankFor(score, par) { return score >= par ? 'S' : score >= par * 0.7 ? 'A' : score >= par * 0.45 ? 'B' : 'C'; }

export function results(L, idx, r, rank, dnaGain, profile, h) {
  const last = idx >= LEVELS.length - 1, run = profile.run;
  show(`
    <p class="kicker">Level ${idx + 1} cleared</p>
    <h1>${esc(L.name)}</h1>
    <div class="rank r${rank}">${rank}</div>
    <table class="stats">
      <tr><td>Score</td><td>${fmtNum(r.score)}</td></tr>
      <tr><td>Eaten / smashed</td><td>${r.eaten} / ${r.smashed}</td></tr>
      <tr><td>Best combo</td><td>${r.maxCombo}</td></tr>
      <tr><td>Final size</td><td>${fmtLen(r.size * L.unit)}</td></tr>
      <tr class="dna"><td>DNA earned</td><td>+${dnaGain} 🧬 <small>(${run.dna} banked)</small></td></tr>
    </table>
    <div class="row">
      ${run.draft ? '<button id="bDraft" class="big pulse">🧪 Mutation Draft!</button>' : ''}
      <button id="bLab" class="big">🧬 Body Lab &amp; Evolution</button>
      ${last || run.draft ? '' : `<button id="bNext" class="big">Next: ${esc(LEVELS[idx + 1].name)} ▶</button>`}
    </div>
    <div class="row"><button id="bRetry">Replay level</button><button id="bMenu">Main menu</button></div>`, 'results');
  on('bDraft', h.draft); on('bLab', h.lab); on('bNext', h.next); on('bRetry', h.retry); on('bMenu', h.menu);
}

export function death(L, idx, r, dnaGain, profile, h) {
  show(`
    <h1 class="red">SQUASHED!</h1>
    <p class="tag">${esc(L.name)} got the better of you this time.</p>
    <p>Score this attempt: <b>${fmtNum(r.score)}</b> · DNA kept: <b>+${dnaGain}</b> 🧬</p>
    <p class="small">Tip: rearrange your parts in the Body Lab. Armor plates, a crab body or regeneration help you survive; wings help you dodge.</p>
    <div class="row">
      <button id="bRetry" class="big">Try again</button>
      <button id="bLab" class="big">🧬 Body Lab &amp; Evolution</button>
    </div>
    <div class="row"><button id="bMenu">Main menu</button></div>`, 'death');
  on('bRetry', h.retry); on('bLab', h.lab); on('bMenu', h.menu);
}

export function pause(h) {
  show(`
    <h1>Paused</h1>
    <div class="col">
      <button id="bResume" class="big">Resume (Esc)</button>
      <button id="bHelp">How to Play</button>
      <button id="bRestart">Restart level</button>
      <button id="bMenu">Quit to menu</button>
    </div>`, 'pause');
  on('bResume', h.resume); on('bRestart', h.restart); on('bMenu', h.menu); on('bHelp', () => help(() => pause(h)));
}

export function victory(r, profile, runScore, h) {
  const ng = profile.run ? profile.run.ng : 0;
  show(`
    <p class="kicker">The End${ng ? ` · New Game+${ng > 1 ? ng : ''}` : ''}</p>
    <h1 class="logo">The World Is Yours</h1>
    <p class="tag">From a speck under a leaf to the thing that cracked the planet in half. Somewhere, another egg is hatching...</p>
    <table class="stats">
      <tr><td>Final level score</td><td>${fmtNum(r.score)}</td></tr>
      <tr class="dna"><td>Run score</td><td>${fmtNum(runScore)}</td></tr>
      <tr><td>Best run ever</td><td>${fmtNum(profile.meta.best)}</td></tr>
    </table>
    <p><b>New Game+${ng + 1 > 1 ? ng + 1 : ''}</b>: hatch a brand-new kaiju and keep one heirloom part. Enemies are much tougher, all part tiers can be drafted, drafts offer an extra choice, and every point is worth ${(1 + 0.5 * (ng + 1)).toFixed(1)}×.</p>
    <div class="credits"><p><b>KAIJU DESTROYER</b> · design elements from <i>Stickbox</i> · built with three.js · all sound synthesized live</p></div>
    <div class="row">
      <button id="bNG" class="big pulse">New Game+ ▶</button>
      <button id="bMenu" class="big">Main menu</button>
    </div>`, 'victory');
  on('bNG', h.ngplus); on('bMenu', h.menu);
}
