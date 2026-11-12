// The game log: one entry per engine event, plus a per-turn timeline (Qi,
// Tao, ghosts, haunted tiles) for the end-of-game stats. Lives outside
// GameState so the engine stays lean; `snapshot()` / `restore()` keep it in
// step with the game store's undo and the network layer's rollbacks.

import { create } from 'zustand'
import type { Color, CurseFace, DieFace, GameEvent, GameState, GhostRef, TileIdx } from '@/game/types'

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
  n?: number
}

/** The table at one moment of the game (taken once per turn). */
export interface TimelinePoint {
  turn: number
  active: Color
  /** Each Taoist's Qi (0 when dead); null for neutral seats. */
  qi: Record<Color, number | null>
  tao: Record<Color, number | null>
  ghosts: number
  haunted: number
  deck: number
  /** White Moon: villagers dead so far. */
  villagersDead: number
}

export interface LogSnapshot {
  entries: LogEntry[]
  nextId: number
  timeline: TimelinePoint[]
}

interface LogStore {
  entries: LogEntry[]
  nextId: number
  timeline: TimelinePoint[]
  /** Log what an action did; `state` (after it) feeds the timeline. */
  record: (events: GameEvent[], turn: number, at?: number, state?: GameState) => void
  note: (text: string, kind?: string) => void
  clear: () => void
  snapshot: () => LogSnapshot
  restore: (s: LogSnapshot) => void
}

const MAX_ENTRIES = 4000
const COLORS: Color[] = ['red', 'blue', 'green', 'yellow']

export function timelinePoint(s: GameState): TimelinePoint {
  const qi = {} as Record<Color, number | null>
  const tao = {} as Record<Color, number | null>
  for (const c of COLORS) {
    const t = s.taoists[c]
    const neutral = s.boards[c].neutral
    qi[c] = neutral ? null : t.alive ? t.qi : 0
    tao[c] = neutral ? null : Object.values(t.tao).reduce((n, v) => n + v, 0)
  }
  let ghosts = 0
  for (const c of COLORS) ghosts += s.boards[c].spaces.filter(Boolean).length
  return {
    turn: s.turn,
    active: s.active,
    qi,
    tao,
    ghosts,
    haunted: s.village.filter((t) => t.haunted).length,
    deck: s.deck.length,
    villagersDead: s.whiteMoon?.dead.length ?? 0,
  }
}

function safePoint(state: GameState): TimelinePoint | null {
  try {
    return timelinePoint(state)
  } catch {
    return null
  }
}

export const useLogStore = create<LogStore>((set, get) => ({
  entries: [],
  nextId: 1,
  timeline: [],
  record: (events, turn, at = Date.now(), state) => {
    const patch: Partial<LogStore> = {}
    if (events.length > 0) {
      let id = get().nextId
      const added = events.map((e) => ({ ...e, id: id++, at, turn }))
      const entries = [...get().entries, ...added]
      patch.entries = entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries
      patch.nextId = id
    }
    // One point per turn: the latest state seen during that turn (the last one
    // also captures the end of the game). Stats are a side record — a state
    // they can't read (a test stand-in engine) is skipped, never fatal.
    const point = state ? safePoint(state) : null
    if (point) {
      const tl = get().timeline
      const last = tl[tl.length - 1]
      patch.timeline = last && last.turn === point.turn ? [...tl.slice(0, -1), point] : [...tl, point]
    }
    set(patch)
  },
  note: (text, kind = 'note') => {
    const id = get().nextId
    set({ entries: [...get().entries, { id, at: Date.now(), turn: 0, kind, text }], nextId: id + 1 })
  },
  clear: () => set({ entries: [], nextId: 1, timeline: [] }),
  snapshot: () => ({ entries: get().entries, nextId: get().nextId, timeline: get().timeline }),
  restore: (s) => set({ entries: s.entries, nextId: s.nextId, timeline: s.timeline }),
}))
