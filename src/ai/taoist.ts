// The Taoist AI's Yang phase: one action at a time, stateless between calls.
//
// Each call lists candidate plans for the rest of the turn (a move, a step-2
// action, a Yin-Yang use, a Buddha placement…), pre-scores them with the
// quick policy, and plays the most promising ones forward through the real
// engine (sim.ts): the plan, then the quick policy until the next Taoist's
// Yang phase begins (so the following Yin phases are included), many times
// with re-dealt hidden information and re-seeded dice, with successive
// halving. The plan with the best average position score (value.ts) wins;
// its first action is returned.

import type { Action, HelpParams } from '@/game/actions'
import { applyAction } from '@/game/engine'
import { adjacentTiles, facedSpaces, isAdjacent } from '@/game/geometry'
import { ghostAt, hasPower, livingTaoists } from '@/game/rules'
import { beforeMove, step2Problem } from '@/game/yang'
import type { Color, GameState, GhostRef } from '@/game/types'
import { CENTER_TILE } from '@/game/types'
import {
  buddhaSpotValue,
  finishTurn,
  freePower,
  helpOptions,
  positionValue,
  quickStep,
  reachable,
  spiresToken,
  step2Options,
} from './policy'
import { hash, rollout, sanitize } from './sim'
import { SEARCH, W } from './tuning'

export function legal(s: GameState, a: Action): boolean {
  try {
    applyAction(s, a)
    return true
  } catch {
    return false
  }
}

interface Candidate {
  plan: Action[]
  pre: number
}

/** Candidate plans for the rest of this Yang phase, with a quick pre-score. */
export function candidatePlans(s: GameState, c: Color): Candidate[] {
  const t = s.taoists[c]
  const here = t.tile!
  const out: Candidate[] = []
  const y = s.yang!
  const canAct = !step2Problem(s, 'exorcise') || !step2Problem(s, 'help') || !step2Problem(s, 'save')
  // Step 1–2: where to go and what to do there.
  if (canAct || beforeMove(s)) {
    for (const tile of reachable(s, c)) {
      const move: Action[] = tile === here ? [] : [{ type: 'move', by: c, to: tile }]
      const pos = positionValue(s, c, tile) + buddhaSpotValue(s, c, tile)
      const opts = canAct ? step2Options(s, c, tile).sort((a, b) => b.value - a.value) : []
      for (const o of opts.slice(0, 3)) out.push({ plan: [...move, o.action], pre: o.value + pos })
      if (tile !== here) out.push({ plan: [...move, { type: 'endTurn', by: c }], pre: pos - 1 })
    }
    // Fly with a borrowed Dance of the Spires.
    const spires = spiresToken(s, c)
    if (spires) {
      for (let tile = 0; tile < 9; tile++) {
        if (tile === here || isAdjacent(here, tile)) continue
        for (const o of step2Options(s, c, tile).sort((a, b) => b.value - a.value).slice(0, 1)) {
          out.push({ plan: [{ type: 'powerToken', by: c, board: spires }, { type: 'move', by: c, to: tile }, o.action], pre: o.value - W.powerToken })
        }
      }
    }
    // Twin Winds: bring a friend (and their Tao) alongside, or in front of a ghost.
    if (beforeMove(s) && hasPower(s, c, 'danceOfTheTwinWinds') && !y.usedPowers.includes('danceOfTheTwinWinds')) {
      const twin: Candidate[] = []
      for (const o of livingTaoists(s)) {
        if (o.color === c || o.tile == null || o.underground) continue
        for (const to of adjacentTiles(o.tile)) {
          const v = positionValue(s, o.color, to) - positionValue(s, o.color, o.tile) + (to === here ? 0.5 : 0)
          twin.push({ plan: [{ type: 'power', by: c, use: { power: 'danceOfTheTwinWinds', taoist: o.color, to } }], pre: v })
        }
      }
      out.push(...twin.sort((a, b) => b.pre - a.pre).slice(0, 2))
    }
  }
  // Yin-Yang: restore a tile, or a villager's help from anywhere.
  if (t.yinYang && !t.underground) {
    const haunted = s.village.filter((x) => x.haunted)
    for (const h of haunted.slice(0, 3)) out.push({ plan: [{ type: 'yinYang', by: c, use: { kind: 'flip', tile: h.idx } }], pre: -W.yinYang + (haunted.length >= 2 ? 40 : 10) })
    const remote: Candidate[] = []
    for (let tile = 0; tile < 9; tile++) {
      for (const h of helpOptions(s, c, tile)) {
        remote.push({ plan: [{ type: 'yinYang', by: c, use: { kind: 'help', tile, params: h.params as HelpParams } }], pre: h.value - W.yinYang })
      }
    }
    out.push(...remote.sort((a, b) => b.pre - a.pre).slice(0, 2))
  }
  // Step 3: where the Buddhas go (or not at all).
  if (!t.underground && t.buddhas - y.newBuddhas > 0) {
    const empty = facedSpaces(here).filter((r) => !ghostAt(s, r) && !s.boards[r.board].buddhas[r.space])
    const sets: GhostRef[][] = empty.map((r) => [r])
    if (empty.length === 2 && t.buddhas - y.newBuddhas >= 2) sets.push(empty)
    for (const set of sets) out.push({ plan: [{ type: 'placeBuddha', by: c, spaces: set }], pre: W.buddhaOnBoard - W.buddhaHeld })
  }
  // Doing nothing more this turn.
  out.push({ plan: [{ type: 'endTurn', by: c, reclaim: here === CENTER_TILE ? s.centerPowerTokens : 0 }], pre: 0 })
  return out
}

/** Trim to the most promising plans; always keep the quick policy's own choice. */
function shortlist(s: GameState, c: Color, cands: Candidate[]): Action[][] {
  const seen = new Set<string>()
  const plans: Action[][] = []
  const quick = quickStep(s, c)
  const add = (p: Action[]) => {
    const k = JSON.stringify(p)
    if (seen.has(k)) return
    seen.add(k)
    plans.push(p)
  }
  add([quick])
  for (const x of [...cands].sort((a, b) => b.pre - a.pre)) {
    if (plans.length >= SEARCH.maxPlans) break
    add(x.plan)
  }
  return plans
}

function searchStep(s: GameState, c: Color): Action {
  const plans = shortlist(s, c, candidatePlans(s, c)).filter((p) => legal(s, p[0]!))
  if (plans.length === 0) return quickStep(s, c)
  if (plans.length === 1) return plans[0]![0]!
  const y = s.yang!
  const base = hash(s.rng ^ Math.imul(s.turn, 2654435761), y.helps * 31 + y.exorcisms * 17 + (y.moved ? 7 : 0) + (y.step3 ? 3 : 0) + y.usedPowers.length * 101)
  // Successive halving: every plan gets `samples` rollouts, then the better
  // half gets as many again, and so on. Sample k is the same re-dealt state
  // for every plan (common random numbers), so plans are compared fairly.
  const states: GameState[] = []
  const stateFor = (k: number) => (states[k] ??= sanitize(s, hash(base, k + 1)))
  let pool = plans.map((plan) => ({ plan, total: 0, n: 0 }))
  let target = SEARCH.samples
  for (let round = 0; ; round++) {
    for (const p of pool) {
      for (let k = p.n; k < target; k++) p.total += rollout(stateFor(k), p.plan)
      p.n = target
    }
    pool.sort((a, b) => b.total / b.n - a.total / a.n)
    if (round >= SEARCH.rounds || pool.length <= 1) break
    pool = pool.slice(0, Math.max(1, Math.ceil(pool.length * SEARCH.keep)))
    target *= 2
  }
  return pool[0]!.plan[0]!
}

export function taoistYang(s: GameState, c: Color): Action {
  const t = s.taoists[c]
  const power = freePower(s, c)
  if (power) return power
  if (SEARCH.on && !t.underground && t.tile != null) return searchStep(s, c)
  const a = quickStep(s, c)
  return legal(s, a) ? a : finishTurn(s, c)
}
