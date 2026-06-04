// Initial state factory. Translates a GameConfig into a fully populated
// GameState ready for the first Yin phase.
//
// Determinism: everything random (village shuffle, deck shuffle, incarnation
// selection, board/side assignment) routes through the seeded RNG so two peers
// with the same config + seed reduce identically.

import { allBaseGhostIds, allWhiteMoonGhostIds, incarnationCardId, allIncarnationIds } from './ghostCatalogue'
import { nextInt, seedRng, shuffle, type RngState } from './rng'
import {
  ALL_VILLAGE_TILE_KINDS,
  TAOIST_POWERS_BY_COLOR,
  VILLAGER_FAMILIES_BY_SIZE,
  WHITE_MOON_BASIC_TILE_SET,
  type BoardColor,
  type BoardSide,
  type Difficulty,
  type GameConfig,
  type GameState,
  type PlayerBoard,
  type TaoColor,
  type TaoistColor,
  type TaoistState,
  type VillageTile,
  type VillageTileId,
  type VillagerToken,
  type WhiteMoonState,
  type WuFengIncarnationId,
} from './types'

// Each color's board sits on a fixed side of the village in our layout.
// Matches the physical game's canonical arrangement.
export const BOARD_SIDE: Record<BoardColor, BoardSide> = {
  red: 'north',
  blue: 'east',
  green: 'south',
  yellow: 'west',
}

export const ALL_TAOIST_COLORS: TaoistColor[] = ['red', 'blue', 'green', 'yellow']

const TURN_ORDER: TaoistColor[] = ['red', 'blue', 'green', 'yellow']

const STARTING_QI_BY_DIFFICULTY: Record<Difficulty, number> = {
  initiation: 4,
  normal: 3,
  nightmare: 3,
  hell: 3,
}

const STARTING_YIN_YANG: Record<Difficulty, boolean> = {
  initiation: true,
  normal: true,
  nightmare: true,
  hell: false,
}

// Tao supply per color (the game ships ~25 tokens per color; tighten if needed).
const TAO_SUPPLY_INITIAL: Record<TaoColor, number> = {
  red: 25,
  green: 25,
  blue: 25,
  yellow: 25,
  black: 25,
}

const tileId = (col: number, row: number): VillageTileId => `tile-${col}-${row}` as VillageTileId

function buildVillage(
  rng: RngState,
  tilePool: typeof ALL_VILLAGE_TILE_KINDS,
): { rng: RngState; village: VillageTile[] } {
  // Randomize the 9 tile kinds across the 3x3.
  const [rng2, kinds] = shuffle(rng, tilePool)
  const village: VillageTile[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col
      village.push({
        id: tileId(col, row),
        coord: { col: col as 0 | 1 | 2, row: row as 0 | 1 | 2 },
        kind: kinds[idx],
        haunted: false,
        circleToken: kinds[idx] === 'circleOfPrayer' ? null : undefined,
      })
    }
  }
  return { rng: rng2, village }
}

function buildBoards(rng: RngState, difficulty: Difficulty): { rng: RngState; boards: Record<BoardColor, PlayerBoard> } {
  // Pick which side (which power) is active on each board, independently.
  let s = rng
  const boards = {} as Record<BoardColor, PlayerBoard>
  for (const color of ALL_TAOIST_COLORS) {
    const [ns, sideIdx] = nextInt(s, 2)
    s = ns
    const [powerA, powerB] = TAOIST_POWERS_BY_COLOR[color]
    boards[color] = {
      color,
      side: BOARD_SIDE[color],
      activePowerId: sideIdx === 0 ? powerA : powerB,
      ghostSpaces: [null, null, null],
      buddhaSpaces: [false, false, false],
      powerActive: true,
      possessed: false,
      // Neutral-board Qi pool is set when a seat is detected as neutral
      // downstream. Default to player Qi here; createGame overwrites for
      // possessed/neutral seats.
      qi: STARTING_QI_BY_DIFFICULTY[difficulty],
    }
  }
  return { rng: s, boards }
}

function buildTaoists(
  config: GameConfig,
  centralTileId: VillageTileId,
): Record<TaoistColor, TaoistState> {
  const out = {} as Record<TaoistColor, TaoistState>
  const startQi = STARTING_QI_BY_DIFFICULTY[config.difficulty]
  const startYinYang = STARTING_YIN_YANG[config.difficulty]
  const playerCount = Object.values(config.seats).filter(Boolean).length
  const isSolo = playerCount === 1

  for (const color of ALL_TAOIST_COLORS) {
    const seat = config.seats[color]
    const isNeutral = !seat
    const isAi = seat === 'ai'
    const isHuman = seat === 'human'

    // Starting Tao bag.
    //  Standard: 1 Tao of own color (+ 1 black on Initiation).
    //  Solo (rulebook): 1 Tao of EACH color (+ black on Initiation) and 3 power tokens.
    const tao: Record<TaoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0, black: 0 }
    if (!isNeutral) {
      if (isSolo) {
        // Solo rulebook bonus: 1 Tao of each color, plus black on Initiation.
        tao.red = 1
        tao.green = 1
        tao.blue = 1
        tao.yellow = 1
        if (config.difficulty === 'initiation') tao.black = 1
      } else {
        const ownTao: TaoColor = color // TaoistColor is a subset of TaoColor
        tao[ownTao] = 1
        if (config.difficulty === 'initiation') tao.black = 1
      }
    }

    out[color] = {
      id: `taoist-${color}`,
      color,
      isHuman,
      isAi,
      isNeutral,
      alive: !isNeutral, // neutral seats have no live taoist
      qi: isNeutral
        ? 3 // neutral board's Qi pool (the rulebook says 3)
        : startQi,
      tao,
      yinYang: !isNeutral && startYinYang,
      buddhasInHand: 0,
      // Solo: 3 power tokens up front. Multiplayer: 1 power token (rulebook §
      // "1, 2 or 3 Players": "give each player … a power token"). For 4
      // players the base rules don't grant power tokens — preserve 0 for 4p
      // and grant 1 to non-solo seats only when there's at least one neutral
      // board (i.e. <4 players).
      powerTokens: isNeutral ? 0 : isSolo ? 3 : (playerCount < 4 ? 1 : 0),
      tile: isNeutral ? null : centralTileId,
    }
  }
  return out
}

function findCentralTile(village: VillageTile[]): VillageTileId {
  const t = village.find((v) => v.coord.col === 1 && v.coord.row === 1)
  if (!t) throw new Error('village layout missing center tile')
  return t.id
}

// Build the ghost deck. Rules:
//  - Shuffle all base ghosts (subset of the catalogue's 45).
//  - White Moon: add the 10 expansion ghost cards, then remove 10 random cards
//    (1-3p: remove additional 5/10/15 per missing player as in the rulebook).
//  - 1-3 player mode (base only): remove 5 cards per missing player (unseen).
//  - Insert N incarnations (chosen by difficulty) into the bottom region:
//      - Normal/Initiation: 1 incarnation, exactly 10 cards from the bottom.
//      - Nightmare/Hell: 4 incarnations (3 if 1-2 players), spaced every 10
//        cards from the bottom.
function buildDeck(
  rng: RngState,
  config: GameConfig,
): { rng: RngState; deck: string[] } {
  const playerCount = Object.values(config.seats).filter(Boolean).length
  const missing = 4 - playerCount
  const whiteMoon = config.expansions?.includes('whiteMoon') ?? false

  // Pick incarnations (shuffle, then take N).
  const [r1, allIncs] = shuffle(rng, allIncarnationIds())
  const wantIncs = incarnationCount(config.difficulty, playerCount)
  const chosen: WuFengIncarnationId[] = allIncs.slice(0, wantIncs)

  // Shuffle base ghosts, plus White Moon ghosts if active.
  const pool = whiteMoon ? [...allBaseGhostIds(), ...allWhiteMoonGhostIds()] : allBaseGhostIds()
  const [r2, shuffled] = shuffle(r1, pool)

  // White Moon trims:
  //   - Remove 10 random cards (per rulebook setup).
  //   - Then 1/2/3p: remove an extra 5 per missing player just like base.
  // Base mode keeps the 5-per-missing-player trim.
  let trimAmount: number
  if (whiteMoon) {
    trimAmount = 10 + 5 * missing
  } else {
    trimAmount = 5 * missing
  }
  const trimmed = shuffled.slice(0, shuffled.length - trimAmount)

  // Insert incarnations at positions 10, 20, 30, ... from the bottom.
  // Top of deck = index 0 (we draw from index 0).
  // "10 cards from bottom" = total - 10 from top. With multiple incarnations the
  // rule says every 10 cards: positions bottom-10, bottom-20, bottom-30, etc.
  const deck = trimmed.slice()
  for (let i = 0; i < chosen.length; i++) {
    const fromBottom = 10 * (i + 1)
    const insertAt = Math.max(0, deck.length - fromBottom + 1)
    deck.splice(insertAt, 0, incarnationCardId(chosen[i]))
  }

  return { rng: r2, deck }
}

function incarnationCount(difficulty: Difficulty, playerCount: number): number {
  if (difficulty === 'initiation' || difficulty === 'normal') return 1
  // Nightmare / Hell: 4 normally, 3 only for 1-2 player games per rulebook.
  return playerCount <= 2 ? 3 : 4
}

export function createGame(config: GameConfig): GameState {
  if (Object.values(config.seats).filter(Boolean).length < 1) {
    throw new Error('createGame: at least one seat must be human or ai')
  }

  const whiteMoon = config.expansions?.includes('whiteMoon') ?? false
  const seed = config.rngSeed ?? Math.floor(Math.random() * 0x7fffffff)
  let rng = seedRng(seed)

  // White Moon basic game replaces Night Watchman with Kung-Fu School.
  const tilePool = whiteMoon ? WHITE_MOON_BASIC_TILE_SET : ALL_VILLAGE_TILE_KINDS
  const v = buildVillage(rng, tilePool)
  rng = v.rng

  const central = findCentralTile(v.village)

  // White Moon: portal sits on the central tile (rulebook default), and 8
  // stacks of 3 villagers fill the 8 non-central tiles. Only the top villager
  // is visible.
  let village = v.village
  let whiteMoonState: WhiteMoonState | undefined
  if (whiteMoon) {
    const stackResult = buildVillagerStacks(rng)
    rng = stackResult.rng
    village = village.map((t) => {
      if (t.id === central) {
        return { ...t, hasPortal: true }
      }
      const stackIdx = (t.coord.row * 3 + t.coord.col)
      // 8 non-central tiles map to stack indices 0..7 (skip center=4)
      const mapping = [0, 1, 2, 3, /* center */ -1, 4, 5, 6, 7]
      const sIdx = mapping[stackIdx]
      if (sIdx < 0) return t
      return { ...t, villagerStack: stackResult.stacks[sIdx] }
    })
    whiteMoonState = {
      saved: [],
      dead: [],
      moonCrystalReserve: 12,
      moonCrystalsByTaoist: { red: 0, blue: 0, green: 0, yellow: 0 },
      receptacles: { ne: false, nw: false, se: false, sw: false },
      suLingPos: null,
    }
  }

  const b = buildBoards(rng, config.difficulty)
  rng = b.rng

  const d = buildDeck(rng, config)
  rng = d.rng

  const taoists = buildTaoists(config, central)

  // Neutral boards start with 3 Qi each in their pool; they don't "have" a
  // Taoist, but the board's own qi is used when the rules say "the board loses
  // 1 Qi".
  for (const color of ALL_TAOIST_COLORS) {
    if (taoists[color].isNeutral) {
      b.boards[color].qi = 3
    }
  }

  // Active board = first seat in clockwise order that isn't neutral.
  // We still rotate turns in canonical order including neutral seats (their
  // turns run a Yin-only mini-phase).
  const firstColor = TURN_ORDER.find((c) => !taoists[c].isNeutral) ?? TURN_ORDER[0]

  return {
    config,
    phase: 'yin', // first turn starts at Yin
    turnIndex: TURN_ORDER.indexOf(firstColor),
    turnOrder: [...TURN_ORDER],
    village,
    boards: b.boards,
    taoists,
    ghostDeck: d.deck,
    discardPile: [],
    buddhaSupply: 2,
    taoSupply: { ...TAO_SUPPLY_INITIAL },
    hauntedCount: 0,
    villagersDead: 0,
    inactiveTaoMarker: false,
    activeBoard: firstColor,
    rngState: rng,
    whiteMoon: whiteMoonState,
  }
}

/**
 * Build 8 stacks of villagers, randomized.
 *
 * Villager pool: 12 families × (3/2/1 members) = 24 tokens.
 * 8 stacks × 3 = 24 slots.
 */
function buildVillagerStacks(rng: RngState): { rng: RngState; stacks: VillagerToken[][] } {
  const all: VillagerToken[] = []
  for (const family of VILLAGER_FAMILIES_BY_SIZE[3]) {
    for (let i = 0; i < 3; i++) all.push({ family, index: i })
  }
  for (const family of VILLAGER_FAMILIES_BY_SIZE[2]) {
    for (let i = 0; i < 2; i++) all.push({ family, index: i })
  }
  for (const family of VILLAGER_FAMILIES_BY_SIZE[1]) {
    all.push({ family, index: 0 })
  }
  const [rng2, shuffled] = shuffle(rng, all)
  const stacks: VillagerToken[][] = []
  for (let s = 0; s < 8; s++) {
    stacks.push(shuffled.slice(s * 3, s * 3 + 3))
  }
  return { rng: rng2, stacks }
}

// Re-exported so engine.ts doesn't have to know about setup.ts internals.
export { TURN_ORDER }
