// Ghost card catalogue.
//
// Ghost Stories ships ~55 base ghost cards plus 9 Wu-Feng incarnations. The
// physical cards are individually named and themed; this seed catalogue
// provides a representative spread that exercises every ability and every
// color so the engine can be played and tested end-to-end. Card-exact text and
// imagery can be filled in later without restructuring.
//
// Conventions:
//   - `id` is stable and globally unique
//   - resistance is a Record<TaoColor, number>; zeroes are explicit so the type
//     stays exhaustive
//   - left = on-arrival, center = each Yin phase, right = on-exorcism

import type { GhostCardDef, GhostResistance, TaoColor, WuFengIncarnationId } from './types'

const ZERO: GhostResistance = { red: 0, green: 0, blue: 0, yellow: 0, black: 0 }

function res(parts: Partial<GhostResistance>): GhostResistance {
  return { ...ZERO, ...parts }
}

// ---- 45 base ghosts ----------------------------------------------------

// Distribution targets, modeled on the rulebook spread:
//   - 9 per non-black color, 9 black
//   - resistance 1..3 (mostly 2-3, a few 1s)
//   - mixed left/center/right ability families covering every ability kind

const BASE_GHOSTS: GhostCardDef[] = [
  // ---- RED (9) -------------------------------------------------------
  {
    id: 'ghost-red-1',
    name: 'Hollow Eye',
    color: 'red',
    resistance: res({ red: 2 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [] },
  },
  {
    id: 'ghost-red-2',
    name: 'Crimson Mist',
    color: 'red',
    resistance: res({ red: 1, black: 1 }),
    abilities: { left: [{ kind: 'arriveAddGhost' }], center: [], right: [] },
  },
  {
    id: 'ghost-red-3',
    name: 'Fire Walker',
    color: 'red',
    resistance: res({ red: 2, yellow: 1 }),
    abilities: { left: [], center: [{ kind: 'tormentor' }], right: [{ kind: 'rewardTaoOne' }] },
  },
  {
    id: 'ghost-red-4',
    name: 'Burning Yamen',
    color: 'red',
    resistance: res({ red: 3 }),
    abilities: { left: [], center: [{ kind: 'powerBlocker' }], right: [{ kind: 'rewardQiOrYinYang' }] },
  },
  {
    id: 'ghost-red-5',
    name: 'Iron Maw',
    color: 'red',
    resistance: res({ red: 1 }),
    abilities: { left: [{ kind: 'arriveLoseQi' }], center: [], right: [] },
  },
  {
    id: 'ghost-red-6',
    name: 'Vermilion Lash',
    color: 'red',
    resistance: res({ red: 2 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [{ kind: 'rewardTaoOne' }] },
  },
  {
    id: 'ghost-red-7',
    name: 'Boiling Brood',
    color: 'red',
    resistance: res({ red: 2, green: 1 }),
    abilities: { left: [], center: [], right: [{ kind: 'rewardTaoTwo' }] },
  },
  {
    id: 'ghost-red-8',
    name: 'Throneless King',
    color: 'red',
    resistance: res({ red: 3 }),
    abilities: { left: [{ kind: 'arriveHauntTile' }], center: [], right: [] },
  },
  {
    id: 'ghost-red-9',
    name: 'Cinder Knight',
    color: 'red',
    resistance: res({ red: 2 }),
    abilities: { left: [], center: [{ kind: 'tormentor' }], right: [] },
  },

  // ---- GREEN (9) -----------------------------------------------------
  {
    id: 'ghost-green-1',
    name: 'Moss Veil',
    color: 'green',
    resistance: res({ green: 2 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [] },
  },
  {
    id: 'ghost-green-2',
    name: 'Twisted Pine',
    color: 'green',
    resistance: res({ green: 1, yellow: 1 }),
    abilities: { left: [{ kind: 'arriveAddGhost' }], center: [], right: [] },
  },
  {
    id: 'ghost-green-3',
    name: 'Bramble Snare',
    color: 'green',
    resistance: res({ green: 2, red: 1 }),
    abilities: { left: [], center: [{ kind: 'dieCaptor' }], right: [{ kind: 'rewardTaoOne' }] },
  },
  {
    id: 'ghost-green-4',
    name: 'Mold Lord',
    color: 'green',
    resistance: res({ green: 3 }),
    abilities: { left: [], center: [{ kind: 'taoBlocker' }], right: [{ kind: 'rewardQiOrYinYang' }] },
  },
  {
    id: 'ghost-green-5',
    name: 'Rotwood Crawler',
    color: 'green',
    resistance: res({ green: 1 }),
    abilities: { left: [{ kind: 'arriveLoseQi' }], center: [], right: [] },
  },
  {
    id: 'ghost-green-6',
    name: 'Vine Witch',
    color: 'green',
    resistance: res({ green: 2 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [{ kind: 'rewardTaoOne' }] },
  },
  {
    id: 'ghost-green-7',
    name: 'Hexed Sapling',
    color: 'green',
    resistance: res({ green: 2, blue: 1 }),
    abilities: { left: [], center: [], right: [{ kind: 'rewardTaoTwo' }] },
  },
  {
    id: 'ghost-green-8',
    name: 'Forest of Eyes',
    color: 'green',
    resistance: res({ green: 3 }),
    abilities: { left: [{ kind: 'arriveHauntTile' }], center: [], right: [] },
  },
  {
    id: 'ghost-green-9',
    name: 'Shroud Walker',
    color: 'green',
    resistance: res({ green: 2 }),
    abilities: { left: [], center: [{ kind: 'tormentor' }], right: [{ kind: 'rewardLoseTao' }] },
  },

  // ---- BLUE (9) ------------------------------------------------------
  {
    id: 'ghost-blue-1',
    name: 'Cold Current',
    color: 'blue',
    resistance: res({ blue: 2 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [] },
  },
  {
    id: 'ghost-blue-2',
    name: 'Drowned Maiden',
    color: 'blue',
    resistance: res({ blue: 1, black: 1 }),
    abilities: { left: [{ kind: 'arriveAddGhost' }], center: [], right: [] },
  },
  {
    id: 'ghost-blue-3',
    name: 'River Choker',
    color: 'blue',
    resistance: res({ blue: 2, green: 1 }),
    abilities: { left: [], center: [{ kind: 'powerBlocker' }], right: [{ kind: 'rewardTaoOne' }] },
  },
  {
    id: 'ghost-blue-4',
    name: 'Tidewraith',
    color: 'blue',
    resistance: res({ blue: 3 }),
    abilities: { left: [], center: [{ kind: 'diceImmune' }], right: [] },
  },
  {
    id: 'ghost-blue-5',
    name: 'Salt Eater',
    color: 'blue',
    resistance: res({ blue: 1 }),
    abilities: { left: [{ kind: 'arriveLoseQi' }], center: [], right: [] },
  },
  {
    id: 'ghost-blue-6',
    name: 'Lantern Drifter',
    color: 'blue',
    resistance: res({ blue: 2 }),
    abilities: { left: [], center: [{ kind: 'tormentor' }], right: [{ kind: 'rewardTaoOne' }] },
  },
  {
    id: 'ghost-blue-7',
    name: 'Glass Carp',
    color: 'blue',
    resistance: res({ blue: 2, yellow: 1 }),
    abilities: { left: [], center: [], right: [{ kind: 'rewardTaoTwo' }] },
  },
  {
    id: 'ghost-blue-8',
    name: 'Flood Speaker',
    color: 'blue',
    resistance: res({ blue: 3 }),
    abilities: { left: [{ kind: 'arriveHauntTile' }], center: [], right: [] },
  },
  {
    id: 'ghost-blue-9',
    name: 'Black Wave',
    color: 'blue',
    resistance: res({ blue: 2 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [{ kind: 'rewardQiOrYinYang' }] },
  },

  // ---- YELLOW (9) ----------------------------------------------------
  {
    id: 'ghost-yellow-1',
    name: 'Reed Whisper',
    color: 'yellow',
    resistance: res({ yellow: 2 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [] },
  },
  {
    id: 'ghost-yellow-2',
    name: 'Mire Daughter',
    color: 'yellow',
    resistance: res({ yellow: 1, red: 1 }),
    abilities: { left: [{ kind: 'arriveAddGhost' }], center: [], right: [] },
  },
  {
    id: 'ghost-yellow-3',
    name: 'Bog Singer',
    color: 'yellow',
    resistance: res({ yellow: 2, blue: 1 }),
    abilities: { left: [], center: [{ kind: 'tormentor' }], right: [{ kind: 'rewardTaoOne' }] },
  },
  {
    id: 'ghost-yellow-4',
    name: 'Marsh King',
    color: 'yellow',
    resistance: res({ yellow: 3 }),
    abilities: { left: [], center: [{ kind: 'powerBlocker' }], right: [{ kind: 'rewardQiOrYinYang' }] },
  },
  {
    id: 'ghost-yellow-5',
    name: 'Rust Cricket',
    color: 'yellow',
    resistance: res({ yellow: 1 }),
    abilities: { left: [{ kind: 'arriveLoseQi' }], center: [], right: [] },
  },
  {
    id: 'ghost-yellow-6',
    name: 'Brass Crone',
    color: 'yellow',
    resistance: res({ yellow: 2 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [{ kind: 'rewardTaoOne' }] },
  },
  {
    id: 'ghost-yellow-7',
    name: 'Stitched Lord',
    color: 'yellow',
    resistance: res({ yellow: 2, green: 1 }),
    abilities: { left: [], center: [], right: [{ kind: 'rewardTaoTwo' }] },
  },
  {
    id: 'ghost-yellow-8',
    name: 'Carrion Choir',
    color: 'yellow',
    resistance: res({ yellow: 3 }),
    abilities: { left: [{ kind: 'arriveHauntTile' }], center: [], right: [] },
  },
  {
    id: 'ghost-yellow-9',
    name: 'Wax Mother',
    color: 'yellow',
    resistance: res({ yellow: 2 }),
    abilities: { left: [], center: [{ kind: 'tormentor' }], right: [{ kind: 'rewardLoseTao' }] },
  },

  // ---- BLACK (9) — multi-color resistances, harder fights ------------
  {
    id: 'ghost-black-1',
    name: 'Shadow Maw',
    color: 'black',
    resistance: res({ black: 2 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [] },
  },
  {
    id: 'ghost-black-2',
    name: 'Soot Spider',
    color: 'black',
    resistance: res({ red: 1, blue: 1 }),
    abilities: { left: [{ kind: 'arriveAddGhost' }], center: [], right: [] },
  },
  {
    id: 'ghost-black-3',
    name: 'Coal Eater',
    color: 'black',
    resistance: res({ green: 1, yellow: 1, black: 1 }),
    abilities: { left: [], center: [{ kind: 'tormentor' }], right: [{ kind: 'rewardTaoTwo' }] },
  },
  {
    id: 'ghost-black-4',
    name: 'Bone Choir',
    color: 'black',
    resistance: res({ red: 1, blue: 1, green: 1 }),
    abilities: { left: [], center: [{ kind: 'dieCaptor' }], right: [] },
  },
  {
    id: 'ghost-black-5',
    name: 'Silent Reaper',
    color: 'black',
    resistance: res({ black: 1 }),
    abilities: { left: [{ kind: 'arriveLoseQi' }], center: [], right: [] },
  },
  {
    id: 'ghost-black-6',
    name: 'Ash Empress',
    color: 'black',
    resistance: res({ red: 1, yellow: 1 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [{ kind: 'rewardQiOrYinYang' }] },
  },
  {
    id: 'ghost-black-7',
    name: 'Onyx Page',
    color: 'black',
    resistance: res({ green: 1, blue: 1 }),
    abilities: { left: [], center: [], right: [{ kind: 'rewardTaoTwo' }] },
  },
  {
    id: 'ghost-black-8',
    name: 'Pit Mother',
    color: 'black',
    resistance: res({ black: 2, red: 1 }),
    abilities: { left: [{ kind: 'arriveHauntTile' }], center: [], right: [] },
  },
  {
    id: 'ghost-black-9',
    name: 'Hollow Crown',
    color: 'black',
    resistance: res({ red: 1, green: 1, blue: 1, yellow: 1 }),
    abilities: { left: [], center: [{ kind: 'haunter' }], right: [{ kind: 'rewardTaoOne' }] },
  },
]

// ---- 9 Wu-Feng incarnations -------------------------------------------

const INCARNATIONS: GhostCardDef[] = [
  {
    id: 'incarnation-howlingNightmare',
    name: 'Howling Nightmare',
    color: 'red',
    resistance: res({ red: 3, black: 1 }),
    abilities: {
      left: [],
      center: [{ kind: 'haunter' }],
      right: [{ kind: 'incarnationReturnQiYinYang' }],
    },
    isIncarnation: true,
    incarnationId: 'howlingNightmare',
  },
  {
    id: 'incarnation-uncatchable',
    name: 'Uncatchable',
    color: 'green',
    resistance: res({ green: 3, black: 1 }),
    abilities: {
      left: [],
      center: [{ kind: 'haunter' }],
      right: [{ kind: 'incarnationReturnQiYinYang' }],
    },
    isIncarnation: true,
    incarnationId: 'uncatchable',
  },
  {
    id: 'incarnation-deathArmy',
    name: 'Death Army',
    color: 'blue',
    resistance: res({ blue: 3, black: 1 }),
    abilities: {
      left: [],
      // Engine special-cases: also rolls curse die on the active player each Yin.
      center: [{ kind: 'tormentor' }],
      right: [
        { kind: 'rewardCurseDie' },
        { kind: 'incarnationReturnQiYinYang' },
      ],
    },
    isIncarnation: true,
    incarnationId: 'deathArmy',
  },
  {
    id: 'incarnation-forgottenOnes',
    name: 'Forgotten Ones',
    color: 'yellow',
    resistance: res({ yellow: 3, black: 1 }),
    abilities: {
      left: [],
      // All Taoist powers disabled while alive — handled in engine.
      center: [{ kind: 'powerBlocker' }],
      right: [{ kind: 'incarnationReturnQiYinYang' }],
    },
    isIncarnation: true,
    incarnationId: 'forgottenOnes',
  },
  {
    id: 'incarnation-bonecracker',
    name: 'Bonecracker',
    color: 'black',
    resistance: res({ black: 3, red: 1 }),
    abilities: {
      // On arrival every player discards a Tao token — handled in engine.
      left: [{ kind: 'arriveLoseQi', params: { amount: 0 } }],
      center: [],
      right: [{ kind: 'incarnationReturnQiYinYang' }],
    },
    isIncarnation: true,
    incarnationId: 'bonecracker',
  },
  {
    id: 'incarnation-darkMistress',
    name: 'Dark Mistress',
    color: 'red',
    resistance: res({ red: 4 }),
    abilities: {
      left: [],
      // Disables Tao token spending entirely (Inactive Tao marker).
      center: [{ kind: 'taoBlocker' }],
      right: [{ kind: 'incarnationReturnQiYinYang' }],
    },
    isIncarnation: true,
    incarnationId: 'darkMistress',
  },
  {
    id: 'incarnation-creepingHorror',
    name: 'Creeping Horror',
    color: 'green',
    resistance: res({ green: 4 }),
    abilities: {
      left: [],
      // Captures one Tao die on arrival; exorcisms use 2 dice instead of 3.
      center: [{ kind: 'dieCaptor', params: { count: 1 } }],
      right: [{ kind: 'incarnationReturnQiYinYang' }],
    },
    isIncarnation: true,
    incarnationId: 'creepingHorror',
  },
  {
    id: 'incarnation-vampireLord',
    name: 'Vampire Lord',
    color: 'blue',
    resistance: res({ blue: 4 }),
    abilities: {
      left: [],
      center: [{ kind: 'haunter' }],
      right: [{ kind: 'incarnationReturnQiYinYang' }],
    },
    isIncarnation: true,
    incarnationId: 'vampireLord',
  },
  {
    id: 'incarnation-hopeKiller',
    name: 'Hope Killer',
    color: 'black',
    resistance: res({ red: 2, green: 2, blue: 2, yellow: 2 }),
    abilities: {
      left: [],
      center: [],
      right: [
        { kind: 'rewardCurseDie' },
        { kind: 'incarnationReturnQiYinYang' },
      ],
    },
    isIncarnation: true,
    incarnationId: 'hopeKiller',
  },
]

const ALL: Map<string, GhostCardDef> = new Map()
for (const g of [...BASE_GHOSTS, ...INCARNATIONS]) {
  if (ALL.has(g.id)) throw new Error(`duplicate ghost id: ${g.id}`)
  ALL.set(g.id, g)
}

export function getGhostCard(id: string): GhostCardDef {
  const card = ALL.get(id)
  if (!card) throw new Error(`unknown ghost card id: ${id}`)
  return card
}

export function allBaseGhostIds(): string[] {
  return BASE_GHOSTS.map((g) => g.id)
}

export function incarnationCardId(id: WuFengIncarnationId): string {
  const card = INCARNATIONS.find((c) => c.incarnationId === id)
  if (!card) throw new Error(`unknown incarnation id: ${id}`)
  return card.id
}

export function allIncarnationIds(): WuFengIncarnationId[] {
  return INCARNATIONS.map((c) => c.incarnationId!).filter(Boolean)
}

/** Look up the canonical color for a tao color (identity — exported for symmetry). */
export function ghostColors(): TaoColor[] {
  return ['red', 'green', 'blue', 'yellow', 'black']
}
