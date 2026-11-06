// State mutations shared by every part of the engine. The reducer works on a
// private deep copy of the state (see engine.ts), so these mutate in place.

import { cardOnBoard, getCard, isSkeleton } from './catalogue'
import { lineOf, OPPOSITE, sameRef, tilePlace } from './geometry'
import { nextInt } from './rng'
import {
  boardName,
  boardPowerActive,
  COLOR_NAME,
  decider,
  findGhost,
  ghostAt,
  ghostsInPlay,
  hauntedCount,
  incarnationInPlay,
  incarnationsInDeck,
  livingTaoists,
  TAO_NAME,
  TILE_NAME,
} from './rules'
import {
  CURSE_DIE,
  DIE_FACES,
  type Color,
  type CurseFace,
  type DieFace,
  type Effect,
  type GameEvent,
  type GameState,
  type GhostInstance,
  type GhostRef,
  type LossReason,
  type Prompt,
  type TaoColor,
  type TileIdx,
} from './types'
import { wmHauntAbsorbed, wmIncarnationArrived } from './whiteMoon'
import { bsQiLost, bsSkeletonRemoved, bsTileHaunted } from './blackSecret'

// ---------------------------------------------------------------------------
// Events, queue, prompts
// ---------------------------------------------------------------------------

export function ev(s: GameState, kind: string, text: string, extra: Partial<GameEvent> = {}): void {
  s.events.push({ kind, text, ...extra })
}

/** Resolve these effects next (before anything already queued), in the given order. */
export function now(s: GameState, ...effects: Effect[]): void {
  s.queue.unshift(...effects)
}

export function ask(s: GameState, prompt: Prompt): void {
  if (s.prompt) throw new Error(`engine: prompt ${prompt.kind} raised while ${s.prompt.kind} is open`)
  s.prompt = prompt
}

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

export function rollDie(s: GameState): DieFace {
  const [rng, i] = nextInt(s.rng, DIE_FACES.length)
  s.rng = rng
  return DIE_FACES[i]!
}

export function rollDice(s: GameState, n: number): DieFace[] {
  return Array.from({ length: n }, () => rollDie(s))
}

export function rollCurse(s: GameState): CurseFace {
  const [rng, i] = nextInt(s.rng, CURSE_DIE.length)
  s.rng = rng
  return CURSE_DIE[i]!
}

export const CURSE_TEXT: Record<CurseFace, string> = {
  blank: 'no effect',
  haunt: 'haunt a tile',
  ghost: 'a ghost comes into play',
  loseTao: 'lose all Tao tokens',
  loseQi: 'lose 1 Qi',
}

// ---------------------------------------------------------------------------
// Tao tokens
// ---------------------------------------------------------------------------

/** Take up to `n` tokens of `color` from the supply. Returns how many were taken. */
export function takeTao(s: GameState, c: Color, color: TaoColor, n = 1): number {
  const got = Math.min(n, s.taoSupply[color])
  s.taoSupply[color] -= got
  s.taoists[c].tao[color] += got
  return got
}

export function returnTao(s: GameState, c: Color, color: TaoColor, n = 1): void {
  const t = s.taoists[c]
  const k = Math.min(n, t.tao[color])
  t.tao[color] -= k
  s.taoSupply[color] += k
}

export function discardAllTao(s: GameState, c: Color): number {
  const t = s.taoists[c]
  let n = 0
  for (const color of Object.keys(t.tao) as TaoColor[]) {
    n += t.tao[color]
    s.taoSupply[color] += t.tao[color]
    t.tao[color] = 0
  }
  return n
}

export function taoList(colors: TaoColor[]): string {
  if (colors.length === 0) return 'nothing'
  return colors.map((c) => TAO_NAME[c]).join(', ')
}

// ---------------------------------------------------------------------------
// Haunting
// ---------------------------------------------------------------------------

/**
 * Haunt `tile` (flip it face down). White Moon: villagers on it are killed
 * instead and the tile stays active. Returns true if the tile was flipped.
 */
export function hauntTile(s: GameState, tile: TileIdx, why: string): boolean {
  const t = s.village[tile]!
  if (t.haunted) return false
  if (s.whiteMoon) {
    s.whiteMoon.suLingEvent = true
    if (wmHauntAbsorbed(s, tile, why)) return false
  }
  t.haunted = true
  if (t.circleToken) {
    s.taoSupply[t.circleToken] += 1
    t.circleToken = null
  }
  ev(s, 'haunt', `${TILE_NAME[t.kind]} (${tilePlace(tile)}) is haunted — ${why}.`, { tile })
  if (s.blackSecret) bsTileHaunted(s, tile)
  return true
}

/** "The first active village tile in front of the ghost" (or the next one on the same line). */
export function hauntInFront(s: GameState, ref: GhostRef, why: string): void {
  const target = lineOf(ref).find((t) => !s.village[t]!.haunted)
  if (target === undefined) {
    ev(s, 'note', `Every tile in front of ${boardName(s, ref.board)} space ${ref.space + 1} is already haunted.`)
    return
  }
  hauntTile(s, target, why)
}

export function unhaunt(s: GameState, tile: TileIdx, why: string): void {
  const t = s.village[tile]!
  if (!t.haunted) return
  t.haunted = false
  ev(s, 'unhaunt', `${TILE_NAME[t.kind]} is restored — ${why}.`, { tile })
}

// ---------------------------------------------------------------------------
// Qi and death
// ---------------------------------------------------------------------------

/**
 * One Qi is lost by `board`'s owner: the Taoist, or a neutral board's own Qi.
 * A possessed board (or a neutral board already at 0) passes the loss to a
 * Taoist of the players' choice.
 */
export function loseQi(s: GameState, board: Color, why: string): void {
  const t = s.taoists[board]
  const b = s.boards[board]
  if (t.alive) {
    t.qi -= 1
    ev(s, 'qi', `${COLOR_NAME[board]} loses 1 Qi (${why}) — ${t.qi} left.`, { color: board, n: -1 })
    if (s.blackSecret) bsQiLost(s, board)
    if (t.qi <= 0) killTaoist(s, board)
    return
  }
  if (b.neutral && !b.possessed && b.qi > 0) {
    b.qi -= 1
    ev(s, 'qi', `The neutral ${board} board loses 1 Qi (${why}) — ${b.qi} left.`, { color: board, n: -1 })
    if (s.blackSecret) bsQiLost(s, board)
    if (b.qi === 0) possess(s, board, 'it lost its last Qi')
    return
  }
  const options = livingTaoists(s).map((x) => x.color)
  if (options.length === 0) return
  if (options.length === 1) {
    ev(s, 'note', `The possessed ${board} board's Qi loss falls on ${COLOR_NAME[options[0]!]}.`)
    loseQi(s, options[0]!, why)
    return
  }
  // "Any loss of Qi points must be taken by a player of your choice."
  ask(s, { kind: 'qiPayer', owner: decider(s), options, board, why })
}

export function gainQi(s: GameState, c: Color, n: number, why: string): void {
  const t = s.taoists[c]
  if (!t.alive || n <= 0) return
  t.qi += n
  ev(s, 'qi', `${COLOR_NAME[c]} gains ${n} Qi (${why}) — ${t.qi} now.`, { color: c, n })
  if (s.blackSecret) {
    // Regaining Qi above 1 ends the blood brotherhood; nothing else to do here.
  }
}

/** A board becomes possessed: its power goes inactive. */
export function possess(s: GameState, c: Color, why: string): void {
  const b = s.boards[c]
  if (b.possessed) return
  b.possessed = true
  ev(s, 'possessed', `${b.neutral ? `The neutral ${c}` : `${COLOR_NAME[c]}'s`} board is possessed — ${why}. Its power is inactive.`, { color: c })
  checkMantraLoss(s)
}

/**
 * A Taoist with no Qi is dead: their possessions are lost, the figure lies on
 * the Cemetery, and their board is possessed (its ghosts stay in play).
 */
export function killTaoist(s: GameState, c: Color): void {
  const t = s.taoists[c]
  if (!t.alive) return
  t.alive = false
  t.qi = 0
  discardAllTao(s, c)
  t.yinYang = false
  s.templeBuddhas += t.buddhas
  t.buddhas = 0
  s.centerPowerTokens += t.powerTokens
  t.powerTokens = 0
  t.tile = null
  t.underground = false
  if (s.whiteMoon) {
    s.whiteMoon.crystalReserve += t.crystals
    t.crystals = 0
    if (t.artifacts.length > 0) {
      now(s, { k: 'inherit', artifacts: t.artifacts })
      t.artifacts = []
    }
  }
  ev(s, 'death', `${COLOR_NAME[c]} has died. Their figure lies on the Cemetery; their possessions are lost.`, { color: c })
  possess(s, c, `${COLOR_NAME[c]} died`)
}

// ---------------------------------------------------------------------------
// Ghosts coming and going
// ---------------------------------------------------------------------------

export function newGhost(s: GameState, card: string): GhostInstance {
  const c = getCard(card)
  const haunter = c.center.some((a) => a.kind === 'haunter')
  const direct = c.left.some((a) => a.kind === 'haunterDirect')
  return { uid: s.nextUid++, card, figure: haunter ? (direct ? 'stone' : 'card') : null, mantra: false }
}

/**
 * Put `card` on `ref` (already chosen by the placement rules). A ghost placed
 * on a Buddha is discarded at once without its abilities; an incarnation
 * only sends the Buddha back to the Temple (Uncatchable keeps it under it).
 * Otherwise the left-stone abilities are queued.
 */
export function placeCard(s: GameState, card: string, ref: GhostRef): void {
  const def = cardOnBoard(card, ref.board)
  const b = s.boards[ref.board]
  if (b.spaces[ref.space]) throw new Error('engine: ghost space already occupied')
  const where = `${boardName(s, ref.board)} space ${ref.space + 1}`
  if (b.buddhas[ref.space]) {
    if (!def.incarnation) {
      b.buddhas[ref.space] = false
      s.templeBuddhas += 1
      if (isSkeleton(card)) bsSkeletonRemoved(s, card)
      else s.discard.push(card)
      ev(s, 'buddha', `${def.name} arrives on a Buddha (${where}) and is destroyed. The Buddha returns to the Temple.`, { ref, card })
      return
    }
    if (def.incarnation !== 'uncatchable') {
      b.buddhas[ref.space] = false
      s.templeBuddhas += 1
      ev(s, 'buddha', `The Buddha on ${where} returns to the Temple: incarnations ignore Buddhas.`, { ref })
    }
  }
  const g = newGhost(s, card)
  b.spaces[ref.space] = g
  ev(s, 'arrive', `${def.name} comes into play on ${where}.`, { ref, card, color: ref.board })
  if (def.incarnation) {
    ev(s, 'incarnation', `An incarnation of Wu-Feng! ${def.text ?? ''}`.trim(), { ref, card })
    if (s.whiteMoon) wmIncarnationArrived(s, ref)
  }
  // Left stone, left to right; then incarnation arrival rules.
  const effects: Effect[] = def.left.map((_, index) => ({ k: 'leftStone', uid: g.uid, index }) as Effect)
  if (def.incarnation === 'bonecracker') {
    for (const t of livingTaoists(s)) effects.push({ k: 'loseTao', taoist: t.color, count: 1, why: 'Bonecracker' })
  }
  if (def.incarnation === 'nameless') {
    const circle = s.village.find((t) => t.kind === 'circleOfPrayer')
    if (circle?.circleToken) {
      s.taoSupply[circle.circleToken] += 1
      ev(s, 'note', `Nameless discards the ${circle.circleToken} Tao token on the Circle of Prayer.`)
      circle.circleToken = null
    }
  }
  now(s, ...effects)
  checkMantraLoss(s)
}

/**
 * Take a ghost off its space (exorcised, Sorcerer, Buddha…). The card goes to
 * the discard pile; the Mantra on it comes back to its owner.
 */
export function removeGhost(s: GameState, ref: GhostRef): GhostInstance {
  const g = ghostAt(s, ref)
  if (!g) throw new Error('engine: no ghost to remove')
  s.boards[ref.board].spaces[ref.space] = null
  if (g.mantra && s.mantra === 'placed') {
    s.mantra = 'cooldown'
    ev(s, 'note', 'The Enfeeblement Mantra token returns to its owner (usable again next turn).')
  }
  if (isSkeleton(g.card)) bsSkeletonRemoved(s, g.card)
  else s.discard.push(g.card)
  if (getCard(g.card).incarnation === 'uncatchable' && s.boards[ref.board].buddhas[ref.space]) {
    s.boards[ref.board].buddhas[ref.space] = false
    s.templeBuddhas += 1
  }
  return g
}

/** Move a ghost (Pavilion of the Heavenly Wind), with everything on it. */
export function moveGhost(s: GameState, from: GhostRef, to: GhostRef): void {
  const g = ghostAt(s, from)
  if (!g) throw new Error('engine: no ghost to move')
  if (s.boards[to.board].spaces[to.space]) throw new Error('That ghost space is not free.')
  const def = cardOnBoard(g.card, from.board)
  s.boards[from.board].spaces[from.space] = null
  const dest = s.boards[to.board]
  const where = `${boardName(s, to.board)} space ${to.space + 1}`
  if (dest.buddhas[to.space]) {
    if (!def.incarnation) {
      dest.buddhas[to.space] = false
      s.templeBuddhas += 1
      if (g.mantra && s.mantra === 'placed') s.mantra = 'cooldown'
      s.discard.push(g.card)
      ev(s, 'buddha', `${def.name} is moved onto a Buddha (${where}) and destroyed. The Buddha returns to the Temple.`, { ref: to, card: g.card })
      return
    }
    if (def.incarnation !== 'uncatchable') {
      dest.buddhas[to.space] = false
      s.templeBuddhas += 1
      ev(s, 'buddha', `The Buddha on ${where} returns to the Temple.`, { ref: to })
    }
  }
  dest.spaces[to.space] = g
  ev(s, 'moveGhost', `${def.name} is blown to ${where}.`, { ref: to, card: g.card })
  if (def.incarnation && s.whiteMoon) wmIncarnationArrived(s, to)
  checkMantraLoss(s)
}

/** "If you lose your power, remove the Enfeeblement Mantra token from the game." */
export function checkMantraLoss(s: GameState): void {
  if (s.mantra === 'removed') return
  const owners = (['red', 'blue', 'green', 'yellow'] as Color[]).filter((c) => s.boards[c].power === 'enfeeblementMantra')
  if (owners.length === 0) return
  if (owners.some((c) => boardPowerActive(s, c))) return
  for (const g of ghostsInPlay(s)) g.ghost.mantra = false
  for (const d of s.blackSecret?.demons ?? []) d.mantra = false
  s.mantra = 'removed'
  ev(s, 'note', 'The Enfeeblement Mantra board lost its power: the Mantra token is removed from the game.')
}

export function ghostName(s: GameState, uid: number): string {
  const g = findGhost(s, uid)
  return g ? g.card.name : 'the ghost'
}

// ---------------------------------------------------------------------------
// End of game
// ---------------------------------------------------------------------------

function endGame(s: GameState, outcome: GameState['outcome']): void {
  s.phase = 'gameOver'
  s.outcome = outcome
  s.queue = []
  s.prompt = null
  s.yang = null
  if (outcome?.result === 'win') ev(s, 'win', 'The last incarnation of Wu-Feng is exorcised. The village is saved!')
  else if (outcome?.result === 'loss') ev(s, 'loss', `Defeat: ${LOSS_TEXT[outcome.reason]}`)
}

export const LOSS_TEXT: Record<LossReason, string> = {
  allDead: 'all the Taoists are dead.',
  thirdHaunting: 'a third village tile is haunted.',
  deckExhausted: 'the ghost deck is exhausted while Wu-Feng remains.',
  villagers: 'the twelfth villager has been killed.',
}

/** The three (four with White Moon) defeats. Returns true if the game just ended. */
export function checkLoss(s: GameState): boolean {
  if (s.phase === 'gameOver') return true
  let reason: LossReason | null = null
  if (livingTaoists(s).length === 0) reason = 'allDead'
  else if (hauntedCount(s) >= 3) reason = 'thirdHaunting'
  else if (s.whiteMoon && s.whiteMoon.dead.length >= 12) reason = 'villagers'
  else if (s.deck.length === 0 && (incarnationInPlay(s) || pendingIncarnation(s) || (s.blackSecret?.pendingSummons ?? 0) > 0)) reason = 'deckExhausted'
  if (!reason) return false
  endGame(s, { result: 'loss', reason })
  return true
}

function pendingIncarnation(s: GameState): boolean {
  const p = s.prompt
  if (!p) return false
  return (p.kind === 'placeGhost' && !!getCard(p.card).incarnation) || p.kind === 'wuFengIncarnation'
}

/** Win: no incarnation left in the deck or in play. Only checked once all effects have resolved. */
export function checkWin(s: GameState): boolean {
  if (s.phase === 'gameOver') return true
  if (incarnationInPlay(s) || incarnationsInDeck(s) > 0 || pendingIncarnation(s) || (s.blackSecret?.pendingSummons ?? 0) > 0) return false
  endGame(s, { result: 'win' })
  return true
}

export const oppositeBoard = OPPOSITE
export { sameRef }
