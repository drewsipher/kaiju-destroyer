// render.js — WebGL renderer, camera, lights and the comic "ink" post pass.
// The scene is drawn to an offscreen target with a depth texture, then a full-screen shader draws
// black ink lines wherever depth or colour jumps (one pass, independent of how many objects exist),
// adds a little paper grain and a vignette, and tints the screen red when the bug is hurt.
import * as THREE from 'three';

export class Renderer {
  constructor(canvas) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.shadowMap.enabled = true;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    this.ink = true;
    try { this.ink = localStorage.getItem('mtm.ink') !== '0'; } catch (e) { /* ignore */ }

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.2);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.target = new THREE.WebGLRenderTarget(1, 1, { samples: 0 });
    this.target.depthTexture = new THREE.DepthTexture(1, 1);
    this.target.depthTexture.type = THREE.UnsignedIntType;
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.target.texture }, tDepth: { value: this.target.depthTexture },
        res: { value: new THREE.Vector2(1, 1) }, near: { value: 0.1 }, far: { value: 1000 },
        hurt: { value: 0 }, frenzy: { value: 0 }, time: { value: 0 }, inkOn: { value: 1 }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float near, far, hurt, frenzy, time, inkOn;
        varying vec2 vUv;
        float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
        float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
        void main(){
          vec3 col = texture2D(tColor, vUv).rgb;
          if (inkOn > 0.5) {
            vec2 px = 1.7 / res;
            float d = lin(vUv);
            float dl = lin(vUv - vec2(px.x, 0.0)), dr = lin(vUv + vec2(px.x, 0.0));
            float du = lin(vUv + vec2(0.0, px.y)), dd = lin(vUv - vec2(0.0, px.y));
            float dEdge = (abs(dl - d) + abs(dr - d) + abs(du - d) + abs(dd - d)) / max(d, 0.001);
            float cl = lum(texture2D(tColor, vUv - vec2(px.x, 0.0)).rgb), cr = lum(texture2D(tColor, vUv + vec2(px.x, 0.0)).rgb);
            float cu = lum(texture2D(tColor, vUv + vec2(0.0, px.y)).rgb), cd = lum(texture2D(tColor, vUv - vec2(0.0, px.y)).rgb);
            float cEdge = abs(cl - cr) + abs(cu - cd);
            float far01 = smoothstep(0.0, 1.0, d / far * 4.0);
            float e = max(smoothstep(0.035, 0.09, dEdge), smoothstep(0.32, 0.6, cEdge) * 0.6) * (1.0 - far01 * 0.7);
            col = mix(col, vec3(0.06, 0.05, 0.05), e * 0.9);
          }
          float g = fract(sin(dot(vUv * res + time, vec2(12.9898, 78.233))) * 43758.5453);
          col += (g - 0.5) * 0.035;
          vec2 q = vUv - 0.5;
          float vig = 1.0 - dot(q, q) * 0.7;
          col *= vig;
          col = mix(col, vec3(0.9, 0.05, 0.05), hurt * (0.25 + length(q) * 0.9));
          col = mix(col, col * vec3(1.25, 0.9, 1.25), frenzy * 0.5);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false
    });
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    quad.frustumCulled = false;
    this.quadScene.add(quad);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  setInk(v) { this.ink = v; try { localStorage.setItem('mtm.ink', v ? '1' : '0'); } catch (e) { /* ignore */ } }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.r.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const pr = this.r.getPixelRatio();
    this.target.setSize(Math.floor(w * pr), Math.floor(h * pr));
    this.post.uniforms.res.value.set(Math.floor(w * pr), Math.floor(h * pr));
  }
  // light follows the action so shadows stay crisp at any scale
  aimSun(x, y, scale) {
    const s = this.sun;
    s.position.set(x - 20 * scale, y + 40 * scale, 30 * scale);
    s.target.position.set(x, 0, 0);
    const c = s.shadow.camera, e = 30 * scale;
    c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.near = 1 * scale; c.far = 120 * scale;
    c.updateProjectionMatrix();
  }
  render(time, hurt, frenzy) {
    const u = this.post.uniforms;
    u.near.value = this.camera.near; u.far.value = this.camera.far;
    u.hurt.value = hurt; u.frenzy.value = frenzy; u.time.value = time % 100; u.inkOn.value = this.ink ? 1 : 0;
    this.r.setRenderTarget(this.target);
    this.r.render(this.scene, this.camera);
    this.r.setRenderTarget(null);
    this.r.render(this.quadScene, this.quadCam);
  }
}
