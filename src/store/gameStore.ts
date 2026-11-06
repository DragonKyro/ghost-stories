// Zustand store for the live game and the screen the app is on.
//
// - `dispatch(action)`: this device's move. Checked by the network guard (when
//   online), applied at once, then handed to the network layer to write to the
//   room's log.
// - `applyLocal(action, at)`: a move from the room's log (or a replay after a
//   rollback). Applied silently.
// - `takeSnapshot()` / `restoreSnapshot()`: the network layer rolls back with
//   these when another device's move lands first.
//
// The network store registers itself through the `register*` hooks so this
// file never imports it (no circular imports).

import { create } from 'zustand'
import { applyAction, createGame } from '@/game/engine'
import type { Action } from '@/game/actions'
import type { Color, GameConfig, GameState } from '@/game/types'
import { useLogStore, type LogSnapshot } from './logStore'

export type UiMode = 'mainMenu' | 'newGame' | 'online' | 'rulebook' | 'inGame'

export interface GameSnapshot {
  game: GameState
  log: LogSnapshot
}

type BroadcastHandler = (action: Action, before: GameSnapshot, at: number) => void
type DispatchGuard = (action: Action) => string | null

let broadcast: BroadcastHandler | null = null
let guard: DispatchGuard | null = null
let onlinePredicate: () => boolean = () => false

/** The network store hands its moves to the room through this. */
export function registerBroadcastHandler(fn: BroadcastHandler | null): void {
  broadcast = fn
}
/** Online: refuse moves for seats this device doesn't own (returns the reason, or null to allow). */
export function registerDispatchGuard(fn: DispatchGuard | null): void {
  guard = fn
}
/** Lets this store ask "are we in an online room?" without importing the network store. */
export function registerOnlinePredicate(fn: () => boolean): void {
  onlinePredicate = fn
}
export function isOnline(): boolean {
  return onlinePredicate()
}

const UNDO_DEPTH = 30

interface GameStore {
  game: GameState | null
  uiMode: UiMode
  /** When the game began (ms since epoch), for the game clock. */
  startedAt: number
  /** The last move that failed, shown as a toast. */
  error: string | null
  /** Hot-seat: the board covered by the hand-off screen until its player taps in. */
  handoff: Color | null
  /** Solo / hot-seat undo stack (states before each undoable move). */
  undoStack: GameSnapshot[]

  setUiMode: (mode: UiMode) => void
  clearError: () => void
  setHandoff: (c: Color | null) => void

  /** Start a game on this device (solo / hot-seat). */
  startLocalGame: (config: GameConfig) => void
  /** Online: the starting state built from the room's start record. */
  setGameState: (game: GameState, startedAt: number) => void
  /** Leave the game screen. */
  quitGame: () => void

  dispatch: (action: Action) => boolean
  applyLocal: (action: Action, at?: number) => boolean
  takeSnapshot: () => GameSnapshot | null
  restoreSnapshot: (s: GameSnapshot) => void

  canUndo: () => boolean
  undo: () => void
}

/**
 * A move can be taken back when it revealed nothing new: no dice rolled, no
 * card drawn (so ending a turn — which draws the next ghost — is final), and
 * the same player still acting.
 */
function undoable(before: GameState, after: GameState): boolean {
  return before.rng === after.rng && before.deck.length === after.deck.length && before.active === after.active && after.phase !== 'gameOver'
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  uiMode: 'mainMenu',
  startedAt: 0,
  error: null,
  handoff: null,
  undoStack: [],

  setUiMode: (uiMode) => set({ uiMode }),
  clearError: () => set({ error: null }),
  setHandoff: (handoff) => set({ handoff }),

  startLocalGame: (config) => {
    const game = createGame(config)
    useLogStore.getState().clear()
    useLogStore.getState().record(game.events, game.turn)
    set({ game, uiMode: 'inGame', startedAt: Date.now(), error: null, handoff: null, undoStack: [] })
  },

  setGameState: (game, startedAt) => {
    useLogStore.getState().clear()
    useLogStore.getState().record(game.events, game.turn, startedAt)
    set({ game, uiMode: 'inGame', startedAt, error: null, handoff: null, undoStack: [] })
  },

  quitGame: () => set({ game: null, uiMode: 'mainMenu', handoff: null, undoStack: [], error: null }),

  dispatch: (action) => {
    const cur = get().game
    if (!cur) return false
    const refused = guard?.(action) ?? null
    if (refused) {
      set({ error: refused })
      return false
    }
    const before: GameSnapshot = { game: cur, log: useLogStore.getState().snapshot() }
    let next: GameState
    try {
      next = applyAction(cur, action)
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
    const at = Date.now()
    useLogStore.getState().record(next.events, next.turn, at)
    const online = onlinePredicate()
    const undoStack = !online && undoable(cur, next) ? [...get().undoStack, before].slice(-UNDO_DEPTH) : []
    set({ game: next, error: null, undoStack })
    if (online) broadcast?.(action, before, at)
    return true
  },

  applyLocal: (action, at = Date.now()) => {
    const cur = get().game
    if (!cur) return false
    let next: GameState
    try {
      next = applyAction(cur, action)
    } catch (e) {
      console.warn('[game] move from the log did not apply:', (e as Error).message, action)
      return false
    }
    useLogStore.getState().record(next.events, next.turn, at)
    set({ game: next, undoStack: [] })
    return true
  },

  takeSnapshot: () => {
    const game = get().game
    return game ? { game, log: useLogStore.getState().snapshot() } : null
  },

  restoreSnapshot: (s) => {
    useLogStore.getState().restore(s.log)
    set({ game: s.game })
  },

  canUndo: () => !onlinePredicate() && get().undoStack.length > 0,

  undo: () => {
    if (onlinePredicate()) return
    const stack = get().undoStack
    const last = stack[stack.length - 1]
    if (!last) return
    useLogStore.getState().restore(last.log)
    set({ game: last.game, undoStack: stack.slice(0, -1), error: null })
  },
}))
