// Read-only rule queries shared by the engine, the UI and the AI.

import { cardOnBoard, getCard, isSkeleton, isSummonCard } from './catalogue'
import { facedSpaces, OPPOSITE, sameRef } from './geometry'
import type {
  AbilityKind,
  Color,
  GameState,
  GhostCard,
  GhostInstance,
  GhostRef,
  PowerId,
  Seat,
  SpaceIdx,
  TaoColor,
  Taoist,
  TileIdx,
  TileKind,
} from './types'
import { COLORS, SPACES } from './types'

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

export const COLOR_NAME: Record<Color, string> = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' }
export const TAO_NAME: Record<TaoColor, string> = { red: 'red', blue: 'blue', green: 'green', yellow: 'yellow', black: 'black' }

export const TILE_NAME: Record<TileKind, string> = {
  circleOfPrayer: 'Circle of Prayer',
  buddhistTemple: 'Buddhist Temple',
  cemetery: 'Cemetery',
  taoistAltar: 'Taoist Altar',
  herbalistShop: "Herbalist's Shop",
  sorcerersHut: "Sorcerer's Hut",
  nightWatchman: "Night Watchman's Beat",
  pavilion: 'Pavilion of the Heavenly Wind',
  teaHouse: 'Tea House',
  kungFuSchool: 'Kung-Fu School',
  calligrapher: 'Calligrapher',
}

export const POWER_NAME: Record<PowerId, string> = {
  danceOfTheSpires: 'Dance of the Spires',
  danceOfTheTwinWinds: 'Dance of the Twin Winds',
  heavenlyGust: 'Heavenly Gust',
  secondWind: 'Second Wind',
  godsFavorite: "The Gods' Favorite",
  strengthOfMountain: 'Strength of a Mountain',
  bottomlessPockets: 'Bottomless Pockets',
  enfeeblementMantra: 'Enfeeblement Mantra',
}

export const POWER_TEXT: Record<PowerId, string> = {
  danceOfTheSpires: 'During your move, you can fly to any village tile.',
  danceOfTheTwinWinds: 'Before your move, you can move 1 other Taoist 1 space.',
  heavenlyGust: 'You can request help from a villager and attempt an exorcism, in either order.',
  secondWind: 'From your tile, you can request help twice or attempt 2 independent exorcisms.',
  godsFavorite: 'You can reroll any of your Tao dice (support action or exorcism) and your curse die, once. Keep the second result.',
  strengthOfMountain: 'You roll a fourth (grey) die when exorcising, and you never roll the curse die.',
  bottomlessPockets: 'Before your move, take a Tao token of any colour from the supply.',
  enfeeblementMantra: 'Before your move, place the Mantra on any ghost: its resistance drops by 1. Take it back when that ghost leaves play.',
}

/** "Red", "the neutral blue board", "Red (dead)". */
export function boardName(s: GameState, c: Color): string {
  const b = s.boards[c]
  if (b.neutral) return `the neutral ${c} board`
  return COLOR_NAME[c]
}

export function seatName(seat: Seat): string {
  return seat === 'wufeng' ? 'Wu-Feng' : COLOR_NAME[seat]
}

// ---------------------------------------------------------------------------
// Ghosts in play
// ---------------------------------------------------------------------------

export function ghostAt(s: GameState, ref: GhostRef): GhostInstance | null {
  return s.boards[ref.board].spaces[ref.space]
}

export function cardAt(s: GameState, ref: GhostRef): GhostCard | null {
  const g = ghostAt(s, ref)
  return g ? cardOnBoard(g.card, ref.board) : null
}

export interface PlacedGhost {
  ref: GhostRef
  ghost: GhostInstance
  card: GhostCard
}

export function ghostsInPlay(s: GameState): PlacedGhost[] {
  const out: PlacedGhost[] = []
  for (const board of COLORS) {
    for (const space of SPACES) {
      const ghost = s.boards[board].spaces[space]
      if (ghost) out.push({ ref: { board, space }, ghost, card: cardOnBoard(ghost.card, board) })
    }
  }
  return out
}

export function findGhost(s: GameState, uid: number): PlacedGhost | null {
  return ghostsInPlay(s).find((g) => g.ghost.uid === uid) ?? null
}

export function incarnationInPlay(s: GameState, id?: string): PlacedGhost | null {
  return ghostsInPlay(s).find((g) => g.card.incarnation && (!id || g.card.incarnation === id)) ?? null
}

export function freeSpaces(s: GameState, board?: Color): GhostRef[] {
  const out: GhostRef[] = []
  for (const b of board ? [board] : COLORS) {
    for (const space of SPACES) if (!s.boards[b].spaces[space]) out.push({ board: b, space })
  }
  return out
}

/** White Moon: Su-Ling stands in front of this space and cancels its centre stone. */
export function suLingAt(s: GameState, ref: GhostRef): boolean {
  const p = s.whiteMoon?.suLing
  return !!p && sameRef(p, ref)
}

/** Does this ghost's centre-stone ability `kind` currently work? */
export function centerActive(s: GameState, ref: GhostRef, kind: AbilityKind): boolean {
  const card = cardAt(s, ref)
  if (!card || !card.center.some((a) => a.kind === kind)) return false
  return !suLingAt(s, ref)
}

function anyActiveCenter(s: GameState, kind: AbilityKind, pred?: (g: PlacedGhost) => boolean): boolean {
  return ghostsInPlay(s).some((g) => (!pred || pred(g)) && centerActive(s, g.ref, kind))
}

/** Tao tokens can't be spent while a Tao blocker (or Dark Mistress) is in play. */
export function taoBlocked(s: GameState): boolean {
  return anyActiveCenter(s, 'taoBlocker')
}

/** Tao dice held captive by die captors (Creeping Horror included). */
export function capturedDice(s: GameState): number {
  return ghostsInPlay(s).filter((g) => centerActive(s, g.ref, 'dieCaptor')).length
}

/** Nameless: white faces are not wild while it is in play. */
export function whiteIsWild(s: GameState): boolean {
  return !incarnationInPlay(s, 'nameless')
}

export function isDiceImmune(s: GameState, ref: GhostRef): boolean {
  return centerActive(s, ref, 'diceImmune')
}

// ---------------------------------------------------------------------------
// Powers
// ---------------------------------------------------------------------------

/** A board's own power works: not possessed, no power blocker on it (or a group one anywhere). */
export function boardPowerActive(s: GameState, c: Color): boolean {
  const b = s.boards[c]
  if (b.possessed) return false
  if (s.blackSecret?.cursedBoards.includes(c)) return false
  return !ghostsInPlay(s).some((g) => {
    if (!centerActive(s, g.ref, 'powerBlocker')) return false
    if (g.ref.board === c) return true
    return g.card.center.some((a) => a.kind === 'powerBlocker' && a.group)
  })
}

/** Forgotten Ones: no powers at all, power tokens included. */
export function powersSuppressed(s: GameState): boolean {
  return !!incarnationInPlay(s, 'forgottenOnes')
}

/** Black Secret blood brother: a Taoist at 1 Qi can use the opposite board's power. */
export function bloodBrotherPower(s: GameState, c: Color): PowerId | null {
  if (!s.blackSecret) return null
  const t = s.taoists[c]
  if (!t.alive || t.qi !== 1) return null
  const opp = OPPOSITE[c]
  return boardPowerActive(s, opp) ? s.boards[opp].power : null
}

/**
 * Can Taoist `c` use `power` right now? Their own board's power, a power
 * borrowed with a power token this Yang phase, or (Black Secret) their
 * blood brother's.
 */
export function hasPower(s: GameState, c: Color, power: PowerId): boolean {
  const t = s.taoists[c]
  if (!t.alive || powersSuppressed(s)) return false
  if (s.boards[c].power === power && boardPowerActive(s, c)) return true
  if (s.phase === 'yang' && s.active === c && s.yang?.borrowed.includes(power)) return true
  return bloodBrotherPower(s, c) === power
}

/** Neutral boards whose power the active Taoist could borrow with a power token now. */
export function borrowablePowers(s: GameState, c: Color): Color[] {
  const t = s.taoists[c]
  if (s.phase !== 'yang' || s.active !== c || !s.yang || t.powerTokens <= 0 || powersSuppressed(s)) return []
  return COLORS.filter((b) => {
    const board = s.boards[b]
    return board.neutral && !board.possessed && boardPowerActive(s, b) && !s.yang!.borrowed.includes(board.power)
  })
}

// ---------------------------------------------------------------------------
// Taoists and seats
// ---------------------------------------------------------------------------

export const livingTaoists = (s: GameState): Taoist[] => COLORS.map((c) => s.taoists[c]).filter((t) => t.alive)

export const playerCount = (s: GameState): number => COLORS.filter((c) => !s.boards[c].neutral).length

export const isSolo = (s: GameState): boolean => playerCount(s) === 1

/** Starting Qi: also the cap is NOT applied — the rules set no maximum. */
export const startingQi = (s: GameState): number => (s.config.difficulty === 'initiation' ? 4 : 3)

/**
 * Who answers "the players' choice" questions this turn: the active Taoist,
 * or on a neutral / possessed board's turn, the next living Taoist clockwise.
 */
export function decider(s: GameState): Color {
  const start = COLORS.indexOf(s.active)
  for (let i = 0; i < 4; i++) {
    const c = COLORS[(start + i) % 4]!
    if (s.taoists[c].alive) return c
  }
  return s.active
}

export function tileOfKind(s: GameState, kind: TileKind): TileIdx | null {
  return s.village.find((t) => t.kind === kind)?.idx ?? null
}

/** Ghost spaces the Taoist faces from where they stand (none from the catacombs). */
export function reachableSpaces(s: GameState, c: Color): GhostRef[] {
  const t = s.taoists[c]
  if (!t.alive || t.tile == null || t.underground) return []
  return facedSpaces(t.tile)
}

/** Taoists standing on the same village tile (or catacomb space) as `c`, `c` included. */
export function taoistsWith(s: GameState, c: Color): Color[] {
  const t = s.taoists[c]
  if (t.tile == null) return [c]
  return COLORS.filter((o) => {
    const x = s.taoists[o]
    return x.alive && x.tile === t.tile && x.underground === t.underground
  })
}

/** The Shadow of Wu-Feng stands on this village tile (and blocks it). */
export function shadowOnTile(s: GameState, tile: TileIdx): boolean {
  const sh = s.blackSecret?.shadow
  return !!sh && sh.where === 'village' && sh.tile === tile
}

// ---------------------------------------------------------------------------
// Exorcism preconditions
// ---------------------------------------------------------------------------

/** Number of Tao dice an exorcism by `c` rolls. */
export function exorcismDice(s: GameState, c: Color): number {
  return Math.max(0, 3 - capturedDice(s)) + (hasPower(s, c, 'strengthOfMountain') ? 1 : 0)
}

/** Why this ghost can't be targeted by an exorcism right now (null = it can). */
export function exorcismBlocker(s: GameState, ref: GhostRef): string | null {
  const g = ghostAt(s, ref)
  if (!g) return 'There is no ghost there.'
  const card = cardOnBoard(g.card, ref.board)
  if (card.incarnation === 'howlingNightmare') {
    const opp = { board: OPPOSITE[ref.board], space: ref.space }
    if (ghostAt(s, opp)) return 'Howling Nightmare: the ghost space facing it on the opposite board must be empty.'
  }
  if (card.incarnation === 'uncatchable' && !s.boards[ref.board].buddhas[ref.space]) {
    return 'Uncatchable can only be exorcised on a space with a Buddha.'
  }
  return null
}

// ---------------------------------------------------------------------------
// Deck / end of game
// ---------------------------------------------------------------------------

export function isWuFengCard(id: string): boolean {
  return isSummonCard(id) || !!(!isSkeleton(id) && getCard(id).incarnation)
}

/** Incarnations (or Black Secret summon cards) still waiting in the deck. */
export const incarnationsInDeck = (s: GameState): number => s.deck.filter(isWuFengCard).length

export const hauntedCount = (s: GameState): number => s.village.filter((t) => t.haunted).length

/** Which colours a Taoist actually holds Tao tokens of. */
export function heldColors(t: Taoist): TaoColor[] {
  return (Object.keys(t.tao) as TaoColor[]).filter((c) => t.tao[c] > 0)
}

export const taoCount = (t: Taoist): number => Object.values(t.tao).reduce((n, v) => n + v, 0)

export function spaceLabel(s: GameState, ref: GhostRef): string {
  return `${boardName(s, ref.board)} board, space ${ref.space + 1}`
}

export const ALL_SPACES: GhostRef[] = COLORS.flatMap((board) => SPACES.map((space) => ({ board, space: space as SpaceIdx })))
