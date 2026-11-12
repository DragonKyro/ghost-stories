// Engine entry points.
//
//   createGame(config)        → the starting GameState (first Yin phase already resolved)
//   applyAction(state, action) → the next GameState; throws on an illegal action
//   actionSeat(state, action)  → the seat allowed to send that action
//
// Pure and deterministic: dice come from the seeded RNG on the state, so every
// device applying the same actions to the same start reaches the same state.
// The reducer works on a deep copy, so a throw leaves the caller's state untouched.

import type { Action } from './actions'
import { run } from './flow'
import { applyResponse } from './respond'
import type { GameState, Seat } from './types'
import { applyYang } from './yang'

export { createGame, setupProblem } from './setup'
export type { Action } from './actions'

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

export function applyAction(state: GameState, action: Action): GameState {
  if (state.phase === 'gameOver') throw new Error('The game is over.')
  const s = clone(state)
  s.events = []
  if (action.type === 'respond') applyResponse(s, action.by, action.r)
  else applyYang(s, action)
  run(s)
  return s
}

/** The seat that must send this action: the prompt's owner for answers, the actor otherwise. */
export function actionSeat(state: GameState, action: Action): Seat {
  if (action.type === 'respond') return state.prompt?.owner ?? action.by
  return action.by
}

/** Whose input the game is waiting for right now. */
export function waitingFor(state: GameState): Seat | null {
  if (state.phase === 'gameOver') return null
  if (state.prompt) return state.prompt.owner
  if (state.phase === 'yang') return state.active
  return null
}
