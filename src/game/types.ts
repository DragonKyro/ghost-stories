// Core type definitions for the Ghost Stories engine.
//
// Source of truth for game vocabulary. The engine, AI, UI, and network layers all
// reference these. Keep this file free of behavior — the engine lives in
// `engine.ts`, the action handlers in `actions/`.

// --- Identifiers ---------------------------------------------------------

export type TaoistColor = 'red' | 'blue' | 'green' | 'yellow'
export type BoardColor = TaoistColor

export type TaoColor = 'red' | 'green' | 'blue' | 'yellow' | 'black'

export type TaoDieFace = TaoColor | 'wild'

export type CurseFace =
  | 'none'
  | 'haunt'
  | 'spawnGhost'
  | 'loseAllTao'
  | 'loseQi'

export type GhostColor = TaoColor // ghost colors mirror tao colors

export type TaoistId = `taoist-${TaoistColor}`

// 3x3 village grid. Coordinates are (col, row), 0..2.
export type VillageCoord = { col: 0 | 1 | 2; row: 0 | 1 | 2 }
export type VillageTileId = `tile-${number}-${number}` // tile-<col>-<row>

// Each player board sits on one side of the village.
// north/east/south/west match the 4 colored boards: red=north, blue=east, green=south, yellow=west.
export type BoardSide = 'north' | 'east' | 'south' | 'west'

// A ghost lives in 1 of 3 slots on a player board.
export type GhostSpaceIdx = 0 | 1 | 2
export type GhostRef = { board: BoardColor; space: GhostSpaceIdx }

// --- Village tiles -------------------------------------------------------

export type VillageTileKind =
  | 'circleOfPrayer'
  | 'buddhistTemple'
  | 'cemetery'
  | 'taoistAltar'
  | 'herbalistShop'
  | 'sorcerersHut'
  | 'nightWatchmanBeat'
  | 'pavilionOfHeavenlyWind'
  | 'teaHouse'
  | 'kungFuSchool' // White Moon
  | 'calligrapher' // Black Secret

export const ALL_VILLAGE_TILE_KINDS: VillageTileKind[] = [
  'circleOfPrayer',
  'buddhistTemple',
  'cemetery',
  'taoistAltar',
  'herbalistShop',
  'sorcerersHut',
  'nightWatchmanBeat',
  'pavilionOfHeavenlyWind',
  'teaHouse',
]

/** White Moon basic game replaces Night Watchman's Beat with Kung-Fu School. */
export const WHITE_MOON_BASIC_TILE_SET: VillageTileKind[] = [
  'circleOfPrayer',
  'buddhistTemple',
  'cemetery',
  'taoistAltar',
  'herbalistShop',
  'sorcerersHut',
  'kungFuSchool',
  'pavilionOfHeavenlyWind',
  'teaHouse',
]

export type VillageTile = {
  id: VillageTileId
  coord: VillageCoord
  kind: VillageTileKind
  haunted: boolean
  // Tile-specific state. circleOfPrayer holds an optional Tao token (`circleToken`).
  circleToken?: TaoColor | null
  /**
   * White Moon: stack of villagers (top-of-stack last). Only the top villager
   * is "visible" / acts as the haunting-shield. Empty in base game.
   */
  villagerStack?: VillagerToken[]
  /**
   * White Moon: the portal sits on one village tile, enabling the Save
   * Villager action there.
   */
  hasPortal?: boolean
}

// ---- White Moon expansion -----------------------------------------------

export type VillagerFamilyId =
  // 3-person families
  | 'hua' | 'zhou' | 'li' | 'sun'
  // 2-person families
  | 'miao' | 'xiang' | 'sheng' | 'wu'
  // 1-person families
  | 'chang' | 'teng' | 'long' | 'weng'

export const VILLAGER_FAMILIES_BY_SIZE: Record<3 | 2 | 1, VillagerFamilyId[]> = {
  3: ['hua', 'zhou', 'li', 'sun'],
  2: ['miao', 'xiang', 'sheng', 'wu'],
  1: ['chang', 'teng', 'long', 'weng'],
}

/** A single villager token. `index` is its position within the family (0..size-1). */
export type VillagerToken = {
  family: VillagerFamilyId
  index: number
}

export type WhiteMoonState = {
  /** Villager tokens on the Shelter board (saved). */
  saved: VillagerToken[]
  /** Villager tokens on the Graveyard board (dead). */
  dead: VillagerToken[]
  /** Moon crystals in the central reserve. */
  moonCrystalReserve: number
  /** Moon crystals held by each Taoist. */
  moonCrystalsByTaoist: Record<TaoistColor, number>
  /** Moon crystals placed into the 4 receptacles (one per corner). */
  receptacles: { ne: boolean; nw: boolean; se: boolean; sw: boolean }
  /** Su-Ling's position. null = in reserve. */
  suLingPos: { board: BoardColor; ghostSpaceIdx: GhostSpaceIdx } | null
}

export const WHITE_MOON_VILLAGERS_TOTAL = 24 // 4×3 + 4×2 + 4×1
export const WHITE_MOON_MAX_VILLAGER_DEATHS = 12 // loss condition

// ---- Black Secret expansion --------------------------------------------

export type DemonId = 'cost2' | 'cost3' | 'cost4'

/**
 * Demons sit in the catacombs (Wu-Feng's side). When summoned they take 1
 * action per turn before each player board's Yin phase.
 */
export type DemonState = {
  id: DemonId
  resistance: number // 1, 2, 3 — also their cost (sort order)
  color: TaoColor // assigned at summon based on the spent ghost card's color
  /** Square index 0..8 on the 3x3 catacombs board. Null when off the board. */
  squareIdx: number | null
}

export type CurseLevel = 1 | 2 | 3 | 4

/**
 * Simplified curse pyramid: track count thrown at each level. Real curses
 * are individual tokens with distinct effects; this build represents them as
 * a counter and surfaces "cursed" status visually.
 */
export type CursePyramid = Record<CurseLevel, number>

export type BloodyMantraCard = {
  level: 2 | 3 | 4 // required Qi to resolve
  qiOnCard: number // current Qi count placed by Taoists from Qi losses
}

export type BlackSecretState = {
  /** Who is Wu-Feng (display tag for log purposes). */
  wuFengTag: string
  /** Curses thrown so far, by level. */
  curses: CursePyramid
  /**
   * Demons sitting on the catacombs board (only those that have been summoned
   * from Wu-Feng's hand). Demons start in Wu-Feng's reserve.
   */
  catacombsDemons: DemonState[]
  /** Demons currently in Wu-Feng's reserve, available to be summoned. */
  reserveDemons: DemonId[]
  /** Skeletons available to Wu-Feng (max 3 per rulebook). */
  skeletonsAvailable: number
  /** Bloody Mantra cards in play: 3× lvl 2, 2× lvl 3, 1× lvl 4. */
  bloodyMantras: BloodyMantraCard[]
}

// --- Taoist powers -------------------------------------------------------

export type TaoistPowerId =
  // red
  | 'danceOfTheSpires'
  | 'danceOfTheTwinWinds'
  // blue
  | 'heavenlyGust'
  | 'secondWind'
  // green
  | 'godsFavorite'
  | 'strengthOfMountain'
  // yellow
  | 'bottomlessPockets'
  | 'enfeeblementMantra'

export const TAOIST_POWERS_BY_COLOR: Record<TaoistColor, [TaoistPowerId, TaoistPowerId]> = {
  red: ['danceOfTheSpires', 'danceOfTheTwinWinds'],
  blue: ['heavenlyGust', 'secondWind'],
  green: ['godsFavorite', 'strengthOfMountain'],
  yellow: ['bottomlessPockets', 'enfeeblementMantra'],
}

// --- Ghosts --------------------------------------------------------------

// A ghost's resistance is a vector of required colored faces, e.g. { red: 2, green: 1 }.
export type GhostResistance = Record<TaoColor, number>

export type GhostAbilityKind =
  // left-stone (on-arrival)
  | 'arriveAddGhost'
  | 'arriveHauntTile'
  | 'arriveLoseQi'
  | 'arriveHaunterSetup'
  | 'arriveDirectHaunt'
  // center-stone (each yin phase)
  | 'haunter'
  | 'tormentor'
  | 'devourer' // White Moon
  | 'powerBlocker'
  | 'taoBlocker'
  | 'dieCaptor'
  | 'diceImmune'
  | 'groupEffect'
  // right-stone (on-exorcism)
  | 'rewardQiOrYinYang'
  | 'rewardTaoOne'
  | 'rewardTaoTwo'
  | 'rewardLoseTao'
  | 'rewardCurseDie'
  | 'incarnationReturnQiYinYang'

// Ability param shapes per kind. Keeping these narrow so handlers can match on
// `kind` and statically know what `params` carries.
export type GhostAbilityParams = {
  arriveAddGhost: { count?: number } // default 1
  arriveHauntTile: Record<string, never>
  arriveLoseQi: { amount?: number } // default 1
  arriveHaunterSetup: Record<string, never>
  arriveDirectHaunt: Record<string, never>
  haunter: Record<string, never>
  tormentor: Record<string, never>
  devourer: Record<string, never>
  powerBlocker: Record<string, never>
  taoBlocker: Record<string, never>
  dieCaptor: { count?: number } // default 1
  diceImmune: Record<string, never>
  groupEffect: { effect: 'taoBlocker' | 'powerBlocker' }
  rewardQiOrYinYang: Record<string, never>
  rewardTaoOne: Record<string, never>
  rewardTaoTwo: Record<string, never>
  rewardLoseTao: Record<string, never>
  rewardCurseDie: Record<string, never>
  incarnationReturnQiYinYang: Record<string, never>
}

export type GhostAbility = {
  [K in GhostAbilityKind]: {
    kind: K
    params?: GhostAbilityParams[K]
  }
}[GhostAbilityKind]

export type GhostStone = 'left' | 'center' | 'right'

export type GhostCardDef = {
  id: string // stable id, e.g. 'ghost-redveil-12'
  name: string
  color: GhostColor
  resistance: GhostResistance
  abilities: Record<GhostStone, GhostAbility[]>
  isIncarnation?: boolean
  incarnationId?: WuFengIncarnationId
}

export type WuFengIncarnationId =
  | 'howlingNightmare'
  | 'uncatchable'
  | 'deathArmy'
  | 'forgottenOnes'
  | 'bonecracker'
  | 'darkMistress'
  | 'creepingHorror'
  | 'vampireLord'
  | 'hopeKiller'
  | 'nameless'

// A ghost card placed on a board. Carries per-instance state (haunting figure
// position, mantra placement, etc.) that doesn't live on the card definition.
export type GhostInstance = {
  cardId: string
  hauntingFigurePos: 'card' | 'stone1' | 'stone2'
  hasMantra: boolean // yellow Taoist's enfeeblement mantra
  capturedDie?: TaoDieFace // creeping horror / die-captor
}

// --- Player boards -------------------------------------------------------

export type PlayerBoard = {
  color: BoardColor
  side: BoardSide
  activePowerId: TaoistPowerId // which side of the board is up
  ghostSpaces: [GhostInstance | null, GhostInstance | null, GhostInstance | null]
  buddhaSpaces: [boolean, boolean, boolean] // is there a Buddha here
  powerActive: boolean // ghost ability or possession can deactivate
  possessed: boolean // taoist died / neutral board lost all Qi
  qi: number // for neutral / possessed-board life pool
}

// --- Taoists (players) ---------------------------------------------------

export type TaoistState = {
  id: TaoistId
  color: TaoistColor
  isHuman: boolean
  isAi: boolean
  isNeutral: boolean // true when this seat is a neutral board (no player)
  alive: boolean
  qi: number
  tao: Record<TaoColor, number>
  yinYang: boolean
  buddhasInHand: number
  powerTokens: number
  // Where the figure stands. null when dead (figure is on Cemetery).
  tile: VillageTileId | null
}

// --- Top-level game state ------------------------------------------------

export type Difficulty = 'initiation' | 'normal' | 'nightmare' | 'hell'

export type GamePhase =
  | 'setup'
  | 'yin'
  | 'yang'
  | 'gameOver'
  /**
   * Black Secret: Wu-Feng's decision point at the start of Yin step 3 — pick
   * between placing the ghost, summoning a demon, or throwing a curse.
   */
  | 'wuFengIntervention'

export type GameConfig = {
  difficulty: Difficulty
  // Human seats by color. Missing colors become neutral boards (1-3 player rules).
  seats: Partial<Record<TaoistColor, 'human' | 'ai'>>
  // Optional seed override for tests.
  rngSeed?: number
  /**
   * Active expansions. Order matters for module composition (similar to the
   * Catan project's module stacking).
   */
  expansions?: Array<'whiteMoon' | 'blackSecret'>
  /**
   * Black Secret only: UUID / display tag of the human Wu-Feng player. In
   * solo play this can be the same identity as the Taoist player (one human
   * plays both sides). When set, Black Secret intervention prompts surface
   * for this identity.
   */
  wuFengPlayer?: { tag: string }
}

export type GameState = {
  config: GameConfig
  phase: GamePhase
  turnIndex: number // 0..3, indexes into turnOrder
  turnOrder: TaoistColor[] // clockwise. Includes neutral seats.
  village: VillageTile[] // length 9
  boards: Record<BoardColor, PlayerBoard>
  taoists: Record<TaoistColor, TaoistState>
  // Ghost deck (top → bottom). Incarnations are mixed in face-down.
  ghostDeck: string[] // ghost card ids
  discardPile: string[]
  buddhaSupply: number // 2 in base game
  taoSupply: Record<TaoColor, number>
  hauntedCount: number // 0..2; 3 = loss
  villagersDead: number // White Moon; 0 in base game
  // Active flags driven by ghost abilities.
  inactiveTaoMarker: boolean
  // Player whose Yin phase is currently resolving (transient during phase tick).
  // Mostly the same as turnOrder[turnIndex], but written explicitly so engine code
  // doesn't have to derive it.
  activeBoard: BoardColor
  // Winner: only ever 'taoists' on win; on loss we set `loss` instead.
  outcome?: { kind: 'win' } | { kind: 'loss'; reason: 'allDead' | 'thirdHaunting' | 'deckExhausted' | 'villagerToll' }
  // Deterministic RNG state for any engine-side randomness (placement coin-flips, etc).
  rngState: number
  /** White Moon state. Null in base game. */
  whiteMoon?: WhiteMoonState
  /** Black Secret state. Null in base game. */
  blackSecret?: BlackSecretState
  /**
   * Black Secret: while in `wuFengIntervention` phase, the ghost card to be
   * acted upon. Wu-Feng's decision will be a `wuFengIntervene` action.
   */
  pendingArrivalCardId?: string
}

// --- Actions (placeholder union; real one lives in `engine.ts`) ----------

export type Action = { type: string; [key: string]: unknown }
