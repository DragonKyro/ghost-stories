// Horde card geometry (viewBox 0 0 200 300), shared by HordeCardArt and cardDefs.
export type { Rect, StoneLayout } from '../../ghosts/layout'
import type { Rect, StoneLayout } from '../../ghosts/layout'

/** Illustration window, full-size card (name plaque + gems above it). */
export const WIN_NORMAL: Rect = { x: 13, y: 72, w: 174, h: 140 }
/** Illustration window, compact card (no name; big gems above it). */
export const WIN_COMPACT: Rect = { x: 11, y: 60, w: 178, h: 134 }

export const STONES_NORMAL: StoneLayout = { cy: 254, r: 29, cx: [38, 100, 162] }
export const STONES_COMPACT: StoneLayout = { cy: 247, r: 33, cx: [36, 100, 164] }
