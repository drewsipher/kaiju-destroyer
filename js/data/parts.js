// data/parts.js — the Body Lab catalogue: every body, head, leg set, tail and attachment you can
// mutate onto your kaiju. Pure data; the 3D builders with the same ids live in bugparts.js.
//   slot: body | head | legs | tail | attach      tier: 1-3 (deeper tiers are drafted later in a run)
//   fx: stat changes while equipped               sockets: where an attachment may go
//   at: extra fx depending on the socket it's placed in
// Add a part: add an entry here and a builder in bugparts.js.

export const SOCKETS = {
  crown:     { name: 'Crown', desc: 'top of the head', unlock: 0 },
  back:      { name: 'Back', desc: 'middle of the back', unlock: 0 },
  shoulders: { name: 'Shoulders', desc: 'both shoulders (mirrored)', unlock: 2, pair: true },
  rump:      { name: 'Rump', desc: 'rear of the back', unlock: 4 },
  cheeks:    { name: 'Cheeks', desc: 'both sides of the head (mirrored)', unlock: 6, pair: true }
};
export const SOCKET_ORDER = ['crown', 'back', 'shoulders', 'rump', 'cheeks'];
export const SLOT_NAMES = { body: 'Body', head: 'Head', legs: 'Legs', tail: 'Tail', attach: 'Attachment' };

export const PARTS = {
  // ---------- BODIES ----------
  body_beetle:    { slot: 'body', tier: 1, name: 'Beetle Body', desc: 'Rounded and armored. A solid all-rounder.', fx: { armor: 0.05, maxHp: 20 } },
  body_mantis:    { slot: 'body', tier: 1, name: 'Mantis Body', desc: 'Long and upright. Faster, hits harder, a little fragile.', fx: { speed: 0.15, biteDmg: 0.1, maxHp: -10 } },
  body_spider:    { slot: 'body', tier: 1, name: 'Spider Body', desc: 'Huge round abdomen. Leaps far and climbs twice as fast.', fx: { jump: 0.2, climb: 1 } },
  body_wasp:      { slot: 'body', tier: 1, name: 'Wasp Body', desc: 'Pinched waist. Born flyer: an extra jump and a quick step.', fx: { jumps: 1, speed: 0.1, armor: -0.04 } },
  body_grub:      { slot: 'body', tier: 1, name: 'Grub Body', desc: 'Fat and soft. Huge health, grows fast, eats bigger things, slow.', fx: { maxHp: 60, growth: 0.15, eatRatio: 0.1, speed: -0.15 } },
  body_scorpion:  { slot: 'body', tier: 2, name: 'Scorpion Body', desc: 'Low segmented plates. Heavily armored.', fx: { armor: 0.12, maxHp: 15, speed: -0.04 } },
  body_crab:      { slot: 'body', tier: 2, name: 'Crab Body', desc: 'A wide shell fortress. Shrugs off knockback.', fx: { armor: 0.16, maxHp: 30, speed: -0.1, heavy: 1 } },
  body_centipede: { slot: 'body', tier: 2, name: 'Centipede Body', desc: 'Long segmented body. Very fast and a quick climber.', fx: { speed: 0.25, climb: 0.5, maxHp: -10 } },

  // ---------- HEADS ----------
  head_ant:    { slot: 'head', tier: 1, name: 'Ant Head', desc: 'Strong snapping mandibles.', fx: { biteDmg: 0.1 } },
  head_rhino:  { slot: 'head', tier: 1, name: 'Rhino Head', desc: 'Shield-shaped head with a nose horn. Dashes hit much harder.', fx: { dashDmg: 0.6 } },
  head_mantis: { slot: 'head', tier: 1, name: 'Mantis Head', desc: 'Huge eyes: more critical hits and longer reach.', fx: { crit: 0.1, reach: 0.12 } },
  head_fly:    { slot: 'head', tier: 1, name: 'Fly Head', desc: 'Compound eyes and a sucking mouth. Slurps up small things from farther away.', fx: { vacuum: 0.1, magnet: 0.5, crit: 0.04 } },
  head_stalk:  { slot: 'head', tier: 2, name: 'Stalk-Eyed Head', desc: 'Eyes on long stalks: you see a wider area and crit more often.', fx: { sight: 0.15, crit: 0.06 } },
  head_moth:   { slot: 'head', tier: 2, name: 'Moth Head', desc: 'Feathery antennae sense food: frenzy charges faster, biomass flies to you.', fx: { frenzyGain: 0.35, magnet: 1 } },
  head_tick:   { slot: 'head', tier: 2, name: 'Tick Head', desc: 'Barbed blood-drinker: bites poison and eating heals more.', fx: { poison: 1, healOnEat: 1 } },
  head_skull:  { slot: 'head', tier: 3, name: 'Kaiju Skull', desc: 'A massive toothy jaw. Bite +30% and swallow bigger prey.', fx: { biteDmg: 0.3, eatRatio: 0.1 } },
  head_hydra:  { slot: 'head', tier: 3, name: 'Twin Heads', desc: 'Two heads: every chomp bites twice and swallows more at once.', fx: { twinhead: 1 } },

  // ---------- LEGS ----------
  legs_walker:  { slot: 'legs', tier: 1, name: 'Walking Legs', desc: 'Six sturdy legs.', fx: {} },
  legs_runner:  { slot: 'legs', tier: 1, name: 'Runner Legs', desc: 'Six long thin legs: 15% faster.', fx: { speed: 0.15 } },
  legs_jumper:  { slot: 'legs', tier: 1, name: 'Hopper Legs', desc: 'Huge grasshopper hind legs: jump 35% higher.', fx: { jump: 0.35 } },
  legs_crab:    { slot: 'legs', tier: 2, name: 'Armored Legs', desc: 'Thick plated legs: more armor, no knockback.', fx: { armor: 0.05, heavy: 1, speed: -0.05 } },
  legs_stilt:   { slot: 'legs', tier: 2, name: 'Stilt Legs', desc: 'Very long legs lift you high: jump and speed up.', fx: { jump: 0.2, speed: 0.1 } },
  legs_spider:  { slot: 'legs', tier: 2, name: 'Spider Legs', desc: 'Eight arched legs: faster, and you climb at double speed.', fx: { speed: 0.08, climb: 1 } },
  legs_many:    { slot: 'legs', tier: 3, name: 'Hundred Legs', desc: 'A rippling carpet of legs: 25% faster.', fx: { speed: 0.25, jump: -0.1 } },

  // ---------- TAILS ----------
  tail_none:      { slot: 'tail', tier: 1, name: 'No Tail', desc: 'Nothing back there.', fx: {} },
  tail_stinger:   { slot: 'tail', tier: 1, name: 'Stinger', desc: 'Bites poison targets for 3 seconds.', fx: { poison: 1 } },
  tail_pincers:   { slot: 'tail', tier: 1, name: 'Tail Forceps', desc: 'Earwig pincers: +10% bite and crit chance.', fx: { biteDmg: 0.1, crit: 0.05 } },
  tail_spinneret: { slot: 'tail', tier: 1, name: 'Spinnerets', desc: 'Silk glands: unlocks the web shot (T), or upgrades it.', fx: { silk: 1 } },
  tail_club:      { slot: 'tail', tier: 2, name: 'Tail Club', desc: 'Every dash ends in a spinning tail smash.', fx: { tailclub: 1 } },
  tail_whip:      { slot: 'tail', tier: 2, name: 'Spiked Whip', desc: 'Your chomps also lash whatever is behind you.', fx: { whip: 1 } },
  tail_scorpion:  { slot: 'tail', tier: 2, name: 'Scorpion Tail', desc: 'Every dash ends in a venomous sting; bites poison.', fx: { tailclub: 1, poison: 1 } },
  tail_fan:       { slot: 'tail', tier: 2, name: 'Tail Fan', desc: 'A fan of plates: glide while holding jump, jump higher.', fx: { glideAlways: 1, jump: 0.1 } },

  // ---------- ATTACHMENTS ----------
  att_horn:     { slot: 'attach', tier: 1, name: 'Great Horn', sockets: ['crown', 'back'], desc: 'Crown: dashes deal much more damage. Back: a spike that hurts attackers.', fx: {}, at: { crown: { dashDmg: 1, ramStructures: 1 }, back: { spikes: 0.6 } } },
  att_spikes:   { slot: 'attach', tier: 1, name: 'Spike Row', sockets: ['back', 'rump', 'shoulders'], desc: 'Anything that hits you or that you dash through gets spiked.', fx: { spikes: 1 } },
  att_wings:    { slot: 'attach', tier: 1, name: 'Insect Wings', sockets: ['back', 'shoulders'], desc: 'An extra jump in mid-air. Wing Muscles evolution adds gliding and flight.', fx: { wings: 1 } },
  att_plates:   { slot: 'attach', tier: 1, name: 'Armor Plates', sockets: ['back', 'shoulders', 'rump'], desc: '8% less damage taken.', fx: { armor: 0.08 } },
  att_eyes:     { slot: 'attach', tier: 1, name: 'Extra Eyes', sockets: ['crown', 'back', 'shoulders', 'cheeks'], desc: '+6% critical hits. Deeply unsettling.', fx: { crit: 0.06 } },
  att_glow:     { slot: 'attach', tier: 1, name: 'Glow Organs', sockets: ['crown', 'back', 'shoulders', 'rump', 'cheeks'], desc: 'Dazzling light: bullets, missiles and shells do 20% less damage to you.', fx: { dazzle: 0.2 } },
  att_thorns:   { slot: 'attach', tier: 1, name: 'Thorn Crown', sockets: ['crown', 'shoulders', 'back'], desc: 'Thorny growths: spikes damage, plus a little armor.', fx: { spikes: 0.5, armor: 0.03 } },
  att_quills:   { slot: 'attach', tier: 2, name: 'Quill Coat', sockets: ['back', 'rump'], desc: 'Every ground pound fires a fan of spines into the air.', fx: { quills: 1 } },
  att_eggs:     { slot: 'attach', tier: 2, name: 'Egg Sacs', sockets: ['rump', 'back'], desc: 'Hatch broodlings that hunt for you (2, more with Brood Chambers).', fx: { brood: 2 } },
  att_scythes:  { slot: 'attach', tier: 2, name: 'Mantis Scythes', sockets: ['shoulders'], desc: 'Scything forelimbs: longer reach, +40% damage on big targets.', fx: { claws: 1 } },
  att_claws:    { slot: 'attach', tier: 2, name: 'Crusher Claws', sockets: ['shoulders', 'cheeks'], desc: 'Crab pincers: +15% bite and 2x damage to buildings and vehicles.', fx: { biteDmg: 0.15, ramStructures: 1, structBite: 1 } },
  att_tentacles:{ slot: 'attach', tier: 2, name: 'Tentacles', sockets: ['cheeks', 'shoulders'], desc: 'Grasping tentacles: longer reach, biomass flies to you.', fx: { reach: 0.2, magnet: 1 } },
  att_antlers:  { slot: 'attach', tier: 2, name: 'Antlers', sockets: ['crown'], desc: 'Branching antlers: bigger roar and harder dashes.', fx: { roarSize: 0.4, dashDmg: 0.5 } },
  att_tusks:    { slot: 'attach', tier: 2, name: 'Tusks', sockets: ['cheeks'], desc: 'Bites +20%.', fx: { biteDmg: 0.2 } },
  att_mane:     { slot: 'attach', tier: 2, name: 'Feeler Mane', sockets: ['crown', 'cheeks'], desc: 'Sensitive feelers: frenzy charges 40% faster.', fx: { frenzyGain: 0.4 } },
  att_crystals: { slot: 'attach', tier: 2, name: 'Prism Crystals', sockets: ['back', 'shoulders', 'crown'], desc: '15% chance to shrug off any bullet, shell or missile.', fx: { reflect: 0.15 } },
  att_batwings: { slot: 'attach', tier: 3, name: 'Dragon Wings', sockets: ['back', 'shoulders'], desc: 'Huge leathery wings: two extra jumps and gliding.', fx: { wings: 2, glideAlways: 1 } },
  att_sail:     { slot: 'attach', tier: 3, name: 'Back Sail', sockets: ['back'], desc: 'A tall sail of spines: regenerate health, stronger atomic breath.', fx: { regen: 0.8, beamPower: 0.25 } },
  att_fins:     { slot: 'attach', tier: 3, name: 'Atomic Fins', sockets: ['back', 'rump'], desc: 'Glowing dorsal plates: atomic breath +50%. Unlocks rank 1 of it.', fx: { beamPower: 0.5, beamFree: 1 } },
  att_cannon:   { slot: 'attach', tier: 3, name: 'Bio-Cannon', sockets: ['shoulders', 'back'], desc: 'A living turret that spits acid at the nearest enemy by itself.', fx: { cannon: 1 } },
  att_storm:    { slot: 'attach', tier: 3, name: 'Storm Antennae', sockets: ['crown'], desc: 'Bites arc lightning into nearby enemies (or upgrade Storm Bite).', fx: { storm: 1 } }
};

export const STARTER = { body: 'body_beetle', head: 'head_ant', legs: 'legs_walker', tail: 'tail_none', sockets: {} };
export const partsOf = (slot) => Object.keys(PARTS).filter((id) => PARTS[id].slot === slot);

// colours and patterns unlock permanently as you defeat each different boss (across all runs)
export const COSMETIC_UNLOCKS = [
  { colors: ['#b8322a', '#d4a017'] }, { patterns: ['stripes'] }, { colors: ['#24508f', '#1f8a85'] }, { patterns: ['spots'] },
  { colors: ['#6b2e8a', '#c9a227'] }, { patterns: ['tiger'] }, { colors: ['#151515', '#a9b4bd'] }, { patterns: ['crown'] },
  { colors: ['#5aff3a', '#e8ff3a'] }, { patterns: ['glowstripes'] }, { colors: ['#ff6a1e', '#2a2420'], patterns: ['magma'] }
];
export const EYE_COLORS = ['#e53935', '#f9d71c', '#33e0ff', '#ffffff', '#7cff4f'];
export function unlockedCosmetics(bossesBeaten) {
  const colors = ['#3f8a3a', '#7a4a2a'], patterns = ['none'];
  COSMETIC_UNLOCKS.slice(0, bossesBeaten).forEach((u) => { if (u.colors) colors.push(...u.colors); if (u.patterns) patterns.push(...u.patterns); });
  return { colors, patterns, eyes: EYE_COLORS };
}
