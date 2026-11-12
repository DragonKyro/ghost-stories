// Exorcism maths and resolution.
//
// "Roll the 3 Tao dice, and roll a number of colored faces equal to the
// ghost's resistance. The white faces are wild." Tao tokens (and White Moon
// moon crystals) cover any shortfall. A corner tile lets one roll exorcise
// both adjacent ghosts. The Circle of Prayer and the Enfeeblement Mantra each
// lower a ghost's resistance by 1. Dice have no effect on dice-immune ghosts
// (tokens, the Circle and Buddhas still work).

import { cardOnBoard } from './catalogue'
import { refKey, sameRef } from './geometry'
import { ev, now, removeGhost, rollDie, taoList } from './ops'
import {
  cardAt,
  COLOR_NAME,
  ghostAt,
  isDiceImmune,
  taoBlocked,
  taoistsWith,
  whiteIsWild,
} from './rules'
import type { CrystalSpend, Response, TaoSpend } from './actions'
import type { DieFace, Effect, ExorcismRoll, GameState, GhostRef, TaoColor } from './types'
import { TAO_COLORS } from './types'
import { bsCommitDemons, demonRequirement } from './blackSecret'

type Vec = Record<TaoColor, number>
const zero = (): Vec => ({ red: 0, blue: 0, green: 0, yellow: 0, black: 0 })

/** One target's needs, before discounts. */
export interface Requirement {
  key: string
  /** Faces needed, after any colour-specific discount (Circle of Prayer). */
  base: Partial<Record<TaoColor, number>>
  /** Number of -1 discounts (Circle of Prayer, Mantra), each on a colour of the player's choice. */
  discounts: number
  /** Dice can't help with this one (dice-immune ghost). */
  immune: boolean
}

export function ghostRequirement(s: GameState, ref: GhostRef, mode: ExorcismRoll['mode']): Requirement {
  const g = ghostAt(s, ref)!
  const card = cardOnBoard(g.card, ref.board)
  let discounts = 0
  const base = { ...card.resistance }
  // Circle of Prayer: ghosts of the token's colour have 1 less resistance (a
  // multicolour incarnation counts as each colour it needs; the −1 is on that colour).
  const circle = s.village.find((t) => t.kind === 'circleOfPrayer')
  const tok = circle && !circle.haunted ? circle.circleToken : null
  if (tok && (base[tok] ?? 0) > 0) base[tok] = (base[tok] ?? 0) - 1
  // The Mantra: −1 on a colour of the player's choice ("chosen after the dice roll").
  if (g.mantra) discounts++
  void mode
  return { key: refKey(ref), base, discounts, immune: isDiceImmune(s, ref) }
}

/** Every way of spending the discounts on the colours a target actually needs. */
function discountedOptions(r: Requirement): Vec[] {
  let opts: Vec[] = [{ ...zero(), ...r.base } as Vec]
  for (let d = 0; d < r.discounts; d++) {
    const next: Vec[] = []
    const seen = new Set<string>()
    for (const v of opts) {
      let any = false
      for (const c of TAO_COLORS) {
        if (v[c] > 0) {
          any = true
          const w = { ...v, [c]: v[c] - 1 }
          const k = JSON.stringify(w)
          if (!seen.has(k)) {
            seen.add(k)
            next.push(w)
          }
        }
      }
      if (!any) next.push(v)
    }
    opts = next
  }
  return opts
}

/** All combinations of discount choices across targets → summed (immune, normal) needs. */
function needCombos(reqs: Requirement[]): Array<{ immune: Vec; normal: Vec }> {
  let combos: Array<{ immune: Vec; normal: Vec }> = [{ immune: zero(), normal: zero() }]
  for (const r of reqs) {
    const next: Array<{ immune: Vec; normal: Vec }> = []
    for (const c of combos) {
      for (const v of discountedOptions(r)) {
        const immune = { ...c.immune }
        const normal = { ...c.normal }
        for (const col of TAO_COLORS) (r.immune ? immune : normal)[col] += v[col]
        next.push({ immune, normal })
      }
    }
    combos = next
  }
  return combos
}

function diceVec(dice: DieFace[], wild: boolean): { colored: Vec; whites: number } {
  const colored = zero()
  let whites = 0
  for (const d of dice) {
    if (d === 'white') {
      if (wild) whites++
    } else colored[d]++
  }
  return { colored, whites }
}

/**
 * Can these targets be exorcised with these dice, these tokens and this many
 * wild crystals? Tokens are assigned to dice-immune needs first (nothing else
 * can pay them), then dice, leftover tokens and whites to the rest, crystals last.
 */
export function covers(reqs: Requirement[], dice: DieFace[], wild: boolean, tokens: Vec, crystals: number): boolean {
  if (reqs.length === 0) return true
  const { colored, whites } = diceVec(dice, wild)
  for (const need of needCombos(reqs)) {
    let immuneShort = 0
    let normalShort = 0
    for (const c of TAO_COLORS) {
      const toImmune = Math.min(tokens[c], need.immune[c])
      immuneShort += need.immune[c] - toImmune
      let rem = Math.max(0, need.normal[c] - colored[c])
      rem -= Math.min(rem, tokens[c] - toImmune)
      normalShort += rem
    }
    if (immuneShort <= crystals && normalShort <= whites + (crystals - immuneShort)) return true
  }
  return false
}

/**
 * The fewest Tao tokens + crystals needed to exorcise these targets with these
 * dice (null: they can't be covered). Dice-immune needs are paid in full; for
 * the rest the white faces go first, so what's left after the dice is
 * max(0, shortfall − whites).
 */
export function minSpend(reqs: Requirement[], dice: DieFace[], wild: boolean, tokens: Vec, crystals: number): number | null {
  if (reqs.length === 0) return 0
  const { colored, whites } = diceVec(dice, wild)
  let best: number | null = null
  for (const need of needCombos(reqs)) {
    let immuneNeed = 0
    let immuneShort = 0
    let short = 0
    let normalShort = 0
    for (const c of TAO_COLORS) {
      const toImmune = Math.min(tokens[c], need.immune[c])
      immuneNeed += need.immune[c]
      immuneShort += need.immune[c] - toImmune
      const rem = Math.max(0, need.normal[c] - colored[c])
      short += rem
      normalShort += rem - Math.min(rem, tokens[c] - toImmune)
    }
    if (immuneShort > crystals || normalShort > whites + (crystals - immuneShort)) continue
    const spend = immuneNeed + Math.max(0, short - whites)
    if (best === null || spend < best) best = spend
  }
  return best
}

export function spendVec(spend: TaoSpend[]): Vec {
  const v = zero()
  for (const x of spend) v[x.color]++
  return v
}

// ---------------------------------------------------------------------------
// Rolling
// ---------------------------------------------------------------------------

export function openRoll(s: GameState, roll: ExorcismRoll): void {
  ev(s, 'roll', `${COLOR_NAME[roll.actor]} rolls ${roll.dice.length} Tao ${roll.dice.length === 1 ? 'die' : 'dice'}.`, {
    color: roll.actor,
    dice: roll.dice,
  })
  s.prompt = { kind: 'exorcism', owner: roll.actor, roll }
}

export function rerollDice(s: GameState, dice: DieFace[], which: number[]): DieFace[] {
  const out = dice.slice()
  const uniq = [...new Set(which)]
  for (const i of uniq) {
    if (i < 0 || i >= out.length) throw new Error('No such die to reroll.')
    out[i] = rollDie(s)
  }
  return out
}

// ---------------------------------------------------------------------------
// Committing
// ---------------------------------------------------------------------------

/** Which Taoists' tokens / crystals may be spent on this roll. */
export function spendersFor(s: GameState, roll: ExorcismRoll): import('./types').Color[] {
  if (roll.mode === 'barrier') return []
  if (roll.mode === 'kungFu') return [roll.actor] // a support action: no sharing
  return taoistsWith(s, roll.actor)
}

export function requirementsFor(s: GameState, roll: ExorcismRoll, refs: GhostRef[], demons: string[]): Requirement[] {
  return [...refs.map((r) => ghostRequirement(s, r, roll.mode)), ...demons.map((d) => demonRequirement(s, d))]
}

/**
 * Apply a `commit` response: check the spend, check the chosen targets are
 * covered, and enforce "if the dice are sufficient to exorcise a ghost, you
 * must exorcise it". Then discard the ghosts and queue their right stones
 * (curses before rewards).
 */
export function commitExorcism(s: GameState, roll: ExorcismRoll, r: Extract<Response, { kind: 'commit' }>): void {
  const wild = whiteIsWild(s)
  const targets = r.exorcise
  for (const t of targets) {
    if (!roll.targets.some((x) => sameRef(x, t))) throw new Error('That ghost was not part of this exorcism.')
    if (!ghostAt(s, t)) throw new Error('That ghost is gone.')
  }
  if (new Set(targets.map(refKey)).size !== targets.length) throw new Error('A ghost was listed twice.')
  const demons = r.demons ?? []
  for (const d of demons) if (!roll.demons.includes(d as never)) throw new Error('That demon was not part of this exorcism.')

  // What may be spent.
  const spenders = spendersFor(s, roll)
  if (r.spend.length > 0) {
    if (roll.mode === 'barrier') throw new Error('Tao tokens cannot be used during the Mystic Barrier.')
    if (taoBlocked(s)) throw new Error('Tao tokens cannot be used while a Tao blocker is in play.')
  }
  const byOwner = new Map<string, number>()
  for (const x of r.spend) {
    if (!spenders.includes(x.from)) throw new Error(`${COLOR_NAME[x.from]} is not on your tile (or can't share tokens here).`)
    const k = `${x.from}:${x.color}`
    byOwner.set(k, (byOwner.get(k) ?? 0) + 1)
    if (byOwner.get(k)! > s.taoists[x.from].tao[x.color]) throw new Error(`${COLOR_NAME[x.from]} doesn't have that many ${x.color} Tao.`)
  }
  const crystals = r.crystals ?? []
  validateCrystals(s, roll, crystals, spenders)

  const nothing = targets.length === 0 && demons.length === 0
  if (nothing && (r.spend.length > 0 || crystals.length > 0)) throw new Error('Nothing is exorcised, so nothing is spent.')

  const reqs = requirementsFor(s, roll, targets, demons)
  if (!covers(reqs, roll.dice, wild, spendVec(r.spend), crystals.length)) {
    throw new Error('The dice and tokens spent do not cover that exorcism.')
  }

  if (roll.mode === 'exorcism' || roll.mode === 'demon') {
    // "If the dice are sufficient to exorcise a ghost, you must exorcise it."
    const all = requirementsFor(s, roll, roll.targets, roll.demons)
    const dicePower = (rs: Requirement[]) => covers(rs, roll.dice, wild, zero(), 0)
    const beaten = all.filter((q) => dicePower([q]))
    const chosen = new Set([...targets.map(refKey), ...demons])
    if (beaten.length > 0) {
      if (dicePower(beaten) && beaten.some((q) => !chosen.has(q.key))) {
        throw new Error('The dice alone are enough for that ghost, so it must be exorcised.')
      }
      if (!beaten.some((q) => chosen.has(q.key))) throw new Error('The dice are enough to exorcise a ghost, so you must exorcise it.')
    }
  }

  // Pay.
  for (const x of r.spend) {
    s.taoists[x.from].tao[x.color] -= 1
    s.taoSupply[x.color] += 1
  }
  for (const x of crystals) {
    if (x.from === 'barrier') s.whiteMoon!.barrier!.crystals -= 1
    else s.taoists[x.from].crystals -= 1
    s.whiteMoon!.crystalReserve += 1
  }
  if (r.spend.length || crystals.length) {
    ev(s, 'spend', `Spent: ${taoList(r.spend.map((x) => x.color))}${crystals.length ? ` + ${crystals.length} moon crystal${crystals.length > 1 ? 's' : ''}` : ''}.`, {
      color: roll.actor,
    })
  }

  if (nothing) {
    ev(s, 'fail', `The exorcism fails. Nothing happens.`, { color: roll.actor })
    return
  }

  if (demons.length) bsCommitDemons(s, roll.actor, demons)

  // Discard the ghosts, then queue right-stone abilities: every curse first, then every reward.
  const curses: Effect[] = []
  const rewards: Effect[] = []
  for (const ref of targets) {
    const card = cardAt(s, ref)!
    removeGhost(s, ref)
    ev(s, 'exorcised', `${card.name} is exorcised!`, { color: roll.actor, ref, card: card.id })
    if (roll.mode !== 'exorcism') continue // Kung-Fu School / Mystic Barrier: no right stone
    for (const ab of card.right) {
      switch (ab.kind) {
        case 'curse':
          curses.push({ k: 'curse', ctx: { roller: roll.actor, board: roll.actor, haunt: { kind: 'front', ref }, why: `${card.name}'s curse` } })
          break
        case 'loseTao':
          curses.push({ k: 'loseTao', taoist: roll.actor, count: 1, why: `${card.name}'s curse` })
          break
        case 'rewardQiOrYinYang':
          rewards.push({ k: 'qiOrYinYang', taoist: roll.actor })
          break
        case 'rewardTao1':
          rewards.push({ k: 'gainTao', taoist: roll.actor, count: 1, why: `${card.name}'s reward` })
          break
        case 'rewardTao2':
          rewards.push({ k: 'gainTao', taoist: roll.actor, count: 2, why: `${card.name}'s reward` })
          break
        case 'rewardCrystal':
          if (s.whiteMoon) {
            if (s.whiteMoon.crystalReserve > 0) {
              s.whiteMoon.crystalReserve--
              s.taoists[roll.actor].crystals++
              if (s.yang) s.yang.newCrystals++
              ev(s, 'crystal', `${COLOR_NAME[roll.actor]} receives a moon crystal.`, { color: roll.actor })
            }
          }
          break
        case 'incarnationReward':
          rewards.push({ k: 'incarnationReward' })
          break
        default:
          break
      }
    }
  }
  now(s, ...curses, ...rewards)
}

function validateCrystals(s: GameState, roll: ExorcismRoll, crystals: CrystalSpend[], spenders: string[]): void {
  if (crystals.length === 0) return
  if (!s.whiteMoon) throw new Error('Moon crystals are a White Moon component.')
  const used = new Map<string, number>()
  for (const x of crystals) {
    if (roll.mode === 'barrier') {
      if (x.from !== 'barrier') throw new Error('During the Mystic Barrier only its crystals can be spent.')
    } else if (x.from === 'barrier' || !spenders.includes(x.from)) {
      throw new Error('Those moon crystals are not available to this exorcism.')
    }
    used.set(x.from, (used.get(x.from) ?? 0) + 1)
  }
  for (const [from, n] of used) {
    const have = from === 'barrier' ? s.whiteMoon.barrier?.crystals ?? 0 : s.taoists[from as keyof GameState['taoists']].crystals
    if (n > have) throw new Error('Not enough moon crystals.')
  }
}

// ---------------------------------------------------------------------------
// Suggestions (UI and AI)
// ---------------------------------------------------------------------------

export interface SpendPlan {
  spend: TaoSpend[]
  crystals: CrystalSpend[]
}

/**
 * The cheapest spend that exorcises `refs` (+ demons) with this roll, or null.
 * Tokens come from the actor first, then from Taoists on the same tile;
 * crystals are used only when tokens run out.
 *
 * It enumerates how many tokens of each needed colour to spend, not which
 * individual tokens, so it stays fast when the Taoists hold a lot of Tao (a
 * token of a colour no target needs can never help).
 */
export function cheapestSpend(s: GameState, roll: ExorcismRoll, refs: GhostRef[], demons: string[] = []): SpendPlan | null {
  const wild = whiteIsWild(s)
  const reqs = requirementsFor(s, roll, refs, demons)
  if (covers(reqs, roll.dice, wild, zero(), 0)) return { spend: [], crystals: [] }
  const spenders = spendersFor(s, roll)
  const ordered = [roll.actor, ...spenders.filter((c) => c !== roll.actor)].filter((c) => spenders.includes(c))
  const blocked = taoBlocked(s) || roll.mode === 'barrier'
  const avail = zero()
  if (!blocked) for (const c of ordered) for (const col of TAO_COLORS) avail[col] += s.taoists[c].tao[col]
  const crystalOwners: CrystalSpend['from'][] = []
  if (s.whiteMoon) {
    if (roll.mode === 'barrier') for (let i = 0; i < (s.whiteMoon.barrier?.crystals ?? 0); i++) crystalOwners.push('barrier')
    else for (const c of ordered) for (let i = 0; i < s.taoists[c].crystals; i++) crystalOwners.push(c)
  }
  const colors = TAO_COLORS.filter((c) => avail[c] > 0 && reqs.some((r) => (r.base[c] ?? 0) > 0))
  const maxTokens = colors.reduce((n, c) => n + avail[c], 0)
  const vec = zero()
  // Spread k tokens over the needed colours (each bounded by what's held); test with j crystals.
  const spread = (i: number, left: number, j: number): boolean => {
    if (i === colors.length) return left === 0 && covers(reqs, roll.dice, wild, vec, j)
    const c = colors[i]!
    for (let x = Math.min(left, avail[c]); x >= 0; x--) {
      vec[c] = x
      if (spread(i + 1, left - x, j)) return true
    }
    vec[c] = 0
    return false
  }
  // Fewest items first; at each size, tokens before crystals.
  const maxItems = Math.min(maxTokens + crystalOwners.length, 12)
  for (let n = 1; n <= maxItems; n++) {
    for (let j = 0; j <= Math.min(n, crystalOwners.length); j++) {
      const k = n - j
      if (k > maxTokens) continue
      for (const c of TAO_COLORS) vec[c] = 0
      if (!spread(0, k, j)) continue
      const spend: TaoSpend[] = []
      for (const color of colors) {
        let left = vec[color]
        for (const from of ordered) {
          const take = Math.min(left, s.taoists[from].tao[color])
          for (let i = 0; i < take; i++) spend.push({ from, color })
          left -= take
        }
      }
      const as = crystalColor(reqs)
      return { spend, crystals: crystalOwners.slice(0, j).map((from) => ({ from, as })) }
    }
  }
  return null
}

function crystalColor(reqs: Requirement[]): TaoColor {
  for (const r of reqs) for (const c of TAO_COLORS) if ((r.base[c] ?? 0) > 0) return c
  return 'red'
}

/** The best set of targets this roll can take (most targets, then cheapest). */
export function bestCommit(s: GameState, roll: ExorcismRoll): { exorcise: GhostRef[]; demons: string[]; plan: SpendPlan } {
  const sets: Array<{ refs: GhostRef[]; demons: string[] }> = []
  const items = [...roll.targets.map((r) => ({ ref: r })), ...roll.demons.map((d) => ({ demon: d as string }))]
  const n = items.length
  for (let mask = (1 << n) - 1; mask > 0; mask--) {
    const refs: GhostRef[] = []
    const demons: string[] = []
    items.forEach((it, i) => {
      if (mask & (1 << i)) {
        if ('ref' in it) refs.push(it.ref)
        else demons.push(it.demon)
      }
    })
    sets.push({ refs, demons })
  }
  sets.sort((a, b) => b.refs.length + b.demons.length - (a.refs.length + a.demons.length))
  let best: { exorcise: GhostRef[]; demons: string[]; plan: SpendPlan } | null = null
  for (const set of sets) {
    const size = set.refs.length + set.demons.length
    if (best && size < best.exorcise.length + best.demons.length) break
    const plan = cheapestSpend(s, roll, set.refs, set.demons)
    if (!plan) continue
    const cost = plan.spend.length + plan.crystals.length
    if (!best || cost < best.plan.spend.length + best.plan.crystals.length) best = { exorcise: set.refs, demons: set.demons, plan }
  }
  return best ?? { exorcise: [], demons: [], plan: { spend: [], crystals: [] } }
}
