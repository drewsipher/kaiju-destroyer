// input.js — keyboard + mouse state. Actions are named so controls can be remapped in one place.
const BINDS = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  jump: ['Space'], chomp: ['KeyJ'], spit: ['KeyK'], dash: ['ShiftLeft', 'ShiftRight', 'KeyL'], stomp: ['KeyQ'],
  roar: ['KeyE'], web: ['KeyT'], beam: ['KeyR'], frenzy: ['KeyF'], pause: ['Escape', 'KeyP'], finish: ['Enter', 'NumpadEnter'], tree: ['Tab']
};

export class Input {
  constructor(canvas) {
    this.down = new Set(); this.pressed = new Set();
    this.mouse = { x: 0, y: 0, left: false, right: false, leftPressed: false, rightPressed: false, moved: false };
    this.enabled = true;
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => { this.down.clear(); this.mouse.left = this.mouse.right = false; });
    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.moved = true; });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse.left = true; this.mouse.leftPressed = true; }
      if (e.button === 2) { this.mouse.right = true; this.mouse.rightPressed = true; }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  held(action) { return BINDS[action].some((k) => this.down.has(k)); }
  hit(action) { return BINDS[action].some((k) => this.pressed.has(k)); }
  endFrame() { this.pressed.clear(); this.mouse.leftPressed = this.mouse.rightPressed = false; }
}
