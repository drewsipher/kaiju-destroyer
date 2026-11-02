// debris.js — physical destruction. A smashed building or vehicle is broken into its real parts
// (large blocks are fractured into chunks); every piece is a rigid body that flies, spins, bounces,
// slides to rest as rubble, then sinks into the ground. Knocked-out creatures tumble the same way.
import * as THREE from 'three';
import { GEO } from './models.js';
import { rand } from './util.js';

const MAX_PIECES = 420;
const _box = new THREE.Box3(), _size = new THREE.Vector3(), _c = new THREE.Vector3();
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _dq = new THREE.Quaternion();

function radiusOf(geo, scale) {
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  return geo.boundingSphere.radius * Math.max(scale.x, scale.y, scale.z);
}

export class Debris {
  constructor(game) {
    this.g = game;
    this.root = new THREE.Group();
    game.scene.add(this.root);
    this.pieces = [];
  }
  add(mesh, v, w, life, o = {}) {
    if (this.pieces.length >= MAX_PIECES) { const old = this.pieces.shift(); this.root.remove(old.m); }
    this.root.add(mesh);
    const r = o.r || radiusOf(mesh.geometry, mesh.scale);
    this.pieces.push({ m: mesh, v, w, life, max: life, r, rest: 0, smoke: o.smoke || 0, hold: o.hold || 0, dust: o.dust, group: o.group });
  }
  // break an entity into flying pieces. power: how violently (explosions > collapses)
  shatter(e, power = 1, dirX = 0) {
    const g = this.g, vs = g.player.size;
    const k = Math.min(e.size, vs * 3);            // velocity scale
    e.mesh.updateMatrixWorld(true);
    _box.setFromObject(e.mesh); _box.getCenter(_c);
    const top = _box.max.y, base = _box.min.y, H = Math.max(0.001, top - base);
    const cx = _c.x, cz = _c.z;
    const meshes = [];
    e.mesh.traverse((o) => { if (o.isMesh && o.visible && o.material && !o.material.transparent) meshes.push(o); });
    const budget = Math.max(12, Math.min(110, MAX_PIECES - this.pieces.length + 40));
    const perMesh = Math.max(1, Math.floor(budget / Math.max(1, meshes.length)));
    const metal = power > 1.2;
    const topple = dirX || (Math.random() < 0.5 ? -1 : 1);
    const launch = (px, py, pz) => {
      const h = (py - base) / H;                  // 0 at the bottom, 1 at the top
      const out = new THREE.Vector3(px - cx, 0, pz - cz).normalize();
      return new THREE.Vector3(
        (out.x * rand(0.5, 2.5) * power + topple * h * rand(1, 3)) * k * 0.6,
        (metal ? rand(3, 9) : rand(0, 2.5)) * k * 0.6 * power,
        out.z * rand(0.5, 2) * k * 0.4);
    };
    const spin = () => new THREE.Vector3(rand(-4, 4), rand(-4, 4), rand(-4, 4)).multiplyScalar(power);
    for (const m of meshes) {
      _box.setFromObject(m); _box.getSize(_size); const bc = _box.getCenter(new THREE.Vector3());
      const big = Math.max(_size.x, _size.y) > e.size * 0.3 && perMesh > 3;
      if (big) {
        // fracture into a grid of chunks that crumble from the bottom up
        const chunk = Math.max(_size.x, _size.y) / Math.max(2, Math.min(6, Math.round(Math.sqrt(perMesh) * 1.4)));
        const nx = Math.max(1, Math.min(6, Math.round(_size.x / chunk))), ny = Math.max(1, Math.min(9, Math.round(_size.y / chunk)));
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          const piece = new THREE.Mesh(GEO.box, m.material);
          piece.scale.set(_size.x / nx * rand(0.8, 0.98), _size.y / ny * rand(0.8, 0.98), _size.z * rand(0.5, 0.95));
          piece.position.set(_box.min.x + (i + 0.5) * _size.x / nx, _box.min.y + (j + 0.5) * _size.y / ny, bc.z + rand(-0.2, 0.2) * _size.z);
          piece.castShadow = piece.scale.x > vs * 0.3;
          const h = (piece.position.y - base) / H;
          this.add(piece, launch(piece.position.x, piece.position.y, piece.position.z), spin(), rand(4, 6), { hold: metal ? 0 : h * 0.35 + rand(0, 0.12), dust: !metal });
        }
      } else {
        m.matrixWorld.decompose(_p, _q, _s);
        const piece = new THREE.Mesh(m.geometry, m.material);
        piece.position.copy(_p); piece.quaternion.copy(_q); piece.scale.copy(_s);
        piece.castShadow = true;
        this.add(piece, launch(_p.x, _p.y, _p.z), spin(), rand(3.5, 5.5), { smoke: metal && Math.random() < 0.3 ? 1 : 0, hold: metal ? 0 : ((_p.y - base) / H) * 0.3 });
      }
    }
    e.mesh.visible = false;
  }
  // a knocked-out creature: the whole body tumbles away and lies still for a moment
  tumble(e, dirX, power = 1) {
    const g = this.g, vs = g.player.size, k = Math.min(e.size, vs * 2) + vs * 0.4;
    const m = e.mesh;
    m.updateMatrixWorld(true);
    m.matrixWorld.decompose(_p, _q, _s);
    this.root.attach ? this.root.attach(m) : this.root.add(m);
    const r = Math.max(e.h, e.w) * 0.5;
    this.add(m, new THREE.Vector3(dirX * rand(3, 6) * k * power, rand(4, 7) * k * power, rand(-1, 1) * k), new THREE.Vector3(rand(-3, 3), rand(-2, 2), -dirX * rand(5, 10)), rand(2.4, 3.2), { r, group: true });
  }
  update(dt) {
    const g = this.g, grav = g.gravity(), vs = g.player.size;
    const minX = g.bounds.min, maxX = g.bounds.max;
    let w = 0;
    for (const p of this.pieces) {
      p.life -= dt;
      if (p.life <= 0) { this.root.remove(p.m); continue; }
      if (p.hold > 0) { p.hold -= dt; p.m.position.x += Math.sin(p.life * 60) * vs * 0.002; this.pieces[w++] = p; continue; } // trembling before it gives way
      const m = p.m, pos = m.position, groundY = p.group ? 0 : p.r * 0.45;
      const sinking = p.life < 1.1;
      if (!sinking) {
        p.v.y -= grav * dt;
        pos.addScaledVector(p.v, dt);
        // walls are solid for debris too
        if (pos.x < minX) { pos.x = minX; p.v.x = Math.abs(p.v.x) * 0.4; }
        if (pos.x > maxX) { pos.x = maxX; p.v.x = -Math.abs(p.v.x) * 0.4; }
        if (pos.y < groundY) {
          const impact = -p.v.y;
          pos.y = groundY;
          p.v.y = impact > vs * 2 ? impact * 0.3 : 0;
          p.v.x *= 0.55; p.v.z *= 0.55; p.w.multiplyScalar(0.55);
          if (impact > vs * 4 && p.dust !== false && Math.random() < 0.35) g.fx.puff(pos.x, 0, pos.z, 1, Math.min(p.r * 1.5, vs), '#b8ad9c', 0.4);
          if (impact > vs * 6 && Math.random() < 0.15) g.sfx('thud', pos.x, 0.3, 0.6 + Math.random() * 0.5);
        }
        _e.set(p.w.x * dt, p.w.y * dt, p.w.z * dt); _dq.setFromEuler(_e); m.quaternion.multiply(_dq);
        if (pos.y <= groundY + 0.001 && p.v.lengthSq() < vs * vs * 0.5) { p.v.multiplyScalar(0.8); p.w.multiplyScalar(0.8); }
        if (p.smoke && Math.random() < dt * 6) g.fx.puff(pos.x, pos.y, pos.z, 1, Math.max(p.r, vs * 0.3), '#3a3a3a', 1.2);
      } else {
        pos.y -= p.r * 1.6 * dt;                   // rubble settles into the ground
      }
      this.pieces[w++] = p;
    }
    this.pieces.length = w;
  }
  clear() { for (const p of this.pieces) this.root.remove(p.m); this.pieces.length = 0; }
  dispose() { this.clear(); this.g.scene.remove(this.root); }
}
