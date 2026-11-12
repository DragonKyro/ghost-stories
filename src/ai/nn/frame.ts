// The canonical frame: the table turned so the deciding Taoist sits at seat 0.
//
// A quarter turn clockwise moves the north board to the east, and so on;
// colours turn with their boards (red → blue → green → yellow), so turn
// order — clockwise — is kept and the rules don't change. Seat 0 is "me",
// seat 1 plays next, etc. Tiles, ghost spaces, corners and catacomb spaces
// are renumbered as they sit after the turn, so slot i always means the same
// place on the table. (No mirror images: they would reverse turn order.)

import { facingTile } from '@/game/geometry'
import type { Color, Corner, GhostRef, SpaceIdx, TaoColor, TileIdx } from '@/game/types'
import { COLORS } from '@/game/types'

export interface Frame {
  me: Color
  /** Quarter turns clockwise. */
  k: number
  /** Relative seat / colour 0–3 of a board colour. */
  seat(c: Color): number
  /** Relative Tao colour: 0–3 for the board colours, 4 for black. */
  tao(c: TaoColor): number
  /** The colour at relative seat i. */
  colorAt(i: number): Color
  /** Canonical tile (also catacomb space) index. */
  tile(t: TileIdx): number
  /** Canonical ghost-space slot 0–11: seat × 3 + canonical space. */
  space(ref: GhostRef): number
  corner(c: Corner): number
}

const rot1 = (t: TileIdx): TileIdx => {
  const c = t % 3
  const r = Math.floor(t / 3)
  return c * 3 + (2 - r) // (c, r) → (2 − r, c): row c, column 2 − r
}

const CORNER_TILE: Record<Corner, TileIdx> = { nw: 0, ne: 2, sw: 6, se: 8 }
const TILE_CORNER: Record<number, number> = { 0: 0, 2: 1, 6: 2, 8: 3 }

function build(k: number): Frame {
  const me = COLORS[(4 - k) % 4]!
  const tiles: number[] = []
  for (let t = 0; t < 9; t++) {
    let x = t
    for (let i = 0; i < k; i++) x = rot1(x)
    tiles.push(x)
  }
  const seat = (c: Color) => (COLORS.indexOf(c) + k) % 4
  const spaces = new Map<string, number>()
  for (const board of COLORS) {
    for (const space of [0, 1, 2] as SpaceIdx[]) {
      const faced = tiles[facingTile({ board, space })]!
      const b2 = COLORS[seat(board)]!
      const s2 = ([0, 1, 2] as SpaceIdx[]).find((i) => facingTile({ board: b2, space: i }) === faced)!
      spaces.set(`${board}:${space}`, seat(board) * 3 + s2)
    }
  }
  return {
    me,
    k,
    seat,
    tao: (c) => (c === 'black' ? 4 : seat(c)),
    colorAt: (i) => COLORS[(i - k + 8) % 4]!,
    tile: (t) => tiles[t]!,
    space: (ref) => spaces.get(`${ref.board}:${ref.space}`)!,
    corner: (c) => TILE_CORNER[tiles[CORNER_TILE[c]]!]!,
  }
}

const FRAMES = [0, 1, 2, 3].map(build)

export function frameFor(me: Color): Frame {
  return FRAMES[(4 - COLORS.indexOf(me)) % 4]!
}

/** In the canonical frame the seat-i board sits where COLORS[i]'s board sits on the real table. */
export const canonicalColor = (i: number): Color => COLORS[i]!
