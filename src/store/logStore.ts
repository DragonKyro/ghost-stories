// The game log: one entry per engine event. Lives outside GameState so the
// engine stays lean; `snapshot()` / `restore()` keep it in step with the game
// store's undo and the network layer's rollbacks.

import { create } from 'zustand'
import type { Color, CurseFace, DieFace, GameEvent, GhostRef, TileIdx } from '@/game/types'

export interface LogEntry {
  id: number
  at: number
  turn: number
  kind: string
  text: string
  color?: Color | 'wufeng'
  dice?: DieFace[]
  curse?: CurseFace
  tile?: TileIdx
  ref?: GhostRef
  card?: string
}

export interface LogSnapshot {
  entries: LogEntry[]
  nextId: number
}

interface LogStore {
  entries: LogEntry[]
  nextId: number
  record: (events: GameEvent[], turn: number, at?: number) => void
  note: (text: string, kind?: string) => void
  clear: () => void
  snapshot: () => LogSnapshot
  restore: (s: LogSnapshot) => void
}

const MAX_ENTRIES = 1500

export const useLogStore = create<LogStore>((set, get) => ({
  entries: [],
  nextId: 1,
  record: (events, turn, at = Date.now()) => {
    if (events.length === 0) return
    let id = get().nextId
    const added = events.map((e) => ({ ...e, id: id++, at, turn }))
    const entries = [...get().entries, ...added]
    set({ entries: entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries, nextId: id })
  },
  note: (text, kind = 'note') => {
    const id = get().nextId
    set({ entries: [...get().entries, { id, at: Date.now(), turn: 0, kind, text }], nextId: id + 1 })
  },
  clear: () => set({ entries: [], nextId: 1 }),
  snapshot: () => ({ entries: get().entries, nextId: get().nextId }),
  restore: (s) => set({ entries: s.entries, nextId: s.nextId }),
}))
