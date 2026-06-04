// Event log + per-turn timeline snapshots. Phase 2 fills this in.

import { create } from 'zustand'

export type LogEntry = {
  at: number
  kind: string
  text: string
  // Free-form payload for typed renderers (dice rolls, exorcism details, etc).
  data?: Record<string, unknown>
}

type LogStore = {
  entries: LogEntry[]
  append: (entry: Omit<LogEntry, 'at'>) => void
  clear: () => void
}

export const useLogStore = create<LogStore>((set) => ({
  entries: [],
  append: (entry) =>
    set((s) => ({ entries: [...s.entries, { ...entry, at: Date.now() }] })),
  clear: () => set({ entries: [] }),
}))
