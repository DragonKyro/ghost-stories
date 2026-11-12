// How close the players are to losing — a hint for self-play training
// (training/rl.py): each move is credited with how much it lowered this score
// (negative when it rose). Only the ways to lose count, in three parts the
// trainer weights by how the network has actually been losing:
//   haunt — haunted tiles, and the haunting figures about to add one;
//   qi    — the Taoists' Qi and everything that drains it: an overrun (full)
//           board on any board, the neutral boards' own Qi (a possessed board
//           passes its Qi losses to a Taoist and loses its power), boards one
//           ghost from full, curse-die rollers;
//   clock — the deck running out while Wu-Feng is in play.
// 0 = no danger; a loss is about 1.

import { lineOf } from '@/game/geometry'
import { ALL_SPACES, centerActive, ghostAt, hauntedCount, incarnationInPlay } from '@/game/rules'
import type { Color, GameState } from '@/game/types'
import { COLORS } from '@/game/types'

export interface DangerWeights {
  /** Danger of 0, 1, 2, 3 haunted tiles (the third loses). */
  haunted: number[]
  /** A haunting figure on the stone (haunts at its board's next Yin phase) / still on its card: × the cost of one more haunted tile. */
  stone: number
  card: number
  /** The Taoist closest to death at 0, 1, 2, 3 Qi (none from 4). */
  lowQi: number[]
  /** A neutral board at 0 (possessed), 1, 2, 3 Qi. */
  neutralQi: number[]
  /** A Taoist's board full: it loses a Qi every turn. */
  overrunOwn: number
  /** A neutral board full: it loses its own Qi every turn (twice this at 1 Qi, when the overrun possesses it; as overrunOwn once possessed). */
  overrunNeutral: number
  /** Any board with 2 of its 3 spaces taken. */
  nearFull: number
  /** A tormentor (rolls the curse die every Yin phase of its board). */
  tormentor: number
  /** Wu-Feng in play and the deck under 10 cards: up to this much as it runs out. */
  clock: number
}

export const DANGER: DangerWeights = {
  haunted: [0, 0.15, 0.5, 1],
  stone: 0.5,
  card: 0.2,
  lowQi: [1, 0.5, 0.2, 0.06],
  neutralQi: [0.15, 0.08, 0.03, 0],
  overrunOwn: 0.25,
  overrunNeutral: 0.12,
  nearFull: 0.03,
  tormentor: 0.03,
  clock: 0.4,
}

export interface DangerParts {
  haunt: number
  qi: number
  clock: number
}

export function dangerParts(s: GameState, seat: Color, w: DangerWeights = DANGER): DangerParts {
  // Haunting.
  const H = w.haunted
  const h = Math.min(3, hauntedCount(s))
  let haunt = H[h]!
  const next = H[Math.min(3, h + 1)]! - H[h]!
  let qi = 0
  for (const ref of ALL_SPACES) {
    const g = ghostAt(s, ref)
    if (!g) continue
    if (centerActive(s, ref, 'haunter') && lineOf(ref).some((t) => !s.village[t]!.haunted)) haunt += (g.figure === 'stone' ? w.stone : w.card) * next
    if (centerActive(s, ref, 'tormentor')) qi += w.tormentor
  }
  // The Taoist closest to death (solo: the only one).
  let low = 0
  for (const c of COLORS) {
    const t = s.taoists[c]
    if (s.boards[c].neutral || !t.alive) continue
    low = Math.max(low, w.lowQi[Math.min(4, t.qi)] ?? 0)
  }
  qi += low
  // Every board: overruns, near-full boards, the neutral boards' Qi.
  for (const c of COLORS) {
    const b = s.boards[c]
    const taken = b.spaces.filter(Boolean).length
    if (taken === 2) qi += w.nearFull
    if (!b.neutral) {
      if (taken === 3 && (s.taoists[c].alive || c === seat)) qi += w.overrunOwn
      continue
    }
    if (b.possessed) {
      qi += w.neutralQi[0]!
      if (taken === 3) qi += w.overrunOwn
    } else {
      qi += w.neutralQi[Math.min(3, b.qi)] ?? 0
      if (taken === 3) qi += w.overrunNeutral * (b.qi <= 1 ? 2 : 1)
    }
  }
  // Wu-Feng in play: the deck running out loses.
  const clock = incarnationInPlay(s) && s.deck.length < 10 ? w.clock * (1 - s.deck.length / 10) : 0
  return { haunt, qi, clock }
}

export function danger(s: GameState, seat: Color, w: DangerWeights = DANGER): number {
  const p = dangerParts(s, seat, w)
  return p.haunt + p.qi + p.clock
}
