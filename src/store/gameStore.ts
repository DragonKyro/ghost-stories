// Zustand store for GameState + UI mode. Phase 2 fills this in.
//
// Exposes:
//   dispatch(action)   — broadcasts then applies
//   applyLocal(action) — silent apply, used by network receivers
//   undo()             — solo/hot-seat only, restores last snapshot

import { create } from 'zustand'
import type { Action, GameState } from '@/game/types'

type UiMode = 'mainMenu' | 'newGame' | 'inGame' | 'gameOver'

type GameStore = {
  game: GameState | null
  uiMode: UiMode
  dispatch: (action: Action) => void
  applyLocal: (action: Action) => void
  setUiMode: (mode: UiMode) => void
}

export const useGameStore = create<GameStore>((set) => ({
  game: null,
  uiMode: 'mainMenu',
  dispatch: (_action) => {
    // Phase 2: applyAction + broadcast.
  },
  applyLocal: (_action) => {
    // Phase 2: applyAction silently (no broadcast).
  },
  setUiMode: (uiMode) => set({ uiMode }),
}))
