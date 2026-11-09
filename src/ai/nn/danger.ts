// How close the players are to losing — a hint for self-play training
// (training/rl.py, --kappa): each move is credited with how much it lowered
// this score (negative when it rose). Only the ways to lose count: haunted
// tiles and the haunting figures about to add one, the Taoists' Qi, an
// overrun board, curse-die rollers, possessed boards, and the deck running
// out while Wu-Feng is in play. 0 = no danger; a loss is about 1.

import { lineOf } from '@/game/geometry'
import { ALL_SPACES, centerActive, ghostAt, hauntedCount, incarnationInPlay } from '@/game/rules'
import type { Color, GameState } from '@/game/types'
import { COLORS } from '@/game/types'

export interface DangerWeights {
  /** Danger of 0, 1, 2, 3 haunted tiles (the third loses). */
  haunted: number[]
  /** Danger of a Taoist at 0, 1, 2, 3 Qi (none from 4). */
  lowQi: number[]
  /** A haunting figure on the stone (haunts at its board's next Yin phase) / still on its card: × the cost of one more haunted tile. */
  stone: number
  card: number
  tormentor: number
  possessed: number
  neutralLow: number
  overrun: number
  /** Wu-Feng in play and the deck under 10 cards: up to this much as it runs out. */
  clock: number
}

export const DANGER: DangerWeights = {
  haunted: [0, 0.15, 0.5, 1],
  lowQi: [1, 0.4, 0.15, 0.05],
  stone: 0.5,
  card: 0.2,
  tormentor: 0.03,
  possessed: 0.1,
  neutralLow: 0.05,
  overrun: 0.2,
  clock: 0.4,
}

export function danger(s: GameState, seat: Color, w: DangerWeights = DANGER): number {
  const HAUNTED = w.haunted
  const LOW_QI = w.lowQi
  const h = Math.min(3, hauntedCount(s))
  let d: number = HAUNTED[h]!
  // One more haunted tile would cost this much.
  const next = HAUNTED[Math.min(3, h + 1)]! - HAUNTED[h]!
  for (const ref of ALL_SPACES) {
    const g = ghostAt(s, ref)
    if (!g) continue
    if (centerActive(s, ref, 'haunter') && lineOf(ref).some((t) => !s.village[t]!.haunted)) {
      // On the stone it haunts at that board's next Yin phase; on the card, a step later.
      d += (g.figure === 'stone' ? w.stone : w.card) * next
    }
    if (centerActive(s, ref, 'tormentor')) d += w.tormentor
  }
  // The Taoist closest to death (solo: the only one).
  let qi = 0
  for (const c of COLORS) {
    const t = s.taoists[c]
    if (s.boards[c].neutral || !t.alive) continue
    qi = Math.max(qi, LOW_QI[Math.min(4, t.qi)] ?? 0)
  }
  d += qi
  // Neutral boards: a possessed one has lost its power; at 1 Qi it's next.
  for (const c of COLORS) {
    const b = s.boards[c]
    if (!b.neutral) continue
    if (b.possessed) d += w.possessed
    else if (b.qi <= 1) d += w.neutralLow
  }
  // An overrun board costs its Taoist a Qi every turn.
  if (s.boards[seat].spaces.every(Boolean)) d += w.overrun
  // Wu-Feng in play: the deck running out loses.
  if (incarnationInPlay(s) && s.deck.length < 10) d += w.clock * (1 - s.deck.length / 10)
  return d
}
