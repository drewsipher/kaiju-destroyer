// data/entities.js — everything you can eat, smash or be shot by. Pure data.
//   model/opts: builder in models.js       size: height-or-length in level units (player starts at 1)
//   kind: food | critter | enemy | structure | pickup   (structures are never swallowed, they break)
//   ai:   static | wander | flee | hunter | hopper | shooter | flyer | diver | bomber | tongue
//   hp, pts (score), dmg (damage to the player), speed (units/s), range, cd (attack cooldown s),
//   proj (projectile type, see projectiles.js), fly: [minY, maxY] for fliers, armor: damage taken x
//   say: comic word shown when it's destroyed
// Sizes are per level: each level's numbers are relative to the bug's size when that level starts.

const food = (name, model, opts, size, pts, extra) => ({ name, model, opts, size, hp: 1, pts, kind: 'food', ai: 'static', ...extra });
const critter = (name, model, opts, size, pts, speed, extra) => ({ name, model, opts, size, hp: 2, pts, kind: 'critter', ai: 'wander', speed, ...extra });

export const ENTITIES = {
  // ===== 1: LEAF LITTER =====
  crumb:      food('Crumb', 'blob', { shape: 'crumb', color: '#d9a85b', color2: '#b8823a' }, 0.3, 5),
  seed:       food('Seed', 'blob', { shape: 'seed', color: '#8a6a3a' }, 0.38, 8),
  dew:        food('Dewdrop', 'blob', { shape: 'drop', color: '#bfe6ff' }, 0.45, 10, { heal: 8 }),
  berry:      food('Wild Berry', 'blob', { shape: 'berry', color: '#8e1f3a' }, 0.9, 30, { hp: 3 }),
  leafbit:    food('Leaf', 'blob', { shape: 'leaf', color: '#7aa83a' }, 0.8, 15, { hp: 2 }),
  aphid:      critter('Aphid', 'bug', { segs: [{ x: 0, r: 0.5, c: '#8fd14f' }, { x: 0.55, r: 0.28, c: '#7cc043' }], legs: 6, legSegs: [0], legLen: 0.5, antenna: true }, 0.4, 10, 0.6, { flee: 1 }),
  ant:        critter('Ant', 'bug', { segs: [{ x: 0, r: 0.4, c: '#2a1a12' }, { x: 0.55, r: 0.22, c: '#2a1a12' }, { x: 0.95, r: 0.28, c: '#2a1a12' }], legs: 6, legSegs: [1], legLen: 0.75, antenna: true, jaws: true, legColor: '#1a100a' }, 0.6, 15, 2.2, { hp: 3 }),
  gnat:       critter('Gnat', 'bug', { segs: [{ x: 0, r: 0.3, c: '#444' }, { x: 0.35, r: 0.2, c: '#333' }], legs: 0, wings: '#e6f2ff', wingLen: 0.8 }, 0.35, 12, 2.5, { ai: 'flyer', fly: [1.2, 3.5] }),
  ladybug:    critter('Ladybug', 'bug', { segs: [{ x: 0, r: 0.55, c: '#d32f2f', h: 0.7 }, { x: 0.5, r: 0.22, c: '#111' }], spots: '#111', legs: 6, legSegs: [0], legLen: 0.4 }, 0.8, 35, 1.1, { hp: 5, armor: 0.8 }),
  caterpillar:critter('Caterpillar', 'worm', { color: '#9ccc45', band: '#f2c94c', eyes: true, n: 10 }, 1.3, 45, 0.7, { hp: 8 }),
  pillbug:    critter('Pill Bug', 'bug', { segs: [{ x: 0, r: 0.45, c: '#5d6670', h: 0.65 }, { x: 0.4, r: 0.5, c: '#6d7680', h: 0.7 }, { x: 0.8, r: 0.4, c: '#5d6670', h: 0.65 }, { x: 1.1, r: 0.25, c: '#4a525a' }], stripes: '#4a525a', legs: 6, legSegs: [1], legLen: 0.35, antenna: true }, 1.6, 70, 0.9, { hp: 22, armor: 0.5 }),
  spiderling: { name: 'Jumping Spider', model: 'bug', opts: { segs: [{ x: 0, r: 0.5, c: '#3b2a20' }, { x: 0.6, r: 0.38, c: '#2a1e17' }], legs: 8, legSegs: [1], legLen: 1.0, legColor: '#2a1e17', glowEyes: null, splay: 0.9 }, size: 1.2, hp: 12, pts: 60, kind: 'enemy', ai: 'hopper', speed: 3, dmg: 8, range: 1.2, cd: 1.4 },
  centipede:  { name: 'Centipede', model: 'bug', opts: { segs: Array.from({ length: 8 }, (_, i) => ({ x: i * 0.5, r: 0.3, c: i === 7 ? '#5a2a10' : '#8a4a1a', h: 0.6 })), legs: 28, legSegs: [0, 1, 2, 3, 4, 5, 6], legLen: 0.5, jaws: true, antenna: true, legColor: '#c97a3a', legFreq: 24 }, size: 2.6, hp: 30, pts: 140, kind: 'enemy', ai: 'hunter', speed: 2.6, dmg: 12, range: 1.6, cd: 1.2 },

  // ===== 2: BACKYARD JUNGLE =====
  worm:       critter('Earthworm', 'worm', { color: '#d98c8c', band: '#c26a6a', n: 12 }, 0.6, 20, 0.5, { hp: 3 }),
  snail:      critter('Snail', 'snail', {}, 0.9, 40, 0.3, { hp: 10, armor: 0.6 }),
  clover:     food('Clover', 'plant', { kind: 'grass', color: '#5aa83a' }, 0.7, 12, { hp: 2 }),
  bee:        { name: 'Bumblebee', model: 'bug', opts: { segs: [{ x: 0, r: 0.5, c: '#f2c230' }, { x: 0.55, r: 0.35, c: '#222' }, { x: 0.9, r: 0.26, c: '#222' }], stripes: '#222', legs: 6, legSegs: [1], legLen: 0.4, wings: '#e6f2ff', antenna: true }, size: 0.75, hp: 6, pts: 40, kind: 'enemy', ai: 'diver', speed: 3.2, dmg: 8, range: 0.8, cd: 2, fly: [1.5, 4] },
  grasshopper:{ ...critter('Grasshopper', 'bug', { segs: [{ x: 0, r: 0.4, c: '#7cb342', l: 1.6 }, { x: 0.75, r: 0.3, c: '#689f38' }], legs: 4, legSegs: [1], legLen: 0.5, hindLegs: true, legColor: '#558b2f', antenna: true }, 1.1, 45, 2, { hp: 6 }), ai: 'hopper', flee: 1 },
  daisy:      { name: 'Daisy', model: 'plant', opts: { kind: 'flower', color: '#ffffff' }, size: 2.5, hp: 10, pts: 50, kind: 'food' },
  tulip:      { name: 'Flower', model: 'plant', opts: { kind: 'flower', color: '#e84a7f' }, size: 2.8, hp: 12, pts: 55, kind: 'food' },
  dragonfly:  { name: 'Dragonfly', model: 'bug', opts: { segs: [{ x: 0, r: 0.15, c: '#1f8a85', l: 3 }, { x: 0.6, r: 0.25, c: '#1f6a8a' }, { x: 0.95, r: 0.25, c: '#1f6a8a' }], legs: 0, wings: '#d8f6ff', wingLen: 2.2, tail: 0 }, size: 1.6, hp: 10, pts: 70, kind: 'enemy', ai: 'diver', speed: 5, dmg: 10, range: 1, cd: 1.8, fly: [2, 6] },
  mouse:      { name: 'Field Mouse', model: 'animal', opts: { color: '#9a8574', color2: '#d8c8b8', ears: 'round', tailLen: 1.4 }, size: 2.6, hp: 30, pts: 150, kind: 'critter', ai: 'flee', speed: 5, flee: 1 },
  frog:       { name: 'Frog', model: 'frog', opts: { color: '#5b9a3a' }, size: 3, hp: 45, pts: 220, kind: 'enemy', ai: 'tongue', speed: 4, dmg: 14, range: 6, cd: 2.4 },
  gnome:      { name: 'Garden Gnome', model: 'prop', opts: { kind: 'gnome' }, size: 4.5, hp: 60, pts: 250, kind: 'structure' },
  hose:       { name: 'Garden Hose', model: 'prop', opts: { kind: 'hose' }, size: 3.2, hp: 30, pts: 120, kind: 'structure' },

  // ===== 3: PICNIC PANIC =====
  grape:      food('Grapes', 'blob', { shape: 'grapes', color: '#6a2c91' }, 0.5, 15),
  cookie:     food('Cookie', 'blob', { shape: 'cookie', color: '#c98a4b' }, 0.55, 20),
  donut:      food('Donut', 'blob', { shape: 'donut', color: '#d9a05b', color2: '#ff8fb8' }, 0.7, 30),
  sandwich:   food('Sandwich', 'blob', { shape: 'sandwich' }, 1.1, 50, { hp: 4 }),
  apple:      food('Apple', 'blob', { shape: 'apple', color: '#d32f2f' }, 0.9, 40, { hp: 4 }),
  soda:       food('Soda Can', 'blob', { shape: 'can', color: '#c62828' }, 1.3, 55, { hp: 8 }),
  wasp:       { name: 'Wasp', model: 'bug', opts: { segs: [{ x: 0, r: 0.4, c: '#f2c230', l: 1.3 }, { x: 0.6, r: 0.25, c: '#222' }, { x: 0.9, r: 0.22, c: '#f2c230' }], stripes: '#111', legs: 6, legSegs: [1], legLen: 0.4, wings: '#e6f2ff', antenna: true }, size: 0.7, hp: 8, pts: 50, kind: 'enemy', ai: 'diver', speed: 4, dmg: 9, range: 0.8, cd: 1.6, fly: [1.5, 5] },
  pigeon:     { name: 'Pigeon', model: 'bird', opts: { color: '#8f98a3', color2: '#5f7a8a', wingColor: '#7a8592' }, size: 2, hp: 25, pts: 160, kind: 'enemy', ai: 'diver', speed: 5, dmg: 12, range: 1.4, cd: 2.2, fly: [3, 8] },
  squirrel:   { name: 'Squirrel', model: 'animal', opts: { color: '#a0602a', color2: '#e0b88a', tail: 'bushy' }, size: 3, hp: 40, pts: 200, kind: 'critter', ai: 'flee', speed: 6, flee: 1 },
  basket:     { name: 'Picnic Basket', model: 'prop', opts: { kind: 'basket' }, size: 3.5, hp: 50, pts: 220, kind: 'structure', drops: 2 },
  cooler:     { name: 'Cooler', model: 'prop', opts: { kind: 'cooler' }, size: 4, hp: 70, pts: 260, kind: 'structure', drops: 2 },
  bench:      { name: 'Park Bench', model: 'prop', opts: { kind: 'bench' }, size: 7, hp: 90, pts: 300, kind: 'structure', drops: 2 },
  cat:        { name: 'Alley Cat', model: 'animal', opts: { color: '#6b6b6b', color2: '#cfcfcf', tail: 'up', tailLen: 1.2 }, size: 4.5, hp: 70, pts: 380, kind: 'enemy', ai: 'hunter', speed: 5.5, dmg: 16, range: 2.5, cd: 1.3 },

  // ===== 4: SUBURBIA =====
  kitten:     { name: 'Housecat', model: 'animal', opts: { color: '#e08a3a', color2: '#f6dcb8', tail: 'up' }, size: 0.8, hp: 6, pts: 50, kind: 'critter', ai: 'flee', speed: 3, flee: 1 },
  dog:        { name: 'Guard Dog', model: 'animal', opts: { color: '#8a6a3a', color2: '#d8b888', ears: 'flop', snout: 1.4, collar: '#d32f2f' }, size: 1.6, hp: 25, pts: 150, kind: 'enemy', ai: 'hunter', speed: 4.5, dmg: 12, range: 1.4, cd: 1.2 },
  person:     { name: 'Neighbor', model: 'person', opts: { shirt: '#3a7bd5', pants: '#2b3f6b', panic: true }, size: 4.4, hp: 18, pts: 260, kind: 'critter', ai: 'flee', speed: 3.5, flee: 1, scream: 1 },
  person2:    { name: 'Jogger', model: 'person', opts: { shirt: '#e84a7f', pants: '#333', hair: '#e0c068', panic: true }, size: 4.2, hp: 18, pts: 260, kind: 'critter', ai: 'flee', speed: 4.5, flee: 1, scream: 1 },
  mailbox:    { name: 'Mailbox', model: 'prop', opts: { kind: 'mailbox' }, size: 3, hp: 20, pts: 100, kind: 'structure' },
  trashcan:   { name: 'Trash Can', model: 'prop', opts: { kind: 'trashcan' }, size: 2.4, hp: 18, pts: 90, kind: 'structure', drops: 2 },
  hydrant:    { name: 'Fire Hydrant', model: 'prop', opts: { kind: 'hydrant' }, size: 1.8, hp: 25, pts: 100, kind: 'structure' },
  fence:      { name: 'Picket Fence', model: 'prop', opts: { kind: 'fence' }, size: 4, hp: 20, pts: 80, kind: 'structure' },
  car:        { name: 'Car', model: 'vehicle', opts: { kind: 'car', color: '#c0392b' }, size: 11, hp: 120, pts: 600, kind: 'structure', drops: 3, say: 'CRUNCH!' },
  car2:       { name: 'Car', model: 'vehicle', opts: { kind: 'car', color: '#2e86c1' }, size: 11, hp: 120, pts: 600, kind: 'structure', drops: 3, say: 'CRUNCH!' },
  house:      { name: 'House', model: 'building', opts: { kind: 'house', w: 2, h: 1.6, d: 1.2, color: '#e8dcc0', roof: '#7a2e2a', by: 'w' }, size: 26, hp: 360, pts: 1800, kind: 'structure', drops: 6, say: 'KA-RUNCH!' },
  house2:     { name: 'House', model: 'building', opts: { kind: 'house', w: 2, h: 1.6, d: 1.2, color: '#b8d4e8', roof: '#3a4a5a', by: 'w' }, size: 26, hp: 360, pts: 1800, kind: 'structure', drops: 6, say: 'KA-RUNCH!' },
  oak:        { name: 'Oak Tree', model: 'plant', opts: { kind: 'tree' }, size: 16, hp: 150, pts: 500, kind: 'structure', drops: 3, say: 'TIMBER!' },
  cop:        { name: 'Police Officer', model: 'person', opts: { shirt: '#1e3a8a', pants: '#1e3a8a', hat: 'cap', gun: true }, size: 4.4, hp: 25, pts: 320, kind: 'enemy', ai: 'shooter', speed: 2.5, dmg: 5, range: 25, cd: 1.1, proj: 'bullet' },
  police:     { name: 'Police Car', model: 'vehicle', opts: { kind: 'police', color: '#1a1a1a' }, size: 11, hp: 140, pts: 800, kind: 'enemy', ai: 'shooter', speed: 6, dmg: 6, range: 30, cd: 0.8, proj: 'bullet', drops: 3, siren: 1, say: 'CRUNCH!' },

  // ===== 5: DOWNTOWN =====
  citizen:    { name: 'Citizen', model: 'person', opts: { shirt: '#5d6d7e', pants: '#2c3e50', panic: true }, size: 0.5, hp: 2, pts: 40, kind: 'critter', ai: 'flee', speed: 1.6, flee: 1, scream: 1 },
  citizen2:   { name: 'Citizen', model: 'person', opts: { shirt: '#f39c12', pants: '#34495e', hair: '#222', panic: true }, size: 0.5, hp: 2, pts: 40, kind: 'critter', ai: 'flee', speed: 1.9, flee: 1, scream: 1 },
  taxi:       { name: 'Taxi', model: 'vehicle', opts: { kind: 'taxi', color: '#f4c20d' }, size: 1.2, hp: 15, pts: 150, kind: 'critter', ai: 'flee', speed: 5, flee: 1 },
  sedan:      { name: 'Sedan', model: 'vehicle', opts: { kind: 'car', color: '#7f8c8d' }, size: 1.2, hp: 15, pts: 150, kind: 'critter', ai: 'flee', speed: 4.5, flee: 1 },
  bus:        { name: 'City Bus', model: 'vehicle', opts: { kind: 'bus', color: '#e67e22' }, size: 2.8, hp: 60, pts: 450, kind: 'critter', ai: 'flee', speed: 3, flee: 1, drops: 2, say: 'CRUNCH!' },
  cruiser:    { name: 'Police Cruiser', model: 'vehicle', opts: { kind: 'police', color: '#1a1a1a' }, size: 1.2, hp: 25, pts: 250, kind: 'enemy', ai: 'shooter', speed: 5, dmg: 4, range: 18, cd: 0.7, proj: 'bullet', siren: 1 },
  swat:       { name: 'SWAT Van', model: 'vehicle', opts: { kind: 'van', color: '#22303c' }, size: 1.4, hp: 45, pts: 350, kind: 'enemy', ai: 'shooter', speed: 4, dmg: 5, range: 20, cd: 0.5, proj: 'bullet' },
  newsheli:   { name: 'News Chopper', model: 'aircraft', opts: { kind: 'heli', color: '#2e86c1' }, size: 1.5, hp: 30, pts: 400, kind: 'enemy', ai: 'flyer', speed: 3, dmg: 0, fly: [10, 18], cd: 99 },
  policeheli: { name: 'Police Chopper', model: 'aircraft', opts: { kind: 'heli', color: '#1a1a1a' }, size: 1.6, hp: 40, pts: 500, kind: 'enemy', ai: 'shooter', speed: 4, dmg: 4, range: 25, cd: 0.4, proj: 'bullet', fly: [9, 16] },
  lamp:       { name: 'Street Lamp', model: 'prop', opts: { kind: 'lamp' }, size: 1.8, hp: 10, pts: 60, kind: 'structure' },
  shop:       { name: 'Corner Shop', model: 'building', opts: { w: 1.6, h: 1, d: 1, color: '#a0522d' }, size: 2.8, hp: 120, pts: 700, kind: 'structure', drops: 3, say: 'SMASH!' },
  office:     { name: 'Office Block', model: 'building', opts: { w: 1, h: 2.2, d: 1, color: '#6c7a89', antenna: true }, size: 8, hp: 320, pts: 1800, kind: 'structure', drops: 6, say: 'KRAKOOM!', spawnsOnDeath: 'citizen' },
  office2:    { name: 'Apartments', model: 'building', opts: { w: 1.2, h: 1.8, d: 1, color: '#9a7b62' }, size: 6, hp: 240, pts: 1400, kind: 'structure', drops: 5, say: 'KRAKOOM!', spawnsOnDeath: 'citizen2' },
  tower:      { name: 'Skyscraper', model: 'building', opts: { kind: 'tower', w: 1, h: 3.5, d: 1, color: '#41566e', lit: '#9fd8ff' }, size: 15, hp: 650, pts: 3500, kind: 'structure', drops: 9, say: 'KA-THOOOM!' },

  // ===== 6: ARMY BLOCKADE =====
  soldier:    { name: 'Soldier', model: 'person', opts: { shirt: '#556b2f', pants: '#4b5320', hat: 'helmet', gun: true }, size: 0.22, hp: 1, pts: 30, kind: 'enemy', ai: 'shooter', speed: 0.6, dmg: 1.5, range: 8, cd: 1.2, proj: 'bullet' },
  jeep:       { name: 'Army Jeep', model: 'vehicle', opts: { kind: 'jeep', color: '#5a6b3a' }, size: 0.45, hp: 4, pts: 80, kind: 'enemy', ai: 'shooter', speed: 2.8, dmg: 2, range: 10, cd: 0.4, proj: 'bullet' },
  tank:       { name: 'Battle Tank', model: 'vehicle', opts: { kind: 'tank', color: '#5a6b3a' }, size: 0.9, hp: 20, pts: 300, kind: 'enemy', ai: 'shooter', speed: 1.4, dmg: 10, range: 18, cd: 2.4, proj: 'shell', armor: 0.7 },
  rockettruck:{ name: 'Rocket Launcher', model: 'vehicle', opts: { kind: 'rocket', color: '#6b6b3a' }, size: 1, hp: 18, pts: 350, kind: 'enemy', ai: 'shooter', speed: 1.2, dmg: 9, range: 25, cd: 3.2, proj: 'missile' },
  armyheli:   { name: 'Attack Helicopter', model: 'aircraft', opts: { kind: 'heli', color: '#4b5320' }, size: 1.4, hp: 16, pts: 400, kind: 'enemy', ai: 'shooter', speed: 3, dmg: 7, range: 22, cd: 2, proj: 'missile', fly: [5, 9] },
  jet:        { name: 'Fighter Jet', model: 'aircraft', opts: { kind: 'jet', color: '#7a8590' }, size: 2, hp: 14, pts: 500, kind: 'enemy', ai: 'bomber', speed: 12, dmg: 9, cd: 0.5, proj: 'bomb', fly: [9, 13] },
  bunker:     { name: 'Bunker', model: 'building', opts: { kind: 'bunker', w: 2, h: 0.7, d: 1.5, color: '#7f7a66', by: 'w' }, size: 2.5, hp: 80, pts: 600, kind: 'structure', drops: 4, say: 'BLAM!', spawnsOnDeath: 'soldier' },
  sandbags:   { name: 'Sandbags', model: 'prop', opts: { kind: 'sandbags' }, size: 1.4, hp: 15, pts: 80, kind: 'structure' },
  radar:      { name: 'Radar Station', model: 'building', opts: { kind: 'radar', w: 1.4, h: 2, d: 1 }, size: 4, hp: 120, pts: 900, kind: 'structure', drops: 4, say: 'ZZZT-BOOM!' },
  barricade:  { name: 'Barricade', model: 'prop', opts: { kind: 'barricade' }, size: 1.2, hp: 8, pts: 50, kind: 'structure' },
  pine:       { name: 'Pine Tree', model: 'plant', opts: { kind: 'pine' }, size: 2.2, hp: 10, pts: 60, kind: 'food' },

  // ===== 7: MEGALOPOLIS =====
  minitank:   { name: 'Tank', model: 'vehicle', opts: { kind: 'tank', color: '#5a6b3a' }, size: 0.3, hp: 3, pts: 120, kind: 'enemy', ai: 'shooter', speed: 1, dmg: 4, range: 12, cd: 2.4, proj: 'shell' },
  minijet:    { name: 'Strike Jet', model: 'aircraft', opts: { kind: 'jet', color: '#55606a' }, size: 0.7, hp: 4, pts: 250, kind: 'enemy', ai: 'bomber', speed: 9, dmg: 6, cd: 0.6, proj: 'bomb', fly: [6, 11] },
  gunship:    { name: 'Gunship', model: 'aircraft', opts: { kind: 'gunship', color: '#3a4048' }, size: 1.4, hp: 25, pts: 600, kind: 'enemy', ai: 'shooter', speed: 2.5, dmg: 7, range: 25, cd: 1.6, proj: 'missile', fly: [6, 12] },
  trooper:    { name: 'Mech Trooper', model: 'mech', opts: { color: '#7a8a96' }, size: 2.2, hp: 60, pts: 900, kind: 'enemy', ai: 'hunter', speed: 2.4, dmg: 14, range: 2.2, cd: 1.6, proj: 'laser', shootRange: 14, armor: 0.75 },
  bus7:       { name: 'Bus', model: 'vehicle', opts: { kind: 'bus', color: '#e67e22' }, size: 0.5, hp: 2, pts: 60, kind: 'critter', ai: 'flee', speed: 2, flee: 1 },
  block7:     { name: 'Tower Block', model: 'building', opts: { w: 1, h: 2.4, d: 1, color: '#596a7b' }, size: 3.5, hp: 70, pts: 800, kind: 'structure', drops: 4, say: 'KRAKOOM!' },
  sky7:       { name: 'Mega Tower', model: 'building', opts: { kind: 'tower', w: 1, h: 4, d: 1, color: '#2c3e50', lit: '#ffd27f' }, size: 8, hp: 200, pts: 2200, kind: 'structure', drops: 7, say: 'KA-THOOOM!' },
  sky7b:      { name: 'Glass Spire', model: 'building', opts: { kind: 'tower', w: 1, h: 5, d: 1, color: '#1f4e5f', lit: '#9fffe0' }, size: 12, hp: 300, pts: 3200, kind: 'structure', drops: 9, say: 'KA-THOOOM!' },
  radar7:     { name: 'Defense Radar', model: 'building', opts: { kind: 'radar', w: 1.4, h: 2, d: 1 }, size: 2, hp: 50, pts: 700, kind: 'structure', drops: 3 },

  // ===== 8: WORLD'S END =====
  city8:      { name: 'City', model: 'building', opts: { w: 1, h: 1.4, d: 1, color: '#3a3f4a', lit: '#ff9a3c' }, size: 0.8, hp: 20, pts: 900, kind: 'structure', drops: 3, say: 'KRAKOOM!' },
  tower8:     { name: 'Arcology', model: 'building', opts: { kind: 'tower', w: 1, h: 4, d: 1, color: '#22262e', lit: '#ff6a3c' }, size: 2.4, hp: 60, pts: 1800, kind: 'structure', drops: 5, say: 'KA-THOOOM!' },
  silo:       { name: 'Missile Silo', model: 'building', opts: { kind: 'silo', w: 1, h: 2.2, d: 1 }, size: 1.6, hp: 50, pts: 1500, kind: 'enemy', ai: 'shooter', speed: 0, dmg: 12, range: 35, cd: 3.5, proj: 'missile', drops: 4, structureLike: 1, say: 'KABOOOM!' },
  megajet:    { name: 'Stealth Bomber', model: 'aircraft', opts: { kind: 'bomber', color: '#2a2e36' }, size: 1.6, hp: 30, pts: 1200, kind: 'enemy', ai: 'bomber', speed: 8, dmg: 10, cd: 0.4, proj: 'bomb', fly: [8, 13] },
  megamech:   { name: 'Siege Mech', model: 'mech', opts: { color: '#5a3a3a', color2: '#2a1e1e', missiles: true, eye: '#ffcc00' }, size: 2.6, hp: 120, pts: 2200, kind: 'enemy', ai: 'hunter', speed: 2, dmg: 18, range: 2.4, cd: 1.4, proj: 'missile', shootRange: 20, armor: 0.7 },
  rock8:      { name: 'Boulder', model: 'blob', opts: { shape: 'rock', color: '#5a4a44' }, size: 0.8, hp: 6, pts: 60, kind: 'food' },
  tank8:      { name: 'Hover Tank', model: 'vehicle', opts: { kind: 'tank', color: '#3a4048' }, size: 0.5, hp: 8, pts: 300, kind: 'enemy', ai: 'shooter', speed: 1.8, dmg: 7, range: 16, cd: 1.8, proj: 'laser' },

  toadstool:  { name: 'Toadstool', model: 'blob', opts: { shape: 'mushroom', color: '#c0392b' }, size: 3, hp: 25, pts: 150, kind: 'structure', drops: 2, say: 'SPLAT!' },
  pebble:     { name: 'Pebble', model: 'blob', opts: { shape: 'rock', color: '#8a8a80' }, size: 2.2, hp: 35, pts: 130, kind: 'structure', drops: 2, say: 'CRACK!' },
  pinecone:   { name: 'Pinecone', model: 'plant', opts: { kind: 'pine', color: '#7a5232' }, size: 3.5, hp: 40, pts: 180, kind: 'structure', drops: 3, say: 'CRUNCH!' },
  reedclump:  { name: 'Reed Clump', model: 'plant', opts: { kind: 'grass', color: '#5a8a3a' }, size: 3.5, hp: 20, pts: 120, kind: 'structure', drops: 2, say: 'SNAP!' },
  pondrock:   { name: 'Mossy Rock', model: 'blob', opts: { shape: 'rock', color: '#6a7a5a' }, size: 2.6, hp: 40, pts: 150, kind: 'structure', drops: 2, say: 'CRACK!' },

  // ===== PUDDLE POND =====
  algae:      food('Algae', 'blob', { shape: 'drop', color: '#6aa83a' }, 0.35, 6),
  duckweed:   food('Duckweed', 'blob', { shape: 'leaf', color: '#8fcf4a' }, 0.5, 9),
  frogspawn:  food('Frogspawn', 'blob', { shape: 'grapes', color: '#cfe6d8' }, 0.75, 25, { hp: 2 }),
  mosquito:   { name: 'Mosquito', model: 'bug', opts: { segs: [{ x: 0, r: 0.25, c: '#5a4a3a', l: 1.8 }, { x: 0.45, r: 0.2, c: '#3a2e24' }, { x: 0.7, r: 0.14, c: '#3a2e24' }], legs: 6, legSegs: [1], legLen: 0.9, legThick: 0.03, wings: '#e6f2ff', antenna: true }, size: 0.45, hp: 3, pts: 20, kind: 'enemy', ai: 'diver', speed: 3.5, dmg: 4, range: 0.6, cd: 1.6, fly: [1, 3] },
  strider:    { ...critter('Water Strider', 'bug', { segs: [{ x: 0, r: 0.2, c: '#3a3a30', l: 2.5 }, { x: 0.5, r: 0.15, c: '#2a2a22' }], legs: 6, legSegs: [0], legLen: 1.3, legThick: 0.03, splay: 1.35, antenna: true }, 0.8, 30, 4.5, { flee: 1, hp: 3 }) },
  tadpole:    critter('Tadpole', 'tadpole', {}, 0.6, 20, 1.6, { hp: 3, flee: 1 }),
  leech:      { name: 'Leech', model: 'worm', opts: { color: '#3a2a2a', band: '#5a3a2a', n: 10 }, size: 1.3, hp: 12, pts: 70, kind: 'enemy', ai: 'hunter', speed: 1.6, dmg: 7, range: 1.1, cd: 1.1 },
  divebeetle: { name: 'Diving Beetle', model: 'bug', opts: { segs: [{ x: 0, r: 0.6, c: '#1f3a2a', h: 0.6 }, { x: 0.55, r: 0.3, c: '#1a2e22' }], stripes: '#c9a227', legs: 6, legSegs: [0], legLen: 0.6, jaws: true }, size: 1.8, hp: 26, pts: 120, kind: 'enemy', ai: 'hunter', speed: 2.6, dmg: 11, range: 1.4, cd: 1.3, armor: 0.75 },
  newt:       { name: 'Fire Newt', model: 'newt', opts: { color: '#c8641e', spots: '#2a1a10' }, size: 2.8, hp: 45, pts: 230, kind: 'enemy', ai: 'hunter', speed: 3.2, dmg: 13, range: 1.8, cd: 1.4 },

  // ===== FARMLAND =====
  chicken:    { name: 'Chicken', model: 'bird', opts: { color: '#f4f0e6', color2: '#ffffff', wingColor: '#e8e0d0', beak: '#f2a01e' }, size: 0.35, hp: 2, pts: 40, kind: 'critter', ai: 'flee', speed: 2.2, flee: 1 },
  pig:        { name: 'Pig', model: 'animal', opts: { color: '#f2a8b0', color2: '#f8c8cc', ears: 'flop', snout: 1.3, tail: 'up', tailLen: 0.3 }, size: 0.7, hp: 8, pts: 90, kind: 'critter', ai: 'flee', speed: 2.2, flee: 1 },
  sheep:      { name: 'Sheep', model: 'animal', opts: { color: '#efeae0', color2: '#3a3a3a', ears: 'flop', tailLen: 0.3 }, size: 0.7, hp: 8, pts: 90, kind: 'critter', ai: 'flee', speed: 2, flee: 1 },
  goat:       { name: 'Angry Goat', model: 'animal', opts: { color: '#c8b8a0', color2: '#efe6d2', tail: 'up', tailLen: 0.3 }, size: 0.7, hp: 10, pts: 120, kind: 'enemy', ai: 'hopper', speed: 3, dmg: 6, range: 0.8, cd: 1.2 },
  cow:        { name: 'Cow', model: 'animal', opts: { color: '#f4f0e6', color2: '#2a2a2a', ears: 'flop', snout: 1.2, tailLen: 1 }, size: 1.4, hp: 20, pts: 200, kind: 'critter', ai: 'wander', speed: 1, flee: 1 },
  bull:       { name: 'Bull', model: 'animal', opts: { color: '#3a2a20', color2: '#5a4030', snout: 1.2, tailLen: 1 }, size: 1.5, hp: 35, pts: 320, kind: 'enemy', ai: 'hunter', speed: 4.5, dmg: 12, range: 1.2, cd: 1.6 },
  farmdog:    { name: 'Sheepdog', model: 'animal', opts: { color: '#2a2a2a', color2: '#efeae0', ears: 'flop', snout: 1.4, tail: 'bushy' }, size: 0.5, hp: 6, pts: 80, kind: 'enemy', ai: 'hunter', speed: 4.5, dmg: 4, range: 0.7, cd: 1 },
  farmer:     { name: 'Farmer', model: 'person', opts: { shirt: '#c0392b', pants: '#2b4f8b', hat: 'cap', hatColor: '#d8b45a', gun: true }, size: 1.2, hp: 10, pts: 220, kind: 'enemy', ai: 'shooter', speed: 1.6, dmg: 5, range: 16, cd: 1.5, proj: 'bullet' },
  corn:       { name: 'Corn Stalk', model: 'farm', opts: { kind: 'corn' }, size: 1.4, hp: 3, pts: 40, kind: 'food' },
  pumpkin:    food('Pumpkin', 'farm', { kind: 'pumpkin' }, 0.55, 50, { hp: 4 }),
  haybale:    food('Hay Bale', 'farm', { kind: 'hay' }, 0.9, 80, { hp: 10 }),
  tractor:    { name: 'Tractor', model: 'machine', opts: { kind: 'tractor', color: '#2e8b3a' }, size: 2.4, hp: 40, pts: 500, kind: 'critter', ai: 'flee', speed: 2, flee: 1, drops: 3, say: 'CRUNCH!' },
  duster:     { name: 'Crop Duster', model: 'machine', opts: { kind: 'biplane', color: '#c0392b' }, size: 1.8, hp: 14, pts: 450, kind: 'enemy', ai: 'bomber', speed: 7, dmg: 4, cd: 0.25, proj: 'gas', fly: [4, 6] },
  scarecrow:  { name: 'Scarecrow', model: 'farm', opts: { kind: 'scarecrow' }, size: 1.4, hp: 10, pts: 80, kind: 'structure' },
  trough:     { name: 'Water Trough', model: 'farm', opts: { kind: 'trough' }, size: 1.2, hp: 10, pts: 60, kind: 'structure' },
  barn:       { name: 'Red Barn', model: 'farm', opts: { kind: 'barn', by: 'h' }, size: 7, hp: 200, pts: 1600, kind: 'structure', drops: 6, say: 'KA-RUNCH!', spawnsOnDeath: 'chicken' },
  windmill:   { name: 'Windmill', model: 'farm', opts: { kind: 'windmill', by: 'h' }, size: 9, hp: 160, pts: 1400, kind: 'structure', drops: 5, say: 'TIMBER!' },
  grainsilo:  { name: 'Grain Silo', model: 'farm', opts: { kind: 'grainsilo', by: 'h' }, size: 10, hp: 260, pts: 2000, kind: 'structure', drops: 7, say: 'KRAKOOM!' },

  // ===== HARBOR ASSAULT =====
  sailor:     { name: 'Dock Worker', model: 'person', opts: { shirt: '#e8a81e', pants: '#2b3f6b', hat: 'helmet', hatColor: '#f2d14a', panic: true }, size: 0.1, hp: 1, pts: 40, kind: 'critter', ai: 'flee', speed: 0.7, flee: 1, scream: 1 },
  marine:     { name: 'Marine', model: 'person', opts: { shirt: '#2b3f5b', pants: '#2b3f5b', hat: 'helmet', hatColor: '#2b3f5b', gun: true }, size: 0.11, hp: 1.5, pts: 50, kind: 'enemy', ai: 'shooter', speed: 0.6, dmg: 1.5, range: 9, cd: 1, proj: 'bullet' },
  tug:        { name: 'Tugboat', model: 'ship', opts: { kind: 'tug', color: '#c0392b', deck: '#3a3a3a' }, size: 0.7, hp: 6, pts: 160, kind: 'critter', ai: 'flee', speed: 1.4, flee: 1 },
  patrol:     { name: 'Patrol Boat', model: 'ship', opts: { kind: 'patrol', color: '#7a8590' }, size: 0.9, hp: 10, pts: 300, kind: 'enemy', ai: 'shooter', speed: 2.2, dmg: 2, range: 14, cd: 0.35, proj: 'bullet' },
  destroyer:  { name: 'Destroyer', model: 'ship', opts: { kind: 'destroyer', color: '#5a6470' }, size: 2.6, hp: 50, pts: 1100, kind: 'enemy', ai: 'shooter', speed: 1.2, dmg: 9, range: 24, cd: 2.2, proj: 'missile', drops: 4, armor: 0.8, say: 'KABOOOM!' },
  cargoship:  { name: 'Cargo Ship', model: 'ship', opts: { kind: 'cargo', color: '#2a3a5a' }, size: 3.4, hp: 70, pts: 1400, kind: 'critter', ai: 'flee', speed: 0.8, flee: 1, drops: 6, say: 'KA-RUNCH!' },
  harrier:    { name: 'Jump Jet', model: 'aircraft', opts: { kind: 'jet', color: '#6a7a6a' }, size: 1, hp: 8, pts: 450, kind: 'enemy', ai: 'shooter', speed: 4, dmg: 6, range: 22, cd: 1.6, proj: 'missile', fly: [6, 10] },
  container:  { name: 'Shipping Container', model: 'harbor', opts: { kind: 'container', color: '#2e86c1', by: 'w' }, size: 0.7, hp: 6, pts: 120, kind: 'food' },
  stack:      { name: 'Container Stack', model: 'harbor', opts: { kind: 'stack', by: 'w' }, size: 1.6, hp: 30, pts: 500, kind: 'structure', drops: 3, say: 'CLANG!' },
  crane:      { name: 'Dock Crane', model: 'harbor', opts: { kind: 'crane', by: 'h' }, size: 4, hp: 90, pts: 1500, kind: 'structure', drops: 5, say: 'KRAKOOM!' },
  lighthouse: { name: 'Lighthouse', model: 'harbor', opts: { kind: 'lighthouse', by: 'h' }, size: 3.2, hp: 70, pts: 1200, kind: 'structure', drops: 4, say: 'SMASH!' },
  bollard:    { name: 'Bollard', model: 'harbor', opts: { kind: 'bollard' }, size: 0.3, hp: 3, pts: 40, kind: 'structure' },

  // ===== pickups (any level) =====
  helix:      { name: 'Golden DNA', model: 'prop', opts: { kind: 'helix' }, size: 0.7, hp: 1, pts: 250, kind: 'pickup', pickup: 'dna', float: 1 },
  heart:      { name: 'Royal Jelly', model: 'prop', opts: { kind: 'heart' }, size: 0.55, hp: 1, pts: 50, kind: 'pickup', pickup: 'heal', float: 1 },

  // ===== bosses (behaviour lives in bosses.js; size is relative to the level's goal size) =====
  b_wolfspider: { name: 'Wolf Spider Matriarch', model: 'bug', opts: { segs: [{ x: 0, r: 0.6, c: '#4a3626' }, { x: 0.75, r: 0.45, c: '#3a2a1e' }], stripes: '#2a1e14', legs: 8, legSegs: [1], legLen: 1.25, legColor: '#3a2a1e', glowEyes: '#ffb300', splay: 0.85, jaws: true }, size: 2.0, hp: 380, pts: 3000, kind: 'boss', boss: 'wolfspider', dmg: 18 },
  b_toad:     { name: 'King Toad', model: 'frog', opts: { color: '#6b7a3a', warts: '#8a7a3a' }, size: 2.0, hp: 600, pts: 5000, kind: 'boss', boss: 'toad', dmg: 22 },
  b_crow:     { name: 'The Crow', model: 'bird', opts: { color: '#1e1e26', color2: '#2a2a36', wingColor: '#15151c', beak: '#3a3a3a' }, size: 1.7, hp: 650, pts: 7000, kind: 'boss', boss: 'crow', dmg: 22 },
  b_waterbug: { name: 'Giant Water Bug', model: 'waterbug', opts: { glowEyes: '#ff6a3c' }, size: 2.0, hp: 480, pts: 4000, kind: 'boss', boss: 'waterbug', dmg: 18 },
  b_combine:  { name: 'Combine Harvester', model: 'machine', opts: { kind: 'combine', color: '#2e8b3a' }, size: 2.2, hp: 1000, pts: 10000, kind: 'boss', boss: 'combine', dmg: 22 },
  b_battleship: { name: 'Iron Leviathan', model: 'ship', opts: { kind: 'battleship', color: '#4a5560' }, size: 2.4, hp: 1600, pts: 19000, kind: 'boss', boss: 'battleship', dmg: 24 },
  b_van:      { name: 'Pest Control Van', model: 'vehicle', opts: { kind: 'van', color: '#e8e8e8' }, size: 2.6, hp: 900, pts: 9000, kind: 'boss', boss: 'van', dmg: 20 },
  b_gunship:  { name: 'Thunderbird Gunship', model: 'aircraft', opts: { kind: 'gunship', color: '#22303c' }, size: 1.4, hp: 1000, pts: 12000, kind: 'boss', boss: 'gunship', dmg: 18 },
  b_mammoth:  { name: 'Mammoth Siege Tank', model: 'vehicle', opts: { kind: 'mammoth', color: '#4b5a32' }, size: 2.2, hp: 1400, pts: 16000, kind: 'boss', boss: 'mammoth', dmg: 24 },
  b_titan:    { name: 'TITAN-X Mech', model: 'mech', opts: { color: '#a9b4bd', color2: '#41566e', missiles: true, eye: '#33e0ff' }, size: 2.0, hp: 1900, pts: 22000, kind: 'boss', boss: 'titan', dmg: 26 },
  b_core:     { name: 'Planetary Defense Core', model: 'building', opts: { kind: 'core', w: 1.2, h: 1.6, d: 1.2, by: 'h' }, size: 2.0, hp: 2600, pts: 40000, kind: 'boss', boss: 'core', dmg: 28 }
};
