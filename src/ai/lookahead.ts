// Sample-based lookahead for the Taoist AI.
//
// For each candidate plan (an optional move, then a step-2 action), play it
// through the real engine a few times with re-seeded dice (the AI never sees
// the actual next rolls), answer any prompts heuristically, place a Buddha if
// one is ready, and score the position. The best average wins.

import type { Action } from '@/game/actions'
import { applyAction, waitingFor } from '@/game/engine'
import { isSkeleton } from '@/game/catalogue'
import { facedSpaces } from '@/game/geometry'
import { ghostsInPlay, hauntedCount, livingTaoists } from '@/game/rules'
import type { Color, GameState } from '@/game/types'
import { COLORS, TAO_COLORS } from '@/game/types'
import { threat } from './eval'
import { answerPrompt } from './prompts'
import { answerWuFeng } from './wufeng'

/** Tunable weights of the position score. */
export const WEIGHTS = {
  qi: [-90, -30, 0, 14, 22, 27, 31, 34],
  dead: 90,
  ghost: 6,
  body: 4,
  tao: 3.2,
}

/** How good the position is for the Taoists (higher is better). */
export function evaluate(s: GameState): number {
  const W = WEIGHTS
  if (s.phase === 'gameOver') return s.outcome?.result === 'win' ? 100000 : -100000
  let v = 0
  const haunted = hauntedCount(s)
  v -= haunted * 45 + (haunted >= 2 ? 120 : 0)
  for (const c of COLORS) {
    const t = s.taoists[c]
    const b = s.boards[c]
    if (b.neutral) {
      v += b.possessed ? -25 : b.qi * 5
      continue
    }
    if (!t.alive) {
      v -= W.dead
      continue
    }
    v += W.qi[Math.min(7, t.qi)]!
    const tao = TAO_COLORS.reduce((n, x) => n + t.tao[x], 0)
    v += Math.min(tao, 8) * W.tao + Math.max(0, tao - 8) * 0.8
    v += t.buddhas * 6 + (t.yinYang ? 9 : 0) + t.powerTokens * 2 + t.crystals * 3
  }
  for (const g of ghostsInPlay(s)) v -= threat(s, g) * W.ghost + (isSkeleton(g.ghost.card) ? 0 : W.body)
  for (const c of COLORS) {
    const n = s.boards[c].spaces.filter(Boolean).length
    if (n === 3) v -= 22
    else if (n === 2) v -= 6
    v += s.boards[c].buddhas.filter(Boolean).length * 7
  }
  v += s.discard.filter((id) => id.startsWith('wf-')).length * 80
  const circle = s.village.find((t) => t.kind === 'circleOfPrayer')
  if (circle?.circleToken) v += ghostsInPlay(s).filter((g) => g.card.color === circle.circleToken).length * 4
  if (s.whiteMoon) v += s.whiteMoon.saved.length * 4 - s.whiteMoon.dead.length * 9
  return v
}

function hash(a: number, b: number): number {
  let h = (a ^ Math.imul(b + 0x9e3779b9, 0x85ebca6b)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return (h ^ (h >>> 16)) >>> 0 || 1
}

/** Apply `plan`, answer prompts, place a ready Buddha; stop when the Yang phase is ours to end. */
function rollout(s0: GameState, c: Color, plan: Action[], seed: number): number {
  let s: GameState = { ...s0, rng: seed }
  try {
    for (const a of plan) {
      s = applyAction(s, a)
      s = settle(s, c)
      if (s.phase === 'gameOver') return evaluate(s)
    }
    // A Buddha ready and a free space faced: place it (step 3 is free).
    const t = s.taoists[c]
    if (s.phase === 'yang' && s.active === c && t.alive && !t.underground && t.tile != null && t.buddhas - (s.yang?.newBuddhas ?? 0) > 0) {
      const empty = facedSpaces(t.tile).filter((r) => !s.boards[r.board].spaces[r.space] && !s.boards[r.board].buddhas[r.space])
      if (empty[0]) {
        try {
          s = applyAction(s, { type: 'placeBuddha', by: c, spaces: [empty[0]] })
        } catch {
          /* not legal: skip */
        }
      }
    }
  } catch {
    return -Infinity
  }
  return evaluate(s)
}

function settle(s0: GameState, c: Color): GameState {
  let s = s0
  for (let i = 0; i < 12 && s.prompt; i++) {
    const p = s.prompt
    const r = p.owner === 'wufeng' ? answerWuFeng(s, p) : answerPrompt(s, p)
    s = applyAction(s, { type: 'respond', by: p.owner, r })
  }
  void c
  void waitingFor
  return s
}

export interface Plan {
  actions: Action[]
  value: number
}

/** Score each plan by `samples` rollouts; return the best. */
export function bestPlan(s: GameState, c: Color, plans: Action[][], samples = 4): Plan | null {
  let best: Plan | null = null
  const base = s.rng ^ (s.turn * 2654435761)
  for (let i = 0; i < plans.length; i++) {
    let total = 0
    for (let k = 0; k < samples; k++) total += rollout(s, c, plans[i]!, hash(base, i * 31 + k))
    const value = total / samples
    if (!best || value > best.value) best = { actions: plans[i]!, value }
  }
  return best
}

export const _living = livingTaoists
