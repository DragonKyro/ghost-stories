// Heuristic AI for empty / AI Taoist seats. Phase 3 lands here.
//
// Contract:
//   chooseAction(state, taoistId) => Action | null
//     null means "I'm done — end Yang phase"
//
// AI is stateless across turns. Any per-turn memory lives in `GameState`, not
// here. See CLAUDE.md "AI model" for the priority tree.

import type { Action, GameState, TaoistId } from '@/game/types'

export function chooseAction(_state: GameState, _taoistId: TaoistId): Action | null {
  // Phase 3 will replace this. For now: always end turn so AI seats are inert.
  return null
}
