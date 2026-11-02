// data/levels.js — the campaign. Each level is pure data:
//   goal: size to reach before the boss (the bug starts each level at size 1). Real-world scale is
//   chained automatically: each level starts where the previous one ended (see bottom of file).
//   sky/fog/ground colours, decor (background scenery, see world.js), spawns: [id, weight],
//   structures: [id, weight] placed along the ground, wall: style of the indestructible boundary walls (walls.js), par: score for an S rank, music: tempo + key.
// Reorder, remove or add levels here; nothing else needs to change.

export const LEVELS = [
  {
    id: 'leaf', name: 'Leaf Litter', sub: 'You hatch under a fallen leaf. Everything is enormous. Eat.',
    goal: 3.2, boss: 'b_wolfspider', wall: 'boulders',
    sky: ['#9fc7a0', '#e3eed2'], fog: '#c9dcb5', ground: '#6b4a2b', ground2: '#4f3820', light: '#fff4d6',
    decor: [['grass', 6, '#4f8a2e'], ['mushroom', 1.5, '#c0392b'], ['leaf', 2, '#9a6a2a'], ['pebble', 2, '#8a8a80'], ['grass', 3, '#6aa83a']],
    spawns: [['crumb', 6], ['seed', 5], ['dew', 2], ['aphid', 6], ['ant', 6], ['gnat', 3], ['leafbit', 3], ['ladybug', 4], ['berry', 2], ['caterpillar', 3], ['spiderling', 2], ['pillbug', 2], ['centipede', 1.5]],
    structures: [['toadstool', 2], ['pebble', 2], ['pinecone', 1.2]], par: 22500, music: { bpm: 112, root: 45, scale: 'minor' }
  },
  {
    id: 'pond', name: 'Puddle Pond', sub: 'A rain puddle is an ocean. Something big is hunting under the surface.',
    goal: 3.2, boss: 'b_waterbug', wall: 'boulders',
    sky: ['#8fc4c8', '#e2f0e8'], fog: '#c4dcd4', ground: '#5a4a32', ground2: '#3f7f96', light: '#fff4e0',
    decor: [['reeds', 5, '#5a8a3a'], ['lily', 2, '#4f9a3a'], ['cattail', 2, '#6a4a2a'], ['pebble', 2, '#7a7a70'], ['grass', 3, '#4f8a2e']],
    spawns: [['algae', 6], ['duckweed', 5], ['frogspawn', 3], ['mosquito', 4], ['strider', 4], ['tadpole', 5], ['aphid', 2], ['leech', 2.5], ['divebeetle', 2], ['newt', 1.3], ['dew', 1]],
    structures: [['reedclump', 2], ['pondrock', 2], ['toadstool', 0.6]], par: 27500, music: { bpm: 108, root: 43, scale: 'dorian' }
  },
  {
    id: 'yard', name: 'Backyard Jungle', sub: 'The lawn is a rainforest. The frogs are hungry too.',
    goal: 3.3, boss: 'b_toad', wall: 'brick',
    sky: ['#7fb8e8', '#d8ecf8'], fog: '#bfdcec', ground: '#5a7a2a', ground2: '#3f5a1e', light: '#fffbe8',
    decor: [['grass', 8, '#5aa83a'], ['flower', 2, '#e84a7f'], ['flower', 2, '#ffd54f'], ['pebble', 1, '#9a9a90'], ['grass', 4, '#3f7f2a']],
    spawns: [['worm', 5], ['clover', 4], ['aphid', 3], ['ant', 3], ['snail', 4], ['bee', 3], ['grasshopper', 4], ['daisy', 2], ['tulip', 2], ['dragonfly', 2], ['mouse', 2], ['frog', 1.5], ['dew', 1]],
    structures: [['gnome', 1], ['hose', 1], ['pebble', 1.5], ['toadstool', 1]], par: 35000, music: { bpm: 118, root: 43, scale: 'dorian' }
  },
  {
    id: 'picnic', name: 'Picnic Panic', sub: 'Sandwiches! Soda! Somebody call the exterminator.',
    goal: 3.5, boss: 'b_crow', wall: 'logs',
    sky: ['#6fb1f0', '#e6f3ff'], fog: '#cfe6f5', ground: '#5f8f35', ground2: '#46702a', light: '#fffbe8',
    decor: [['tree', 1.5, '#3f7f32'], ['bush', 2, '#3c7a30'], ['grass', 3, '#5aa83a'], ['table', 0.6, '#8a5a2a'], ['blanket', 0.5, '#d32f2f']],
    spawns: [['grape', 5], ['cookie', 5], ['donut', 3], ['sandwich', 4], ['apple', 3], ['soda', 3], ['ant', 3], ['wasp', 3], ['pigeon', 2.5], ['squirrel', 2], ['cat', 1.2], ['heart', 0.4]],
    structures: [['basket', 1], ['cooler', 1], ['bench', 0.7]], par: 50000, music: { bpm: 124, root: 48, scale: 'major' }
  },
  {
    id: 'suburb', name: 'Suburbia', sub: 'Lawns, mailboxes and screaming neighbors. You are now a problem.',
    goal: 4, boss: 'b_van', wall: 'brick',
    sky: ['#79a9e0', '#f5e6c8'], fog: '#d9dfe8', ground: '#55803a', ground2: '#7a7a7a', light: '#fff2d8',
    decor: [['house', 1, '#e8dcc0'], ['house', 1, '#b8d4e8'], ['tree', 1.5, '#3f7f32'], ['fence', 1, '#efe6d2'], ['bush', 1, '#3c7a30']],
    spawns: [['kitten', 4], ['dog', 4], ['person', 3], ['person2', 3], ['cop', 2], ['police', 1], ['heart', 0.3]],
    structures: [['mailbox', 2], ['trashcan', 2], ['hydrant', 1.5], ['fence', 1.5], ['car', 1.2], ['car2', 1.2], ['oak', 1], ['house', 0.8], ['house2', 0.8]], par: 75000, music: { bpm: 128, root: 41, scale: 'minor' }
  },
  {
    id: 'farm', name: 'Farmland', sub: 'Open fields, fat cattle, and a farmer with a very large harvester.',
    goal: 2.8, boss: 'b_combine', wall: 'drystone',
    sky: ['#7fb8e8', '#fbe8b8'], fog: '#e8dcb8', ground: '#7a9a3a', ground2: '#8a6a3a', light: '#fff2c8',
    decor: [['cornrow', 3, '#7aa83a'], ['farmhouse', 0.7, '#a8322a'], ['tree', 1, '#4f8a3a'], ['hayfield', 1.5, '#d9b44a'], ['fence', 1, '#efe6d2']],
    spawns: [['chicken', 6], ['pig', 4], ['sheep', 4], ['goat', 3], ['cow', 3], ['bull', 1.5], ['farmdog', 3], ['farmer', 2.5], ['corn', 4], ['pumpkin', 3], ['haybale', 2], ['tractor', 1.2], ['duster', 1], ['heart', 0.3]],
    structures: [['scarecrow', 2], ['trough', 1.5], ['barn', 1], ['windmill', 0.8], ['grainsilo', 0.7]], par: 90000, music: { bpm: 126, root: 43, scale: 'major' }
  },
  {
    id: 'downtown', name: 'Downtown', sub: 'Rush hour. Skyscrapers. Nobody is going to work today.',
    goal: 3.3, boss: 'b_gunship', wall: 'concrete',
    sky: ['#e8955a', '#f8d9a8'], fog: '#e8c9a8', ground: '#4a4a4f', ground2: '#2f2f33', light: '#ffd9a8',
    decor: [['skyline', 3, '#5d6d7e'], ['skyline', 2, '#7f8c8d'], ['skyline', 1, '#34495e']],
    spawns: [['citizen', 6], ['citizen2', 6], ['taxi', 4], ['sedan', 4], ['bus', 2], ['cruiser', 3], ['swat', 1.5], ['newsheli', 1], ['policeheli', 1.5], ['heart', 0.3]],
    structures: [['lamp', 2], ['shop', 2], ['office', 1.4], ['office2', 1.4], ['tower', 0.7]], par: 112500, music: { bpm: 134, root: 40, scale: 'phrygian' }
  },
  {
    id: 'army', name: 'Army Blockade', sub: 'The military has drawn a line in the desert. Cross it.',
    goal: 3.4, boss: 'b_mammoth', wall: 'steel',
    sky: ['#c9a87a', '#f2dcb0'], fog: '#e0c9a0', ground: '#b8955a', ground2: '#8a6a3a', light: '#fff0d0',
    decor: [['dune', 3, '#c9a56a'], ['mesa', 1, '#a8703a'], ['cactus', 1, '#5d8a3a'], ['smoke', 1, '#555']],
    spawns: [['soldier', 8], ['jeep', 5], ['tank', 4], ['rockettruck', 2], ['armyheli', 2.5], ['jet', 1.5], ['pine', 1.5], ['heart', 0.3]],
    structures: [['sandbags', 2], ['barricade', 2], ['bunker', 1.5], ['radar', 0.8]], par: 150000, music: { bpm: 140, root: 38, scale: 'minor' }
  },
  {
    id: 'harbor', name: 'Harbor Assault', sub: 'The navy is waiting at the docks. Wade in and sink the fleet.',
    goal: 3.2, boss: 'b_battleship', wall: 'containers',
    sky: ['#5a7a9a', '#c8d8e0'], fog: '#a8bccb', ground: '#2a5a7a', ground2: '#6a6a66', light: '#e8f0ff',
    decor: [['farship', 2, '#5a6470'], ['cranebg', 1.2, '#e8a81e'], ['skyline', 1.5, '#4a5a6a', 6, 20], ['smoke', 1, '#555']],
    spawns: [['sailor', 7], ['marine', 6], ['tug', 4], ['patrol', 4], ['container', 4], ['destroyer', 1.6], ['cargoship', 1.2], ['harrier', 1.8], ['armyheli', 1.5], ['heart', 0.3]],
    structures: [['bollard', 2], ['stack', 2], ['crane', 1], ['lighthouse', 0.6]], par: 175000, music: { bpm: 142, root: 38, scale: 'phrygian' }
  },
  {
    id: 'mega', name: 'Megalopolis', sub: 'Forty million people and every weapon they own. Topple the towers.',
    goal: 3.4, boss: 'b_titan', wall: 'concrete',
    sky: ['#2a2240', '#c85a5a'], fog: '#5a3a5a', ground: '#2f2f36', ground2: '#1f1f24', light: '#ffc9a8', night: 1,
    decor: [['skyline', 4, '#2c3e50', 6, 22], ['skyline', 3, '#1f2a36', 10, 30], ['skyline', 2, '#3a2a4a', 4, 14], ['smoke', 2, '#333', 6, 20]],
    spawns: [['minitank', 6], ['bus7', 4], ['minijet', 3], ['gunship', 2.5], ['trooper', 2], ['heart', 0.35]],
    structures: [['block7', 2], ['sky7', 1.4], ['sky7b', 1], ['radar7', 0.8]], par: 200000, music: { bpm: 146, root: 37, scale: 'phrygian' }
  },
  {
    id: 'end', name: "World's End", sub: 'The whole planet stands against you. Crack its core.',
    goal: 4, boss: 'b_core', wall: 'obsidian', final: 1,
    sky: ['#1a0a0a', '#a8321e'], fog: '#5a1a12', ground: '#3a2620', ground2: '#ff5a1e', light: '#ffb08a', night: 1,
    decor: [['mesa', 3, '#3a2620', 8, 30], ['lava', 2, '#ff5a1e', 3, 10], ['smoke', 3, '#2a1a1a', 8, 25], ['skyline', 1, '#22262e', 1, 4]],
    spawns: [['rock8', 4], ['tank8', 5], ['megajet', 2.5], ['megamech', 2], ['silo', 1.2], ['heart', 0.35]],
    structures: [['city8', 2], ['tower8', 1.2]], par: 275000, music: { bpm: 152, root: 36, scale: 'harmonic' }
  }
];

// chain the real-world scale: the bug starts as a 3 mm hatchling and each level begins at the
// size the previous one ended, so levels can be added, removed or reordered freely
let unit = 0.003;
for (const L of LEVELS) { L.unit = unit; unit *= L.goal; }
