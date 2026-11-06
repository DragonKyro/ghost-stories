// Card geometry (viewBox 0 0 200 300), shared by GhostCardArt and ghostDefs.

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Illustration window, full-size card (name banner + pips above it). */
export const WIN_NORMAL: Rect = { x: 12, y: 70, w: 176, h: 140 }
/** Illustration window, compact card (no name; big pips above it). */
export const WIN_COMPACT: Rect = { x: 10, y: 59, w: 180, h: 136 }

export interface StoneLayout {
  cy: number
  r: number
  cx: readonly [number, number, number]
}

export const STONES_NORMAL: StoneLayout = { cy: 254, r: 29, cx: [38, 100, 162] }
export const STONES_COMPACT: StoneLayout = { cy: 248, r: 32, cx: [35, 100, 165] }
