// The turn engine: an effect queue resolved front-first until the game needs
// a decision (a prompt) or the active Taoist's Yang phase begins.
//
// Turn order (rules summary, "Game Turn"):
//   Yin phase — 1. ghosts' actions (a. Haunters, b. Tormentors)
//               2. board overrun? (3 ghosts: lose 1 Qi, skip step 3)
//               3. arrival of a ghost (player boards only)
//   Yang phase — the Taoist (see yang.ts); neutral / possessed boards have none.

import { getCard } from './catalogue'
import { lineOf, spacesLeftToRight } from './geometry'
import {
  ask,
  CURSE_TEXT,
  checkLoss,
  checkWin,
  discardAllTao,
  ev,
  gainQi,
  hauntInFront,
  hauntTile,
  loseQi,
  now,
  placeCard,
  returnTao,
  rollCurse,
  takeTao,
} from './ops'
import {
  boardName,
  COLOR_NAME,
  decider,
  findGhost,
  freeSpaces,
  ghostsInPlay,
  hasPower,
  heldColors,
  livingTaoists,
  suLingAt,
  taoCount,
} from './rules'
import type { Color, CurseContext, Effect, GameState, YangState } from './types'
import { COLORS, TAO_COLORS } from './types'
import { wmEffect, wmDevour, wmFlee } from './whiteMoon'
import { bsArrival, bsEffect } from './blackSecret'

/** Resolve queued effects until a prompt is open, the queue is empty, or the game ends. */
export function run(s: GameState): void {
  for (let guard = 0; guard < 5000; guard++) {
    if (s.phase === 'gameOver' || s.prompt) return
    if (checkLoss(s)) return
    const e = s.queue.shift()
    if (!e) {
      if (checkWin(s)) return
      // A Taoist who dies during their own Yang phase ends their turn.
      if (s.phase === 'yang' && !s.taoists[s.active].alive) {
        s.queue.push({ k: 'endTurn' })
        continue
      }
      return
    }
    handle(s, e)
    if (checkLoss(s)) return
  }
  throw new Error('engine: the effect queue did not settle')
}

export function freshYang(): YangState {
  return {
    moved: false,
    helps: 0,
    exorcisms: 0,
    saves: 0,
    demonExorcisms: 0,
    step3: false,
    usedPowers: [],
    borrowed: [],
    newBuddhas: 0,
    newCrystals: 0,
    climbed: false,
    moves: 0,
    climbs: 0,
  }
}

function handle(s: GameState, e: Effect): void {
  switch (e.k) {
    case 'beginTurn':
      return beginTurn(s)
    case 'yinSteps':
      return yinSteps(s)
    case 'bonecracker':
      return bonecracker(s, e.uid)
    case 'haunter':
      return haunter(s, e.uid)
    case 'tormentor':
      return tormentor(s, e.uid)
    case 'devourer': {
      const g = findGhost(s, e.uid)
      if (!g) return
      if (suLingAt(s, g.ref)) return ev(s, 'suLing', `Su-Ling holds ${g.card.name} back: it devours no one.`)
      return wmDevour(s, g.ref)
    }
    case 'overrun':
      return overrun(s)
    case 'arrival':
      return arrival(s, e.why)
    case 'leftStone':
      return leftStone(s, e.uid, e.index)
    case 'curse':
      return curse(s, e.ctx)
    case 'curseFace':
      return curseFace(s, e.ctx, e.face)
    case 'loseQi':
      return loseQi(s, e.board, e.why)
    case 'loseTao':
      return loseTao(s, e.taoist, e.count, e.why)
    case 'gainTao':
      return gainTao(s, e.taoist, e.count, e.why)
    case 'qiOrYinYang':
      return qiOrYinYang(s, e.taoist)
    case 'incarnationReward':
      return incarnationReward(s)
    case 'enterYang':
      return enterYang(s)
    case 'endTurn':
      return endTurn(s)
    case 'nextTurn':
      return nextTurn(s)
    case 'suLingPlacement':
    case 'barrierStart':
    case 'barrierNext':
    case 'villagerDeath':
    case 'familySaved':
    case 'inherit':
      return wmEffect(s, e)
    case 'wuFengTurnStart':
    case 'demonPhase':
    case 'shadowPhase':
    case 'catacombToken':
    case 'curseEffect':
    case 'mantraResolve':
    case 'skeleton':
    case 'freeCurse':
    case 'mantraQi':
      return bsEffect(s, e)
  }
}

// ---------------------------------------------------------------------------
// Start of a board's turn
// ---------------------------------------------------------------------------

function beginTurn(s: GameState): void {
  const c = s.active
  const b = s.boards[c]
  const t = s.taoists[c]
  const who = b.neutral ? `the neutral ${c} board` : t.alive ? COLOR_NAME[c] : `${COLOR_NAME[c]}'s possessed board`
  ev(s, 'turn', `Turn ${s.turn} — ${who}`, { color: c })
  if (s.blackSecret && t.alive) now(s, { k: 'wuFengTurnStart' }, { k: 'yinSteps' })
  else now(s, { k: 'yinSteps' })
}

/** Queue the Yin phase of the active board. */
function yinSteps(s: GameState): void {
  const c = s.active
  const steps: Effect[] = []
  // Bonecracker: its host discards a Tao token at the start of each of its Yin phases.
  for (const g of ghostsInPlay(s)) {
    if (g.ref.board === c && g.card.incarnation === 'bonecracker') steps.push({ k: 'bonecracker', uid: g.ghost.uid })
  }
  const order = spacesLeftToRight(c)
  const here = order
    .map((space) => s.boards[c].spaces[space])
    .filter((g): g is NonNullable<typeof g> => !!g)
  if (s.whiteMoon) {
    // White Moon: centre-stone abilities apply ghost by ghost, from right to left.
    for (const g of [...here].reverse()) {
      for (const a of getCard(g.card).center) {
        if (a.kind === 'haunter' || a.kind === 'tormentor' || a.kind === 'devourer') steps.push({ k: a.kind, uid: g.uid })
      }
    }
  } else {
    // a. every Haunter, then b. every Tormentor.
    for (const g of here) if (getCard(g.card).center.some((a) => a.kind === 'haunter')) steps.push({ k: 'haunter', uid: g.uid })
    for (const g of here) if (getCard(g.card).center.some((a) => a.kind === 'tormentor')) steps.push({ k: 'tormentor', uid: g.uid })
  }
  // Death Army: "the active player rolls the curse die each turn" — every board's turn.
  const army = ghostsInPlay(s).find((g) => g.card.incarnation === 'deathArmy')
  if (army) {
    steps.push({
      k: 'curse',
      ctx: { roller: s.taoists[c].alive ? c : null, board: c, haunt: { kind: 'front', ref: army.ref }, why: 'Death Army' },
    })
  }
  steps.push({ k: 'overrun' }, { k: 'enterYang' })
  now(s, ...steps)
}

function bonecracker(s: GameState, uid: number): void {
  if (!findGhost(s, uid)) return
  const t = s.taoists[s.active]
  if (t.alive) {
    now(s, { k: 'loseTao', taoist: t.color, count: 1, why: 'Bonecracker' })
    return
  }
  // On a neutral / possessed board, the players choose who discards.
  const options = livingTaoists(s).filter((x) => taoCount(x) > 0).map((x) => x.color)
  if (options.length === 0) return ev(s, 'note', 'Bonecracker: nobody has a Tao token to discard.')
  if (options.length === 1) return now(s, { k: 'loseTao', taoist: options[0]!, count: 1, why: 'Bonecracker' })
  ask(s, { kind: 'bonecrackerPayer', owner: decider(s), options })
}

// ---------------------------------------------------------------------------
// Yin step 1: ghosts' actions
// ---------------------------------------------------------------------------

function haunter(s: GameState, uid: number): void {
  const g = findGhost(s, uid)
  if (!g) return
  if (suLingAt(s, g.ref)) return ev(s, 'suLing', `Su-Ling holds ${g.card.name} back: its haunting figure stays put.`)
  const name = g.card.name
  if (g.ghost.figure !== 'stone') {
    g.ghost.figure = 'stone'
    ev(s, 'haunter', `${name} (Haunter): its haunting figure steps off the card onto the board.`, { ref: g.ref })
    if (s.whiteMoon) wmFlee(s, g.ref)
    return
  }
  // From the first stone to the edge of the board: haunt, then back to the card.
  g.ghost.figure = 'card'
  ev(s, 'haunter', `${name} (Haunter): its haunting figure reaches the village!`, { ref: g.ref })
  hauntInFront(s, g.ref, `${name}'s haunting`)
}

function tormentor(s: GameState, uid: number): void {
  const g = findGhost(s, uid)
  if (!g) return
  if (suLingAt(s, g.ref)) return ev(s, 'suLing', `Su-Ling holds ${g.card.name} back: no curse die.`)
  const c = s.active
  now(s, {
    k: 'curse',
    ctx: { roller: s.taoists[c].alive ? c : null, board: c, haunt: { kind: 'front', ref: g.ref }, why: `${g.card.name} (Tormentor)` },
  })
}

// ---------------------------------------------------------------------------
// The curse die
// ---------------------------------------------------------------------------

function curse(s: GameState, ctx: CurseContext): void {
  // Strength of a Mountain: "you never roll the curse die". Neutral-board rolls have no roller.
  if (ctx.roller && hasPower(s, ctx.roller, 'strengthOfMountain')) {
    ev(s, 'power', `Strength of a Mountain: ${COLOR_NAME[ctx.roller]} does not roll the curse die (${ctx.why}).`, { color: ctx.roller })
    return
  }
  const face = rollCurse(s)
  if (s.whiteMoon) s.whiteMoon.suLingEvent = true
  const who = ctx.roller ? COLOR_NAME[ctx.roller] : `For ${boardName(s, ctx.board)}, the curse die`
  ev(s, 'curse', ctx.roller ? `${who} rolls the curse die (${ctx.why}): ${CURSE_TEXT[face]}.` : `${who} (${ctx.why}): ${CURSE_TEXT[face]}.`, {
    curse: face,
    color: ctx.roller ?? ctx.board,
  })
  now(s, { k: 'curseFace', ctx, face })
  // The Gods' Favorite: may reroll the curse die once and must keep the second result.
  if (ctx.roller && hasPower(s, ctx.roller, 'godsFavorite')) ask(s, { kind: 'curseReroll', owner: ctx.roller, face })
}

function curseFace(s: GameState, ctx: CurseContext, face: CurseFace): void {
  const t = s.taoists[ctx.board]
  switch (face) {
    case 'blank':
      return
    case 'haunt':
      if (ctx.haunt.kind === 'front') return hauntInFront(s, ctx.haunt.ref, 'curse die')
      hauntTile(s, ctx.haunt.tile, 'curse die')
      return
    case 'ghost':
      return now(s, { k: 'arrival', why: 'curse die' })
    case 'loseTao':
      if (!t.alive) return ev(s, 'note', 'Losing Tao tokens has no effect on a neutral or possessed board.')
      {
        const n = discardAllTao(s, ctx.board)
        ev(s, 'tao', `${COLOR_NAME[ctx.board]} discards all ${n} Tao token${n === 1 ? '' : 's'}.`, { color: ctx.board })
      }
      return
    case 'loseQi':
      return loseQi(s, ctx.board, 'curse die')
  }
}

type CurseFace = import('./types').CurseFace

// ---------------------------------------------------------------------------
// Yin steps 2 and 3
// ---------------------------------------------------------------------------

function overrun(s: GameState): void {
  const c = s.active
  if (s.boards[c].spaces.every(Boolean)) {
    ev(s, 'overrun', `${boardName(s, c)}'s board is overrun by 3 ghosts: lose 1 Qi, and no ghost arrives.`, { color: c })
    loseQi(s, c, 'board overrun')
    return
  }
  // Step 3 happens on player boards only (not neutral or possessed ones).
  if (s.taoists[c].alive) now(s, { k: 'arrival', why: 'Yin phase' })
}

/** "Bring a ghost into play": draw the top card and place it by the placement rules. */
export function arrival(s: GameState, why: string): void {
  if (s.blackSecret) return bsArrival(s, why)
  if (s.deck.length === 0) return ev(s, 'note', 'The ghost deck is empty: no ghost can come.')
  if (freeSpaces(s).length === 0) {
    ev(s, 'note', 'All 12 ghost spaces are occupied: the active player loses 1 Qi instead.')
    return loseQi(s, s.active, 'no room for a ghost')
  }
  const card = s.deck.shift()!
  offerPlacement(s, card, decider(s))
}

/**
 * Red, green, blue and yellow ghosts go on their own board; black ghosts on
 * the active player's board. If that board is full, any other free space.
 * The player chooses among the free spaces.
 */
export function placementOptions(s: GameState, card: string) {
  const def = getCard(card)
  const natural: Color = def.color === 'black' ? s.active : def.color
  const own = freeSpaces(s, natural)
  return own.length > 0 ? own : freeSpaces(s)
}

export function offerPlacement(s: GameState, card: string, owner: import('./types').Seat): void {
  const options = placementOptions(s, card)
  if (options.length === 0) {
    s.deck.unshift(card)
    ev(s, 'note', 'All 12 ghost spaces are occupied: the active player loses 1 Qi instead.')
    return loseQi(s, s.active, 'no room for a ghost')
  }
  ev(s, 'draw', `A ghost comes into play: ${getCard(card).name}.`, { card })
  if (options.length === 1) return placeCard(s, card, options[0]!)
  ask(s, { kind: 'placeGhost', owner, card, options })
}

function leftStone(s: GameState, uid: number, index: number): void {
  const g = findGhost(s, uid)
  if (!g) return
  const ab = g.card.left[index]
  if (!ab) return
  const name = g.card.name
  switch (ab.kind) {
    case 'addGhost':
      return now(s, { k: 'arrival', why: `${name} brings another ghost` })
    case 'hauntTile':
      return hauntInFront(s, g.ref, `${name} arrives`)
    case 'loseQi':
      if (ab.group) {
        // "The group: applies to all players and boards" — possessed and exhausted
        // boards pass their loss to a Taoist of the players' choice.
        return now(s, ...COLORS.map((c) => ({ k: 'loseQi', board: c, why: `${name} (the group)` }) as Effect))
      }
      return loseQi(s, g.ref.board, `${name} arrives`)
    default:
      return
  }
}

// ---------------------------------------------------------------------------
// Tao tokens, rewards
// ---------------------------------------------------------------------------

function loseTao(s: GameState, c: Color, count: number, why: string): void {
  const t = s.taoists[c]
  if (!t.alive) return
  const held = taoCount(t)
  if (held === 0) return ev(s, 'note', `${COLOR_NAME[c]} has no Tao token to lose (${why}).`)
  const n = Math.min(count, held)
  const colors = heldColors(t)
  if (colors.length === 1) {
    returnTao(s, c, colors[0]!, n)
    return ev(s, 'tao', `${COLOR_NAME[c]} discards ${n} ${colors[0]} Tao (${why}).`, { color: c })
  }
  ask(s, { kind: 'discardTao', owner: c, taoist: c, count: n, why })
}

function gainTao(s: GameState, c: Color, count: number, why: string): void {
  const t = s.taoists[c]
  if (!t.alive) return
  const available = TAO_COLORS.filter((x) => s.taoSupply[x] > 0)
  if (available.length === 0) return ev(s, 'note', `The Tao supply is empty: ${COLOR_NAME[c]} gets nothing (${why}).`)
  const total = available.reduce((n, x) => n + s.taoSupply[x], 0)
  const n = Math.min(count, total)
  if (available.length === 1) {
    takeTao(s, c, available[0]!, n)
    return ev(s, 'tao', `${COLOR_NAME[c]} takes ${n} ${available[0]} Tao (${why}).`, { color: c })
  }
  ask(s, { kind: 'gainTao', owner: c, taoist: c, count: n, why })
}

function qiOrYinYang(s: GameState, c: Color): void {
  const t = s.taoists[c]
  if (!t.alive) return
  if (t.yinYang) return gainQi(s, c, 1, 'reward')
  ask(s, { kind: 'qiOrYinYang', owner: c, taoist: c })
}

function incarnationReward(s: GameState): void {
  if (livingTaoists(s).length === 0) return
  ask(s, { kind: 'incarnationReward', owner: decider(s) })
}

// ---------------------------------------------------------------------------
// Yang phase and the end of a turn
// ---------------------------------------------------------------------------

function enterYang(s: GameState): void {
  const c = s.active
  if (!s.taoists[c].alive) {
    // Neutral and possessed boards have no Yang phase.
    now(s, { k: 'endTurn' })
    return
  }
  s.phase = 'yang'
  s.yang = freshYang()
  ev(s, 'yang', `${COLOR_NAME[c]}'s Yang phase.`, { color: c })
}

function endTurn(s: GameState): void {
  const after: Effect[] = []
  if (s.whiteMoon) after.push({ k: 'suLingPlacement' }, { k: 'barrierStart' })
  after.push({ k: 'nextTurn' })
  now(s, ...after)
}

function nextTurn(s: GameState): void {
  s.phase = 'yin'
  s.yang = null
  if (s.mantra === 'cooldown') s.mantra = 'ready'
  if (s.whiteMoon) s.whiteMoon.suLingEvent = false
  if (s.blackSecret) s.blackSecret.cursedBoards = s.blackSecret.cursedBoards.filter((c) => c !== s.active)
  s.active = COLORS[(COLORS.indexOf(s.active) + 1) % 4]!
  s.turn += 1
  now(s, { k: 'beginTurn' })
}

/** Haunt the first active tile on a ghost's line (exported for curses on exorcism). */
export const firstActiveInLine = (s: GameState, ref: import('./types').GhostRef) =>
  lineOf(ref).find((t) => !s.village[t]!.haunted) ?? null
