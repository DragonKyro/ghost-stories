// What the player is in the middle of choosing on the board (local to this
// device, never part of the game state). The board highlights targets for the
// current selection and routes clicks here; the action panel shows the steps.

import { create } from 'zustand'
import type { HelpParams } from '@/game/actions'
import type { Color, GhostRef, TileIdx, TileKind } from '@/game/types'

/** A tile action whose parameters are being collected step by step. */
export interface HelpDraft {
  kind: TileKind
  /** The tile whose villager helps (the Taoist's own, or any via the Yin-Yang). */
  tile: TileIdx
  viaYinYang: boolean
  /** Picked so far (meaning depends on `kind`). */
  ghost?: GhostRef
  to?: GhostRef
  taoist?: Color | null
  board?: Color
  carry?: boolean
  climb?: boolean
}

export type Selecting =
  | { kind: 'move' }
  | { kind: 'exorcise'; picked: GhostRef[] }
  | { kind: 'buddha'; picked: GhostRef[] }
  | { kind: 'help'; draft: HelpDraft }
  | { kind: 'yinYangTile' }
  | { kind: 'yinYangFlip' }
  | { kind: 'twinWinds'; taoist?: Color }
  | { kind: 'mantra' }
  | { kind: 'artifact'; artifact: 'jadeTalisman' | 'phoenixFeather' }

interface UiStore {
  selecting: Selecting | null
  /** A ghost / tile being inspected in the detail popover. */
  inspect: { kind: 'ghost'; ref: GhostRef } | { kind: 'tile'; tile: TileIdx } | null
  /** Villager escort toggle for the next move (White Moon). */
  carry: boolean
  /** Black Secret: a Taoist moved by Twin Winds changes levels afterwards. */
  climb: boolean
  sidePanel: 'log' | 'chat' | 'expansion'
  /** The stats screen is open. */
  showStats: boolean
  setShowStats: (b: boolean) => void
  select: (s: Selecting | null) => void
  setInspect: (i: UiStore['inspect']) => void
  setCarry: (b: boolean) => void
  setClimb: (b: boolean) => void
  setSidePanel: (p: UiStore['sidePanel']) => void
  reset: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  selecting: null,
  inspect: null,
  carry: false,
  climb: false,
  sidePanel: 'log',
  showStats: false,
  setShowStats: (showStats) => set({ showStats }),
  select: (selecting) => set({ selecting }),
  setInspect: (inspect) => set({ inspect }),
  setCarry: (carry) => set({ carry }),
  setClimb: (climb) => set({ climb }),
  setSidePanel: (sidePanel) => set({ sidePanel }),
  reset: () => set({ selecting: null, inspect: null, carry: false, climb: false }),
}))

export type { HelpParams }
