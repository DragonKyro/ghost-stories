// State → tokens, in the canonical frame of the deciding seat.
//
// Everything a player at the table can see goes in: every board, ghost,
// haunting figure, Taoist, tile, villager on top, token and counter, the
// open prompt and its dice, the turn's bookkeeping, the pending effects, and
// what's left of the unseen ghosts (as counts — never the deck order). What
// the players can't see stays out: deck order and identities, villagers under
// the top one, face-down curse tokens, Wu-Feng's hand, catacomb stacks, the
// Bloody Mantra deck order. `sanitize`d copies (hidden details re-dealt)
// encode identically; nn.test.ts checks it.

import { cardOnBoard, getCard, isSkeleton, isSummonCard, baseGhostIds, whiteMoonGhostIds, blackSecretGhostIds, incarnationIds } from '@/game/catalogue'
import { ghostRequirement } from '@/game/exorcism'
import { adjacentTiles, cornerOfSpace, facingTile, isAdjacent, lineOf, OPPOSITE } from '@/game/geometry'
import {
  ALL_SPACES,
  bloodBrotherPower,
  boardPowerActive,
  borrowablePowers,
  capturedDice,
  centerActive,
  decider,
  exorcismBlocker,
  exorcismDice,
  ghostAt,
  hasPower,
  isWuFengCard,
  playerCount,
  powersSuppressed,
  shadowOnTile,
  suLingAt,
  taoBlocked,
  whiteIsWild,
} from '@/game/rules'
import { CATACOMB_SIDES } from '@/game/blackSecret'
import { FAMILIES } from '@/game/whiteMoon'
import type { Color, Corner, GameState, GhostCard, GhostInstance, GhostRef, Seat, TaoColor, TileIdx } from '@/game/types'
import { COLORS, TAO_COLORS } from '@/game/types'
import { frameFor, type Frame } from './frame'
import {
  ABILITY,
  CATACOMB_TOKEN,
  CENTER_ABILITIES,
  CURSE_EFFECT,
  CURSE_PYRAMID_SLOTS,
  DEMON,
  DIFFICULTY,
  EFFECT_KINDS,
  FAMILY,
  FAMILY_IDS,
  INCARNATION,
  LOSS,
  MANTRA_EFFECT,
  N_EFFECT,
  N_TOKENS,
  POWER,
  PROMPT_KIND,
  REL,
  TILE_KIND,
  TOKEN,
  TOKENS,
  ARTIFACT,
  cardSlot,
  type Layout,
  type TokenType,
} from './schema'

export interface Encoded {
  /** The seat the state is seen from (seat 0 of the frame). */
  seat: Color
  frame: Frame
  /** Per token type: slots × features, row-major. */
  x: Record<TokenType, Float32Array>
  /** 1 for token slots in use. */
  present: Uint8Array
  /** N_TOKENS × N_TOKENS relation ids (REL). */
  rel: Uint8Array
}

const CORNER_OF_TILE: Record<number, Corner> = { 0: 'nw', 2: 'ne', 6: 'sw', 8: 'se' }
const EFFECT_INDEX = new Map<string, number>(EFFECT_KINDS.map((k, i) => [k, i]))

/** Writes named fields of one token row. Throws on unknown fields or out-of-range one-hots (bugs). */
class Row {
  constructor(
    private readonly buf: Float32Array,
    private readonly base: number,
    private readonly L: Layout,
  ) {}
  set(name: string, v: number, i = 0): void {
    const f = this.L.field(name)
    if (i < 0 || i >= f.n || !Number.isInteger(i)) throw new Error(`nn encode: ${name}[${i}] out of range`)
    this.buf[this.base + f.off + i] = v
  }
  add(name: string, v: number, i = 0): void {
    const f = this.L.field(name)
    if (i < 0 || i >= f.n) throw new Error(`nn encode: ${name}[${i}] out of range`)
    this.buf[this.base + f.off + i] += v
  }
}

/** The seat a decision is seen from: the prompt owner or the active Taoist (Wu-Feng's prompts: the players' decider). */
export function viewSeat(s: GameState, seat?: Seat): Color {
  if (seat && seat !== 'wufeng') return seat
  return decider(s)
}

export function encodeState(s: GameState, seat?: Seat): Encoded {
  const me = viewSeat(s, seat)
  const f = frameFor(me)
  const x = Object.fromEntries(TOKENS.map((t) => [t.type, new Float32Array(t.slots * t.layout.size)])) as Record<TokenType, Float32Array>
  const present = new Uint8Array(N_TOKENS)
  const rel = new Uint8Array(N_TOKENS * N_TOKENS)
  const row = (type: TokenType, slot: number): Row => {
    const spec = TOKEN[type]
    if (slot < 0 || slot >= spec.slots) throw new Error(`nn encode: ${type} slot ${slot}`)
    present[spec.start + slot] = 1
    return new Row(x[type], slot * spec.layout.size, spec.layout)
  }
  const ctx = new Ctx(s, me, f)
  encodeGlobal(ctx, row('global', 0))
  encodePrompt(ctx, row('prompt', 0))
  for (const c of COLORS) encodeSeat(ctx, c, row('seat', f.seat(c)))
  for (let t = 0; t < 9; t++) encodeTile(ctx, t, row('tile', f.tile(t)))
  for (const ref of ALL_SPACES) encodeSpace(ctx, ref, row('space', f.space(ref)))
  if (s.whiteMoon) for (const id of FAMILY_IDS) encodeFamily(ctx, id, row('family', FAMILY[id]))
  if (s.blackSecret) {
    for (let i = 0; i < 9; i++) encodeCatacomb(ctx, i, row('catacomb', f.tile(i)))
    for (const d of s.blackSecret.demons) encodeDemon(ctx, d.id, row('demon', DEMON[d.id]))
    encodeCurses(ctx, row)
    s.blackSecret.mantras.slice(0, TOKEN.mantra.slots).forEach((m, i) => {
      const r = row('mantra', i)
      r.set('bias', 1)
      r.set('level', 1, m.level - 2)
      r.set('effect', 1, MANTRA_EFFECT[m.effect])
      r.set('qi', m.qi / 4)
      r.set('progress', m.qi / m.level)
    })
  }
  buildRelations(ctx, present, rel)
  return { seat: me, frame: f, x, present, rel }
}

// ---------------------------------------------------------------------------
// Shared context and slot lookups
// ---------------------------------------------------------------------------

export class Ctx {
  readonly reachable = new Set<TileIdx>()
  readonly haunt = new Map<string, TileIdx>() // ref key → tile its haunter haunts next
  readonly hauntNext = new Array<number>(9).fill(0)
  readonly hauntLater = new Array<number>(9).fill(0)
  readonly myTile: TileIdx | null
  constructor(
    readonly s: GameState,
    readonly me: Color,
    readonly f: Frame,
  ) {
    const t = s.taoists[me]
    this.myTile = t.alive && t.tile != null && !t.underground ? t.tile : null
    if (this.myTile != null) {
      const fly = hasPower(s, me, 'danceOfTheSpires')
      for (let i = 0; i < 9; i++) if (fly || i === this.myTile || isAdjacent(this.myTile, i)) this.reachable.add(i)
    }
    for (const ref of ALL_SPACES) {
      const g = ghostAt(s, ref)
      if (!g || !centerActive(s, ref, 'haunter')) continue
      const target = lineOf(ref).find((i) => !s.village[i]!.haunted)
      if (target == null) continue
      this.haunt.set(`${ref.board}:${ref.space}`, target)
      if (g.figure === 'stone') this.hauntNext[target]! += 1
      else this.hauntLater[target]! += 1
    }
  }
  seatSlot = (c: Color) => TOKEN.seat.start + this.f.seat(c)
  tileSlot = (t: TileIdx) => TOKEN.tile.start + this.f.tile(t)
  spaceSlot = (r: GhostRef) => TOKEN.space.start + this.f.space(r)
  catacombSlot = (i: number) => TOKEN.catacomb.start + this.f.tile(i)
  demonSlot = (id: string) => TOKEN.demon.start + DEMON[id as keyof typeof DEMON]
  mantraSlot = (i: number) => TOKEN.mantra.start + i
  familySlot = (id: keyof typeof FAMILY) => TOKEN.family.start + FAMILY[id]
}

const relTao = (f: Frame, c: TaoColor) => f.tao(c)

// ---------------------------------------------------------------------------
// Ghosts
// ---------------------------------------------------------------------------

function writeGhost(f: Frame, r: Row, card: GhostCard, id: string): void {
  r.set('g.present', 1)
  r.set('g.card', 1, cardSlot(id))
  r.set('g.color', 1, relTao(f, card.color))
  let total = 0
  for (const c of TAO_COLORS) {
    const n = card.resistance[c] ?? 0
    total += n
    if (n) r.set('g.res', n / 4, relTao(f, c))
  }
  r.set('g.resTotal', total / 8)
  for (const a of [...card.left, ...card.center, ...card.right]) {
    r.add('g.ability', 1, ABILITY[a.kind])
    if (a.group) r.add('g.group', 1, ABILITY[a.kind])
  }
  if (card.incarnation) {
    r.set('g.incarnation', 1, INCARNATION[card.incarnation])
    r.set('g.isIncarnation', 1)
  }
  if (isSkeleton(id)) r.set('g.skeleton', 1)
  if (isSummonCard(id)) r.set('g.summon', 1)
  if (card.expansion === 'whiteMoon') r.set('g.expansion', 1, 0)
  if (card.expansion === 'blackSecret') r.set('g.expansion', 1, 1)
}

/** Ghost cards no one has seen yet in this game (the deck draws from these). */
export function unseenPool(s: GameState): { ghosts: string[]; incarnations: string[] } {
  const seen = new Set<string>(s.discard)
  for (const ref of ALL_SPACES) {
    const g = ghostAt(s, ref)
    if (g) seen.add(g.card)
  }
  const p = s.prompt
  if (p && (p.kind === 'placeGhost' || p.kind === 'wuFengGhost')) seen.add(p.card)
  const ghosts = [...baseGhostIds(), ...(s.whiteMoon ? whiteMoonGhostIds() : []), ...(s.blackSecret ? blackSecretGhostIds() : [])].filter((id) => !seen.has(id))
  const incarnations = s.blackSecret ? [...s.blackSecret.incarnationHand, ...s.blackSecret.incarnationPile] : incarnationIds().filter((id) => !seen.has(id))
  return { ghosts, incarnations }
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

function encodeGlobal(ctx: Ctx, r: Row): void {
  const { s, f } = ctx
  r.set('bias', 1)
  r.set('turn', s.turn / 100)
  r.set('phase', 1, s.phase === 'yin' ? 0 : s.phase === 'yang' ? 1 : 2)
  r.set('activeRel', 1, f.seat(s.active))
  r.set('decider', 1, f.seat(decider(s)))
  r.set('difficulty', 1, DIFFICULTY[s.config.difficulty])
  r.set('players', 1, Math.max(1, playerCount(s)) - 1)
  if (s.whiteMoon) r.set('expansions', 1, 0)
  if (s.blackSecret) r.set('expansions', 1, 1)
  const wf = s.deck.filter(isWuFengCard).length
  r.set('deck', s.deck.length / 50)
  r.set('deckGhosts', (s.deck.length - wf) / 50)
  r.set('wuFengInDeck', wf / 4)
  const next = s.deck.findIndex(isWuFengCard)
  if (next >= 0) {
    r.set('nextWuFeng', (next + 1) / 30)
    r.set('nextWuFengInv', 1 / (next + 1))
    r.set('hasNextWuFeng', 1)
  }
  let inPlay = 0
  let ghosts = 0
  for (const ref of ALL_SPACES) {
    const g = ghostAt(ctx.s, ref)
    if (!g) continue
    ghosts++
    if (cardOnBoard(g.card, ref.board).incarnation) inPlay++
  }
  r.set('incarnationsInPlay', inPlay / 2)
  r.set('ghostsInPlay', ghosts / 12)
  r.set('freeSpaces', (12 - ghosts) / 12)
  r.set('discard', s.discard.length / 50)
  const haunted = s.village.filter((t) => t.haunted).length
  r.set('haunted', haunted / 3)
  r.set('hauntedN', 1, Math.min(3, haunted))
  r.set('templeBuddhas', s.templeBuddhas / 2)
  for (const c of TAO_COLORS) r.set('taoSupply', s.taoSupply[c] / 10, relTao(f, c))
  r.set('centerPowerTokens', s.centerPowerTokens / 3)
  r.set('mantra', 1, ['ready', 'placed', 'cooldown', 'removed'].indexOf(s.mantra))
  if (taoBlocked(s)) r.set('taoBlocked', 1)
  if (!whiteIsWild(s)) r.set('whiteNotWild', 1)
  r.set('capturedDice', capturedDice(s) / 2)
  if (powersSuppressed(s)) r.set('powersSuppressed', 1)
  // The unseen ghosts.
  const pool = unseenPool(s)
  const n = pool.ghosts.length
  r.set('poolSize', n / 50)
  if (n > 0) {
    r.set('poolInDeck', Math.min(1, (s.deck.length - wf) / n))
    let group = 0
    for (const id of pool.ghosts) {
      const card = getCard(id)
      r.add('poolColor', 1 / n, relTao(f, card.color))
      const kinds = new Set([...card.left, ...card.center, ...card.right].map((a) => a.kind))
      for (const k of kinds) r.add('poolAbility', 1 / n, ABILITY[k])
      if ([...card.left, ...card.center, ...card.right].some((a) => a.group)) group++
      const res = Object.values(card.resistance).reduce((k, v) => k + (v ?? 0), 0)
      r.add('poolRes', 1 / n, Math.min(4, Math.max(1, res)) - 1)
    }
    r.set('poolGroup', group / n)
  }
  for (const id of pool.incarnations) {
    if (isSummonCard(id)) continue
    const inc = getCard(id).incarnation
    if (inc) r.set('poolIncarnation', 1, INCARNATION[inc])
  }
  // The Yang phase so far.
  const y = s.yang
  if (y) {
    r.set('yang', 1)
    r.set('yMoved', y.moved ? 1 : 0)
    r.set('yHelps', y.helps / 2)
    r.set('yExorcisms', y.exorcisms / 2)
    r.set('ySaves', y.saves / 2)
    r.set('yDemonExorcisms', y.demonExorcisms / 2)
    r.set('yStep3', y.step3 ? 1 : 0)
    r.set('yNewBuddhas', y.newBuddhas / 2)
    r.set('yNewCrystals', y.newCrystals / 2)
    r.set('yClimbed', y.climbed ? 1 : 0)
    r.set('yMoves', y.moves / 2)
    r.set('yClimbs', y.climbs / 2)
  }
  for (const e of s.queue) r.set('queue', 1, EFFECT_INDEX.get((e as { k: string }).k) ?? N_EFFECT - 1)
  r.set('queueLen', s.queue.length / 10)
  r.set('outcome', 1, !s.outcome ? 0 : s.outcome.result === 'win' ? 1 : 2 + LOSS[s.outcome.reason])
  // White Moon.
  const wm = s.whiteMoon
  if (wm) {
    r.set('wmCrystalReserve', wm.crystalReserve / 10)
    for (const c of ['nw', 'ne', 'sw', 'se'] as Corner[]) if (wm.receptacles[c]) r.set('wmReceptacles', 1, f.corner(c))
    if (wm.suLing) r.set('wmSuLingPlaced', 1)
    if (wm.suLingEvent) r.set('wmSuLingEvent', 1)
    if (wm.barrierPending) r.set('wmBarrierPending', 1)
    if (wm.barrier) {
      r.set('wmBarrier', 1)
      r.set('wmBarrierCrystals', wm.barrier.crystals / 4)
      for (const c of wm.barrier.order) r.set('wmBarrierOrder', 1, f.seat(c))
    }
    r.set('wmSaved', wm.saved.length / 12)
    r.set('wmDead', wm.dead.length / 12)
    r.set('wmHidden', s.village.reduce((k, t) => k + Math.max(0, t.villagers.length - 1), 0) / 12)
  }
  // Black Secret.
  const bs = s.blackSecret
  if (bs) {
    r.set('bsIncarnationPool', (bs.incarnationHand.length + bs.incarnationPile.length) / 10)
    r.set('bsIncarnationHand', bs.incarnationHand.length / 4)
    for (const id of [...bs.incarnationHand, ...bs.incarnationPile]) {
      const inc = getCard(id).incarnation
      if (inc) r.set('bsIncarnationPoolIds', 1, INCARNATION[inc])
    }
    r.set('bsUrns', bs.urns / 3)
    r.set('bsSkeletonsLeft', bs.skeletonsLeft / 3)
    r.set('bsCurseHand', bs.curseHand.length / 14)
    for (const t of bs.curseHand) r.add('bsCurseHandLevel', 1 / 4, t.level - 1)
    for (const t of bs.curseReserve) r.add('bsCurseReserveLevel', 1 / 4, t.level - 1)
    r.set('bsMantraDeck', bs.mantraDeck.length / 10)
    for (const m of bs.mantraDeck) r.add('bsMantraDeckEffect', 1 / 4, MANTRA_EFFECT[m.effect])
    r.set('bsPendingSummons', bs.pendingSummons / 2)
    r.set('bsShadow', 1, !bs.shadow ? 0 : bs.shadow.where === 'village' ? 1 : 2)
    for (const st of bs.catacombs) for (const k of st) r.add('bsCatacombTokens', 1 / 9, CATACOMB_TOKEN[k])
  }
}

function encodePrompt(ctx: Ctx, r: Row): void {
  const { s, f, me } = ctx
  const p = s.prompt
  if (!p) return
  r.set('present', 1)
  r.set('kind', 1, PROMPT_KIND[p.kind])
  if (p.owner === me) r.set('ownerMe', 1)
  if (p.owner === 'wufeng') r.set('ownerWuFeng', 1)
  else r.set('ownerRel', 1, f.seat(p.owner))
  if ('options' in p) r.set('nOptions', p.options.length / 12)
  if ('taoist' in p && p.taoist) r.set('taoistRel', 1, f.seat(p.taoist))
  if ('board' in p && p.board) r.set('boardRel', 1, f.seat(p.board))
  const dice = (ds: readonly string[]) => {
    for (const d of ds) r.add('dice', 1 / 4, d === 'white' ? 5 : relTao(f, d as TaoColor))
    r.set('nDice', ds.length / 4)
  }
  switch (p.kind) {
    case 'placeGhost':
    case 'wuFengGhost':
      writeGhost(f, r, getCard(p.card), p.card)
      break
    case 'curseReroll':
      r.set('curseFace', 1, ['blank', 'haunt', 'ghost', 'loseTao', 'loseQi'].indexOf(p.face))
      break
    case 'discardTao':
    case 'gainTao':
      r.set('count', p.count / 4)
      break
    case 'exorcism': {
      const roll = p.roll
      dice(roll.dice)
      if (roll.canReroll) r.set('canReroll', 1)
      r.set('mode', 1, ['exorcism', 'kungFu', 'barrier', 'demon'].indexOf(roll.mode))
      if (roll.scope) r.set('scope', 1, roll.scope === 'ownColor' ? 0 : roll.scope === 'black' ? 1 : 2)
      r.set('nTargets', roll.targets.length / 4)
      r.set('nDemons', roll.demons.length / 3)
      r.set('taoistRel', 1, f.seat(roll.actor))
      if (roll.barrierBoard) r.set('boardRel', 1, f.seat(roll.barrierBoard))
      break
    }
    case 'herbalist':
      dice(p.dice)
      if (p.canReroll) r.set('canReroll', 1)
      break
    case 'inherit':
      r.set('artifact', 1, ARTIFACT[p.artifact])
      break
    case 'suLingCrystal':
      r.set('corner', 1, f.corner(p.corner))
      break
    case 'wuFengDemon':
      r.set('demon', 1, DEMON[p.demon])
      break
    case 'mantraTarget':
      r.set('mantraEffect', 1, MANTRA_EFFECT[p.mantra])
      break
    case 'mantraQi':
      r.set('mantraMode', 1, p.mode === 'qi' ? 0 : 1)
      break
    case 'wuFengCurseTarget':
      r.set('curseTarget', 1, p.effect === 'removeLadder' ? 0 : 1)
      break
    case 'shadowAttack':
      r.set('shadowHits', p.hits / 3)
      break
    default:
      break
  }
}

function encodeSeat(ctx: Ctx, c: Color, r: Row): void {
  const { s, f, me } = ctx
  const b = s.boards[c]
  const t = s.taoists[c]
  const rel = f.seat(c)
  r.set('bias', 1)
  r.set('rel', 1, rel)
  if (c === me) r.set('me', 1)
  if (c === s.active) r.set('active', 1)
  r.set('turnsUntil', 1, (rel - f.seat(s.active) + 4) % 4)
  if (!b.neutral) r.set('player', 1)
  if (t.alive) r.set('alive', 1)
  if (!b.neutral && !t.alive) r.set('dead', 1)
  if (b.possessed) r.set('possessed', 1)
  if (b.neutral) r.set('neutralQi', b.qi / 3)
  if (t.alive) {
    r.set('qi', t.qi / 4)
    r.set('qiN', 1, Math.min(6, t.qi))
    let total = 0
    for (const col of TAO_COLORS) {
      total += t.tao[col]
      r.set('tao', t.tao[col] / 4, relTao(f, col))
    }
    r.set('taoTotal', total / 10)
    if (t.yinYang) r.set('yinYang', 1)
    r.set('buddhas', t.buddhas / 2)
    if (s.yang && s.active === c) r.set('newBuddhas', s.yang.newBuddhas / 2)
    r.set('powerTokens', t.powerTokens / 3)
    r.set('crystals', t.crystals / 3)
    for (const a of t.artifacts) r.add('artifacts', 1, ARTIFACT[a])
    r.set('tile', 1, t.tile == null ? 9 : f.tile(t.tile))
    if (t.underground) r.set('underground', 1)
    r.set('exorcismDice', exorcismDice(s, c) / 4)
  } else {
    r.set('tile', 1, 9)
  }
  r.set('power', 1, POWER[b.power])
  if (boardPowerActive(s, c)) r.set('powerActive', 1)
  if (hasPower(s, c, b.power)) r.set('hasOwnPower', 1)
  if (s.yang?.usedPowers.includes(b.power)) r.set('powerUsed', 1)
  if (s.yang?.borrowed.includes(b.power)) r.set('powerBorrowed', 1)
  if (s.phase === 'yang' && borrowablePowers(s, s.active).includes(c)) r.set('borrowable', 1)
  if (s.blackSecret?.cursedBoards.includes(c)) r.set('cursedBoard', 1)
  if (bloodBrotherPower(s, c)) r.set('bloodBrother', 1)
  let ghosts = 0
  let haunters = 0
  let tormentors = 0
  for (let i = 0; i < 3; i++) {
    const g = b.spaces[i]
    if (!g) continue
    ghosts++
    const ref = { board: c, space: i as 0 | 1 | 2 }
    if (centerActive(s, ref, 'haunter')) haunters++
    if (centerActive(s, ref, 'tormentor')) tormentors++
  }
  r.set('ghosts', ghosts / 3)
  r.set('free', (3 - ghosts) / 3)
  r.set('boardBuddhas', b.buddhas.filter(Boolean).length / 3)
  r.set('haunters', haunters / 3)
  r.set('tormentors', tormentors / 3)
}

function encodeTile(ctx: Ctx, t: TileIdx, r: Row): void {
  const { s, f, me } = ctx
  const tile = s.village[t]!
  const pos = f.tile(t)
  r.set('bias', 1)
  r.set('kind', 1, TILE_KIND[tile.kind])
  if (tile.haunted) r.set('haunted', 1)
  if (tile.kind === 'circleOfPrayer') r.set('circleToken', 1, tile.circleToken ? relTao(f, tile.circleToken) : 5)
  r.set('pos', 1, pos)
  if (pos === 4) r.set('center', 1)
  else if (pos % 2 === 0) r.set('corner', 1)
  else r.set('edge', 1)
  let n = 0
  for (const c of COLORS) {
    const x = s.taoists[c]
    if (x.alive && x.tile === t && !x.underground) {
      r.set('taoists', 1, f.seat(c))
      n++
      if (c === me) r.set('me', 1)
    }
  }
  r.set('nTaoists', n / 4)
  if (ctx.myTile != null) {
    const d = Math.max(Math.abs((t % 3) - (ctx.myTile % 3)), Math.abs(Math.floor(t / 3) - Math.floor(ctx.myTile / 3)))
    r.set('dist', 1, d)
  }
  if (ctx.reachable.has(t)) r.set('reachable', 1)
  let facedGhosts = 0
  let facedFree = 0
  for (const ref of ALL_SPACES) {
    if (facingTile(ref) !== t) continue
    if (ghostAt(s, ref)) facedGhosts++
    else facedFree++
  }
  r.set('facedGhosts', facedGhosts / 2)
  r.set('facedFree', facedFree / 2)
  r.set('hauntNext', ctx.hauntNext[t]! / 2)
  r.set('hauntLater', ctx.hauntLater[t]! / 2)
  if (tile.kind === 'buddhistTemple') r.set('templeBuddhas', s.templeBuddhas / 2)
  if (t === 4) r.set('centerTokens', s.centerPowerTokens / 3)
  if (s.whiteMoon) {
    r.set('wmVillagers', tile.villagers.length / 3)
    const top = tile.villagers[tile.villagers.length - 1]
    if (top) {
      r.set('wmTopFamily', 1, FAMILY[top.family])
      r.set('wmTopMember', top.member / 2)
    }
    if (tile.portal) r.set('wmPortal', 1)
    const corner = CORNER_OF_TILE[t]
    if (corner && s.whiteMoon.receptacles[corner]) r.set('wmReceptacle', 1)
  }
  if (s.blackSecret) {
    if (tile.ladder) r.set('bsLadder', 1)
    if (shadowOnTile(s, t)) r.set('bsShadow', 1)
  }
}

function encodeSpace(ctx: Ctx, ref: GhostRef, r: Row): void {
  const { s, f } = ctx
  const b = s.boards[ref.board]
  const slot = f.space(ref)
  r.set('bias', 1)
  r.set('seat', 1, Math.floor(slot / 3))
  r.set('idx', 1, slot % 3)
  if (ref.board === ctx.me) r.set('mine', 1)
  if (ref.board === s.active) r.set('activeBoard', 1)
  if (b.buddhas[ref.space]) r.set('buddha', 1)
  const faced = facingTile(ref)
  r.set('faces', 1, f.tile(faced))
  if (s.village[faced]!.haunted) r.set('facesHaunted', 1)
  r.set('lineHaunted', lineOf(ref).filter((i) => s.village[i]!.haunted).length / 3)
  const corner = cornerOfSpace(ref)
  if (corner) {
    r.set('cornerSpace', 1)
    if (s.whiteMoon?.receptacles[corner]) r.set('wmReceptacle', 1)
  }
  if (suLingAt(s, ref)) r.set('wmSuLing', 1)
  if (ctx.reachable.has(faced)) r.set('reachable', 1)
  const g: GhostInstance | null = ghostAt(s, ref)
  if (!g) {
    r.set('empty', 1)
    r.set('figure', 1, 0)
    return
  }
  const card = cardOnBoard(g.card, ref.board)
  writeGhost(f, r, card, g.card)
  r.set('figure', 1, g.figure === null ? 0 : g.figure === 'card' ? 1 : 2)
  if (g.mantra) r.set('mantra', 1)
  CENTER_ABILITIES.forEach((k, i) => {
    if (centerActive(s, ref, k)) r.set('centerActive', 1, i)
  })
  if (exorcismBlocker(s, ref)) r.set('blocked', 1)
  const need = ghostRequirement(s, ref, 'exorcism')
  for (const c of TAO_COLORS) if (need.base[c]) r.set('need', need.base[c]! / 4, relTao(f, c))
  r.set('needDiscounts', need.discounts / 2)
  const target = ctx.haunt.get(`${ref.board}:${ref.space}`)
  if (target != null) r.set('hauntTarget', 1, f.tile(target))
}

function encodeFamily(ctx: Ctx, id: keyof typeof FAMILY, r: Row): void {
  const { s } = ctx
  const wm = s.whiteMoon!
  const fam = FAMILIES[id]
  r.set('bias', 1)
  r.set('id', 1, FAMILY[id])
  r.set('size', 1, fam.size - 1)
  const saved = wm.saved.filter((v) => v.family === id).length
  const dead = wm.dead.filter((v) => v.family === id).length
  let visible = 0
  let hidden = 0
  for (const t of s.village) {
    t.villagers.forEach((v, i) => {
      if (v.family !== id) return
      if (i === t.villagers.length - 1) visible++
      else hidden++
    })
  }
  r.set('saved', saved / fam.size)
  r.set('dead', dead / fam.size)
  r.set('visible', visible / fam.size)
  r.set('hidden', hidden / fam.size)
  if (saved === fam.size) r.set('complete', 1)
  if (dead > 0) r.set('wiped', 1)
}

function encodeCatacomb(ctx: Ctx, i: number, r: Row): void {
  const { s, f } = ctx
  const bs = s.blackSecret!
  r.set('bias', 1)
  r.set('pos', 1, f.tile(i))
  r.set('color', 1, relTao(f, bs.catacombColors[i]!))
  r.set('height', bs.catacombs[i]!.length / 3)
  if (s.village[i]!.ladder) r.set('ladder', 1)
  if (CATACOMB_SIDES[s.config.blackSecret!.side].entrances.includes(i)) r.set('entrance', 1)
  for (const c of COLORS) {
    const t = s.taoists[c]
    if (t.alive && t.underground && t.tile === i) r.set('taoists', 1, f.seat(c))
  }
  r.set('demons', bs.demons.filter((d) => d.space === i).length / 3)
  if (bs.shadow?.where === 'catacombs' && bs.shadow.tile === i) r.set('shadow', 1)
}

function encodeDemon(ctx: Ctx, id: string, r: Row): void {
  const { s, f } = ctx
  const bs = s.blackSecret!
  const d = bs.demons.find((x) => x.id === id)!
  r.set('bias', 1)
  r.set('id', 1, DEMON[d.id])
  r.set('cost', d.cost / 4)
  r.set('resistance', d.resistance / 3)
  if (d.space == null) r.set('onBoard', 1)
  else {
    r.set('pos', 1, f.tile(d.space))
    r.set('color', 1, relTao(f, bs.catacombColors[d.space]!))
  }
  if (d.banished) r.set('banished', 1)
  if (d.mantra) r.set('mantra', 1)
}

function encodeCurses(ctx: Ctx, row: (type: TokenType, slot: number) => Row): void {
  const { s, f } = ctx
  const bs = s.blackSecret!
  let slot = 0
  for (const level of [1, 2, 3, 4] as const) {
    bs.pyramid[level].forEach((t, i) => {
      const k = slot++
      if (!t) return
      const r = row('curse', k)
      r.set('bias', 1)
      r.set('slot', 1, i)
      r.set('level', 1, t.level - 1)
      r.set('revealed', 1)
      r.set('color', 1, relTao(f, t.color))
      r.set('effect', 1, CURSE_EFFECT[t.effect])
    })
  }
  bs.curseHand.slice(0, TOKEN.curse.slots - CURSE_PYRAMID_SLOTS).forEach((t, i) => {
    const r = row('curse', CURSE_PYRAMID_SLOTS + i)
    r.set('bias', 1)
    r.set('inHand', 1)
    r.set('level', 1, t.level - 1)
    if (t.revealed) {
      r.set('revealed', 1)
      r.set('color', 1, relTao(f, t.color))
      r.set('effect', 1, CURSE_EFFECT[t.effect])
    }
  })
}

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

function buildRelations(ctx: Ctx, present: Uint8Array, rel: Uint8Array): void {
  const { s } = ctx
  const N = N_TOKENS
  const set = (a: number, b: number, r: number) => {
    if (!present[a] || !present[b] || a === b) return
    rel[a * N + b] = r
    rel[b * N + a] = r
  }
  const G = TOKEN.global.start
  const P = TOKEN.prompt.start
  for (let i = 0; i < N; i++) {
    if (!present[i]) continue
    rel[i * N + i] = REL.self
    set(G, i, REL.global)
    set(P, i, REL.global)
  }
  // Village geometry.
  for (let t = 0; t < 9; t++) for (const u of adjacentTiles(t)) set(ctx.tileSlot(t), ctx.tileSlot(u), REL.adjacent)
  for (const ref of ALL_SPACES) {
    const sp = ctx.spaceSlot(ref)
    const line = lineOf(ref)
    set(sp, ctx.tileSlot(line[0]!), REL.faces)
    set(sp, ctx.tileSlot(line[1]!), REL.line)
    set(sp, ctx.tileSlot(line[2]!), REL.line)
    set(sp, ctx.seatSlot(ref.board), REL.board)
    set(sp, ctx.spaceSlot({ board: OPPOSITE[ref.board], space: ref.space }), REL.opposite)
    for (const other of [0, 1, 2] as const) if (other !== ref.space) set(sp, ctx.spaceSlot({ board: ref.board, space: other }), REL.sameBoard)
    const target = ctx.haunt.get(`${ref.board}:${ref.space}`)
    if (target != null) set(sp, ctx.tileSlot(target), REL.hauntTarget)
  }
  // Where the Taoists stand.
  for (const c of COLORS) {
    const t = s.taoists[c]
    if (!t.alive || t.tile == null) continue
    if (t.underground) set(ctx.seatSlot(c), ctx.catacombSlot(t.tile), REL.underground)
    else set(ctx.seatSlot(c), ctx.tileSlot(t.tile), REL.onTile)
    for (const o of COLORS) {
      const u = s.taoists[o]
      if (o !== c && u.alive && u.tile === t.tile && u.underground === t.underground) set(ctx.seatSlot(c), ctx.seatSlot(o), REL.sameTile)
    }
  }
  if (s.whiteMoon) {
    for (const t of s.village) {
      const top = t.villagers[t.villagers.length - 1]
      if (top) set(ctx.familySlot(top.family), ctx.tileSlot(t.idx), REL.family)
    }
  }
  const bs = s.blackSecret
  if (bs) {
    for (let i = 0; i < 9; i++) {
      set(ctx.catacombSlot(i), ctx.tileSlot(i), REL.under)
      for (const j of adjacentTiles(i)) set(ctx.catacombSlot(i), ctx.catacombSlot(j), REL.catacombAdjacent)
    }
    for (const d of bs.demons) if (d.space != null) set(ctx.demonSlot(d.id), ctx.catacombSlot(d.space), REL.demonAt)
    if (bs.shadow) set(G, bs.shadow.where === 'village' ? ctx.tileSlot(bs.shadow.tile) : ctx.catacombSlot(bs.shadow.tile), REL.shadow)
  }
  // What the open prompt is about.
  const p = s.prompt
  if (p) {
    const refs: number[] = []
    if ('options' in p) {
      for (const o of p.options as unknown[]) {
        if (typeof o === 'string' && (COLORS as readonly string[]).includes(o)) refs.push(ctx.seatSlot(o as Color))
        else if (o && typeof o === 'object' && 'board' in o) refs.push(ctx.spaceSlot(o as GhostRef))
        else if (typeof o === 'number' && (p.kind === 'devour' || p.kind === 'restoreTile' || p.kind === 'wuFengCurseTarget')) refs.push(ctx.tileSlot(o))
        else if (typeof o === 'number' && p.kind === 'mantraQi' && o < TOKEN.mantra.slots) refs.push(ctx.mantraSlot(o))
      }
    }
    if ('taoist' in p && p.taoist) refs.push(ctx.seatSlot(p.taoist))
    if ('board' in p && p.board) refs.push(ctx.seatSlot(p.board))
    if (p.kind === 'exorcism') {
      refs.push(ctx.seatSlot(p.roll.actor))
      for (const t of p.roll.targets) refs.push(ctx.spaceSlot(t))
      for (const d of p.roll.demons) refs.push(ctx.demonSlot(d))
    }
    for (const x of refs) set(P, x, REL.prompt)
  }
}
