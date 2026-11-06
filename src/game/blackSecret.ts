// Black Secret expansion (rules summary pages 7–8): one player is Wu-Feng.
// Ghost draws become Wu-Feng's choice (place / summon a demon / throw a
// curse), demons roam the catacombs under the village, Taoists climb down
// ladders to fight them, lost Qi feeds the Bloody Mantras, and the Shadow of
// Wu-Feng rises once three urns are found.
//
// The summary describes every mechanism but not the text of each curse token
// or Bloody Mantra card, nor the catacomb board's printed colours; those are
// our own designs below, built on the summary's rules (pyramid, colours,
// levels, refills).

import type { Response, ShadowChoice } from './actions'
import { cardOnBoard, getCard, isSummonCard, totalResistance } from './catalogue'
import { isAdjacent, refKey } from './geometry'
import { openRoll, type Requirement } from './exorcism'
import { placementOptions } from './flow'
import { ask, CURSE_TEXT, ev, gainQi, hauntTile, loseQi, now, placeCard, rollCurse, rollDice, unhaunt } from './ops'
import { shuffle } from './rng'
import {
  COLOR_NAME,
  decider,
  exorcismDice,
  freeSpaces,
  ghostsInPlay,
  hasPower,
  livingTaoists,
  TILE_NAME,
} from './rules'
import {
  COLORS,
  TAO_COLORS,
  type BloodyMantra,
  type CatacombTokenKind,
  type Color,
  type CurseEffectId,
  type CurseToken,
  type DemonId,
  type Effect,
  type GameState,
  type GhostRef,
  type MantraEffectId,
  type TaoColor,
  type TileIdx,
} from './types'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** Catacomb board colours (row-major, mirroring the village), by side; and the two entrances. */
export const CATACOMB_SIDES: Record<'a' | 'b', { colors: TaoColor[]; entrances: [TileIdx, TileIdx] }> = {
  a: { colors: ['red', 'green', 'blue', 'yellow', 'black', 'yellow', 'blue', 'green', 'red'], entrances: [0, 8] },
  b: { colors: ['blue', 'red', 'yellow', 'green', 'black', 'red', 'yellow', 'green', 'blue'], entrances: [2, 6] },
}

export const DEMONS: Record<DemonId, { name: string; cost: number; resistance: number }> = {
  imp: { name: 'Imp', cost: 2, resistance: 1 },
  fiend: { name: 'Fiend', cost: 3, resistance: 2 },
  archfiend: { name: 'Archfiend', cost: 4, resistance: 3 },
}

const LAYER_1: CatacombTokenKind[] = ['dirt', 'dirt', 'buddha', 'bloodOfTheJust', 'cursedTablet', 'bones', 'bloodOfSuLing', 'urn', 'urn']
const LAYER_N: CatacombTokenKind[] = ['dirt', 'dirt', 'dirt', 'buddha', 'bloodOfTheJust', 'cursedTablet', 'bones', 'bloodOfSuLing', 'urn']

export const TOKEN_NAME: Record<CatacombTokenKind, string> = {
  dirt: 'Dirt',
  buddha: 'Buddha',
  bloodOfTheJust: 'Blood of the Just',
  cursedTablet: 'Cursed Tablet',
  bones: 'Bones',
  bloodOfSuLing: 'Blood of Su-Ling',
  urn: 'Urn',
}

export const TOKEN_TEXT: Record<CatacombTokenKind, string> = {
  dirt: 'No effect.',
  buddha: 'The searching demon returns to Wu-Feng’s board.',
  bloodOfTheJust: 'The active Taoist puts a Qi from the reserve on a Bloody Mantra.',
  cursedTablet: 'Wu-Feng throws a curse of the colour of his choice.',
  bones: 'Wu-Feng places it on a free ghost space as a skeleton.',
  bloodOfSuLing: 'The active Taoist immediately activates a Bloody Mantra.',
  urn: 'Wu-Feng draws an incarnation card. The third urn brings the Shadow of Wu-Feng.',
}

const CURSE_POOL: Record<1 | 2 | 3 | 4, CurseEffectId[]> = {
  1: ['loseQi', 'loseQi', 'loseTao2', 'loseYinYang', 'advanceHaunters', 'clearCircle', 'loseTao2', 'advanceHaunters'],
  2: ['allLoseTao', 'blockPowers', 'removeLadder', 'skeleton', 'allLoseTao', 'removeLadder', 'shadowAct'],
  3: ['hauntTile', 'allLoseQi', 'addTwoGhosts', 'blockPowers', 'hauntTile'],
  4: ['drawIncarnation', 'summonIncarnation', 'allLoseQi'],
}
const CURSE_HAND: Record<1 | 2 | 3 | 4, number> = { 1: 5, 2: 4, 3: 3, 4: 2 }

export const CURSE_EFFECT_TEXT: Record<CurseEffectId, string> = {
  loseQi: 'The active Taoist loses 1 Qi.',
  loseTao2: 'The active Taoist discards 2 Tao tokens.',
  loseYinYang: 'The active Taoist loses their Yin-Yang.',
  advanceHaunters: 'Every haunting figure on the active board advances one step.',
  clearCircle: 'The Circle of Prayer’s Tao token returns to the supply.',
  allLoseTao: 'Every Taoist discards 1 Tao token.',
  blockPowers: 'The next Taoist’s power is inactive during their next turn.',
  removeLadder: 'Wu-Feng removes a ladder of his choice.',
  hauntTile: 'Wu-Feng haunts a village tile of his choice.',
  allLoseQi: 'Every Taoist loses 1 Qi.',
  addTwoGhosts: 'Two ghosts come into play.',
  drawIncarnation: 'Wu-Feng draws an incarnation card into his hand.',
  summonIncarnation: 'Wu-Feng draws an incarnation card, then puts one into play.',
  skeleton: 'Wu-Feng places one of his skeletons on a free ghost space.',
  shadowAct: 'The Shadow of Wu-Feng acts (if it is in play).',
}

const MANTRA_POOL: Record<2 | 3 | 4, MantraEffectId[]> = {
  2: ['gainTaoEach', 'yinYangReturn', 'restoreLadders', 'gainTaoEach', 'yinYangReturn', 'restoreLadders'],
  3: ['allGainQi', 'banishDemon', 'unhaunt', 'allGainQi'],
  4: ['discardGhosts', 'unhaunt'],
}

export const MANTRA_TEXT: Record<MantraEffectId, string> = {
  allGainQi: 'Every living Taoist gains 1 Qi.',
  gainTaoEach: 'Every living Taoist takes a Tao token of their choice.',
  yinYangReturn: 'A Taoist of your choice regains their Yin-Yang.',
  unhaunt: 'Restore a haunted tile of your choice.',
  restoreLadders: 'Put back up to 2 removed ladders (not on haunted tiles).',
  banishDemon: 'A demon of your choice returns to Wu-Feng’s board.',
  discardGhosts: 'Discard the strongest ordinary ghost from each board.',
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function drawCurses(s: GameState): void {
  const bs = s.blackSecret!
  let rng = s.rng
  const all = [...bs.curseHand, ...bs.curseReserve, ...([1, 2, 3, 4] as const).flatMap((l) => bs.pyramid[l].filter((x): x is CurseToken => !!x))]
  bs.curseHand = []
  bs.curseReserve = []
  for (const level of [1, 2, 3, 4] as const) {
    let tokens = all.filter((t) => t.level === level).map((t) => ({ ...t, revealed: level === 1 }))
    ;[rng, tokens] = shuffle(rng, tokens)
    bs.curseHand.push(...tokens.slice(0, CURSE_HAND[level]))
    bs.curseReserve.push(...tokens.slice(CURSE_HAND[level]))
  }
  bs.pyramid = { 1: [null, null, null, null], 2: [null, null, null], 3: [null, null], 4: [null] }
  s.rng = rng
}

export function bsSetup(s: GameState, incarnations: string[]): void {
  const side = s.config.blackSecret!.side
  const taoists = COLORS.filter((c) => !s.boards[c].neutral).length
  let rng = s.rng
  // Catacomb tokens: the 1-Taoist layer, then one more layer per extra Taoist on top.
  const stacks: CatacombTokenKind[][] = Array.from({ length: 9 }, () => [])
  for (let layer = 1; layer <= taoists; layer++) {
    let tokens: CatacombTokenKind[]
    ;[rng, tokens] = shuffle(rng, layer === 1 ? LAYER_1 : LAYER_N)
    tokens.forEach((t, i) => stacks[i]!.push(t))
  }
  const curses: CurseToken[] = []
  for (const level of [1, 2, 3, 4] as const) {
    CURSE_POOL[level].forEach((effect, i) => {
      curses.push({ id: `c${level}-${i}`, level, color: TAO_COLORS[(i + level) % 5]!, effect, revealed: false })
    })
  }
  const mantras: BloodyMantra[] = []
  for (const level of [2, 3, 4] as const) {
    MANTRA_POOL[level].forEach((effect, i) => mantras.push({ id: `m${level}-${i}`, level, effect, qi: 0 }))
  }
  let deck: BloodyMantra[]
  ;[rng, deck] = shuffle(rng, mantras)
  const faceUp: BloodyMantra[] = []
  for (const [level, n] of [[2, 3], [3, 2], [4, 1]] as const) {
    for (let i = 0; i < n; i++) {
      const k = deck.findIndex((m) => m.level === level)
      faceUp.push(deck.splice(k, 1)[0]!)
    }
  }
  s.rng = rng
  s.blackSecret = {
    incarnationPile: incarnations.slice(),
    incarnationHand: [],
    demons: (Object.keys(DEMONS) as DemonId[]).map((id) => ({ id, cost: DEMONS[id].cost, resistance: DEMONS[id].resistance, space: null, banished: false, mantra: false })),
    catacombs: stacks,
    catacombColors: CATACOMB_SIDES[side].colors.slice(),
    urns: 0,
    shadow: null,
    skeletonsLeft: 3,
    curseHand: [],
    curseReserve: curses,
    pyramid: { 1: [null, null, null, null], 2: [null, null, null], 3: [null, null], 4: [null] },
    mantras: faceUp,
    mantraDeck: deck,
    cursedBoards: [],
    pendingSummons: 0,
  }
  drawCurses(s)
  s.events.push({ kind: 'setup', text: `Black Secret: Wu-Feng (${s.config.blackSecret!.wuFeng === 'ai' ? 'AI' : 'a player'}) holds 14 curses; the catacombs hold ${taoists * 9} tokens.` })
}

// ---------------------------------------------------------------------------
// Ghost draws: Wu-Feng's choice
// ---------------------------------------------------------------------------

export function bsArrival(s: GameState, why: string): void {
  const bs = s.blackSecret!
  // An owed summon comes first, as soon as there is room.
  if (bs.pendingSummons > 0 && bs.incarnationHand.length > 0 && freeSpaces(s).length > 0) {
    bs.pendingSummons -= 1
    ev(s, 'summon', 'Wu-Feng’s waiting incarnation now comes into play.', { color: 'wufeng' })
    ask(s, { kind: 'wuFengIncarnation', owner: 'wufeng' })
    return
  }
  if (s.deck.length === 0) return ev(s, 'note', 'The ghost deck is empty: no ghost can come.')
  const card = s.deck.shift()!
  if (isSummonCard(card)) {
    ev(s, 'summon', 'Wu-Feng draws a summon card!', { color: 'wufeng' })
    drawIncarnation(s)
    if (bs.incarnationHand.length > 0) ask(s, { kind: 'wuFengIncarnation', owner: 'wufeng' })
    return
  }
  ev(s, 'draw', `Wu-Feng draws ${getCard(card).name} (${why}).`, { color: 'wufeng', card })
  ask(s, { kind: 'wuFengGhost', owner: 'wufeng', card })
}

function drawIncarnation(s: GameState): void {
  const bs = s.blackSecret!
  const card = bs.incarnationPile.shift()
  if (!card) return ev(s, 'note', 'The incarnation pile is empty.')
  bs.incarnationHand.push(card)
  ev(s, 'summon', 'Wu-Feng draws an incarnation card into his hand.', { color: 'wufeng' })
}

/** Pyramid slots open for a level: free, and (above level 1) resting on two thrown curses. */
export function openSlots(s: GameState, level: 1 | 2 | 3 | 4): number[] {
  const p = s.blackSecret!.pyramid
  return p[level]
    .map((tok, i) => (tok ? -1 : i))
    .filter((i) => i >= 0 && (level === 1 || (!!p[(level - 1) as 1 | 2 | 3][i] && !!p[(level - 1) as 1 | 2 | 3][i + 1])))
}

/** Curse tokens Wu-Feng could throw with a ghost of `color` (black = any colour). */
export function throwableCurses(s: GameState, color: TaoColor | 'any'): CurseToken[] {
  return s.blackSecret!.curseHand.filter((t) => (color === 'any' || color === 'black' || t.color === color) && openSlots(s, t.level).length > 0)
}

export function summonableDemons(s: GameState, card: string): DemonId[] {
  const res = totalResistance(getCard(card))
  return s.blackSecret!.demons.filter((d) => d.space === null && !d.banished && d.cost <= res).map((d) => d.id)
}

function throwCurse(s: GameState, tokenId: string, slot: number, color: TaoColor | 'any'): void {
  const bs = s.blackSecret!
  const tok = bs.curseHand.find((t) => t.id === tokenId)
  if (!tok) throw new Error('Wu-Feng does not hold that curse.')
  if (color !== 'any' && color !== 'black' && tok.color !== color) throw new Error('A curse must match the colour of the discarded ghost (black ghosts are wild).')
  if (!openSlots(s, tok.level).includes(slot)) throw new Error('That pyramid space is not open.')
  bs.curseHand = bs.curseHand.filter((t) => t.id !== tokenId)
  bs.pyramid[tok.level][slot] = { ...tok, revealed: true }
  ev(s, 'curseToken', `Wu-Feng throws a level ${tok.level} ${tok.color} curse: ${CURSE_EFFECT_TEXT[tok.effect]}`, { color: 'wufeng' })
  // Newly unlocked levels are flipped face up.
  for (const level of [2, 3, 4] as const) {
    if (openSlots(s, level).length > 0) bs.curseHand.forEach((t) => t.level === level && (t.revealed = true))
  }
  now(s, { k: 'curseEffect', effect: tok.effect, token: tok.id })
}

// ---------------------------------------------------------------------------
// Curse effects
// ---------------------------------------------------------------------------

function curseEffect(s: GameState, effect: CurseEffectId, token: string): void {
  const bs = s.blackSecret!
  const a = s.active
  const t = s.taoists[a]
  switch (effect) {
    case 'loseQi':
      loseQi(s, a, 'Wu-Feng’s curse')
      break
    case 'loseTao2':
      if (t.alive) now(s, { k: 'loseTao', taoist: a, count: 2, why: 'Wu-Feng’s curse' })
      break
    case 'loseYinYang':
      if (t.alive && t.yinYang) {
        t.yinYang = false
        ev(s, 'yinYang', `${COLOR_NAME[a]} loses their Yin-Yang to the curse.`, { color: a })
      }
      break
    case 'advanceHaunters':
      now(s, ...ghostsInPlay(s).filter((g) => g.ref.board === a && g.ghost.figure).map((g) => ({ k: 'haunter', uid: g.ghost.uid }) as Effect))
      break
    case 'clearCircle': {
      const circle = s.village.find((x) => x.kind === 'circleOfPrayer')
      if (circle?.circleToken) {
        s.taoSupply[circle.circleToken] += 1
        circle.circleToken = null
        ev(s, 'note', 'The Circle of Prayer’s token returns to the supply.')
      }
      break
    }
    case 'allLoseTao':
      now(s, ...livingTaoists(s).map((x) => ({ k: 'loseTao', taoist: x.color, count: 1, why: 'Wu-Feng’s curse' }) as Effect))
      break
    case 'blockPowers': {
      const next = nextLiving(s)
      if (next && !bs.cursedBoards.includes(next)) {
        bs.cursedBoards.push(next)
        ev(s, 'note', `${COLOR_NAME[next]}'s power is cursed: inactive until the end of their next turn.`)
      }
      break
    }
    case 'removeLadder': {
      const options = s.village.filter((x) => x.ladder).map((x) => x.idx)
      if (options.length) ask(s, { kind: 'wuFengCurseTarget', owner: 'wufeng', effect: 'removeLadder', options })
      break
    }
    case 'hauntTile': {
      const options = s.village.filter((x) => !x.haunted).map((x) => x.idx)
      if (options.length) ask(s, { kind: 'wuFengCurseTarget', owner: 'wufeng', effect: 'hauntTile', options })
      break
    }
    case 'allLoseQi':
      now(s, ...livingTaoists(s).map((x) => ({ k: 'loseQi', board: x.color, why: 'Wu-Feng’s curse' }) as Effect))
      break
    case 'addTwoGhosts':
      now(s, { k: 'arrival', why: 'curse' }, { k: 'arrival', why: 'curse' })
      break
    case 'drawIncarnation':
      drawIncarnation(s)
      break
    case 'summonIncarnation':
      drawIncarnation(s)
      if (bs.incarnationHand.length) ask(s, { kind: 'wuFengIncarnation', owner: 'wufeng' })
      break
    case 'skeleton':
      if (bs.skeletonsLeft > 0) now(s, { k: 'skeleton', kind: 'skeleton' })
      break
    case 'shadowAct':
      if (bs.shadow) now(s, { k: 'shadowPhase' })
      break
  }
  // After the level 4 curse resolves, Wu-Feng gathers and redraws all curses.
  const tok = ([1, 2, 3, 4] as const).flatMap((l) => bs.pyramid[l]).find((x) => x?.id === token)
  if (tok?.level === 4) {
    ev(s, 'note', 'The curse pyramid is complete: Wu-Feng gathers every curse and draws a new set.')
    drawCurses(s)
  }
}

function nextLiving(s: GameState): Color | null {
  const i = COLORS.indexOf(s.active)
  for (let k = 1; k <= 4; k++) {
    const c = COLORS[(i + k) % 4]!
    if (s.taoists[c].alive) return c
  }
  return null
}

// ---------------------------------------------------------------------------
// Demons and the Shadow
// ---------------------------------------------------------------------------

const taoistOnSpace = (s: GameState, space: TileIdx): boolean =>
  livingTaoists(s).some((t) => t.underground && t.tile === space)

function demonPhase(s: GameState, remaining: DemonId[]): void {
  const [d, ...rest] = remaining
  if (!d) return
  const demon = s.blackSecret!.demons.find((x) => x.id === d)
  if (rest.length) now(s, { k: 'demonPhase', remaining: rest })
  if (!demon || demon.space === null) return
  ask(s, { kind: 'wuFengDemon', owner: 'wufeng', demon: d })
}

function searchToken(s: GameState, demon: DemonId, space: TileIdx): void {
  const bs = s.blackSecret!
  const token = bs.catacombs[space]!.pop()
  if (!token) return ev(s, 'note', `${DEMONS[demon].name} searches an empty catacomb space.`)
  ev(s, 'token', `${DEMONS[demon].name} digs up: ${TOKEN_NAME[token]}. ${TOKEN_TEXT[token]}`, { color: 'wufeng' })
  now(s, { k: 'catacombToken', token, demon, space })
}

function catacombToken(s: GameState, token: CatacombTokenKind, demonId: DemonId, space: TileIdx): void {
  const bs = s.blackSecret!
  const active = s.taoists[s.active].alive ? s.active : decider(s)
  switch (token) {
    case 'dirt':
      return
    case 'buddha':
      return demonLeaves(s, bs.demons.find((x) => x.id === demonId)!)
    case 'bloodOfTheJust':
      return now(s, { k: 'mantraQi', from: active, mode: 'qi' })
    case 'cursedTablet':
      return now(s, { k: 'freeCurse' })
    case 'bones':
      return now(s, { k: 'skeleton', kind: 'bones' })
    case 'bloodOfSuLing':
      return now(s, { k: 'mantraQi', from: active, mode: 'activate' })
    case 'urn':
      bs.urns += 1
      drawIncarnation(s)
      if (bs.urns === 3 && !bs.shadow) {
        bs.shadow = { where: 'catacombs', tile: space }
        ev(s, 'shadow', 'The third urn! The Shadow of Wu-Feng rises in the catacombs. It is invincible.', { color: 'wufeng' })
      }
      return
  }
}

function shadowArrivesOn(s: GameState): void {
  const sh = s.blackSecret!.shadow
  if (!sh || sh.where !== 'village') return
  const tile = s.village[sh.tile]!
  if (tile.kind === 'circleOfPrayer' && tile.circleToken) {
    s.taoSupply[tile.circleToken] += 1
    tile.circleToken = null
    ev(s, 'note', 'The Shadow returns the Circle of Prayer’s token to the supply.')
  }
}

function shadowAct(s: GameState, choice: ShadowChoice): void {
  const bs = s.blackSecret!
  const sh = bs.shadow
  if (!sh) throw new Error('The Shadow is not in play.')
  const present = livingTaoists(s).filter((t) => t.tile === sh.tile && t.underground === (sh.where === 'catacombs')).map((t) => t.color)
  switch (choice.kind) {
    case 'pass':
      return
    case 'move':
      if (choice.tile < 0 || choice.tile > 8) throw new Error('No such space.')
      bs.shadow = { where: choice.where, tile: choice.tile }
      ev(s, 'shadow', `The Shadow of Wu-Feng moves to ${choice.where === 'village' ? `the ${TILE_NAME[s.village[choice.tile]!.kind]}` : 'the catacombs'}.`, { color: 'wufeng' })
      shadowArrivesOn(s)
      return
    case 'attackTaoists': {
      if (present.length === 0) throw new Error('No Taoist stands with the Shadow.')
      const dice = rollDice(s, 3)
      const hits = dice.filter((d) => d === 'black').length
      ev(s, 'shadow', `The Shadow attacks! ${hits} black face${hits === 1 ? '' : 's'}.`, { color: 'wufeng', dice })
      if (hits > 0) {
        if (present.length === 1) now(s, ...Array.from({ length: hits }, () => ({ k: 'loseQi', board: present[0]!, why: 'the Shadow' }) as Effect))
        else ask(s, { kind: 'shadowAttack', owner: 'wufeng', hits, options: present })
      }
      return
    }
    case 'attackTile': {
      if (sh.where !== 'village') throw new Error('The Shadow attacks a village tile from the village.')
      if (present.length > 0) throw new Error('The Shadow attacks a tile only when no Taoist is on it.')
      const face = rollCurse(s)
      if (s.whiteMoon) s.whiteMoon.suLingEvent = true
      ev(s, 'curse', `The Shadow attacks the ${TILE_NAME[s.village[sh.tile]!.kind]}: ${CURSE_TEXT[face]}.`, { curse: face, color: 'wufeng' })
      const a = s.active
      if (face === 'haunt') hauntTile(s, sh.tile, 'the Shadow')
      else if (face === 'ghost') now(s, { k: 'arrival', why: 'the Shadow' })
      else if (face !== 'blank') now(s, { k: 'curseFace', ctx: { roller: null, board: a, haunt: { kind: 'tile', tile: sh.tile }, why: 'the Shadow' }, face })
      return
    }
  }
}

// ---------------------------------------------------------------------------
// Taoists in the catacombs
// ---------------------------------------------------------------------------

/** Why the active Taoist can't climb now (null = they can). */
export function climbProblem(s: GameState, c: Color): string | null {
  const y = s.yang
  if (!s.blackSecret || !y) return 'There are no catacombs.'
  if (y.step3 || y.helps + y.exorcisms + y.saves + y.demonExorcisms > 0) return 'Change levels after your move, before your action.'
  // Once after your movement (moved or not); with the Dance of the Peaks, after each of two moves.
  const peaks = hasPower(s, c, 'danceOfTheSpires')
  if (y.climbs >= (peaks ? 2 : 1) || (y.climbs > 0 && y.climbs >= y.moves)) return 'You already changed levels after this move.'
  const t = s.taoists[c]
  if (!s.village[t.tile!]!.ladder) return 'There is no ladder here.'
  return null
}

/** Climb up or down the ladder of this tile / catacomb space, after the move and before the action. */
export function bsClimb(s: GameState, c: Color): void {
  const problem = climbProblem(s, c)
  if (problem) throw new Error(problem)
  const y = s.yang!
  bsLevelChange(s, c)
  y.moved = true
  y.climbed = true
  y.climbs += 1
}

/** Take the ladder at this Taoist's tile (also after a Twin Winds / Pavilion move). */
export function bsLevelChange(s: GameState, c: Color): void {
  if (!s.blackSecret) throw new Error('There are no catacombs without Black Secret.')
  const t = s.taoists[c]
  const tile = s.village[t.tile!]!
  if (!tile.ladder) throw new Error('There is no ladder there.')
  t.underground = !t.underground
  ev(s, 'climb', `${COLOR_NAME[c]} climbs ${t.underground ? 'down into the catacombs' : 'back up to the village'}.`, { color: c, tile: tile.idx })
}

/** A move inside the catacombs (`other`: someone else moving the Taoist — Twin Winds, Pavilion). */
export function bsMoveUnderground(s: GameState, c: Color, to: TileIdx, other = false): void {
  const t = s.taoists[c]
  if (to < 0 || to > 8 || to === t.tile) throw new Error('Choose another catacomb space.')
  const fly = !other && hasPower(s, c, 'danceOfTheSpires')
  if (!fly && !isAdjacent(t.tile!, to)) throw new Error('Move to an adjacent catacomb space.')
  t.tile = to
  if (!other) s.yang!.moved = true
  ev(s, 'move', `${COLOR_NAME[c]} moves through the catacombs.`, { color: c })
}

export function demonsOn(s: GameState, space: TileIdx): DemonId[] {
  return s.blackSecret?.demons.filter((d) => d.space === space).map((d) => d.id) ?? []
}

export function bsExorciseDemons(s: GameState, c: Color, demons: string[]): void {
  const t = s.taoists[c]
  if (!s.blackSecret || !t.underground) throw new Error('Demons are fought in the catacombs.')
  const here = demonsOn(s, t.tile!)
  if (demons.length === 0) throw new Error('Choose a demon on your catacomb space.')
  for (const d of demons) if (!here.includes(d as DemonId)) throw new Error('That demon is not on your space.')
  const dice = rollDice(s, exorcismDice(s, c))
  ev(s, 'exorcise', `${COLOR_NAME[c]} attacks ${demons.map((d) => DEMONS[d as DemonId].name).join(' and ')}.`, { color: c })
  openRoll(s, { mode: 'demon', actor: c, targets: [], demons: demons as DemonId[], dice, canReroll: hasPower(s, c, 'godsFavorite') })
}

export function demonRequirement(s: GameState, id: string): Requirement {
  const bs = s.blackSecret!
  const d = bs.demons.find((x) => x.id === id)!
  const color = bs.catacombColors[d.space ?? 4]!
  const circle = s.village.find((x) => x.kind === 'circleOfPrayer')
  const circleOff = circle && !circle.haunted && circle.circleToken === color ? 1 : 0
  return { key: id, base: { [color]: Math.max(0, d.resistance - circleOff) }, discounts: d.mantra ? 1 : 0, immune: false }
}

export function bsCommitDemons(s: GameState, actor: Color, demons: string[]): void {
  const bs = s.blackSecret!
  for (const id of demons) {
    const d = bs.demons.find((x) => x.id === id)!
    demonLeaves(s, d)
    ev(s, 'exorcised', `${DEMONS[d.id].name} is driven back to Wu-Feng's board${d.banished ? ' — and can never return' : ''}.`, { color: actor })
  }
}

// ---------------------------------------------------------------------------
// Bloody Mantras and the Calligrapher
// ---------------------------------------------------------------------------

/** A demon goes back to Wu-Feng's board: the Mantra on it returns to its owner. */
function demonLeaves(s: GameState, d: { space: TileIdx | null; banished: boolean; mantra: boolean }): void {
  d.space = null
  if (s.blackSecret!.shadow) d.banished = true
  if (d.mantra) {
    d.mantra = false
    if (s.mantra === 'placed') s.mantra = 'cooldown'
  }
}

/** Every Qi a Taoist or neutral board loses goes onto a Bloody Mantra of their choice. */
export function bsQiLost(s: GameState, from: Color): void {
  if (s.blackSecret!.mantras.length === 0) return
  s.queue.unshift({ k: 'mantraQi', from, mode: 'qi' })
}

function addMantraQi(s: GameState, idx: number): void {
  const bs = s.blackSecret!
  const m = bs.mantras[idx]!
  m.qi += 1
  ev(s, 'mantra', `A Qi lands on a level ${m.level} Bloody Mantra (${m.qi}/${m.level}).`)
  if (m.qi >= m.level) activateMantra(s, idx)
}

function activateMantra(s: GameState, idx: number): void {
  const bs = s.blackSecret!
  const m = bs.mantras[idx]!
  ev(s, 'mantra', `The Bloody Mantra awakens: ${MANTRA_TEXT[m.effect]}`)
  // Removed from the game; a card of the same level replaces it (if any are left).
  const k = bs.mantraDeck.findIndex((x) => x.level === m.level)
  if (k >= 0) bs.mantras[idx] = bs.mantraDeck.splice(k, 1)[0]!
  else bs.mantras.splice(idx, 1)
  mantraEffect(s, m.effect)
}

function mantraEffect(s: GameState, effect: MantraEffectId): void {
  const bs = s.blackSecret!
  const owner = decider(s)
  switch (effect) {
    case 'allGainQi':
      for (const t of livingTaoists(s)) gainQi(s, t.color, 1, 'Bloody Mantra')
      return
    case 'gainTaoEach':
      return now(s, ...livingTaoists(s).map((t) => ({ k: 'gainTao', taoist: t.color, count: 1, why: 'Bloody Mantra' }) as Effect))
    case 'yinYangReturn': {
      const options = livingTaoists(s).filter((t) => !t.yinYang).map((t) => COLORS.indexOf(t.color))
      if (options.length) ask(s, { kind: 'mantraTarget', owner, mantra: effect, options })
      return
    }
    case 'unhaunt': {
      const options = s.village.filter((t) => t.haunted).map((t) => t.idx)
      if (options.length) ask(s, { kind: 'mantraTarget', owner, mantra: effect, options })
      return
    }
    case 'restoreLadders': {
      // Ladders come back only where none stands and the tile is not haunted.
      let n = 0
      for (const t of s.village) if (!t.ladder && !t.haunted && n < 2) ((t.ladder = true), n++)
      ev(s, 'note', `${n} ladder${n === 1 ? '' : 's'} restored.`)
      return
    }
    case 'banishDemon': {
      const options = bs.demons.map((d, i) => (d.space !== null ? i : -1)).filter((i) => i >= 0)
      if (options.length) ask(s, { kind: 'mantraTarget', owner, mantra: effect, options })
      return
    }
    case 'discardGhosts':
      for (const c of COLORS) {
        const best = ghostsInPlay(s)
          .filter((g) => g.ref.board === c && !g.card.incarnation && g.ghost.card !== 'skeleton' && g.ghost.card !== 'bones')
          .sort((x, y) => totalResistance(y.card) - totalResistance(x.card))[0]
        if (best) {
          s.boards[c].spaces[best.ref.space] = null
          if (best.ghost.mantra && s.mantra === 'placed') s.mantra = 'cooldown'
          s.discard.push(best.ghost.card)
          ev(s, 'discard', `${best.card.name} is swept away by the Bloody Mantra.`, { ref: best.ref })
        }
      }
      return
  }
}

export function bsCalligrapher(s: GameState, c: Color, swap: { mantra: number; replacement: string } | null, placeQi: number | null): void {
  const bs = s.blackSecret!
  if (!swap && placeQi == null) throw new Error('Choose at least one of the Calligrapher’s two effects.')
  if (swap) {
    const m = bs.mantras[swap.mantra]
    const k = bs.mantraDeck.findIndex((x) => x.id === swap.replacement)
    if (!m || k < 0 || bs.mantraDeck[k]!.level !== m.level) throw new Error('Swap a Bloody Mantra for another of the same level.')
    const fresh = bs.mantraDeck.splice(k, 1)[0]!
    bs.mantras[swap.mantra] = fresh
    ev(s, 'mantra', `The Calligrapher rewrites a Bloody Mantra (its ${m.qi} Qi return to the reserve).`, { color: c })
  }
  if (placeQi != null) {
    if (!bs.mantras[placeQi]) throw new Error('No such Bloody Mantra.')
    addMantraQi(s, placeQi)
  }
}

// ---------------------------------------------------------------------------
// Skeletons, tiles
// ---------------------------------------------------------------------------

export function bsSkeletonRemoved(s: GameState, card: string): void {
  if (card === 'skeleton' && s.blackSecret) s.blackSecret.skeletonsLeft += 1
}

/** A haunted tile loses its ladder for good. */
export function bsTileHaunted(s: GameState, tile: TileIdx): void {
  const t = s.village[tile]!
  if (t.ladder) {
    t.ladder = false
    ev(s, 'note', `The ladder under the ${TILE_NAME[t.kind]} crumbles away.`)
  }
}

// ---------------------------------------------------------------------------
// Effects and prompts
// ---------------------------------------------------------------------------

export function bsEffect(s: GameState, e: Effect): void {
  const bs = s.blackSecret
  if (!bs) return
  switch (e.k) {
    case 'wuFengTurnStart': {
      const active = bs.demons.filter((d) => d.space !== null).sort((a, b) => a.resistance - b.resistance).map((d) => d.id)
      const after: Effect[] = []
      if (active.length) after.push({ k: 'demonPhase', remaining: active })
      if (bs.shadow) after.push({ k: 'shadowPhase' })
      if (after.length) ev(s, 'wufeng', 'Wu-Feng’s servants stir beneath the village.', { color: 'wufeng' })
      return now(s, ...after)
    }
    case 'demonPhase':
      return demonPhase(s, e.remaining)
    case 'shadowPhase':
      return ask(s, { kind: 'wuFengShadow', owner: 'wufeng' })
    case 'catacombToken':
      return catacombToken(s, e.token, e.demon, e.space)
    case 'curseEffect':
      return curseEffect(s, e.effect, e.token)
    case 'skeleton': {
      if (e.kind === 'skeleton') {
        if (bs.skeletonsLeft <= 0) return
      }
      const options = freeSpaces(s)
      if (options.length === 0) {
        ev(s, 'note', 'No ghost space is free for the skeleton: the active player loses 1 Qi.')
        return loseQi(s, s.active, 'no room for a skeleton')
      }
      return ask(s, { kind: 'wuFengSkeleton', owner: 'wufeng', options, token: e.kind })
    }
    case 'freeCurse':
      if (throwableCurses(s, 'any').length === 0) return ev(s, 'note', 'Wu-Feng has no curse he can throw.')
      return ask(s, { kind: 'wuFengFreeCurse', owner: 'wufeng' })
    case 'mantraQi': {
      const options = bs.mantras.map((_, i) => i)
      if (options.length === 0) return
      const owner = e.from && s.taoists[e.from].alive ? e.from : decider(s)
      if (options.length === 1 && e.mode === 'qi') return addMantraQi(s, 0)
      return ask(s, { kind: 'mantraQi', owner, options, mode: e.mode })
    }
    case 'mantraResolve':
      return activateMantra(s, e.mantra)
    default:
      return
  }
}

export function bsRespond(s: GameState, r: Response): boolean {
  const p = s.prompt
  const bs = s.blackSecret!
  if (!p) return false
  switch (p.kind) {
    case 'wuFengGhost': {
      if (r.kind !== 'wuFengGhost') return false
      const card = getCard(p.card)
      const ch = r.choice
      if (ch.kind === 'place') {
        const options = placementOptions(s, p.card)
        if (options.length > 0 && !options.some((o) => refKey(o) === refKey(ch.ref))) {
          throw new Error('Wu-Feng must follow the placement rules (own colour board first; black on the active board).')
        }
        s.prompt = null
        if (options.length === 0) {
          s.discard.push(p.card)
          ev(s, 'note', 'All 12 ghost spaces are occupied: the active player loses 1 Qi instead.')
          loseQi(s, s.active, 'no room for a ghost')
          return true
        }
        placeCard(s, p.card, ch.ref)
        return true
      }
      if (ch.kind === 'summon') {
        if (!summonableDemons(s, p.card).includes(ch.demon)) throw new Error('That demon costs more than the ghost’s resistance (or is already out).')
        const entrances = CATACOMB_SIDES[s.config.blackSecret!.side].entrances
        if (!entrances.includes(ch.entrance)) throw new Error('Demons enter at one of the two catacomb entrances.')
        s.prompt = null
        s.discard.push(p.card)
        const d = bs.demons.find((x) => x.id === ch.demon)!
        d.space = ch.entrance
        ev(s, 'demon', `Wu-Feng discards ${card.name} to summon the ${DEMONS[d.id].name} into the catacombs.`, { color: 'wufeng' })
        return true
      }
      s.prompt = null
      throwCurse(s, ch.token, ch.slot, card.color)
      s.discard.push(p.card)
      return true
    }
    case 'wuFengIncarnation': {
      if (r.kind !== 'wuFengIncarnation') return false
      if (!bs.incarnationHand.includes(r.card)) throw new Error('Wu-Feng does not hold that incarnation.')
      const options = placementOptions(s, r.card)
      if (options.length && !options.some((o) => refKey(o) === refKey(r.ref))) throw new Error('Incarnations follow the placement rules.')
      s.prompt = null
      if (options.length === 0) {
        // It stays in Wu-Feng's hand: incarnations can only ever be placed in the village.
        ev(s, 'note', 'All 12 ghost spaces are occupied: the incarnation waits in Wu-Feng’s hand for the next arrival, and the active player loses 1 Qi.')
        bs.pendingSummons += 1
        loseQi(s, s.active, 'no room for the incarnation')
        return true
      }
      bs.incarnationHand = bs.incarnationHand.filter((x) => x !== r.card)
      placeCard(s, r.card, r.ref)
      return true
    }
    case 'wuFengDemon': {
      if (r.kind !== 'wuFengDemon') return false
      const d = bs.demons.find((x) => x.id === p.demon)!
      const ch = r.choice
      if (ch.kind === 'move') {
        if (!isAdjacent(d.space!, ch.to)) throw new Error('Demons move to an adjacent catacomb space.')
        s.prompt = null
        d.space = ch.to
        ev(s, 'demon', `The ${DEMONS[d.id].name} prowls to another catacomb space.`, { color: 'wufeng' })
        return true
      }
      if (ch.kind === 'search') {
        if (taoistOnSpace(s, d.space!)) throw new Error('A demon cannot search while a Taoist stands on its space.')
        s.prompt = null
        searchToken(s, d.id, d.space!)
        return true
      }
      s.prompt = null
      return true
    }
    case 'wuFengShadow': {
      if (r.kind !== 'wuFengShadow') return false
      s.prompt = null
      shadowAct(s, r.choice)
      return true
    }
    case 'shadowAttack': {
      if (r.kind !== 'shadowAttack') return false
      if (r.taoists.length !== p.hits || r.taoists.some((c) => !p.options.includes(c))) throw new Error('Assign each black face to a Taoist with the Shadow.')
      s.prompt = null
      now(s, ...r.taoists.map((c) => ({ k: 'loseQi', board: c, why: 'the Shadow' }) as Effect))
      return true
    }
    case 'wuFengSkeleton': {
      if (r.kind !== 'wuFengSkeleton') return false
      if (!p.options.some((o) => refKey(o) === refKey(r.ref))) throw new Error('A skeleton goes on a free ghost space.')
      s.prompt = null
      const kind = p.token
      if (kind === 'skeleton') bs.skeletonsLeft -= 1
      ev(s, 'skeleton', 'Wu-Feng raises a skeleton.', { color: 'wufeng', ref: r.ref })
      placeCard(s, kind, r.ref)
      return true
    }
    case 'wuFengFreeCurse': {
      if (r.kind !== 'wuFengFreeCurse') return false
      if (r.token == null) {
        s.prompt = null
        return true
      }
      s.prompt = null
      throwCurse(s, r.token, r.slot, 'any')
      return true
    }
    case 'wuFengCurseTarget': {
      if (r.kind !== 'wuFengCurseTarget') return false
      if (!p.options.includes(r.tile)) throw new Error('Not a valid target.')
      s.prompt = null
      if (p.effect === 'removeLadder') {
        s.village[r.tile]!.ladder = false
        ev(s, 'note', `Wu-Feng tears down the ladder under the ${TILE_NAME[s.village[r.tile]!.kind]}.`)
      } else hauntTile(s, r.tile, 'Wu-Feng’s curse')
      return true
    }
    case 'mantraQi': {
      if (r.kind !== 'mantraQi') return false
      if (!p.options.includes(r.mantra)) throw new Error('No such Bloody Mantra.')
      s.prompt = null
      if (p.mode === 'qi') addMantraQi(s, r.mantra)
      else activateMantra(s, r.mantra)
      return true
    }
    case 'mantraTarget': {
      if (r.kind !== 'mantraTarget') return false
      if (!p.options.includes(r.target)) throw new Error('Not a valid target.')
      s.prompt = null
      if (p.mantra === 'yinYangReturn') {
        const c = COLORS[r.target]!
        s.taoists[c].yinYang = true
        ev(s, 'yinYang', `${COLOR_NAME[c]} regains their Yin-Yang.`, { color: c })
      } else if (p.mantra === 'unhaunt') unhaunt(s, r.target, 'Bloody Mantra')
      else if (p.mantra === 'banishDemon') {
        const d = bs.demons[r.target]!
        demonLeaves(s, d)
        ev(s, 'demon', `The ${DEMONS[d.id].name} is banished to Wu-Feng's board.`)
      }
      return true
    }
    default:
      return false
  }
}

export const bsCardOnBoard = cardOnBoard
export type { GhostRef }
