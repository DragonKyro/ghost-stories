// Shared bits for the ghost illustrations. Every design draws into a
// 160×150 box (x right, y down; the ghost stands on y ≈ 146).
import type { ReactNode } from 'react'
import type { TaoColor } from '@/game/types'
import { COLOR_DARK, COLOR_HEX, COLOR_LIGHT } from '../palette'

export interface Tint {
  color: TaoColor
  /** Main colour of the ghost (washes, robes, flames). */
  tint: string
  light: string
  deep: string
  /** Radial wash gradient for the backdrop. */
  wash: string
  /** Gradient for glowing eyes. */
  glow: string
}

export function tintFor(color: TaoColor, incarnation = false): Tint {
  if (color === 'black') {
    return {
      color,
      tint: '#5a524b',
      light: '#a8a29a',
      deep: '#0d0a08',
      wash: 'url(#gs-wash-ash)',
      glow: incarnation ? 'url(#gs-red-glow)' : 'url(#gs-eye-glow)',
    }
  }
  return {
    color,
    tint: COLOR_HEX[color],
    light: COLOR_LIGHT[color],
    deep: COLOR_DARK[color],
    wash: `url(#gs-wash-${color})`,
    glow: incarnation || color === 'green' ? 'url(#gs-red-glow)' : 'url(#gs-eye-glow)',
  }
}

export type Design = (t: Tint) => ReactNode

export const INK = '#1d1712'
export const VOID = '#0b0807'
export const GHOST = '#f1f3ee'
export const GHOST_SHADE = '#c9d2ce'

/** A glowing eye: halo + bright core. */
export function GlowEye({ x, y, r, t }: { x: number; y: number; r: number; t: Tint }) {
  return (
    <>
      <circle cx={x} cy={y} r={r * 2.2} fill={t.glow} />
      <circle cx={x} cy={y} r={r * 0.55} fill="#fffbe8" />
    </>
  )
}
