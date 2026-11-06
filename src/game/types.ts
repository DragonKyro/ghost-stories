// Core vocabulary of the Ghost Stories engine. No behaviour lives here.
//
// The engine is a deterministic state machine:
//   createGame(config) → GameState
//   applyAction(state, action) → GameState   (throws on an illegal action)
//
// Every die roll comes from the seeded RNG stored on the state (`rng`), so
// every device that applies the same actions to the same start reaches the
// same state. Rolls happen inside the reducer; actions carry only intents
// and choices.

// ---------------------------------------------------------------------------
// Colours, seats, geometry
// ---------------------------------------------------------------------------

/** The four Taoist colours. Also the four player boards. Turn order is clockwise. */
export type Color = 'red' | 'blue' | 'green' | 'yellow'
export const COLORS: readonly Color[] = ['red', 'blue', 'green', 'yellow']

/** Tao token / ghost colours. */
export type TaoColor = Color | 'black'
export const TAO_COLORS: readonly TaoColor[] = ['red', 'blue', 'green', 'yellow', 'black']

/** Faces of a Tao die: the five colours plus the white (wild) face. */
export type DieFace = TaoColor | 'white'
export const DIE_FACES: readonly DieFace[] = ['red', 'blue', 'green', 'yellow', 'black', 'white']

/**
 * Faces of the curse die. The physical die has two blank faces, so `blank`
 * appears twice in CURSE_DIE.
 */
export type CurseFace = 'blank' | 'haunt' | 'ghost' | 'loseTao' | 'loseQi'
export const CURSE_DIE: readonly CurseFace[] = ['blank', 'blank', 'haunt', 'ghost', 'loseTao', 'loseQi']

/** Board positions around the village (red north, then clockwise). */
export type Side = 'north' | 'east' | 'south' | 'west'
export const BOARD_SIDE: Record<Color, Side> = { red: 'north', blue: 'east', green: 'south', yellow: 'west' }

/** A village tile index 0..8, row-major: idx = row * 3 + col. 4 is the centre. */
export type TileIdx = number
export const CENTER_TILE: TileIdx = 4

/** Ghost space on a board. 0..2 runs west→east on N/S boards and north→south on E/W boards. */
export type SpaceIdx = 0 | 1 | 2
export const SPACES: readonly SpaceIdx[] = [0, 1, 2]
export interface GhostRef {
  board: Color
  space: SpaceIdx
}

/** Who can be asked to act: a Taoist seat, or the Wu-Feng player (Black Secret). */
export type Seat = Color | 'wufeng'

/** The four corners of the village (White Moon receptacles sit there). */
export type Corner = 'nw' | 'ne' | 'sw' | 'se'
export const CORNER_TILE: Record<Corner, TileIdx> = { nw: 0, ne: 2, sw: 6, se: 8 }

// ---------------------------------------------------------------------------
// Village tiles
// ---------------------------------------------------------------------------

export type TileKind =
  | 'circleOfPrayer'
  | 'buddhistTemple'
  | 'cemetery'
  | 'taoistAltar'
  | 'herbalistShop'
  | 'sorcerersHut'
  | 'nightWatchman'
  | 'pavilion'
  | 'teaHouse'
  | 'kungFuSchool' // White Moon
  | 'calligrapher' // Black Secret

export const BASE_TILES: readonly TileKind[] = [
  'circleOfPrayer',
  'buddhistTemple',
  'cemetery',
  'taoistAltar',
  'herbalistShop',
  'sorcerersHut',
  'nightWatchman',
  'pavilion',
  'teaHouse',
]

export interface VillageTile {
  idx: TileIdx
  kind: TileKind
  /** Face down: the villager is gone and the tile has no action. */
  haunted: boolean
  /** Circle of Prayer only: the Tao token placed on it. */
  circleToken: TaoColor | null
  /** White Moon: villager stack, bottom → top (the last one is visible). */
  villagers: Villager[]
  /** White Moon: the Portal is on this tile. */
  portal: boolean
  /** Black Secret: the ladder down to the matching catacomb space is still here. */
  ladder: boolean
}

// ---------------------------------------------------------------------------
// Taoist powers
// ---------------------------------------------------------------------------

export type PowerId =
  | 'danceOfTheSpires' // red: fly to any tile during your move
  | 'danceOfTheTwinWinds' // red: before your move, move another Taoist 1 space
  | 'heavenlyGust' // blue: request help AND exorcise
  | 'secondWind' // blue: two helps OR two exorcisms
  | 'godsFavorite' // green: reroll Tao dice / the curse die once
  | 'strengthOfMountain' // green: 4th die for exorcisms, never roll the curse die
  | 'bottomlessPockets' // yellow: before your move, take a Tao token
  | 'enfeeblementMantra' // yellow: before your move, place the Mantra on a ghost

export const POWERS_BY_COLOR: Record<Color, readonly [PowerId, PowerId]> = {
  red: ['danceOfTheSpires', 'danceOfTheTwinWinds'],
  blue: ['heavenlyGust', 'secondWind'],
  green: ['godsFavorite', 'strengthOfMountain'],
  yellow: ['bottomlessPockets', 'enfeeblementMantra'],
}

// ---------------------------------------------------------------------------
// Ghosts
// ---------------------------------------------------------------------------

export type AbilityKind =
  // Left stone — applied when the ghost comes into play.
  | 'addGhost' // bring another ghost into play
  | 'hauntTile' // haunt the first active tile in front of the ghost
  | 'loseQi' // the host player / neutral board loses 1 Qi
  | 'haunterDirect' // the haunting figure starts on the board, not the card
  // Centre stone — active while the ghost is in play (Yin phase or passive).
  | 'haunter' // advance the haunting figure each Yin phase
  | 'tormentor' // roll the curse die each Yin phase
  | 'devourer' // White Moon: kill a villager each Yin phase
  | 'powerBlocker' // the host board's power is inactive
  | 'taoBlocker' // nobody can spend Tao tokens
  | 'dieCaptor' // holds one Tao die: exorcisms roll one die fewer
  | 'diceImmune' // Tao dice have no effect on this ghost
  // Right stone — applied when the ghost is exorcised (curses before rewards).
  | 'curse' // the exorcist rolls the curse die
  | 'loseTao' // the exorcist loses 1 Tao token
  | 'rewardQiOrYinYang' // the exorcist gains 1 Qi or regains their Yin-Yang
  | 'rewardTao1' // the exorcist takes 1 Tao token of their choice
  | 'rewardTao2' // the exorcist takes 2 Tao tokens of their choice
  | 'rewardCrystal' // White Moon: the exorcist takes a moon crystal
  | 'incarnationReward' // 1 Qi and 1 Yin-Yang to the group

export interface Ability {
  kind: AbilityKind
  /** "The group" icon: the ability applies to every player and every board. */
  group?: boolean
}

export const CURSE_ABILITIES: readonly AbilityKind[] = ['curse', 'loseTao']

export type IncarnationId =
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

export interface GhostCard {
  id: string
  name: string
  color: TaoColor
  /** Faces needed to exorcise, by colour. Ordinary ghosts need only their own colour. */
  resistance: Partial<Record<TaoColor, number>>
  left: Ability[]
  center: Ability[]
  right: Ability[]
  incarnation?: IncarnationId
  /** One-line rules text for incarnations and odd cards. */
  text?: string
  expansion?: 'whiteMoon' | 'blackSecret'
}

/** A ghost (or Black Secret skeleton) sitting on a ghost space. */
export interface GhostInstance {
  /** Unique per game, so effects can follow a ghost that moves. */
  uid: number
  /** Catalogue id, or 'skeleton' for a Black Secret skeleton token. */
  card: string
  /** Haunting figure: on the card, on the stone in front of the card, or none (not a haunter). */
  figure: 'card' | 'stone' | null
  /** The yellow Taoist's Enfeeblement Mantra sits on this ghost. */
  mantra: boolean
}

// ---------------------------------------------------------------------------
// Boards and Taoists
// ---------------------------------------------------------------------------

export interface PlayerBoard {
  color: Color
  /** The power on the face-up side of the board. */
  power: PowerId
  spaces: [GhostInstance | null, GhostInstance | null, GhostInstance | null]
  buddhas: [boolean, boolean, boolean]
  /** No player sits here (1–3 player games). */
  neutral: boolean
  /** Neutral boards' own Qi (starts at 3). Unused on player boards. */
  qi: number
  /** A dead Taoist's board, or a neutral board that lost its last Qi. Its power is inactive. */
  possessed: boolean
}

export type SeatKind = 'human' | 'ai' | 'neutral'

export interface Taoist {
  color: Color
  kind: SeatKind
  /** False for dead Taoists and neutral seats. */
  alive: boolean
  qi: number
  tao: Record<TaoColor, number>
  yinYang: boolean
  /** Buddha figures taken from the Temple and not yet placed. */
  buddhas: number
  powerTokens: number
  /** Where the figure stands. null when dead (lying on the Cemetery) or neutral. */
  tile: TileIdx | null
  /** Black Secret: down in the catacombs, on catacomb space `tile`. */
  underground: boolean
  /** White Moon: moon crystals held. */
  crystals: number
  /** White Moon: artifacts held (rewards of one-member families). */
  artifacts: ArtifactId[]
}

// ---------------------------------------------------------------------------
// White Moon
// ---------------------------------------------------------------------------

export type FamilyId =
  | 'hua' | 'zhou' | 'li' | 'sun' // 3 members
  | 'miao' | 'xiang' | 'sheng' | 'wu' // 2 members
  | 'chang' | 'teng' | 'long' | 'weng' // 1 member

export interface Villager {
  family: FamilyId
  /** 0-based member number within the family. */
  member: number
}

export type ArtifactId = 'moonDust' | 'jadeTalisman' | 'dragonPearl' | 'phoenixFeather'

export interface WhiteMoonState {
  saved: Villager[] // Shelter board
  dead: Villager[] // Graveyard board
  crystalReserve: number
  receptacles: Record<Corner, boolean>
  /** Su-Ling stands on the haunting icon in front of this space; null = in the reserve. */
  suLing: GhostRef | null
  /** A villager died, a curse die was rolled, or a tile was haunted this turn. */
  suLingEvent: boolean
  /** The 4th receptacle was filled: the Mystic Barrier runs at the end of this turn. */
  barrierPending: boolean
  /** Mystic Barrier in progress: boards still to choose, and the crystals in the barrier. */
  barrier: { order: Color[]; crystals: number } | null
}

// ---------------------------------------------------------------------------
// Black Secret
// ---------------------------------------------------------------------------

export type DemonId = 'imp' | 'fiend' | 'archfiend'

export interface Demon {
  id: DemonId
  /** Summoning cost (2, 3, 4). */
  cost: number
  /** Exorcism resistance (1, 2, 3). The colour comes from the catacomb space it stands on. */
  resistance: number
  /** Catacomb space index 0..8, or null when on Wu-Feng's board. */
  space: TileIdx | null
  /** The Shadow of Wu-Feng is in play: a returned demon can't be summoned again. */
  banished: boolean
  /** The Enfeeblement Mantra sits on this demon's space on Wu-Feng's board. */
  mantra: boolean
}

export type CatacombTokenKind = 'dirt' | 'buddha' | 'bloodOfTheJust' | 'cursedTablet' | 'bones' | 'bloodOfSuLing' | 'urn'

export interface CurseToken {
  id: string
  level: 1 | 2 | 3 | 4
  color: TaoColor
  effect: CurseEffectId
  /** Face up (visible to the Taoists): every level 1 token, and higher levels once unlocked. */
  revealed: boolean
}

export type CurseEffectId =
  | 'loseQi' // the active Taoist loses 1 Qi
  | 'loseTao2' // the active Taoist discards 2 Tao tokens
  | 'loseYinYang' // the active Taoist loses their Yin-Yang
  | 'advanceHaunters' // every haunting figure on the active board advances one step
  | 'clearCircle' // the Circle of Prayer's token returns to the supply
  | 'allLoseTao' // every Taoist discards 1 Tao token
  | 'blockPowers' // the active board's power is inactive until its next turn
  | 'removeLadder' // a ladder of Wu-Feng's choice is removed
  | 'hauntTile' // a tile of Wu-Feng's choice is haunted
  | 'allLoseQi' // every Taoist loses 1 Qi
  | 'addTwoGhosts' // bring two ghosts into play
  | 'drawIncarnation' // Wu-Feng draws an incarnation card
  | 'summonIncarnation' // Wu-Feng draws an incarnation card, then puts one into play
  | 'skeleton' // Wu-Feng places one of his skeletons on a free ghost space
  | 'shadowAct' // the Shadow of Wu-Feng takes an extra action (if in play)

export type MantraEffectId =
  | 'allGainQi' // every living Taoist gains 1 Qi
  | 'gainTaoEach' // every living Taoist takes 1 Tao token
  | 'yinYangReturn' // a Taoist regains their Yin-Yang
  | 'unhaunt' // flip a haunted tile back
  | 'restoreLadders' // put back up to 2 removed ladders
  | 'banishDemon' // return a demon to Wu-Feng's board
  | 'discardGhosts' // discard one non-incarnation ghost from each board

export interface BloodyMantra {
  id: string
  level: 2 | 3 | 4
  effect: MantraEffectId
  qi: number
}

export interface BlackSecretState {
  /** Ghost card / summon card ids beyond the deck: incarnations Wu-Feng can draw. */
  incarnationPile: string[]
  /** Incarnation cards in Wu-Feng's hand. */
  incarnationHand: string[]
  demons: Demon[]
  /** Catacomb spaces: each holds a stack of face-down tokens (top = last). */
  catacombs: CatacombTokenKind[][]
  /** Space colours of the catacomb board. */
  catacombColors: TaoColor[]
  urns: number
  /** The Shadow of Wu-Feng: off the board, on a village tile, or on a catacomb space. */
  shadow: { where: 'village' | 'catacombs'; tile: TileIdx } | null
  skeletonsLeft: number
  /** Curse tokens Wu-Feng holds (not yet thrown). */
  curseHand: CurseToken[]
  /** Curse tokens set aside at setup. */
  curseReserve: CurseToken[]
  /** The pyramid on Wu-Feng's board: 4 / 3 / 2 / 1 slots; each higher slot rests on the two below it. */
  pyramid: Record<1 | 2 | 3 | 4, Array<CurseToken | null>>
  mantras: BloodyMantra[]
  mantraDeck: BloodyMantra[]
  /** Boards whose power a 'blockPowers' curse switched off until their next turn. */
  cursedBoards: Color[]
  /** Summons owed: an incarnation that found no room waits to come into play at the next arrival. */
  pendingSummons: number
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export type Difficulty = 'initiation' | 'normal' | 'nightmare' | 'hell'

export interface GameConfig {
  difficulty: Difficulty
  /** Each board: a human player, an AI player, or no player (neutral board). */
  seats: Record<Color, SeatKind>
  /** Seed for the shuffle and every die roll. */
  seed: number
  /** Which side of each board is up. Missing → random. (Solo forces red to Dance of the Spires.) */
  powers?: Partial<Record<Color, PowerId>>
  /** The first player. Missing → random among the player seats. */
  firstPlayer?: Color
  whiteMoon?: {
    /** Where the Portal goes: centre (standard) or a harder peripheral tile. */
    portal: 'center' | 'edge' | 'corner'
    /** Draw 9 village tiles at random from all 10, instead of swapping the Night Watchman for the Kung-Fu School. */
    randomTiles: boolean
  }
  blackSecret?: {
    /** Is Wu-Feng played by a person or the AI? */
    wuFeng: 'human' | 'ai'
    /** Catacomb board side. */
    side: 'a' | 'b'
  }
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

export type Phase = 'yin' | 'yang' | 'gameOver'

/** Book-keeping for the active Taoist's Yang phase. */
export interface YangState {
  /** Step 1 is over: the Taoist moved, or went on to a later step. */
  moved: boolean
  /** Step 2 actions taken this turn. */
  helps: number
  exorcisms: number
  saves: number // White Moon: Save a Villager
  demonExorcisms: number // Black Secret: exorcisms in the catacombs
  /** Step 3 (Buddha / moon crystal placement) has begun: no more step-2 actions. */
  step3: boolean
  /** Once-per-turn powers already used. */
  usedPowers: PowerId[]
  /** Powers borrowed from neutral boards with power tokens this turn. */
  borrowed: PowerId[]
  /** Buddhas / moon crystals gained this turn (they can't be placed until a later turn). */
  newBuddhas: number
  newCrystals: number
  /** Black Secret: the Taoist used a ladder this turn. */
  climbed: boolean
  /** Moves made and ladders climbed this turn (the Dance of the Peaks allows two of each in Black Secret). */
  moves: number
  climbs: number
}

export interface ExorcismRoll {
  mode: 'exorcism' | 'kungFu' | 'barrier' | 'demon'
  actor: Color
  targets: GhostRef[]
  /** Black Secret: demons targeted in the catacombs. */
  demons: DemonId[]
  dice: DieFace[]
  /** Gods' Favorite reroll still available. */
  canReroll: boolean
  /** Kung-Fu School: which ghosts the attempt covers. */
  scope?: 'ownColor' | 'black' | { neutralBoard: Color }
  /** Mystic Barrier: the board whose ghosts are targeted. */
  barrierBoard?: Color
}

export type Prompt =
  /** Choose the ghost space for an arriving ghost. */
  | { kind: 'placeGhost'; owner: Seat; card: string; options: GhostRef[] }
  /** Gods' Favorite: keep or reroll the curse die. */
  | { kind: 'curseReroll'; owner: Seat; face: CurseFace }
  /** A possessed / exhausted neutral board loses Qi: which Taoist takes it? */
  | { kind: 'qiPayer'; owner: Seat; options: Color[]; board: Color; why: string }
  /** Choose which Tao tokens to discard. */
  | { kind: 'discardTao'; owner: Seat; taoist: Color; count: number; why: string }
  /** Choose the colours of Tao tokens to take. */
  | { kind: 'gainTao'; owner: Seat; taoist: Color; count: number; why: string }
  /** Reward: 1 Qi or the Yin-Yang back. */
  | { kind: 'qiOrYinYang'; owner: Seat; taoist: Color }
  /** Incarnation reward: who gets the Qi, who gets the Yin-Yang. */
  | { kind: 'incarnationReward'; owner: Seat }
  /** Bonecracker on a neutral board: which Taoist discards? */
  | { kind: 'bonecrackerPayer'; owner: Seat; options: Color[] }
  /** Gods' Favorite on a curse die: the context is kept on the queue (a `curseFace` effect). */
  /** An exorcism roll is on the table: reroll (Gods' Favorite) or commit. */
  | { kind: 'exorcism'; owner: Seat; roll: ExorcismRoll }
  /** Herbalist's Shop dice are on the table: reroll (Gods' Favorite) or take the tokens. */
  | { kind: 'herbalist'; owner: Seat; taoist: Color; dice: DieFace[]; canReroll: boolean }
  // White Moon
  /** A Devourer found nobody in front of it: pick any visible villager. */
  | { kind: 'devour'; owner: Seat; options: TileIdx[] }
  /** End of turn after a negative event: place or move Su-Ling (optional). */
  | { kind: 'suLing'; owner: Seat; options: GhostRef[] }
  /** Su-Ling stands next to an empty receptacle: fill it from the reserve? */
  | { kind: 'suLingCrystal'; owner: Seat; corner: Corner }
  /** A dead Taoist's artifacts go to living Taoists. */
  | { kind: 'inherit'; owner: Seat; artifact: ArtifactId; options: Color[] }
  /** Mystic Barrier: this board chooses (save a villager / roll 4 dice / pass). */
  | { kind: 'barrier'; owner: Seat; board: Color }
  /** A family reward restores a haunted tile: which one? */
  | { kind: 'restoreTile'; owner: Seat; options: TileIdx[] }
  // Black Secret
  /** Wu-Feng drew a ghost: place it, summon a demon, or throw a curse. */
  | { kind: 'wuFengGhost'; owner: Seat; card: string }
  /** Wu-Feng drew a summon card: put an incarnation from hand into play. */
  | { kind: 'wuFengIncarnation'; owner: Seat }
  /** Wu-Feng's demon phase: one action per demon, weakest first. */
  | { kind: 'wuFengDemon'; owner: Seat; demon: DemonId }
  /** Wu-Feng's Shadow acts. */
  | { kind: 'wuFengShadow'; owner: Seat }
  /** Wu-Feng places a skeleton (Bones token). */
  | { kind: 'wuFengSkeleton'; owner: Seat; options: GhostRef[]; token: 'skeleton' | 'bones' }
  /** Wu-Feng throws a curse of any colour (Cursed Tablet). */
  | { kind: 'wuFengFreeCurse'; owner: Seat }
  /** Wu-Feng picks a target for a curse effect. */
  | { kind: 'wuFengCurseTarget'; owner: Seat; effect: 'removeLadder' | 'hauntTile'; options: TileIdx[] }
  /** Shadow attack: assign each black face to a Taoist on the Shadow's space. */
  | { kind: 'shadowAttack'; owner: Seat; hits: number; options: Color[] }
  /** A lost Qi goes on a Bloody Mantra of the Taoists' choice. */
  | { kind: 'mantraQi'; owner: Seat; options: number[]; mode: 'qi' | 'activate' }
  /** A Bloody Mantra needs a target to resolve. */
  | { kind: 'mantraTarget'; owner: Seat; mantra: MantraEffectId; options: number[] }

export type PromptKind = Prompt['kind']

/** One line in the game log, produced by the engine as it resolves an action. */
export interface GameEvent {
  kind: string
  text: string
  color?: Color | 'wufeng'
  dice?: DieFace[]
  curse?: CurseFace
  tile?: TileIdx
  ref?: GhostRef
  card?: string
  /** Signed amount, e.g. −1 / +2 on Qi events. */
  n?: number
}

export interface GameState {
  config: GameConfig
  rng: number
  phase: Phase
  /** Turn number, counting every board's turn (neutral ones too). */
  turn: number
  /** Whose turn it is (a board; neutral boards take turns too). */
  active: Color
  village: VillageTile[]
  boards: Record<Color, PlayerBoard>
  taoists: Record<Color, Taoist>
  /** Ghost deck, top = index 0. */
  deck: string[]
  discard: string[]
  /** Buddha figures on the Buddhist Temple tile. */
  templeBuddhas: number
  taoSupply: Record<TaoColor, number>
  /** Used power tokens wait on the central tile until someone ends a turn there. */
  centerPowerTokens: number
  /**
   * The Enfeeblement Mantra token: ready to place, on a ghost, back from a
   * ghost that left play (usable again next turn), or out of the game.
   */
  mantra: 'ready' | 'placed' | 'cooldown' | 'removed'
  nextUid: number
  /** Effects still to resolve (front first). Internal to the engine. */
  queue: Effect[]
  /** The decision the game is waiting for, if any. */
  prompt: Prompt | null
  /** Present during a living Taoist's Yang phase. */
  yang: YangState | null
  outcome: { result: 'win' } | { result: 'loss'; reason: LossReason } | null
  /** What the last action did, for the log and the UI. */
  events: GameEvent[]
  whiteMoon: WhiteMoonState | null
  blackSecret: BlackSecretState | null
}

export type LossReason = 'allDead' | 'thirdHaunting' | 'deckExhausted' | 'villagers'

// ---------------------------------------------------------------------------
// Internal effect queue
// ---------------------------------------------------------------------------

/** Who rolls a curse die: decides whether the green powers apply. */
export interface CurseContext {
  /** The Taoist rolling, or null when it's rolled for a neutral / possessed board. */
  roller: Color | null
  /** The board whose player suffers Qi / Tao loss. */
  board: Color
  /** Where a "haunt" face strikes. */
  haunt: { kind: 'front'; ref: GhostRef } | { kind: 'tile'; tile: TileIdx }
  why: string
}

export type Effect =
  | { k: 'beginTurn' }
  | { k: 'yinSteps' }
  | { k: 'bonecracker'; uid: number }
  | { k: 'haunter'; uid: number }
  | { k: 'tormentor'; uid: number }
  | { k: 'devourer'; uid: number }
  | { k: 'overrun' }
  | { k: 'arrival'; why: string }
  | { k: 'leftStone'; uid: number; index: number }
  | { k: 'curse'; ctx: CurseContext }
  | { k: 'curseFace'; ctx: CurseContext; face: CurseFace }
  | { k: 'loseQi'; board: Color; why: string }
  | { k: 'loseTao'; taoist: Color; count: number; why: string }
  | { k: 'gainTao'; taoist: Color; count: number; why: string }
  | { k: 'qiOrYinYang'; taoist: Color }
  | { k: 'incarnationReward' }
  | { k: 'enterYang' }
  | { k: 'endTurn' }
  | { k: 'nextTurn' }
  // White Moon
  | { k: 'suLingPlacement' }
  | { k: 'barrierStart' }
  | { k: 'barrierNext' }
  | { k: 'villagerDeath'; villager: Villager; board: Color; tile: TileIdx }
  | { k: 'familySaved'; family: FamilyId; taoist: Color }
  | { k: 'inherit'; artifacts: ArtifactId[] }
  // Black Secret
  | { k: 'wuFengTurnStart' }
  | { k: 'demonPhase'; remaining: DemonId[] }
  | { k: 'shadowPhase' }
  | { k: 'catacombToken'; token: CatacombTokenKind; demon: DemonId; space: TileIdx }
  | { k: 'curseEffect'; effect: CurseEffectId; token: string }
  | { k: 'mantraResolve'; mantra: number }
  | { k: 'skeleton'; kind: 'skeleton' | 'bones' }
  | { k: 'freeCurse' }
  | { k: 'mantraQi'; from: Color | null; mode: 'qi' | 'activate' }
