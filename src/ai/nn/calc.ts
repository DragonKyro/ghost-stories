// Dice maths handed to the network as inputs: the exact chance that an
// exorcism succeeds and the Tao it costs, from the rules (every outcome of the
// Tao dice, the Gods' Favorite reroll, white faces, Tao tokens and crystals,
// the Circle of Prayer and the Mantra). The network still decides whether a
// chance is worth taking and what to spend on it (Tao, Qi, turns); it just
// doesn't have to learn the dice from game results.
//
// Where it goes in (schema.ts): each ghost space (`odds*` / `spend*`: the
// deciding Taoist's chance from the tile facing it), each tile (`odds*`: the
// best chance from there, both ghosts from a corner) and the candidate actions
// (`c*`: exorcisms, moves, the Gods' Favorite reroll, the Mantra, Bottomless
// Pockets). Only public information is used, so sanitized copies get the same
// numbers.

import { covers, minSpend, requirementsFor, spendersFor, type Requirement } from '@/game/exorcism'
import { facedSpaces, facingTile, isCorner } from '@/game/geometry'
import { exorcismBlocker, exorcismDice, ghostAt, hasPower, taoBlocked, whiteIsWild } from '@/game/rules'
import type { Color, DemonId, DieFace, ExorcismRoll, GameState, GhostRef, TaoColor, TileIdx } from '@/game/types'
import { COLORS, TAO_COLORS } from '@/game/types'
import { outcomes } from '../prob'

type Vec = Record<TaoColor, number>

export interface Odds {
  /** P(every target is exorcised). */
  all: number
  /** P(at least one target is exorcised): the same as `all` for one target. */
  any: number
  /** P(every target is exorcised by the dice alone, without Tao or crystals). */
  dice: number
  /** Expected Tao tokens + crystals spent when every target is exorcised (0 when it can't be). */
  spend: number
}

export const NO_ODDS: Readonly<Odds> = { all: 0, any: 0, dice: 0, spend: 0 }

export interface Pool {
  tokens: Vec
  crystals: number
}

const zero = (): Vec => ({ red: 0, blue: 0, green: 0, yellow: 0, black: 0 })
const EMPTY: Pool = { tokens: zero(), crystals: 0 }

/** The Tao and crystals these Taoists can put together (Tao blocked: crystals only). */
export function poolOf(s: GameState, taoists: readonly Color[]): Pool {
  const tokens = zero()
  let crystals = 0
  const blocked = taoBlocked(s)
  for (const c of new Set(taoists)) {
    const t = s.taoists[c]
    if (!t.alive) continue
    if (!blocked) for (const x of TAO_COLORS) tokens[x] += t.tao[x]
    crystals += t.crystals
  }
  return { tokens, crystals }
}

/** `actor` and the Taoists standing on village tile `tile` (where the actor would exorcise from). */
export function poolOnTile(s: GameState, actor: Color, tile: TileIdx): Pool {
  return poolOf(s, [actor, ...COLORS.filter((c) => s.taoists[c].alive && s.taoists[c].tile === tile && !s.taoists[c].underground)])
}

const CACHE = new Map<string, Odds>()

/**
 * The odds of covering `reqs` with `fixed` dice plus `n` fresh ones, the pool
 * and, with `reroll`, the Gods' Favorite: when the first roll falls short, the
 * dice no target can use are rolled again (the AI's and prob.ts's policy).
 */
export function rollOdds(reqs: Requirement[], fixed: readonly DieFace[], n: number, wild: boolean, pool: Pool, reroll: boolean): Odds {
  if (reqs.length === 0) return { all: 1, any: 1, dice: 1, spend: 0 }
  const key = JSON.stringify([reqs.map((r) => [r.base, r.discounts, r.immune]), fixed, n, wild, pool.tokens, pool.crystals, reroll])
  const hit = CACHE.get(key)
  if (hit) return hit
  const out = tally(reqs, fixed, n, wild, pool, reroll)
  const bare = pool.crystals === 0 && TAO_COLORS.every((c) => pool.tokens[c] === 0)
  out.dice = bare ? out.all : tally(reqs, fixed, n, wild, EMPTY, reroll).all
  if (CACHE.size > 50000) CACHE.clear()
  CACHE.set(key, out)
  return out
}

function tally(reqs: Requirement[], fixed: readonly DieFace[], n: number, wild: boolean, pool: Pool, reroll: boolean): Odds {
  let all = 0
  let any = 0
  let spent = 0
  const one = (dice: DieFace[], p: number) => {
    const cost = minSpend(reqs, dice, wild, pool.tokens, pool.crystals)
    if (cost !== null) {
      all += p
      any += p
      spent += p * cost
    } else if (reqs.length > 1 && reqs.some((r) => covers([r], dice, wild, pool.tokens, pool.crystals))) any += p
  }
  const useful = (d: DieFace) => (d === 'white' ? wild : reqs.some((r) => !r.immune && (r.base[d] ?? 0) > 0))
  for (const o of outcomes(n)) {
    const dice = [...fixed, ...o.dice]
    if (!reroll || covers(reqs, dice, wild, pool.tokens, pool.crystals)) {
      one(dice, o.p)
      continue
    }
    const keep = dice.filter(useful)
    const k = dice.length - keep.length
    if (k === 0) {
      one(dice, o.p)
      continue
    }
    for (const r of outcomes(k)) one([...keep, ...r.dice], o.p * r.p)
  }
  return { all, any, dice: 0, spend: all > 0 ? spent / all : 0 }
}

function fakeRoll(actor: Color, targets: GhostRef[], demons: string[]): ExorcismRoll {
  return { mode: 'exorcism', actor, targets, demons: demons as DemonId[], dice: [], canReroll: false }
}

/** Requirements of these targets as they stand, optionally with one more −1 (the Mantra) on `mantraOn`. */
export function requirements(s: GameState, actor: Color, targets: GhostRef[], demons: string[] = [], mantraOn?: GhostRef): Requirement[] {
  const reqs = requirementsFor(s, fakeRoll(actor, targets, demons), targets, demons)
  if (mantraOn) {
    targets.forEach((r, i) => {
      if (r.board === mantraOn.board && r.space === mantraOn.space && !ghostAt(s, r)?.mantra) reqs[i] = { ...reqs[i]!, discounts: reqs[i]!.discounts + 1 }
    })
  }
  return reqs
}

export interface OddsOptions {
  /** Black Secret demons in the same roll. */
  demons?: string[]
  /** The pool to use (default: the actor and the Taoists on `tile`). */
  pool?: Pool
  /** Count the Mantra as placed on this ghost. */
  mantraOn?: GhostRef
}

/** An exorcism by `actor` from `tile` on `targets` (0 when a target is missing or can't be exorcised now). */
export function exorcismOdds(s: GameState, actor: Color, tile: TileIdx, targets: GhostRef[], o: OddsOptions = {}): Odds {
  if (targets.some((r) => !ghostAt(s, r) || exorcismBlocker(s, r))) return NO_ODDS
  const reqs = requirements(s, actor, targets, o.demons ?? [], o.mantraOn)
  const pool = o.pool ?? poolOnTile(s, actor, tile)
  return rollOdds(reqs, [], exorcismDice(s, actor), whiteIsWild(s), pool, hasPower(s, actor, 'godsFavorite'))
}

export interface TileOdds {
  /** The best one-ghost exorcism from the tile. */
  best: Odds
  /** Both faced ghosts with one roll (corner tiles with two ghosts; else none). */
  pair: Odds
}

/** What `actor` could exorcise from `tile`, with `pool` (default: the Taoists there). */
export function tileOdds(s: GameState, actor: Color, tile: TileIdx, pool?: Pool): TileOdds {
  const p = pool ?? poolOnTile(s, actor, tile)
  const faced = facedSpaces(tile).filter((r) => ghostAt(s, r) && !exorcismBlocker(s, r))
  let best: Odds = NO_ODDS
  for (const r of faced) {
    const o = exorcismOdds(s, actor, tile, [r], { pool: p })
    if (o.all > best.all || (o.all === best.all && o.spend < best.spend)) best = o
  }
  const pair = faced.length === 2 && isCorner(tile) ? exorcismOdds(s, actor, tile, faced, { pool: p }) : NO_ODDS
  return { best, pair }
}

/** The chance `actor` exorcises the ghost on `ref` from the tile facing it. */
export function spaceOdds(s: GameState, actor: Color, ref: GhostRef, mantra = false): Odds {
  const tile = facingTile(ref)
  return exorcismOdds(s, actor, tile, [ref], { mantraOn: mantra ? ref : undefined })
}

/** The open roll after rerolling the dice at `which` (the Gods' Favorite; no further reroll). */
export function rerollOdds(s: GameState, roll: ExorcismRoll, which: readonly number[]): Odds {
  const reqs = requirementsFor(s, roll, roll.targets, roll.demons)
  const set = new Set(which)
  const keep = roll.dice.filter((_, i) => !set.has(i))
  const pool = poolOf(s, spendersFor(s, roll))
  return rollOdds(reqs, keep, roll.dice.length - keep.length, whiteIsWild(s), pool, false)
}
