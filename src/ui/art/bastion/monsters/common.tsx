// Shared bits for the Horde illustrations. Every design draws into a 160×150
// box (x right, y down; the figure stands on y ≈ 146), tinted by the card's
// colour. `boss` = drawn for a Warlord card (crowns, regalia, more menace).
import type { ReactNode } from 'react'
import type { TaoColor } from '@/game/types'
import { LB_INK } from '../palette'

export { LB_INK as INK }

interface HideDef {
  light: string
  base: string
  deep: string
  /** Fire / frost / spores / magic: the monster's own light. */
  accent: string
  /** Backdrop glow behind the figure. */
  aura: string
  /** Eye glow gradient. */
  eye: string
  /** Card frame enamel (light → mid → deep). */
  frame: readonly [string, string, string]
}

export const HIDE: Record<TaoColor, HideDef> = {
  red: {
    light: '#ec7a5c',
    base: '#b0301f',
    deep: '#4a0c08',
    accent: '#ffb23a',
    aura: '#ffb04a',
    eye: 'url(#lb-eye-glow)',
    frame: ['#e0614a', '#a92a1e', '#5a120c'],
  },
  green: {
    light: '#a6cf68',
    base: '#4d8635',
    deep: '#183311',
    accent: '#d8ff5a',
    aura: '#dcf59a',
    eye: 'url(#lb-card-eye-toxic)',
    frame: ['#5fae76', '#2f8150', '#133d24'],
  },
  blue: {
    light: '#cbe8fa',
    base: '#5f97cf',
    deep: '#183766',
    accent: '#dff8ff',
    aura: '#9fd8ff',
    eye: 'url(#lb-card-eye-frost)',
    frame: ['#6c9fe0', '#2c62ad', '#102f5e'],
  },
  yellow: {
    light: '#f5ead0',
    base: '#cfb67c',
    deep: '#5f4a22',
    accent: '#c9ff7a',
    aura: '#f2df8a',
    eye: 'url(#lb-card-eye-toxic)',
    frame: ['#f2d488', '#cf9f3c', '#6e4c12'],
  },
  black: {
    light: '#a89bc0',
    base: '#564c6c',
    deep: '#231e2e',
    accent: '#c27cff',
    aura: '#b27cf2',
    eye: 'url(#lb-violet-eye)',
    frame: ['#57506a', '#2a2533', '#0b0a0f'],
  },
}

/** Sky of each colour's backdrop: top, middle, horizon. */
export const SKY: Record<TaoColor, readonly [string, string, string]> = {
  red: ['#140303', '#430d07', '#b8421a'],
  green: ['#050d09', '#10261a', '#55703a'],
  blue: ['#071129', '#183766', '#7aa9d2'],
  yellow: ['#1c170a', '#4f421b', '#c4ad57'],
  black: ['#040307', '#1b1029', '#4d2f6e'],
}

export interface Tint {
  color: TaoColor
  /** Body gradient (light top, deep bottom). */
  hide: string
  base: string
  light: string
  deep: string
  accent: string
  eye: string
}

export function tintFor(color: TaoColor): Tint {
  const h = HIDE[color]
  return { color, hide: `url(#lb-card-hide-${color})`, base: h.base, light: h.light, deep: h.deep, accent: h.accent, eye: h.eye }
}

/** `alt` picks a design's second look (e.g. the orc warchief's helm and banner). */
export type Design = (t: Tint, boss: boolean, alt: boolean) => ReactNode

// Shared materials.
export const BONE = '#ebe1c6'
export const BONE_SHADE = '#b9a985'
export const STEEL = 'url(#lb-steel)'
export const IRON = 'url(#lb-iron)'
export const GOLD = 'url(#lb-gold)'
export const DARK = '#1b1820'
export const PALE_SKIN = '#e6dfe9'

/** A glowing eye: halo + bright core. */
export function Eye({ x, y, r, t }: { x: number; y: number; r: number; t: Tint }) {
  return (
    <>
      <circle cx={x} cy={y} r={r * 2.4} fill={t.eye} />
      <circle cx={x} cy={y} r={r * 0.6} fill="#fffbe8" />
    </>
  )
}

/** Two eyes, slanted toward the nose (angry). */
export function Eyes({ x, y, gap, r, t }: { x: number; y: number; gap: number; r: number; t: Tint }) {
  return (
    <>
      <Eye x={x - gap} y={y} r={r} t={t} />
      <Eye x={x + gap} y={y} r={r} t={t} />
    </>
  )
}

/** A gold crown of spikes, centred on (x, y) = middle of its band, `w` wide. */
export function Crown({ x, y, w, spikes = 5 }: { x: number; y: number; w: number; spikes?: number }) {
  const h = w * 0.55
  let d = `M${x - w / 2} ${y + h * 0.25}`
  for (let i = 0; i < spikes; i++) {
    const x0 = x - w / 2 + (i * w) / spikes
    const tall = i === Math.floor(spikes / 2) ? 1.25 : i % 2 === 0 ? 1 : 0.7
    d += `L${x0 + w / spikes / 2} ${y - h * tall}L${x0 + w / spikes} ${y - h * 0.05}`
  }
  d += `L${x + w / 2} ${y + h * 0.25}Z`
  return (
    <g>
      <path d={d} fill={GOLD} stroke={LB_INK} strokeWidth={1.8} strokeLinejoin="round" />
      <circle cx={x} cy={y - h * 0.05} r={w * 0.07} fill="#c0202a" stroke={LB_INK} strokeWidth={1} />
    </g>
  )
}

/** A filled path with the standard outline. */
export function P({ d, fill, sw = 2, o, stroke = LB_INK }: { d: string; fill: string; sw?: number; o?: number; stroke?: string }) {
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" opacity={o} />
}
