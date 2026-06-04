// Zustand store: game state + UI overlay state.
//
// `dispatch(action)` applies locally AND broadcasts via the network store
// (when connected). Receivers call `applyLocal(action)` to skip the
// broadcast. `receiveSnapshot(state)` overwrites the live game with a
// host-authoritative copy (used by guests on game start / rejoin).

import { create } from 'zustand'
import { applyAction, createGame } from '@/game/engine'
import type { Action } from '@/game/actions'
import type { GameConfig, GameState, TaoistColor } from '@/game/types'
import { useLogStore } from './logStore'

export type UiMode = 'mainMenu' | 'newGame' | 'onlineSetup' | 'onlineLobby' | 'inGame' | 'gameOver' | 'rulebook'

export type UiOverlay =
  | { kind: 'none' }
  | { kind: 'selectMoveTarget' }
  | { kind: 'selectExorcismTarget' }
  | { kind: 'rollingExorcism'; targets: import('@/game/types').GhostRef[]; spent: Array<{ from: string; color: string }> }
  | { kind: 'selectBuddhaTarget' }
  | { kind: 'requestHelp'; tileKind: string }
  | { kind: 'yinYang' }
  | { kind: 'handoff'; nextTaoist: TaoistColor }
  | { kind: 'yinPhasePlayback' }

type BroadcastHandler = (action: Action) => void

let broadcaster: BroadcastHandler | null = null

/** Networking layer registers its broadcast hook here. */
export function registerBroadcaster(fn: BroadcastHandler | null) {
  broadcaster = fn
}

type GameStore = {
  game: GameState | null
  uiMode: UiMode
  uiOverlay: UiOverlay
  /** True when this seat is the "currently revealed" Taoist (hot-seat). */
  revealedTaoist: TaoistColor | null
  setUiMode: (mode: UiMode) => void
  setOverlay: (overlay: UiOverlay) => void
  setRevealedTaoist: (c: TaoistColor | null) => void
  startGame: (config: GameConfig) => void
  dispatch: (action: Action) => void
  applyLocal: (action: Action) => void
  /** Host snapshot — replace local state with the authoritative copy. */
  receiveSnapshot: (state: GameState) => void
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
    // Broadcast over the network (no-op if offline).
    if (broadcaster) broadcaster(action)
  },

  applyLocal: (action) => {
    const cur = get().game
    if (!cur) return
    let next: GameState
    try {
      next = applyAction(cur, action)
    } catch (err) {
      console.error('applyLocal failed:', err)
      return
    }
    useLogStore.getState().recordAction(cur, action, next)
    set({
      game: next,
      uiMode: next.phase === 'gameOver' ? 'gameOver' : 'inGame',
    })
  },

  receiveSnapshot: (game) => {
    useLogStore.getState().clear()
    useLogStore.getState().append({ kind: 'snap', text: 'Received game snapshot' })
    set({
      game,
      uiMode: game.phase === 'gameOver' ? 'gameOver' : 'inGame',
      uiOverlay: { kind: 'none' },
      revealedTaoist: null,
    })
  },

  endTurnAndHandoff: () => {
    const s = get()
    if (!s.game) return
    const active = s.game.turnOrder[s.game.turnIndex]
    s.dispatch({ type: 'endYangPhase', taoistId: `taoist-${active}` })
    const next = get().game
    if (!next || next.phase === 'gameOver') return
    const nextSeat = next.turnOrder[next.turnIndex]
    // Hot-seat handoff only when multiple humans share THIS device.
    // We detect "shared device" by counting human seats — networked humans
    // have their own devices, so we suppress the handoff if the network
    // layer says we're online (defer to networkStore via a small lookup).
    // To keep gameStore from importing networkStore (circular), we check a
    // global flag.
    if (typeof window !== 'undefined' && (window as any).__ghostStoriesOnline) {
      // Online: never show the handoff overlay; reveal is unnecessary because
      // each peer only sees their own hand via networkStore.seatUuids.
      set({ revealedTaoist: null })
      return
    }
    if (next.taoists[nextSeat].isHuman) {
      set({ uiOverlay: { kind: 'handoff', nextTaoist: nextSeat }, revealedTaoist: null })
    } else {
      set({ revealedTaoist: null })
    }
  },
}))
