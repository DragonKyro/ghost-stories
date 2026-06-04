// Engine entry point. Phase 1 lands here.
//
// Contract:
//   applyAction(state, action) => state    // pure, deterministic
//   createGame(config) => GameState        // initial state from config + seeded deck/layout
//
// All randomness flows through the action payload — see CLAUDE.md "Determinism".
// Action handlers live in `src/game/actions/*` and are wired by the dispatcher in
// this file. Right now this file is a stub so the UI / type layers compile.

import type { Action, GameConfig, GameState } from './types'

export function createGame(_config: GameConfig): GameState {
  throw new Error('createGame: not yet implemented (Phase 1a)')
}

export function applyAction(_state: GameState, _action: Action): GameState {
  throw new Error('applyAction: not yet implemented (Phase 1)')
}
