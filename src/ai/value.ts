// The position score used at the end of every rollout, and the ghost-cost
// model shared with the quick policy. Higher is better for the Taoists.
// Uses only public information.

import { isSkeleton, totalResistance } from '@/game/catalogue'
import { facingTile, lineOf } from '@/game/geometry'
import {
  exorcismBlocker,
  exorcismDice,
  ghostsInPlay,
  hasPower,
  hauntedCount,
  incarnationInPlay,
  incarnationsInDeck,
  suLingAt,
  taoBlocked,
  whiteIsWild,
  type PlacedGhost,
} from '@/game/rules'
import { coverChance, reqsOf } from './prob'
import type { Color, GameState, TaoColor, Taoist } from '@/game/types'
import { COLORS, TAO_COLORS } from '@/game/types'
import { W } from './tuning'

/** The cost of one more haunted tile, given `h` already haunted. */
export function hauntCost(h: number): number {
  if (h >= 2) return W.thirdHaunt
  return h === 1 ? W.h2 - W.h1 : W.h1
}

/** Total penalty for `h` haunted tiles. */
export function hauntedPenalty(h: number): number {
  return h <= 0 ? 0 : h === 1 ? W.h1 : W.h2
}

/** How much this ghost hurts the Taoists while it stays in play. */
export function ghostCost(s: GameState, g: PlacedGhost, h = hauntedCount(s)): number {
  if (isSkeleton(g.ghost.card)) return W.skeleton
  const c = g.card
  let v = W.ghostBase + W.ghostRes * totalResistance(c)
  if (c.incarnation) v += W.incarnation
  const held = suLingAt(s, g.ref)
  for (const a of c.center) {
    if (held && (a.kind === 'haunter' || a.kind === 'tormentor' || a.kind === 'devourer')) continue
    switch (a.kind) {
      case 'haunter': {
        // Nothing left to haunt in front of it: harmless as a haunter.
        if (!lineOf(g.ref).some((t) => !s.village[t]!.haunted)) break
        v += (g.ghost.figure === 'stone' ? W.haunterStone : W.haunterCard) * hauntCost(h)
        break
      }
      case 'tormentor':
        v += W.tormentor + hauntCost(h) / 6
        break
      case 'devourer':
        v += W.devourer
        break
      case 'powerBlocker':
        v += W.powerBlocker * (a.group ? 2.5 : 1)
        break
      case 'taoBlocker':
        v += W.taoBlocker
        break
      case 'dieCaptor':
        v += W.dieCaptor
        break
      case 'diceImmune':
        v += W.diceImmune
        break
      default:
        break
    }
  }
  if (c.incarnation === 'deathArmy') v += W.tormentor * 3
  return v
}

/** Score of a board's crowding (negative). */
export function crowdCost(n: number): number {
  return n >= 3 ? W.full : n === 2 ? W.two : 0
}

/** Tao each colour of the ghosts in play needs (for valuing tokens). */
export function colourNeeds(s: GameState): Record<TaoColor, number> {
  const need: Record<TaoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
  for (const g of ghostsInPlay(s)) for (const c of TAO_COLORS) need[c] += g.card.resistance[c] ?? 0
  return need
}

export function taoValue(t: Taoist, need: Record<TaoColor, number>): number {
  let n = 0
  let match = 0
  for (const c of TAO_COLORS) {
    n += t.tao[c]
    match += Math.min(t.tao[c], Math.max(0, need[c] - 1))
  }
  return Math.min(n, W.taoCap) * W.tao + Math.max(0, n - W.taoCap) * W.taoExtra + match * W.taoMatch
}

export function qiValue(qi: number): number {
  if (qi <= 1) return 0
  let v = W.qi2
  if (qi >= 3) v += W.qi3
  if (qi >= 4) v += W.qi4
  if (qi >= 5) v += W.qiMore * Math.min(3, qi - 4)
  return v
}

/**
 * How ready the Taoists are to exorcise this incarnation: the best chance any
 * one of them would have from the tile facing it, with their own Tao plus
 * that of the Taoists already standing there.
 */
export function readiness(s: GameState, g: PlacedGhost): number {
  if (exorcismBlocker(s, g.ref)) return 0
  const tile = facingTile(g.ref)
  const reqs = reqsOf(s, s.active, [g.ref])
  const wild = whiteIsWild(s)
  const blocked = taoBlocked(s)
  const there = COLORS.filter((c) => s.taoists[c].alive && s.taoists[c].tile === tile && !s.taoists[c].underground)
  let best = 0
  for (const c of COLORS) {
    const t = s.taoists[c]
    if (!t.alive || t.underground) continue
    const tokens: Record<TaoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
    let crystals = 0
    for (const o of new Set([c, ...there])) {
      crystals += s.taoists[o].crystals
      if (!blocked) for (const x of TAO_COLORS) tokens[x] += s.taoists[o].tao[x]
    }
    best = Math.max(best, coverChance(reqs, exorcismDice(s, c), wild, tokens, crystals, hasPower(s, c, 'godsFavorite')))
  }
  return best
}

/** How good the position is for the Taoists. */
export function evaluate(s: GameState): number {
  if (s.phase === 'gameOver') {
    // Losing later is a little better than losing sooner (a tie-break in lost causes).
    return s.outcome?.result === 'win' ? W.winValue : -W.lossValue + (60 - s.deck.length) * 0.5
  }
  let v = 0
  const h = hauntedCount(s)
  v -= hauntedPenalty(h)
  for (const t of s.village) if (t.haunted) v -= W.tileHaunted[t.kind] ?? 0
  const need = colourNeeds(s)
  for (const c of COLORS) {
    const t = s.taoists[c]
    const b = s.boards[c]
    if (b.neutral) {
      v += b.possessed ? -W.possessed : b.qi * W.neutralQi
      continue
    }
    if (!t.alive) {
      v -= W.dead
      continue
    }
    v += qiValue(t.qi) + taoValue(t, need)
    v += t.buddhas * W.buddhaHeld + (t.yinYang ? W.yinYang : 0) + t.powerTokens * W.powerToken + t.crystals * W.crystal
  }
  for (const g of ghostsInPlay(s)) v -= ghostCost(s, g, h)
  for (const c of COLORS) {
    const b = s.boards[c]
    v -= crowdCost(b.spaces.filter(Boolean).length)
    for (let i = 0; i < 3; i++) if (b.buddhas[i] && !b.spaces[i]) v += W.buddhaOnBoard
  }
  const circle = s.village.find((t) => t.kind === 'circleOfPrayer')
  if (circle?.circleToken && !circle.haunted) v += need[circle.circleToken] > 0 ? W.circle * (1 + Math.min(4, need[circle.circleToken]) * 0.5) : W.circle * 0.5
  if (W.incReady > 0) for (const g of ghostsInPlay(s)) if (g.card.incarnation) v += W.incReady * readiness(s, g)
  // Drawing through the deck brings Wu-Feng closer; once he is out, the cards left are the time left.
  if (incarnationInPlay(s) && incarnationsInDeck(s) === 0) v += s.deck.length * W.clock
  else v -= s.deck.length * W.progress
  if (s.whiteMoon) v += s.whiteMoon.saved.length * W.villagerSaved - s.whiteMoon.dead.length * W.villagerDead
  return v
}

export type { Color }
