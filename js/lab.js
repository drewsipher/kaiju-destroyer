// lab.js — the creature screens: choose your hatchling, the Mutation Draft, the heirloom pick for
// New Game+, and the Body Lab / Evolution screen. All 3D previews share one offscreen renderer
// (the `previews` hub) that draws each live view into its own 2D canvas.
import * as THREE from 'three';
import { PARTS, SOCKETS, SOCKET_ORDER, SLOT_NAMES, unlockedCosmetics } from './data/parts.js';
import { BRANCHES, SKILLS, canBuy, cost, rankOf, reqMet, spent } from './data/skills.js';
import { buildBug } from './bugparts.js';
import { openSockets, place, statsFor, extrasFor, equipNew } from './run.js';
import { sfx } from './sound.js';
import { show, on, esc, root } from './ui.js';

// ---------------- shared preview renderer ----------------
export const previews = (() => {
  let r = null, raf = 0;
  const views = [];
  function ensure() {
    if (r) return;
    r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace;
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    for (const v of views) {
      if (!v.canvas.isConnected) continue;
      const w = v.canvas.clientWidth || 200, h = v.canvas.clientHeight || 200;
      if (v.canvas.width !== w || v.canvas.height !== h) { v.canvas.width = w; v.canvas.height = h; }
      r.setSize(w, h, false); v.cam.aspect = w / h; v.cam.updateProjectionMatrix();
      const dt = Math.min(0.05, (now - (v.last || now)) / 1000); v.last = now; v.t += dt;
      v.bug.rotation.y = v.spin ? v.t * 0.6 : -0.5 + Math.sin(v.t * 0.4) * 0.25;
      v.bug.userData.update(dt, { moving: Math.sin(v.t * 0.7) > 0.3, airborne: Math.sin(v.t * 0.5) > 0.85, beam: false });
      if ((v.chomp -= dt) <= 0) { v.chomp = 2.2; v.bug.userData.chomp(); }
      r.render(v.scene, v.cam);
      const ctx = v.canvas.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.drawImage(r.domElement, 0, 0, w, h);
    }
  }
  return {
    add(canvas, design, colors, extras, spin = true) {
      ensure();
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x445533, 1.4));
      const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(2, 3, 2); scene.add(sun);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.04, 40), new THREE.MeshToonMaterial({ color: '#c9b38a' }));
      disc.position.y = -0.02; scene.add(disc);
      const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      cam.position.set(0.7, 1.1, 3.4); cam.lookAt(-0.15, 0.4, 0);
      const bug = buildBug(design, colors, extras); bug.position.x = 0.1; scene.add(bug);
      const v = { canvas, scene, cam, bug, t: Math.random() * 5, chomp: Math.random() * 2, spin };
      views.push(v);
      if (!raf) raf = requestAnimationFrame(loop);
      return v;
    },
    rebuild(v, design, colors, extras) { v.scene.remove(v.bug); v.bug = buildBug(design, colors, extras); v.bug.position.x = 0.1; v.scene.add(v.bug); },
    clear() { views.length = 0; if (raf) cancelAnimationFrame(raf); raf = 0; }
  };
})();

const partCard = (id, extra = '') => {
  const P = PARTS[id];
  const where = P.slot === 'attach' ? `<small>Fits: ${P.sockets.map((s) => SOCKETS[s].name).join(', ')}</small>` : '';
  return `<b>${esc(P.name)}</b><span class="slotTag t${P.tier}">${SLOT_NAMES[P.slot]} · tier ${P.tier}</span><p>${esc(P.desc)}</p>${where}${extra}`;
};

// ---------------- hatch: pick one of three random eggs ----------------
export function hatch(profile, designs, onPick) {
  show(`
    <p class="kicker">${profile.run.ng ? `New Game+${profile.run.ng > 1 ? profile.run.ng : ''}` : 'A new life'}</p>
    <h1>Choose Your Hatchling</h1>
    <p class="tag">Three eggs. Three different monsters. You'll mutate it further as you go.</p>
    ${profile.run.heirloom ? `<p>Heirloom carried over: <b>${esc(PARTS[profile.run.heirloom].name)}</b></p>` : ''}
    <div class="cards">${designs.map((d, i) => `
      <div class="pcard"><canvas class="pv" id="egg${i}"></canvas>
        <b>${esc(PARTS[d.body].name.replace(' Body', ''))} + ${esc(PARTS[d.head].name.replace(' Head', ''))}</b>
        <p class="small">${[d.legs, d.tail, ...Object.values(d.sockets)].filter((p) => p !== 'tail_none' && p !== 'legs_walker').map((p) => esc(PARTS[p].name)).join(' · ') || 'plain and hungry'}</p>
        <button class="big" data-egg="${i}">Hatch this one</button></div>`).join('')}</div>`, 'hatch', 'wide');
  designs.forEach((d, i) => {
    const pv = JSON.parse(JSON.stringify(d)), h = profile.run.heirloom; // show the heirloom already grown on
    if (h && PARTS[h]) { const P = PARTS[h]; if (P.slot !== 'attach') pv[P.slot] = h; else { const s = P.sockets.find((k) => SOCKETS[k].unlock === 0); if (s) pv.sockets[s] = h; } }
    previews.add(document.getElementById('egg' + i), pv, profile.colors, {});
  });
  root().querySelectorAll('[data-egg]').forEach((b) => b.addEventListener('click', () => { sfx.play('dna'); onPick(designs[+b.dataset.egg]); }));
}

// ---------------- Mutation Draft ----------------
export function draft(profile, onDone) {
  const run = profile.run, ids = run.draft || [];
  show(`
    <p class="kicker">Mutation Draft</p>
    <h1>Choose a New Part</h1>
    <p class="tag">Your body is changing. Pick one mutation. The others are gone for good.</p>
    <div class="cards">${ids.map((id, i) => `<div class="pcard"><canvas class="pv" id="dr${i}"></canvas>${partCard(id)}<button class="big" data-pick="${id}">Mutate!</button></div>`).join('')}</div>
    <div class="row"><button id="bSkip">Skip (gain 1 DNA instead)</button></div>`, 'draft', 'wide');
  ids.forEach((id, i) => {
    const d = JSON.parse(JSON.stringify(run.design));
    const P = PARTS[id];
    if (P.slot !== 'attach') d[P.slot] = id;
    else { const s = P.sockets.find((k) => openSockets(run).includes(k)) || P.sockets[0]; for (const k in d.sockets) if (d.sockets[k] === id) delete d.sockets[k]; d.sockets[s] = id; }
    previews.add(document.getElementById('dr' + i), d, profile.colors, extrasFor(run));
  });
  root().querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.pick;
    run.parts.push(id); run.draft = null;
    const msg = equipNew(run, id);
    sfx.play('levelup'); onDone(msg);
  }));
  on('bSkip', () => { run.draft = null; run.dna += 1; onDone('You skipped the draft (+1 DNA).'); });
}

// ---------------- New Game+ heirloom ----------------
export function heirloom(profile, onPick) {
  const run = profile.run;
  const keep = run.parts.filter((id) => id !== 'tail_none' && id !== 'legs_walker');
  show(`
    <p class="kicker">New Game+</p>
    <h1>Choose an Heirloom</h1>
    <p class="tag">Your next kaiju hatches with one part of this one.</p>
    <div class="chips">${keep.map((id) => `<button class="chipPart t${PARTS[id].tier}" data-id="${id}" title="${esc(PARTS[id].desc)}"><b>${esc(PARTS[id].name)}</b><small>${SLOT_NAMES[PARTS[id].slot]}</small></button>`).join('')}</div>
    <div class="row"><button id="bNone">No heirloom</button></div>`, 'draft');
  root().querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => { sfx.play('dna'); onPick(b.dataset.id); }));
  on('bNone', () => onPick(null));
}

// ---------------- Body Lab & Evolution ----------------
export function lab(profile, levelIndex, onSave, onClose, note) {
  const run = profile.run;
  let tab = 'body';
  show(`
    <div class="evoHead"><h1>${tab === 'body' ? 'Body Lab' : 'Evolution'}</h1>
      <div class="tabs"><button id="tabBody">🧪 Body Lab</button><button id="tabEvo">🧬 Evolution</button></div>
      <div id="dnaBank" class="dnaBank"></div><button id="bDone" class="big">Done ▶</button></div>
    ${note ? `<p class="note">${esc(note)}</p>` : ''}
    <div class="evoBody">
      <div id="labMain"></div>
      <div class="side">
        <canvas id="preview" class="pv big"></canvas>
        <div id="statBox" class="statBox"></div>
        <div id="info" class="skillinfo">Hover anything to read about it.</div>
      </div>
    </div>`, 'evolve', 'wide');
  const view = previews.add(document.getElementById('preview'), run.design, profile.colors, extrasFor(run));
  const refresh = () => { previews.rebuild(view, run.design, profile.colors, extrasFor(run)); onSave(); render(); };
  const info = (html) => { document.getElementById('info').innerHTML = html; };

  function statsBox() {
    const s = statsFor(run, levelIndex);
    const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
    document.getElementById('statBox').innerHTML = [
      row('Health', s.maxHp), row('Armor', Math.round(s.armor * 100) + '%'), row('Bite', '×' + (s.biteDmg * s.power).toFixed(2)),
      row('Speed', '×' + s.speed.toFixed(2)), row('Jumps', s.jumps + (s.flight ? ' + flight' : s.glide ? ' + glide' : '')), row('Crit', Math.round(s.crit * 100) + '%'),
      row('Swallow', Math.round(s.eatRatio * 100) + '%'), row('Power', '×' + s.power.toFixed(1))
    ].join('');
  }

  function renderBody() {
    const d = run.design, open = openSockets(run);
    const owned = (slot) => run.parts.filter((id) => PARTS[id] && PARTS[id].slot === slot);
    let html = '';
    for (const slot of ['body', 'head', 'legs', 'tail']) {
      html += `<section class="labRow"><h3>${SLOT_NAMES[slot]}</h3><div class="chips">${owned(slot).map((id) =>
        `<button class="chipPart t${PARTS[id].tier} ${d[slot] === id ? 'sel' : ''}" data-slot="${slot}" data-id="${id}"><b>${esc(PARTS[id].name)}</b></button>`).join('')}</div></section>`;
    }
    const atts = owned('attach');
    html += `<h3>Sockets <small>pick where each attachment grows. Paired sockets mirror on both sides.</small></h3><div class="sockets">`;
    for (const s of SOCKET_ORDER) {
      const S = SOCKETS[s], isOpen = open.includes(s), cur = d.sockets[s];
      if (!isOpen) { html += `<div class="sock locked"><b>${S.name}</b><small>opens after clearing ${S.unlock} level${S.unlock > 1 ? 's' : ''}</small></div>`; continue; }
      const fits = atts.filter((id) => PARTS[id].sockets.includes(s));
      html += `<div class="sock"><b>${S.name}</b><small>${S.desc}</small><div class="chips">
        <button class="chipPart ${!cur ? 'sel' : ''}" data-sock="${s}" data-id="">empty</button>
        ${fits.map((id) => { const elsewhere = Object.keys(d.sockets).find((k) => d.sockets[k] === id && k !== s);
          return `<button class="chipPart t${PARTS[id].tier} ${cur === id ? 'sel' : ''}" data-sock="${s}" data-id="${id}">${esc(PARTS[id].name)}${elsewhere ? `<small>(move from ${SOCKETS[elsewhere].name})</small>` : ''}</button>`; }).join('')}
        </div></div>`;
    }
    html += '</div>';
    const stored = atts.filter((id) => !Object.values(d.sockets).includes(id));
    if (stored.length) html += `<p class="small">In storage: ${stored.map((id) => esc(PARTS[id].name)).join(', ')}</p>`;
    // colours
    const cos = unlockedCosmetics(profile.meta.bosses.length), c = profile.colors;
    if (!cos.colors.includes(c.body)) c.body = cos.colors[0];
    if (!cos.patterns.includes(c.pattern)) c.pattern = 'none';
    const PN = { none: 'Plain', stripes: 'Stripes', spots: 'Glow Spots', crown: 'Crown', glowstripes: 'Light Bands', tiger: 'Tiger', magma: 'Lava Cracks' };
    html += `<h3>Coloration <small>beat new bosses to unlock more</small></h3><div class="looks">
      <div><b>Carapace</b> ${cos.colors.map((col) => `<button class="sw ${c.body === col ? 'sel' : ''}" data-k="body" data-v="${col}" style="background:${col}"></button>`).join('')}</div>
      <div><b>Eyes</b> ${cos.eyes.map((col) => `<button class="sw ${c.eyes === col ? 'sel' : ''}" data-k="eyes" data-v="${col}" style="background:${col}"></button>`).join('')}</div>
      <div><b>Pattern</b> ${cos.patterns.map((pt) => `<button class="pt ${c.pattern === pt ? 'sel' : ''}" data-k="pattern" data-v="${pt}">${PN[pt] || pt}</button>`).join('')}</div></div>`;
    const main = document.getElementById('labMain'); main.className = 'labBody'; main.innerHTML = html;
    main.querySelectorAll('[data-slot]').forEach((b) => {
      b.addEventListener('mouseenter', () => info(partCard(b.dataset.id)));
      b.addEventListener('click', () => { d[b.dataset.slot] = b.dataset.id; sfx.play('click'); refresh(); });
    });
    main.querySelectorAll('[data-sock]').forEach((b) => {
      if (b.dataset.id) b.addEventListener('mouseenter', () => { const P = PARTS[b.dataset.id], at = P.at && P.at[b.dataset.sock]; info(partCard(b.dataset.id, at ? `<p class="small">On the ${SOCKETS[b.dataset.sock].name}: ${Object.keys(at).map((k) => k).join(', ')} bonus</p>` : '')); });
      b.addEventListener('click', () => { place(run, b.dataset.sock, b.dataset.id || null); sfx.play('click'); refresh(); });
    });
    main.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { c[b.dataset.k] = b.dataset.v; sfx.play('click'); refresh(); }));
  }

  function renderEvo() {
    const ranks = run.ranks;
    let html = '<div class="tree">';
    for (const B of BRANCHES) {
      const ids = Object.keys(SKILLS).filter((id) => SKILLS[id].branch === B.id);
      const cols = Math.max(...ids.map((id) => SKILLS[id].pos[0])) + 1, rows = Math.max(...ids.map((id) => SKILLS[id].pos[1])) + 1;
      let lines = '';
      for (const id of ids) for (const [rq] of SKILLS[id].req || []) {
        if (SKILLS[rq].branch !== B.id) continue;
        const a = SKILLS[rq].pos, b = SKILLS[id].pos;
        lines += `<line x1="${a[0] + 0.5}" y1="${a[1] + 0.5}" x2="${b[0] + 0.5}" y2="${b[1] + 0.5}" class="${rankOf(ranks, rq) ? 'lit' : ''}"/>`;
      }
      const nodes = ids.map((id) => {
        const S = SKILLS[id], r = rankOf(ranks, id), maxed = r >= S.max, can = canBuy(id, ranks, run.dna);
        const st = maxed ? 'owned' : can ? 'buy' : reqMet(id, ranks) ? (r ? 'part' : 'poor') : 'locked';
        const pips = Array.from({ length: S.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('');
        return `<button class="node ${st}" data-id="${id}" style="grid-column:${S.pos[0] + 1};grid-row:${S.pos[1] + 1};--bc:${B.color}"><b>${esc(S.name)}</b><span class="pips">${pips}</span><span>${maxed ? 'MAX' : cost(id, r) + ' 🧬'}</span></button>`;
      }).join('');
      html += `<section class="branch" style="--bc:${B.color}"><h3>${esc(B.name)} <small>${esc(B.blurb)}</small></h3>
        <div class="grid" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},auto)">
          <svg class="links" viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="none">${lines}</svg>${nodes}</div></section>`;
    }
    html += `</div><div class="row"><button id="bRespec" title="Refund every rank">Respec (refund ${spent(ranks)} DNA)</button></div>`;
    const main = document.getElementById('labMain'); main.className = ''; main.innerHTML = html;
    main.querySelectorAll('.node').forEach((n) => {
      const id = n.dataset.id, S = SKILLS[id];
      n.addEventListener('mouseenter', () => {
        const r = rankOf(ranks, id), req = (S.req || []).map(([q, k]) => `${SKILLS[q].name} ${k}`).join(', ');
        info(`<b>${esc(S.name)}</b> <span class="cost">rank ${r}/${S.max}${r < S.max ? ` · next ${cost(id, r)} 🧬` : ''}</span><br>${esc(S.desc)}${req ? `<br><small>Needs: ${esc(req)}</small>` : ''}`);
      });
      n.addEventListener('click', () => {
        if (!canBuy(id, run.ranks, run.dna)) { sfx.play('thud'); return; }
        run.dna -= cost(id, rankOf(run.ranks, id)); run.ranks[id] = rankOf(run.ranks, id) + 1; sfx.play('buy'); refresh();
      });
    });
    on('bRespec', () => { run.dna += spent(run.ranks); run.ranks = {}; refresh(); });
  }

  function render() {
    document.getElementById('dnaBank').textContent = '🧬 ' + run.dna + ' DNA';
    document.querySelector('.evoHead h1').textContent = tab === 'body' ? 'Body Lab' : 'Evolution';
    document.getElementById('tabBody').className = tab === 'body' ? 'sel' : '';
    document.getElementById('tabEvo').className = tab === 'evo' ? 'sel' : '';
    statsBox();
    if (tab === 'body') renderBody(); else renderEvo();
  }
  on('tabBody', () => { tab = 'body'; render(); });
  on('tabEvo', () => { tab = 'evo'; render(); });
  on('bDone', onClose);
  render();
}
