// Short board effects after each action, read from the events of the last
// action (state.events): a sword slash where a Monster is vanquished, the
// Grasp of Evil spreading over a tile, a hurt flash on a plate… Last Bastion
// only (Ghost Stories keeps its still ink look). The CSS is in ../bastion.css.
import { useMemo } from 'react'
import { refKey } from '@/game/geometry'
import { COLORS, type Color, type GameEvent, type TileIdx } from '@/game/types'

export type SpaceFx = 'slash' | 'banish'
export type TileFx = 'grasp' | 'cleanse'
export type PlateFx = 'hurt' | 'heal'

export interface BoardFx {
  /** New for every action: effect elements are keyed by it, so they replay. */
  serial: number
  spaces: ReadonlyMap<string, SpaceFx>
  tiles: ReadonlyMap<TileIdx, TileFx>
  plates: ReadonlyMap<Color, PlateFx>
}

const NONE: BoardFx = { serial: 0, spaces: new Map(), tiles: new Map(), plates: new Map() }
let serial = 0

export function boardFx(events: readonly GameEvent[]): Omit<BoardFx, 'serial'> {
  const spaces = new Map<string, SpaceFx>()
  const tiles = new Map<TileIdx, TileFx>()
  const plates = new Map<Color, PlateFx>()
  for (const e of events) {
    if (e.ref && (e.kind === 'exorcised' || (e.kind === 'buddha' && e.card))) spaces.set(refKey(e.ref), 'slash')
    else if (e.ref && e.kind === 'discard') spaces.set(refKey(e.ref), 'banish')
    else if (e.tile !== undefined && e.kind === 'haunt') tiles.set(e.tile, 'grasp')
    else if (e.tile !== undefined && e.kind === 'unhaunt') tiles.set(e.tile, 'cleanse')
    else if (e.kind === 'qi' && e.n && (COLORS as readonly string[]).includes(e.color ?? '')) {
      const c = e.color as Color
      // A loss outweighs a gain in the same action.
      if (e.n < 0) plates.set(c, 'hurt')
      else if (!plates.has(c)) plates.set(c, 'heal')
    }
  }
  return { spaces, tiles, plates }
}

export function useBoardFx(events: readonly GameEvent[], on: boolean): BoardFx {
  return useMemo(() => (on ? { serial: ++serial, ...boardFx(events) } : NONE), [events, on])
}
