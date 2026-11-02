# Kaiju Destroyer

A side-scrolling eat-'em-up, a bit Rampage and a bit Spore. You hatch as a 3 mm bug under a leaf, eat and smash everything to grow, evolve new body parts and powers between levels, and end up as a 2 km kaiju cracking the planet's core.

Each level: grow while smashing everything (the boss arrives when you reach the size goal), fight the boss inside a walled arena, then a 40-second RAMPAGE at double points (Enter ends it early).

11 levels: Leaf Litter, Puddle Pond, Backyard Jungle, Picnic Panic, Suburbia, Farmland, Downtown, Army Blockade, Harbor Assault, Megalopolis, World's End.
53 body parts (8 bodies, 9 heads, 7 leg sets, 8 tails, 21 attachments that go in 5 sockets) and a 31-node Evolution tree with up to 5 ranks per node.
Every run grows a different monster: you hatch from one of three random eggs, draft a new random body part after every level, and arrange your parts in the Body Lab. DNA is scarce, so each run can only buy a fraction of the Evolution tree. Beat the game to start New Game+ with a fresh kaiju, one heirloom part and tougher enemies.

UI style, comic hit effects and the synthesized sound engine are carried over from Stickbox (`../JamesGame`).

## Run it

```
python3 tools/serve.py 8123      # then open http://localhost:8123
```
(Any static server works. It needs to be served over http rather than opened as a file, because it uses ES modules. three.js is vendored in `vendor/`, so the game also works offline.)

## Controls

| Key | Action |
| --- | --- |
| A / D, arrows | move |
| Space / W | jump (wings add double/triple jump, glide, flight) |
| W against a tall building | climb it (rooftops are solid; S climbs down, Space leaps off) |
| Left click / J | CHOMP toward the mouse: swallow small things, bite big ones |
| Right click / K | acid spit (evolve it) |
| Shift | dash (you can't be hurt while dashing) |
| Q, or S in the air | ground pound |
| E / R / T / F | roar / atomic breath / silk web shot / feeding frenzy |
| Esc | pause |

## Code layout (ES modules, no build step)

| File | What it does |
| --- | --- |
| `js/data/levels.js` | the levels: growth goal, colours, scenery, spawn tables, boss, music. **Edit levels here** (real-world scale chains automatically, so levels can be added or reordered freely) |
| `js/data/entities.js` | every creature, vehicle, building, pickup and boss as data (size, hp, AI, attacks) |
| `js/data/parts.js` | the Body Lab catalogue: bodies, heads, legs, tails, attachments, sockets, colour unlocks |
| `js/data/skills.js` | the ranked Evolution tree and `computeStats()` (ranks + parts + level power) |
| `js/run.js` | one playthrough: eggs, mutation drafts, socket placement, heirlooms |
| `js/bugparts.js` | 3D builders for every part, assembled at the body's anchor points |
| `js/lab.js` | hatch, draft, heirloom and Body Lab / Evolution screens, shared 3D previews |
| `js/models.js` | procedural 3D models for everything except the player |
| `js/models-extra.js` | pond, farm and harbor models (registers extra builders) |
| `js/player.js` | movement, climbing, eating, attacks, abilities, growth |
| `js/entities.js` | runtime entities + generic AI (wander, flee, hunter, hopper, shooter, diver, bomber, tongue) and biomass orbs |
| `js/bosses.js` | one attack-pattern brain per boss |
| `js/projectiles.js` | bullets, shells, missiles, acid, strikes, shockwaves, tongues |
| `js/game.js` | one level being played: spawning, scoring, combos, boss phase, camera |
| `js/world.js` | sky, ground and endless background scenery |
| `js/render.js` | renderer + comic ink-outline post pass |
| `js/debris.js` | physics destruction: buildings and vehicles break into their real parts that tumble, bounce and settle as rubble |
| `js/walls.js` | indestructible boundary walls (one style per level) that block you, enemies and projectiles |
| `js/fx.js` | instanced particles, rings, comic popups, shake, hit-stop |
| `js/sound.js` | synthesized sound effects (from Stickbox) + procedural music |
| `js/hud.js`, `js/ui.js` | HUD, menus, evolution screen with 3D preview |
| `js/main.js` | app state machine and main loop |
| `js/save.js` | profile in localStorage (`kaiju.save.v3`: meta progress + current run) |

Console helpers for testing: `MTM.startLevel(n)`, `MTM.grow(20)`, `MTM.dna(10)`, `MTM.game`, `MTM.profile`.
