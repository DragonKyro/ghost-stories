// Village geometry: the 3×3 grid, the four boards around it, and which ghost
// spaces face which tiles.
//
// Tiles are numbered row-major (0 = north-west corner, 4 = centre,
// 8 = south-east). Board spaces run west→east on the north (red) and south
// (green) boards, and north→south on the east (blue) and west (yellow) boards,
// so a space index lines up with the column / row it faces.

import { BOARD_SIDE, type Color, type Corner, type GhostRef, type SpaceIdx, type TileIdx } from './types'

export const colOf = (t: TileIdx): number => t % 3
export const rowOf = (t: TileIdx): number => Math.floor(t / 3)
export const tileAt = (col: number, row: number): TileIdx => row * 3 + col

export const ALL_TILES: readonly TileIdx[] = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/** King's-move neighbours (diagonals included) on the 3×3 grid. */
export function adjacentTiles(t: TileIdx): TileIdx[] {
  const out: TileIdx[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const c = colOf(t) + dc
      const r = rowOf(t) + dr
      if (c >= 0 && c <= 2 && r >= 0 && r <= 2) out.push(tileAt(c, r))
    }
  }
  return out
}

export const isAdjacent = (a: TileIdx, b: TileIdx): boolean =>
  a !== b && Math.abs(colOf(a) - colOf(b)) <= 1 && Math.abs(rowOf(a) - rowOf(b)) <= 1

export const isCorner = (t: TileIdx): boolean => t === 0 || t === 2 || t === 6 || t === 8

/** The three tiles in front of a ghost space, nearest first ("the next one on the same line"). */
export function lineOf(ref: GhostRef): TileIdx[] {
  const i = ref.space
  switch (BOARD_SIDE[ref.board]) {
    case 'north':
      return [tileAt(i, 0), tileAt(i, 1), tileAt(i, 2)]
    case 'south':
      return [tileAt(i, 2), tileAt(i, 1), tileAt(i, 0)]
    case 'west':
      return [tileAt(0, i), tileAt(1, i), tileAt(2, i)]
    case 'east':
      return [tileAt(2, i), tileAt(1, i), tileAt(0, i)]
  }
}

/** The tile directly in front of a ghost space: a Taoist must stand here to exorcise it. */
export const facingTile = (ref: GhostRef): TileIdx => lineOf(ref)[0]!

/** Ghost spaces a Taoist on `t` faces: one from an edge tile, two from a corner, none from the centre. */
export function facedSpaces(t: TileIdx): GhostRef[] {
  const out: GhostRef[] = []
  for (const board of ['red', 'blue', 'green', 'yellow'] as Color[]) {
    for (const space of [0, 1, 2] as SpaceIdx[]) {
      if (facingTile({ board, space }) === t) out.push({ board, space })
    }
  }
  return out
}

export const OPPOSITE: Record<Color, Color> = { red: 'green', green: 'red', blue: 'yellow', yellow: 'blue' }

/** The ghost space on the opposite board, at the other end of the same line. */
export const oppositeSpace = (ref: GhostRef): GhostRef => ({ board: OPPOSITE[ref.board], space: ref.space })

/**
 * Spaces in left-to-right order as seen by the player sitting at the board
 * (facing the village). North faces south, so its left is east; and so on.
 */
export function spacesLeftToRight(board: Color): SpaceIdx[] {
  const side = BOARD_SIDE[board]
  return side === 'north' || side === 'east' ? [2, 1, 0] : [0, 1, 2]
}

/** The village corner a board's end space touches (where a White Moon receptacle stands). */
export function cornerOfSpace(ref: GhostRef): Corner | null {
  if (ref.space === 1) return null
  const first = ref.space === 0
  switch (BOARD_SIDE[ref.board]) {
    case 'north':
      return first ? 'nw' : 'ne'
    case 'east':
      return first ? 'ne' : 'se'
    case 'south':
      return first ? 'sw' : 'se'
    case 'west':
      return first ? 'nw' : 'sw'
  }
}

export const sameRef = (a: GhostRef, b: GhostRef): boolean => a.board === b.board && a.space === b.space
export const refKey = (r: GhostRef): string => `${r.board}:${r.space}`

/** Short human name of a tile position. */
export function tilePlace(t: TileIdx): string {
  const names = ['north-west', 'north', 'north-east', 'west', 'centre', 'east', 'south-west', 'south', 'south-east']
  return names[t] ?? `tile ${t}`
}
