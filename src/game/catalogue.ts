// The ghost deck.
//
// Rules summary: "Ghosts are characterized by Color, Resistance, Abilities,
// and sometimes a Reward." An ordinary ghost's resistance is a number of faces
// of its own colour; only some incarnations of Wu-Feng need several colours.
// The base game has 45 ghosts (9 per colour) and 10 incarnations.
//
// The printed cards' names and exact stats aren't in the rules summary, so
// this is an original deck with the same structure: every ability icon from
// the reference sheet appears, spread across the colours. Incarnation rules
// follow the summary's "Powers of the Incarnations" text.

import type { Ability, AbilityKind, GhostCard, IncarnationId, TaoColor } from './types'

const a = (kind: AbilityKind, group = false): Ability => (group ? { kind, group } : { kind })

function ghost(
  id: string,
  name: string,
  color: TaoColor,
  resistance: number,
  left: Ability[],
  center: Ability[],
  right: Ability[],
  expansion?: GhostCard['expansion'],
): GhostCard {
  return { id, name, color, resistance: { [color]: resistance }, left, center, right, ...(expansion ? { expansion } : {}) }
}

// Each colour follows the same spread of nine ghosts; its "special" centre
// ability varies by colour.
type Template = (color: TaoColor, n: number, name: string, special: AbilityKind) => GhostCard
const COLOR_TEMPLATES: Template[] = [
  (c, n, name) => ghost(`${c}-${n}`, name, c, 1, [], [], [a('rewardTao1')]),
  (c, n, name) => ghost(`${c}-${n}`, name, c, 1, [a('addGhost')], [], []),
  (c, n, name) => ghost(`${c}-${n}`, name, c, 2, [], [a('tormentor')], [a('curse')]),
  (c, n, name) => ghost(`${c}-${n}`, name, c, 2, [], [a('haunter')], [a('rewardQiOrYinYang')]),
  (c, n, name) => ghost(`${c}-${n}`, name, c, 2, [a('loseQi')], [], [a('rewardTao1')]),
  (c, n, name) => ghost(`${c}-${n}`, name, c, 2, [], [], [a('curse')]),
  (c, n, name, special) => ghost(`${c}-${n}`, name, c, 3, [], [a(special)], [a('rewardTao2')]),
  (c, n, name) => ghost(`${c}-${n}`, name, c, 3, [a('haunterDirect')], [a('haunter')], [a('rewardQiOrYinYang')]),
  (c, n, name) => ghost(`${c}-${n}`, name, c, 3, [a('hauntTile')], [], [a('curse'), a('rewardTao2')]),
]

const COLOR_NAMES: Record<'red' | 'green' | 'blue' | 'yellow', { special: AbilityKind; names: string[] }> = {
  // Mountain ghosts.
  red: {
    special: 'powerBlocker',
    names: ['Hollow Eye', 'Crimson Mist', 'Fire Walker', 'Vermilion Lash', 'Iron Maw', 'Throneless King', 'Burning Yamen', 'Cinder Knight', 'Boiling Brood'],
  },
  // Forest ghosts.
  green: {
    special: 'dieCaptor',
    names: ['Moss Veil', 'Twisted Pine', 'Shroud Walker', 'Vine Witch', 'Rotwood Crawler', 'Forest of Eyes', 'Bramble Snare', 'Mold Lord', 'Hexed Sapling'],
  },
  // River ghosts.
  blue: {
    special: 'diceImmune',
    names: ['Cold Current', 'Drowned Maiden', 'Lantern Drifter', 'Black Wave', 'Salt Eater', 'Flood Speaker', 'Tidewraith', 'River Choker', 'Glass Carp'],
  },
  // Marsh ghosts.
  yellow: {
    special: 'taoBlocker',
    names: ['Reed Whisper', 'Mire Daughter', 'Bog Singer', 'Brass Crone', 'Rust Cricket', 'Carrion Choir', 'Marsh King', 'Stitched Lord', 'Wax Mother'],
  },
}

const BASE_COLORED: GhostCard[] = (Object.keys(COLOR_NAMES) as Array<keyof typeof COLOR_NAMES>).flatMap((c) =>
  COLOR_TEMPLATES.map((t, i) => t(c, i + 1, COLOR_NAMES[c].names[i]!, COLOR_NAMES[c].special)),
)

// Black ghosts go on the active player's board; they carry the nastier abilities.
const BASE_BLACK: GhostCard[] = [
  ghost('black-1', 'Shadow Maw', 'black', 1, [], [a('tormentor')], [a('curse')]),
  ghost('black-2', 'Soot Spider', 'black', 2, [a('addGhost')], [a('haunter')], []),
  ghost('black-3', 'Silent Reaper', 'black', 2, [a('loseQi', true)], [], [a('rewardQiOrYinYang')]),
  ghost('black-4', 'Onyx Page', 'black', 2, [], [a('taoBlocker')], [a('rewardTao1')]),
  ghost('black-5', 'Bone Choir', 'black', 2, [], [a('dieCaptor')], [a('loseTao')]),
  ghost('black-6', 'Pit Mother', 'black', 3, [a('hauntTile')], [a('tormentor')], [a('curse')]),
  ghost('black-7', 'Ash Empress', 'black', 3, [], [a('powerBlocker', true)], [a('rewardTao2')]),
  ghost('black-8', 'Coal Eater', 'black', 3, [a('haunterDirect')], [a('haunter')], [a('loseTao'), a('rewardQiOrYinYang')]),
  ghost('black-9', 'Hollow Crown', 'black', 3, [], [a('diceImmune')], [a('rewardTao2')]),
]

// White Moon adds 10 ghosts: the Devourers, the Black Widow (Tao blocker) and
// the Shapeless Evil (haunts a tile). Some reward moon crystals.
const WHITE_MOON: GhostCard[] = [
  ghost('wm-1', 'Gnawing Maw', 'red', 2, [], [a('devourer')], [a('rewardCrystal')], 'whiteMoon'),
  ghost('wm-2', 'Bone Whisperer', 'green', 2, [], [a('devourer')], [], 'whiteMoon'),
  ghost('wm-3', 'Tide Eater', 'blue', 2, [], [a('devourer')], [a('rewardCrystal')], 'whiteMoon'),
  ghost('wm-4', 'Marsh Devourer', 'yellow', 2, [], [a('devourer')], [], 'whiteMoon'),
  ghost('wm-5', 'Hollow Reaper', 'black', 3, [], [a('devourer'), a('haunter')], [a('rewardCrystal')], 'whiteMoon'),
  ghost('wm-6', 'Wind Caller', 'red', 1, [a('hauntTile')], [], [a('rewardCrystal')], 'whiteMoon'),
  ghost('wm-7', 'Black Widow', 'black', 3, [], [a('taoBlocker')], [a('rewardTao2')], 'whiteMoon'),
  ghost('wm-8', 'Lantern Cult', 'green', 3, [], [a('devourer')], [a('rewardCrystal')], 'whiteMoon'),
  ghost('wm-9', 'Shapeless Evil', 'yellow', 2, [a('hauntTile')], [a('haunter')], [a('curse')], 'whiteMoon'),
  ghost('wm-10', 'Pale Hunger', 'blue', 3, [], [a('devourer'), a('tormentor')], [a('curse'), a('rewardCrystal')], 'whiteMoon'),
]

// Black Secret adds 10 ghosts to the deck.
const BLACK_SECRET: GhostCard[] = [
  ghost('bs-1', 'Catacomb Rat King', 'red', 1, [a('addGhost')], [], [], 'blackSecret'),
  ghost('bs-2', 'Lamp Thief', 'red', 2, [], [a('tormentor')], [a('rewardTao1')], 'blackSecret'),
  ghost('bs-3', 'Root Strangler', 'green', 2, [a('loseQi')], [a('haunter')], [a('rewardQiOrYinYang')], 'blackSecret'),
  ghost('bs-4', 'Mossback', 'green', 3, [], [], [a('curse'), a('rewardTao2')], 'blackSecret'),
  ghost('bs-5', 'Well Dweller', 'blue', 2, [a('hauntTile')], [], [a('rewardTao1')], 'blackSecret'),
  ghost('bs-6', 'Ink Serpent', 'blue', 3, [], [a('dieCaptor')], [a('rewardTao2')], 'blackSecret'),
  ghost('bs-7', 'Tomb Bride', 'yellow', 2, [], [a('haunter')], [a('curse')], 'blackSecret'),
  ghost('bs-8', 'Ossuary Bell', 'yellow', 3, [a('addGhost')], [a('tormentor')], [a('rewardTao2')], 'blackSecret'),
  ghost('bs-9', 'Grave Herald', 'black', 2, [a('loseQi')], [a('tormentor')], [a('curse')], 'blackSecret'),
  ghost('bs-10', 'Ninth Lantern', 'black', 3, [a('haunterDirect')], [a('haunter')], [a('rewardQiOrYinYang')], 'blackSecret'),
]

function incarnation(
  id: IncarnationId,
  name: string,
  color: TaoColor,
  resistance: Partial<Record<TaoColor, number>>,
  center: Ability[],
  right: Ability[],
  text: string,
): GhostCard {
  return { id: `wf-${id}`, name, color, resistance, left: [], center, right, incarnation: id, text }
}

const REWARD = a('incarnationReward')

const INCARNATIONS: GhostCard[] = [
  incarnation('howlingNightmare', 'Howling Nightmare', 'red', { red: 4 }, [], [REWARD],
    'Can only be exorcised while the ghost space facing it on the opposite board is empty.'),
  incarnation('uncatchable', 'Uncatchable', 'green', { green: 3 }, [], [REWARD],
    'Can only be exorcised on a space with a Buddha (move it onto one, or have it arrive on one). The only incarnation affected by Buddhas.'),
  incarnation('deathArmy', 'Death Army', 'black', { black: 4 }, [], [a('curse'), REWARD],
    'While in play, the active player rolls the curse die every turn (whatever board is active), and again when it is destroyed.'),
  incarnation('forgottenOnes', 'Forgotten Ones', 'yellow', { yellow: 4 }, [], [REWARD],
    'While in play, no Taoist can use their power, nor power tokens.'),
  incarnation('bonecracker', 'Bonecracker', 'blue', { blue: 4 }, [], [REWARD],
    'On arrival every Taoist discards a Tao token; its host discards another at the start of each of its Yin phases.'),
  incarnation('darkMistress', 'Dark Mistress', 'black', { black: 4 }, [a('taoBlocker')], [REWARD],
    'While in play, Tao tokens cannot be used (the Circle of Prayer still works).'),
  incarnation('creepingHorror', 'Creeping Horror', 'green', { green: 4 }, [a('dieCaptor')], [REWARD],
    'Holds a Tao die captive until destroyed: exorcisms roll one die fewer.'),
  incarnation('vampireLord', 'Vampire Lord', 'red', { red: 4 }, [a('haunter')], [REWARD],
    'A Haunter with a resistance of 4.'),
  incarnation('hopeKiller', 'Hope Killer', 'black', { red: 2, blue: 2, green: 2, yellow: 2 }, [], [a('curse'), REWARD],
    'Resistance 8: two of each colour. Roll the curse die when it is destroyed.'),
  incarnation('nameless', 'Nameless', 'black', { red: 1, blue: 1, green: 1, yellow: 1, black: 1 }, [], [REWARD],
    'On arrival, discards the Tao token on the Circle of Prayer. While in play, white die faces are not wild.'),
]

/** Black Secret skeleton tokens: resistance 1 in the colour of their board, no abilities. */
export const SKELETON_IDS = ['skeleton', 'bones'] as const

const ALL = new Map<string, GhostCard>()
for (const card of [...BASE_COLORED, ...BASE_BLACK, ...WHITE_MOON, ...BLACK_SECRET, ...INCARNATIONS]) {
  if (ALL.has(card.id)) throw new Error(`duplicate ghost id ${card.id}`)
  ALL.set(card.id, card)
}

/** Black Secret summon cards sit in the deck in place of incarnations. */
export function isSummonCard(id: string): boolean {
  return id.startsWith('summon-')
}

export function isSkeleton(id: string): boolean {
  return id === 'skeleton' || id === 'bones'
}

export function getCard(id: string): GhostCard {
  const card = ALL.get(id)
  if (card) return card
  if (isSkeleton(id)) {
    // Colour depends on the board; callers use skeletonCard(board) for that.
    return { id, name: id === 'bones' ? 'Bones' : 'Skeleton', color: 'black', resistance: { black: 1 }, left: [], center: [], right: [] }
  }
  if (isSummonCard(id)) {
    return { id, name: 'Summon Wu-Feng', color: 'black', resistance: {}, left: [], center: [], right: [] }
  }
  throw new Error(`unknown ghost card ${id}`)
}

/** A card as it sits on `board` (skeletons take the board's colour). */
export function cardOnBoard(id: string, board: TaoColor): GhostCard {
  if (isSkeleton(id)) return { ...getCard(id), color: board, resistance: { [board]: 1 } }
  return getCard(id)
}

export const baseGhostIds = (): string[] => [...BASE_COLORED, ...BASE_BLACK].map((c) => c.id)
export const whiteMoonGhostIds = (): string[] => WHITE_MOON.map((c) => c.id)
export const blackSecretGhostIds = (): string[] => BLACK_SECRET.map((c) => c.id)
export const incarnationIds = (): string[] => INCARNATIONS.map((c) => c.id)
export const allCards = (): GhostCard[] => [...ALL.values()]

export function totalResistance(card: GhostCard): number {
  return Object.values(card.resistance).reduce((n, v) => n + (v ?? 0), 0)
}
