// Which part of the game a position is in — for the training curriculum
// (training/rl.py starts more self-play games in the parts the network loses
// most) and for reporting where games are lost.
//   early: fewer cards drawn than are left before the next incarnation
//          (solo Normal: the first 9 of the 19 ghosts before it);
//   mid:   the rest of the way to it;
//   late:  an incarnation has come out (it's in play, or beaten).

import { incarnationInPlay, isWuFengCard } from '@/game/rules'
import type { GameState } from '@/game/types'

export type GamePhase = 'early' | 'mid' | 'late'
export const GAME_PHASES: readonly GamePhase[] = ['early', 'mid', 'late']

/** `deck0`: the deck's size at the start of the game. */
export function gamePhase(s: GameState, deck0: number): GamePhase {
  const next = s.deck.findIndex(isWuFengCard)
  if (next < 0 || incarnationInPlay(s) || s.discard.some(isWuFengCard)) return 'late'
  const drawn = deck0 - s.deck.length
  return drawn < next + 1 ? 'early' : 'mid'
}
