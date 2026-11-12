// Exact exorcism odds (no sampling): the chance that a roll of `n` Tao dice,
// plus the Tao tokens and moon crystals the actor can pool, exorcises a set
// of targets. Used to pre-score plans and by the rollout policy.

import { covers, requirementsFor, type Requirement } from '@/game/exorcism'
import { cardAt, whiteIsWild } from '@/game/rules'
import type { Color, DieFace, ExorcismRoll, GameState, GhostRef, TaoColor } from '@/game/types'
import { DIE_FACES, TAO_COLORS } from '@/game/types'
import { poolAt } from './eval'

type Vec = Record<TaoColor, number>

/** P(Binomial(n, p) >= k). */
export function binomTail(n: number, p: number, k: number): number {
  if (k <= 0) return 1
  if (k > n) return 0
  let total = 0
  let c = 1
  for (let i = 0; i <= n; i++) {
    if (i > 0) c = (c * (n - i + 1)) / i
    if (i >= k) total += c * p ** i * (1 - p) ** (n - i)
  }
  return total
}

/** Every multiset of `n` die faces with its probability (cached; don't modify). */
const OUTCOMES = new Map<number, Array<{ dice: DieFace[]; p: number }>>()
export function outcomes(n: number): Array<{ dice: DieFace[]; p: number }> {
  let out = OUTCOMES.get(n)
  if (out) return out
  out = []
  const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1))
  const rec = (start: number, left: number, dice: DieFace[]) => {
    if (left === 0) {
      const counts = new Map<DieFace, number>()
      for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
      let ways = fact(n)
      for (const k of counts.values()) ways /= fact(k)
      out!.push({ dice: dice.slice(), p: ways / 6 ** n })
      return
    }
    for (let i = start; i < 6; i++) {
      dice.push(DIE_FACES[i]!)
      rec(i, left - 1, dice)
      dice.pop()
    }
  }
  rec(0, n, [])
  OUTCOMES.set(n, out)
  return out
}

const CACHE = new Map<string, number>()

/** Chance that dice + tokens cover all `reqs`. */
export function coverChance(reqs: Requirement[], n: number, wild: boolean, tokens: Vec, crystals: number, reroll: boolean): number {
  if (reqs.length === 0) return 1
  // Fast path: one ordinary single-colour target.
  if (reqs.length === 1) {
    const r = reqs[0]!
    const colors = TAO_COLORS.filter((c) => (r.base[c] ?? 0) > 0)
    if (colors.length <= 1) {
      const c = colors[0]
      const need = Math.max(0, (c ? r.base[c]! : 0) - r.discounts) - (c ? tokens[c] : 0) - crystals
      if (need <= 0) return 1
      if (r.immune) return 0
      const p = (wild ? 2 : 1) / 6
      return binomTail(n, reroll ? p + (1 - p) * p : p, need)
    }
  }
  const key = JSON.stringify([reqs.map((r) => [r.base, r.discounts, r.immune]), n, wild, tokens, crystals, reroll])
  const hit = CACHE.get(key)
  if (hit !== undefined) return hit
  let total = 0
  const useful = (d: DieFace) => (d === 'white' ? wild : reqs.some((r) => !r.immune && (r.base[d] ?? 0) > 0))
  for (const o of outcomes(n)) {
    if (covers(reqs, o.dice, wild, tokens, crystals)) {
      total += o.p
      continue
    }
    if (!reroll) continue
    const keep = o.dice.filter(useful)
    const k = n - keep.length
    if (k === 0) continue
    let sub = 0
    for (const r of outcomes(k)) if (covers(reqs, [...keep, ...r.dice], wild, tokens, crystals)) sub += r.p
    total += o.p * sub
  }
  if (CACHE.size > 20000) CACHE.clear()
  CACHE.set(key, total)
  return total
}

/** Requirements of these targets as they stand. */
export function reqsOf(s: GameState, actor: Color, targets: GhostRef[]): Requirement[] {
  const fake: ExorcismRoll = { mode: 'exorcism', actor, targets, demons: [], dice: [], canReroll: false }
  return requirementsFor(s, fake, targets, [])
}

/**
 * Chance that an exorcism by `actor` from `tile` succeeds on all `targets`
 * (tokens pooled with the Taoists standing on `tile`).
 */
export function exorcismChance(s: GameState, actor: Color, tile: number, targets: GhostRef[], n: number, reroll: boolean): number {
  if (targets.some((r) => !cardAt(s, r))) return 0
  const { tokens, crystals } = poolAt(s, actor, tile)
  return coverChance(reqsOf(s, actor, targets), n, whiteIsWild(s), tokens, crystals, reroll)
}

/**
 * A two-target corner exorcism: the chance of taking both, only A, only B,
 * or either one (but not both) — then the better one is taken.
 */
export interface PairOdds {
  both: number
  onlyA: number
  onlyB: number
  either: number
}

const PAIR_CACHE = new Map<string, PairOdds>()

export function pairChances(s: GameState, actor: Color, tile: number, a: GhostRef, b: GhostRef, n: number, reroll: boolean): PairOdds {
  const { tokens, crystals } = poolAt(s, actor, tile)
  const wild = whiteIsWild(s)
  const ra = reqsOf(s, actor, [a])
  const rb = reqsOf(s, actor, [b])
  const key = JSON.stringify([ra.map((r) => [r.base, r.discounts, r.immune]), rb.map((r) => [r.base, r.discounts, r.immune]), n, wild, tokens, crystals, reroll])
  const hit = PAIR_CACHE.get(key)
  if (hit) return hit
  const odds: PairOdds = { both: 0, onlyA: 0, onlyB: 0, either: 0 }
  const all = [...ra, ...rb]
  const useful = (d: DieFace) => (d === 'white' ? wild : all.some((r) => !r.immune && (r.base[d] ?? 0) > 0))
  const tally = (dice: DieFace[], p: number) => {
    if (covers(all, dice, wild, tokens, crystals)) return void (odds.both += p)
    const ca = covers(ra, dice, wild, tokens, crystals)
    const cb = covers(rb, dice, wild, tokens, crystals)
    if (ca && cb) odds.either += p
    else if (ca) odds.onlyA += p
    else if (cb) odds.onlyB += p
  }
  for (const o of outcomes(n)) {
    if (!reroll || covers(all, o.dice, wild, tokens, crystals)) {
      tally(o.dice, o.p)
      continue
    }
    const keep = o.dice.filter(useful)
    const k = n - keep.length
    if (k === 0) {
      tally(o.dice, o.p)
      continue
    }
    for (const r of outcomes(k)) tally([...keep, ...r.dice], o.p * r.p)
  }
  if (PAIR_CACHE.size > 20000) PAIR_CACHE.clear()
  PAIR_CACHE.set(key, odds)
  return odds
}
