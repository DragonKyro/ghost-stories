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

export type VillageTile = {
  id: VillageTileId
  coord: VillageCoord
  kind: VillageTileKind
  haunted: boolean
  // Tile-specific state. circleOfPrayer holds an optional Tao token (`circleToken`).
  circleToken?: TaoColor | null
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

export type GameConfig = {
  difficulty: Difficulty
  // Human seats by color. Missing colors become neutral boards (1-3 player rules).
  seats: Partial<Record<TaoistColor, 'human' | 'ai'>>
  // Optional seed override for tests.
  rngSeed?: number
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
  outcome?: { kind: 'win' } | { kind: 'loss'; reason: 'allDead' | 'thirdHaunting' | 'deckExhausted' }
  // Deterministic RNG state for any engine-side randomness (placement coin-flips, etc).
  rngState: number
}

// --- Actions (placeholder union; real one lives in `engine.ts`) ----------

export type Action = { type: string; [key: string]: unknown }
