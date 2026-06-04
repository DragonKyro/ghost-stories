// Zustand store: game state + UI overlay state.
//
// `dispatch(action)` runs the action through the engine and records the
// resulting transition in the log. Local-only for hot-seat; Phase 4 will
// broadcast over Trystero alongside the local apply.

import { create } from 'zustand'
import { applyAction, createGame } from '@/game/engine'
import type { Action } from '@/game/actions'
import type { GameConfig, GameState, GhostRef, TaoistColor, VillageTileId } from '@/game/types'
import { useLogStore } from './logStore'

export type UiMode = 'mainMenu' | 'newGame' | 'inGame' | 'gameOver'

/**
 * Transient UI state — what dialog is open, what the active player is in the
 * middle of doing. Lives in the store so dialogs are a function of state, not
 * imperatively triggered.
 */
export type UiOverlay =
  | { kind: 'none' }
  | { kind: 'selectMoveTarget' }
  | { kind: 'selectExorcismTarget' } // pick which ghost (1 or 2 for corner)
  | { kind: 'rollingExorcism'; targets: GhostRef[]; spent: Array<{ from: string; color: string }> }
  | { kind: 'selectBuddhaTarget' }
  | { kind: 'requestHelp'; tileKind: string }
  | { kind: 'yinYang' }
  | { kind: 'handoff'; nextTaoist: TaoistColor }
  | { kind: 'yinPhasePlayback' }

type GameStore = {
  game: GameState | null
  uiMode: UiMode
  uiOverlay: UiOverlay
  /** True when this seat is the "currently revealed" Taoist (hot-seat). */
  revealedTaoist: TaoistColor | null
  setUiMode: (mode: UiMode) => void
  setOverlay: (overlay: UiOverlay) => void
  setRevealedTaoist: (c: TaoistColor | null) => void
  /** Spin up a brand-new game from a config. */
  startGame: (config: GameConfig) => void
  /** Dispatch an action through the engine. Throws on invalid actions. */
  dispatch: (action: Action) => void
  /** Silent apply (used by the network layer in Phase 4 / by tests). */
  applyLocal: (action: Action) => void
  /** Hot-seat handoff: hide UI, then reveal the next Taoist. */
  endTurnAndHandoff: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  uiMode: 'mainMenu',
  uiOverlay: { kind: 'none' },
  revealedTaoist: null,

  setUiMode: (uiMode) => set({ uiMode }),
  setOverlay: (uiOverlay) => set({ uiOverlay }),
  setRevealedTaoist: (revealedTaoist) => set({ revealedTaoist }),

  startGame: (config) => {
    const game = createGame(config)
    useLogStore.getState().clear()
    useLogStore.getState().append({ kind: 'gameStart', text: `Game started: ${config.difficulty}` })
    const active = game.turnOrder[game.turnIndex]
    set({
      game,
      uiMode: 'inGame',
      uiOverlay: { kind: 'none' },
      revealedTaoist: game.taoists[active].isHuman ? active : null,
    })
  },

  dispatch: (action) => {
    const cur = get().game
    if (!cur) throw new Error('dispatch with no active game')
    const next = applyAction(cur, action)
    useLogStore.getState().recordAction(cur, action, next)
    set({
      game: next,
      uiMode: next.phase === 'gameOver' ? 'gameOver' : 'inGame',
    })
  },

  applyLocal: (action) => {
    const cur = get().game
    if (!cur) return
    const next = applyAction(cur, action)
    set({ game: next })
  },

  endTurnAndHandoff: () => {
    const s = get()
    if (!s.game) return
    // Dispatch endYangPhase to advance turn order.
    const dispatch = s.dispatch
    const active = s.game.turnOrder[s.game.turnIndex]
    dispatch({ type: 'endYangPhase', taoistId: `taoist-${active}` })
    const next = get().game
    if (!next || next.phase === 'gameOver') return
    // Trigger hot-seat handoff to the next seat (humans only).
    const nextSeat = next.turnOrder[next.turnIndex]
    if (next.taoists[nextSeat].isHuman) {
      set({ uiOverlay: { kind: 'handoff', nextTaoist: nextSeat }, revealedTaoist: null })
    } else {
      // AI / neutral — no handoff screen needed (Phase 3 will drive them).
      set({ revealedTaoist: null })
    }
  },
}))

// Force the dummy `VillageTileId` import to be used at runtime (kept for type
// completeness on future overlay variants).
void (null as unknown as VillageTileId)
