// Shared building blocks for the village tiles: the paper / night grounds,
// the frame, the action strip, two-mode layers (ink by day, silhouette by
// night), a portrait builder (face + robe), and the haunted-side effects.
// All coordinates are in the tile's 240×240 viewBox; the scene is y 0–192.
import type { ReactNode } from 'react'
import { blob, brush, smooth, strokes, type Pt } from '../brush'
import { HAND_PATH } from '../glyphs'
import { INK, INK_FADED } from '../palette'
import type { WashKey } from '../ArtDefs'

export const SCENE_H = 192
/** Night silhouette fill. */
export const SIL = '#120e19'
/** Night rim / far-silhouette tone. */
export const SIL_FAR = '#2a2436'
export const NIGHT_PALE = '#9b92ad'
export const SPECTRE = '#dfe8e2'

// ---------------------------------------------------------------------------
// Small path helpers.
// ---------------------------------------------------------------------------
export function circ(cx: number, cy: number, r: number): string {
  const f = (n: number) => Math.round(n * 10) / 10
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`
}
export function ell(cx: number, cy: number, rx: number, ry: number): string {
  const f = (n: number) => Math.round(n * 10) / 10
  return `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`
}
export function rect(x: number, y: number, w: number, h: number): string {
  return `M${x} ${y}h${w}v${h}h${-w}Z`
}

// ---------------------------------------------------------------------------
// Two-mode layers: each path has a day paint and a night paint.
// ---------------------------------------------------------------------------
export interface Layer {
  d: string
  /** Fill (or stroke, with `sw`) by day; null = skip by day. */
  day: string | null
  /** By night; undefined = silhouette (SIL), null = skip. */
  night?: string | null
  o?: number
  no?: number
  /** Stroke width: draw as a stroked line instead of a fill. */
  sw?: number
}

export const L = (d: string, day: string | null, night?: string | null, o?: number, no?: number): Layer => ({ d, day, night, o, no })
export const S = (d: string, day: string | null, sw: number, night?: string | null, o?: number): Layer => ({ d, day, night, sw, o })

export function Layers({ list, night }: { list: readonly Layer[]; night: boolean }) {
  return (
    <>
      {list.map((l, i) => {
        const paint = night ? (l.night === undefined ? SIL : l.night) : l.day
        if (!paint) return null
        const o = night ? l.no : l.o
        return l.sw ? (
          <path key={i} d={l.d} fill="none" stroke={paint} strokeWidth={l.sw} strokeLinecap="round" strokeLinejoin="round" opacity={o} />
        ) : (
          <path key={i} d={l.d} fill={paint} opacity={o} />
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// Grounds, frame, strip.
// ---------------------------------------------------------------------------
const TILE_SHAPE = 'M8 0H232Q240 0 240 8V232Q240 240 232 240H8Q0 240 0 232V8Q0 0 8 0Z'
const STRIP_SHAPE = 'M0 192H240V232Q240 240 232 240H8Q0 240 0 232Z'
const STRIP_RULE = brush([[6, 193.5], [60, 191.5], [150, 192.5], [234, 191]], 3.2, 'both', { min: 0.2 })
const STRIP_RULE_NIGHT = brush([[6, 194], [70, 191], [140, 194], [234, 191.5]], 2.4, 'both', { min: 0.2 })

/** A wash blob: (cx, cy, rx, ry, colour key, seed, opacity). */
export type Wash = readonly [number, number, number, number, WashKey, number?, number?]

export function DayGround({ washes }: { washes: readonly Wash[] }) {
  return (
    <>
      <path d={TILE_SHAPE} fill="url(#gs-paper)" />
      <path d={TILE_SHAPE} fill="url(#gs-mottle)" />
      {washes.map(([cx, cy, rx, ry, k, seed = 1, o = 1], i) => (
        <path key={i} d={blob(cx, cy, rx, ry, seed + i * 7, 0.16, 10)} fill={`url(#gs-wash-${k})`} opacity={o} />
      ))}
      <path d={TILE_SHAPE} fill="url(#gs-fibre)" />
    </>
  )
}

export function NightGround({ moon }: { moon: readonly [number, number] | null }) {
  return (
    <>
      <path d={TILE_SHAPE} fill="url(#gs-night)" />
      <path d={blob(120, 70, 150, 70, 3, 0.2)} fill="url(#gs-wash-violet)" opacity={0.7} />
      {moon && (
        <>
          <circle cx={moon[0]} cy={moon[1]} r={46} fill="url(#gs-moon-halo)" />
          <circle cx={moon[0]} cy={moon[1]} r={15} fill="url(#gs-moon)" opacity={0.92} />
          <path d={blob(moon[0] - 4, moon[1] + 2, 9, 5, 4, 0.3)} fill="#9d96a8" opacity={0.25} />
        </>
      )}
      <path d={TILE_SHAPE} fill="url(#gs-fibre-light)" />
    </>
  )
}

export function Strip({ children }: { children: ReactNode }) {
  return (
    <>
      <path d={STRIP_SHAPE} fill="url(#gs-paper-strip)" />
      <path d={STRIP_SHAPE} fill="url(#gs-fibre)" />
      <path d={STRIP_RULE} fill={INK} />
      {children}
    </>
  )
}

// Torn top edge of the haunted strip.
const TORN_STRIP = (() => {
  const pts: string[] = []
  let x = 0
  let i = 0
  while (x < 240) {
    const y = 194 + ((i * 37) % 7) - 2
    pts.push(`${x} ${y}`)
    x += 9 + ((i * 13) % 8)
    i++
  }
  return `M0 240V${194}L${pts.join('L')}L240 193V232Q240 240 232 240H8Q0 240 0 232Z`
})()
// Claw scratches across the dead strip.
const STRIP_SCRATCH = strokes([
  [[[84, 204], [118, 216], [150, 232]], 3.2, 'both'],
  [[[94, 200], [128, 212], [160, 228]], 3, 'both'],
  [[[104, 198], [136, 208], [168, 222]], 2.6, 'both'],
])

export function NightStrip() {
  return (
    <>
      <path d={TORN_STRIP} fill="url(#gs-night-strip)" />
      <path d={STRIP_RULE_NIGHT} fill="#08060b" />
      <path d={ell(120, 222, 100, 12)} fill="url(#gs-mist)" opacity={0.6} />
      <path d={STRIP_SCRATCH} fill="#0c0a10" opacity={0.7} />
    </>
  )
}

export function Frame({ night }: { night: boolean }) {
  return (
    <>
      <path d={TILE_SHAPE} fill="url(#gs-vignette)" opacity={night ? 0.9 : 0.75} />
      <rect x={1.5} y={1.5} width={237} height={237} rx={7} fill="none" stroke={night ? '#06050a' : '#2a2018'} strokeWidth={3} />
      <rect x={6} y={6} width={228} height={228} rx={4} fill="none" stroke={night ? '#6d6380' : '#6b5338'} strokeWidth={0.9} opacity={0.55} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Haunted-side effects.
// ---------------------------------------------------------------------------
export function MistBand({ y, h = 22, o = 0.8, x = 120, w = 150 }: { y: number; h?: number; o?: number; x?: number; w?: number }) {
  return <path d={ell(x, y, w, h)} fill="url(#gs-mist)" opacity={o} />
}

/** A pair of glowing ghost eyes. */
export function GlowEyes({ x, y, gap = 9, r = 6, slant = 0 }: { x: number; y: number; gap?: number; r?: number; slant?: number }) {
  return (
    <>
      <circle cx={x - gap} cy={y - slant} r={r} fill="url(#gs-eye-glow)" />
      <circle cx={x + gap} cy={y + slant} r={r} fill="url(#gs-eye-glow)" />
      <ellipse cx={x - gap} cy={y - slant} rx={r * 0.32} ry={r * 0.2} fill="#ffffff" />
      <ellipse cx={x + gap} cy={y + slant} rx={r * 0.32} ry={r * 0.2} fill="#ffffff" />
    </>
  )
}

/** A pale, grasping ghost hand (100-box hand placed at x, y with size s, rotation rot). */
export function SpectreHand({ x, y, s, rot = 0, o = 0.6 }: { x: number; y: number; s: number; rot?: number; o?: number }) {
  return (
    <path
      d={HAND_PATH}
      transform={`translate(${x} ${y}) rotate(${rot} ${s / 2} ${s / 2}) scale(${s / 100})`}
      fill={SPECTRE}
      opacity={o}
    />
  )
}

/** A translucent hooded spectre with glowing eyes, standing where the villager was. */
export function Spectre({ x, y, k = 1, o = 0.42 }: { x: number; y: number; k?: number; o?: number }) {
  const body = smooth(
    [
      [x, y - 34 * k],
      [x + 22 * k, y - 24 * k],
      [x + 26 * k, y + 4 * k],
      [x + 40 * k, y + 40 * k],
      [x + 52 * k, y + 96 * k],
      [x + 30 * k, y + 84 * k],
      [x + 16 * k, y + 100 * k],
      [x, y + 86 * k],
      [x - 16 * k, y + 102 * k],
      [x - 30 * k, y + 86 * k],
      [x - 52 * k, y + 98 * k],
      [x - 40 * k, y + 40 * k],
      [x - 26 * k, y + 4 * k],
      [x - 22 * k, y - 24 * k],
    ],
    true,
  )
  const hood = smooth(
    [
      [x, y - 22 * k],
      [x + 15 * k, y - 12 * k],
      [x + 14 * k, y + 12 * k],
      [x, y + 20 * k],
      [x - 14 * k, y + 12 * k],
      [x - 15 * k, y - 12 * k],
    ],
    true,
  )
  return (
    <>
      <path d={body} fill="url(#gs-spirit-fade)" opacity={o} />
      <path d={hood} fill="#07050a" opacity={0.85} />
      <GlowEyes x={x} y={y - 2 * k} gap={6 * k} r={5.5 * k} slant={1} />
    </>
  )
}

// Torn top-right corner and a crack running down from the top edge.
const TORN_CORNER =
  'M240 0H192L197 7L191 13L201 18L198 27L209 30L212 40L222 38L226 49L240 52Z'
const TORN_EDGE = smooth([
  [192, 0],
  [197, 7],
  [191, 13],
  [201, 18],
  [198, 27],
  [209, 30],
  [212, 40],
  [222, 38],
  [226, 49],
  [240, 52],
])
export function TornCorner() {
  return (
    <>
      <path d={TORN_CORNER} fill="#0b090c" />
      <path d={TORN_EDGE} fill="none" stroke="#b8ab95" strokeWidth={1.6} opacity={0.55} />
    </>
  )
}

export function Crack({ pts }: { pts: readonly Pt[] }) {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('')
  return (
    <>
      <path d={d} fill="none" stroke="#8c83a0" strokeWidth={3.4} opacity={0.35} strokeLinejoin="bevel" transform="translate(1 0.5)" />
      <path d={d} fill="none" stroke="#050407" strokeWidth={2} strokeLinejoin="bevel" />
    </>
  )
}

/** Ghost-smoke curl: a tapered pale brush stroke. */
export function curl(pts: readonly Pt[], w: number): string {
  return brush(pts, w, 'both', { min: 0.05 })
}

// ---------------------------------------------------------------------------
// Portrait builder.
// ---------------------------------------------------------------------------
export interface FaceSpec {
  hx: number
  hy: number
  /** Half-width of the head. */
  r: number
  eyes?: 'open' | 'closed' | 'narrow' | 'stern' | 'lidded' | 'none'
  glasses?: boolean
  brows?: 'normal' | 'long' | 'stern' | 'thin' | 'none'
  mouth?: 'neutral' | 'smile' | 'frown' | 'lips' | 'grin' | 'none'
  beard?: 'moustache' | 'wispy' | 'long' | 'none'
  /** −1..1: which way the face turns (positive = viewer's right). */
  turn?: number
  age?: boolean
  /** Draw the top of the head outline too (bald heads). */
  bald?: boolean
}

export interface Face {
  head: string
  ears: string
  outline: string
  ink: string
  pale: string
  lips: string
  beardFill: string
  lines: string
  glasses: string
  cheeks: string
}

const C = (cx: number, cy: number, r: number) => circ(cx, cy, r)

export function buildFace(f: FaceSpec): Face {
  const { hx, hy, r } = f
  const R = r * 1.22
  const turn = f.turn ?? 0
  const sh = turn * r * 0.16
  const k = (a: number) => {
    const s = Math.sin(a)
    return s > 0 ? 1 - 0.24 * s * s * s : 1
  }
  const hp = (a: number): Pt => [hx + Math.cos(a) * r * k(a), hy + Math.sin(a) * R]
  const headPts: Pt[] = []
  for (let i = 0; i < 16; i++) headPts.push(hp(-Math.PI / 2 + (i / 16) * Math.PI * 2))
  const head = smooth(headPts, true)

  const jawPts: Pt[] = []
  for (let i = 0; i <= 8; i++) jawPts.push(hp(-0.2 + ((Math.PI + 0.4) * i) / 8))
  let outline = brush(jawPts, r * 0.11, 'both', { min: 0.25 })
  if (f.bald) {
    const top: Pt[] = []
    for (let i = 0; i <= 8; i++) top.push(hp(Math.PI + 0.3 + ((Math.PI - 0.6) * i) / 8))
    outline += brush(top, r * 0.08, 'both', { min: 0.2 })
  }

  const ears = blob(hx - r * 0.98, hy + R * 0.1, r * 0.16, r * 0.25, 3, 0.05, 7) + blob(hx + r * 0.98, hy + R * 0.1, r * 0.16, r * 0.25, 5, 0.05, 7)

  let ink = ''
  let pale = ''
  let lines = ''
  const ey = hy + R * 0.04
  for (const side of [-1, 1] as const) {
    const ex = hx + side * r * 0.42 + sh
    const inner = ex - side * r * 0.17
    const outer = ex + side * r * 0.17
    const pupil = C(ex + sh * 0.25, ey + r * 0.04, r * 0.075)
    switch (f.eyes ?? 'open') {
      case 'open':
        ink += brush([[inner, ey + r * 0.02], [ex, ey - r * 0.07], [outer, ey + r * 0.01]], r * 0.085, 'both', { min: 0.3 }) + pupil
        break
      case 'closed':
        ink += brush([[inner, ey - r * 0.01], [ex, ey + r * 0.07], [outer, ey - r * 0.02]], r * 0.08, 'both', { min: 0.3 })
        break
      case 'narrow':
        ink += brush([[inner, ey + r * 0.01], [outer, ey - r * 0.01]], r * 0.075, 'both', { min: 0.3 }) + C(ex + sh * 0.25, ey + r * 0.035, r * 0.05)
        break
      case 'stern':
        ink += brush([[outer, ey - r * 0.05], [ex, ey - r * 0.03], [inner, ey + r * 0.03]], r * 0.1, 'both', { min: 0.35 }) + pupil
        break
      case 'lidded':
        ink += brush([[inner, ey], [ex, ey - r * 0.03], [outer, ey + r * 0.02]], r * 0.11, 'both', { min: 0.35 }) + C(ex + sh * 0.25, ey + r * 0.06, r * 0.06)
        break
      case 'none':
        break
    }
    const by = hy - R * 0.27
    switch (f.brows ?? 'normal') {
      case 'normal':
        ink += brush([[inner, by + r * 0.03], [ex, by - r * 0.04], [outer + side * r * 0.02, by + r * 0.01]], r * 0.09, 'tail', { min: 0.2 })
        break
      case 'stern':
        ink += brush([[inner - side * r * 0.02, by + r * 0.07], [ex, by - r * 0.01], [outer + side * r * 0.04, by - r * 0.06]], r * 0.13, 'tail', { min: 0.25 })
        break
      case 'thin':
        ink += brush([[inner, by + r * 0.02], [ex, by - r * 0.05], [outer + side * r * 0.04, by + r * 0.01]], r * 0.05, 'both', { min: 0.2 })
        break
      case 'long':
        pale += brush(
          [[inner, by + r * 0.02], [ex, by - r * 0.06], [outer + side * r * 0.2, by + r * 0.08], [outer + side * r * 0.38, by + r * 0.42], [outer + side * r * 0.42, by + r * 0.8]],
          r * 0.16,
          'tail',
          { min: 0.1 },
        )
        break
      case 'none':
        break
    }
    if (f.age) {
      lines += brush([[outer + side * r * 0.04, ey + r * 0.02], [outer + side * r * 0.14, ey - r * 0.04]], r * 0.04, 'both')
      lines += brush([[outer + side * r * 0.04, ey + r * 0.08], [outer + side * r * 0.14, ey + r * 0.1]], r * 0.04, 'both')
      lines += brush([[hx + sh + side * r * 0.16, hy + R * 0.38], [hx + sh + side * r * 0.3, hy + R * 0.6]], r * 0.05, 'both')
    }
  }
  if (f.age) {
    lines += brush([[hx - r * 0.3, hy - R * 0.48], [hx, hy - R * 0.52], [hx + r * 0.3, hy - R * 0.48]], r * 0.04, 'both')
    lines += brush([[hx - r * 0.22, hy - R * 0.4], [hx, hy - R * 0.43], [hx + r * 0.22, hy - R * 0.4]], r * 0.035, 'both')
  }
  // Nose.
  ink += brush([[hx + sh * 1.3 - r * 0.02, hy + R * 0.14], [hx + sh * 1.3 + r * 0.07, hy + R * 0.36], [hx + sh * 1.3 - r * 0.06, hy + R * 0.42]], r * 0.07, 'tail', { min: 0.2 })
  // Mouth.
  const mx = hx + sh * 1.1
  const my = hy + R * 0.62
  let lips = ''
  switch (f.mouth ?? 'neutral') {
    case 'neutral':
      ink += brush([[mx - r * 0.15, my], [mx, my + r * 0.01], [mx + r * 0.15, my - r * 0.005]], r * 0.065, 'both', { min: 0.2 })
      break
    case 'smile':
      ink += brush([[mx - r * 0.18, my - r * 0.04], [mx, my + r * 0.05], [mx + r * 0.18, my - r * 0.04]], r * 0.065, 'both', { min: 0.2 })
      break
    case 'frown':
      ink += brush([[mx - r * 0.16, my + r * 0.04], [mx, my - r * 0.02], [mx + r * 0.16, my + r * 0.04]], r * 0.07, 'both', { min: 0.2 })
      break
    case 'grin':
      ink += brush([[mx - r * 0.22, my - r * 0.06], [mx, my + r * 0.06], [mx + r * 0.22, my - r * 0.06]], r * 0.09, 'both', { min: 0.2 })
      break
    case 'lips':
      lips = smooth(
        [
          [mx - r * 0.15, my],
          [mx - r * 0.05, my - r * 0.06],
          [mx, my - r * 0.03],
          [mx + r * 0.05, my - r * 0.06],
          [mx + r * 0.15, my],
          [mx, my + r * 0.08],
        ],
        true,
      )
      break
    case 'none':
      break
  }
  let beardFill = ''
  switch (f.beard ?? 'none') {
    case 'moustache':
      ink += brush([[mx - r * 0.02, hy + R * 0.5], [mx - r * 0.2, hy + R * 0.56], [mx - r * 0.3, hy + R * 0.78], [mx - r * 0.3, hy + R * 0.95]], r * 0.1, 'tail', { min: 0.1 })
      ink += brush([[mx + r * 0.02, hy + R * 0.5], [mx + r * 0.2, hy + R * 0.56], [mx + r * 0.3, hy + R * 0.78], [mx + r * 0.3, hy + R * 0.95]], r * 0.1, 'tail', { min: 0.1 })
      break
    case 'wispy':
      ink += brush([[mx - r * 0.06, hy + R * 0.86], [mx - r * 0.08, hy + R * 1.2], [mx - r * 0.02, hy + R * 1.5]], r * 0.07, 'tail')
      ink += brush([[mx + r * 0.06, hy + R * 0.86], [mx + r * 0.1, hy + R * 1.22], [mx + r * 0.06, hy + R * 1.45]], r * 0.06, 'tail')
      ink += brush([[mx - r * 0.02, hy + R * 0.5], [mx - r * 0.24, hy + R * 0.6], [mx - r * 0.34, hy + R * 0.8]], r * 0.07, 'tail')
      ink += brush([[mx + r * 0.02, hy + R * 0.5], [mx + r * 0.24, hy + R * 0.6], [mx + r * 0.34, hy + R * 0.8]], r * 0.07, 'tail')
      break
    case 'long':
      beardFill = smooth(
        [
          [mx - r * 0.5, hy + R * 0.45],
          [mx - r * 0.2, hy + R * 0.52],
          [mx + r * 0.2, hy + R * 0.52],
          [mx + r * 0.5, hy + R * 0.45],
          [mx + r * 0.45, hy + R * 1.1],
          [mx + r * 0.16, hy + R * 1.7],
          [mx, hy + R * 2.0],
          [mx - r * 0.16, hy + R * 1.7],
          [mx - r * 0.45, hy + R * 1.1],
        ],
        true,
      )
      lines += brush([[mx - r * 0.2, hy + R * 0.9], [mx - r * 0.14, hy + R * 1.4], [mx - r * 0.04, hy + R * 1.8]], r * 0.05, 'tail')
      lines += brush([[mx + r * 0.18, hy + R * 0.9], [mx + r * 0.14, hy + R * 1.4], [mx + r * 0.04, hy + R * 1.75]], r * 0.05, 'tail')
      ink += brush([[mx - r * 0.02, hy + R * 0.5], [mx - r * 0.24, hy + R * 0.56], [mx - r * 0.38, hy + R * 0.76]], r * 0.08, 'tail')
      ink += brush([[mx + r * 0.02, hy + R * 0.5], [mx + r * 0.24, hy + R * 0.56], [mx + r * 0.38, hy + R * 0.76]], r * 0.08, 'tail')
      break
    case 'none':
      break
  }
  let glasses = ''
  if (f.glasses) {
    for (const side of [-1, 1] as const) glasses += circ(hx + side * r * 0.42 + sh, ey + r * 0.02, r * 0.27)
    glasses += `M${hx + sh - r * 0.15} ${ey - r * 0.02}Q${hx + sh} ${ey - r * 0.1} ${hx + sh + r * 0.15} ${ey - r * 0.02}`
  }
  const cheeks = circ(hx - r * 0.52 + sh, hy + R * 0.36, r * 0.16) + circ(hx + r * 0.52 + sh, hy + R * 0.36, r * 0.16)
  return { head, ears, outline, ink, pale, lips, beardFill, lines, glasses, cheeks }
}

export function FaceView({ f, skin = 'url(#gs-skin)', blush = false, paleColor = '#e9e4da' }: { f: Face; skin?: string; blush?: boolean; paleColor?: string }) {
  return (
    <>
      <path d={f.ears} fill={skin} stroke={INK} strokeWidth={1.2} />
      <path d={f.head} fill={skin} />
      {blush && <path d={f.cheeks} fill="#e0806a" opacity={0.3} />}
      <path d={f.outline} fill={INK} />
      {f.beardFill && <path d={f.beardFill} fill={paleColor} stroke="#8d857a" strokeWidth={1} />}
      <path d={f.lines} fill={INK_FADED} opacity={0.75} />
      <path d={f.ink} fill={INK} />
      {f.pale && <path d={f.pale} fill={paleColor} stroke="#7d756b" strokeWidth={0.8} />}
      {f.lips && <path d={f.lips} fill="#b8322a" />}
      {f.glasses && <path d={f.glasses} fill="none" stroke={INK} strokeWidth={1.8} />}
    </>
  )
}

export interface RobeSpec {
  cx: number
  /** y of the neck base. */
  top: number
  /** Half-width of the shoulders. */
  w: number
  neck?: number
  collar?: 'cross' | 'v' | 'high' | 'none'
  /** Shoulder slope (bigger = more sloped). */
  slope?: number
}

export interface Robe {
  body: string
  outline: string
  collar: string
  collarInk: string
  folds: string
  neck: string
}

export function buildRobe(s: RobeSpec): Robe {
  const { cx, top, w } = s
  const n = s.neck ?? 9
  const sl = s.slope ?? 24
  const bodyPts: Pt[] = [
    [cx - n, top - 2],
    [cx - w * 0.62, top + sl * 0.35],
    [cx - w, top + sl],
    [cx - w - 5, top + sl + 34],
    [cx - w - 9, 206],
    [cx + w + 9, 206],
    [cx + w + 5, top + sl + 34],
    [cx + w, top + sl],
    [cx + w * 0.62, top + sl * 0.35],
    [cx + n, top - 2],
  ]
  const body = smooth(bodyPts, true)
  const outline =
    brush([[cx - n, top - 1], [cx - w * 0.62, top + sl * 0.35], [cx - w, top + sl], [cx - w - 5, top + sl + 34], [cx - w - 8, 200]], 3.6, 'tail', { min: 0.15 }) +
    brush([[cx + n, top - 1], [cx + w * 0.62, top + sl * 0.35], [cx + w, top + sl], [cx + w + 5, top + sl + 34], [cx + w + 8, 200]], 3.6, 'tail', { min: 0.15 })
  let collar = ''
  let collarInk = ''
  switch (s.collar ?? 'cross') {
    case 'cross':
      collar =
        brush([[cx - n - 2, top - 2], [cx - n * 0.2, top + 20], [cx + w * 0.42, top + 56]], 10, 'none') +
        brush([[cx + n + 2, top - 2], [cx + n * 0.5, top + 14], [cx + 1, top + 24]], 8, 'none')
      collarInk =
        brush([[cx - n + 3, top + 2], [cx + n * 0.3, top + 22], [cx + w * 0.46, top + 52]], 2.4, 'both', { min: 0.3 }) +
        brush([[cx - n - 6, top + 2], [cx - n * 0.6, top + 26], [cx + w * 0.34, top + 62]], 2.4, 'both', { min: 0.3 })
      break
    case 'v':
      collar =
        brush([[cx - n - 2, top - 2], [cx - 2, top + 34]], 9, 'none') + brush([[cx + n + 2, top - 2], [cx + 2, top + 34]], 9, 'none')
      collarInk = brush([[cx - n + 4, top], [cx, top + 26], [cx + n - 4, top]], 2.2, 'both', { min: 0.3 })
      break
    case 'high':
      collar = smooth([[cx - n - 3, top - 12], [cx, top - 14], [cx + n + 3, top - 12], [cx + n + 4, top + 2], [cx, top + 4], [cx - n - 4, top + 2]], true)
      collarInk = brush([[cx - n - 3, top + 2], [cx, top + 4], [cx + n + 3, top + 2]], 2, 'both') + brush([[cx + 2, top - 13], [cx + 4, top + 3]], 1.6, 'both')
      break
    case 'none':
      break
  }
  const folds =
    brush([[cx - w * 0.5, top + sl + 18], [cx - w * 0.56, top + sl + 50], [cx - w * 0.5, 196]], 2.6, 'both') +
    brush([[cx + w * 0.62, top + sl + 24], [cx + w * 0.66, top + sl + 54], [cx + w * 0.6, 196]], 2.6, 'both')
  const neck = smooth([[cx - n * 0.85, top - 22], [cx + n * 0.85, top - 22], [cx + n, top + 4], [cx, top + 10], [cx - n, top + 4]], true)
  return { body, outline, collar, collarInk, folds, neck }
}

export function RobeView({ r, fill, trim, foldColor = INK, neck = true }: { r: Robe; fill: string; trim: string; foldColor?: string; neck?: boolean }) {
  return (
    <>
      {neck && <path d={r.neck} fill="url(#gs-skin)" />}
      <path d={r.body} fill={fill} />
      <path d={r.body} fill="url(#gs-streaks)" opacity={0.5} />
      <path d={r.body} fill="url(#gs-tile-shade)" />
      <path d={r.folds} fill={foldColor} opacity={0.35} />
      {r.collar && <path d={r.collar} fill={trim} />}
      {r.collarInk && <path d={r.collarInk} fill={INK} opacity={0.8} />}
      <path d={r.outline} fill={INK} />
    </>
  )
}

/** A yurei: long black hair over a pale face, white robe fading into mist, limp hands. */
export function Yurei({ x, y, k = 1, o = 0.62 }: { x: number; y: number; k?: number; o?: number }) {
  const P = (dx: number, dy: number): Pt => [x + dx * k, y + dy * k]
  const robe = smooth([P(-20, 10), P(20, 10), P(34, 44), P(40, 100), P(16, 86), P(0, 104), P(-18, 88), P(-40, 100), P(-34, 44)], true)
  const face = smooth([P(-12, -16), P(0, -24), P(12, -16), P(12, 4), P(0, 14), P(-12, 4)], true)
  const hair =
    smooth([P(0, -30), P(18, -22), P(22, 4), P(26, 50), P(14, 70), P(10, 30), P(6, -6), P(-2, -14), P(-8, 10), P(-12, 40), P(-22, 72), P(-28, 40), P(-22, 0), P(-18, -22)], true)
  const arms =
    brush([P(-14, 26), P(-22, 46), P(-14, 60), P(-6, 62)], 6 * k, 'head', { min: 0.4 }) +
    brush([P(14, 26), P(22, 46), P(16, 60), P(8, 62)], 6 * k, 'head', { min: 0.4 })
  const fingers =
    brush([P(-6, 62), P(-4, 70), P(-6, 76)], 2.2 * k, 'tail') +
    brush([P(-8, 62), P(-9, 72), P(-12, 76)], 2.2 * k, 'tail') +
    brush([P(8, 62), P(8, 70), P(6, 76)], 2.2 * k, 'tail') +
    brush([P(10, 62), P(12, 71), P(14, 75)], 2.2 * k, 'tail')
  return (
    <>
      <path d={robe} fill="url(#gs-spirit-fade)" opacity={o} />
      <path d={arms + fingers} fill={SPECTRE} opacity={o + 0.1} />
      <path d={face} fill="url(#gs-skin-pale)" opacity={0.85} />
      <path d={hair} fill="#07050a" />
      <circle cx={x + 6 * k} cy={y - 6 * k} r={5 * k} fill="url(#gs-eye-glow)" />
      <ellipse cx={x + 6 * k} cy={y - 6 * k} rx={1.6 * k} ry={1 * k} fill="#fff" />
    </>
  )
}

/** Eyes and reaching hands in a bank of mist (no body). */
export function Lurker({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  return (
    <>
      <path d={blob(x, y + 8 * k, 34 * k, 22 * k, 17, 0.2)} fill="#07050a" opacity={0.55} />
      <GlowEyes x={x} y={y} gap={8 * k} r={6 * k} slant={1.5} />
      <SpectreHand x={x - 46 * k} y={y + 18 * k} s={44 * k} rot={-30} o={0.55} />
      <SpectreHand x={x + 6 * k} y={y + 22 * k} s={40 * k} rot={26} o={0.5} />
    </>
  )
}

/** A tiny vermilion artist's seal, as stamped on ink paintings. */
const SEAL_MARKS = strokes([
  [[[2.5, 3], [7.5, 3]], 1.3, 'none'],
  [[[5, 3], [5, 9]], 1.3, 'none'],
  [[[2.5, 6.5], [7.5, 6.5]], 1.1, 'none'],
  [[[2.5, 9.5], [7.5, 9.5]], 1.3, 'none'],
])
export function SealStamp({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-3)`} opacity={0.88}>
      <rect width={10} height={12.5} rx={1} fill="#b8322a" />
      <path d={SEAL_MARKS} fill="#f3dccb" />
    </g>
  )
}

/** A black ink wraith rising out of a spill, with ragged arms and glowing eyes. */
export function InkWraith({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  const P = (dx: number, dy: number): Pt => [x + dx * k, y + dy * k]
  const body = smooth(
    [P(0, -24), P(14, -16), P(16, 4), P(30, 10), P(50, 0), P(36, 22), P(22, 34), P(26, 70), P(40, 92), P(0, 86), P(-40, 92), P(-26, 70), P(-22, 34), P(-36, 22), P(-50, 4), P(-30, 10), P(-16, 4), P(-14, -16)],
    true,
  )
  const drips = brush([P(-34, 18), P(-38, 30), P(-36, 40)], 3 * k, 'tail') + brush([P(40, 14), P(42, 26)], 3 * k, 'tail') + circ(x - 44 * k, y + 46 * k, 2.4 * k) + circ(x + 46 * k, y + 34 * k, 2 * k)
  return (
    <>
      <path d={body + drips} fill="#050407" opacity={0.92} />
      <GlowEyes x={x} y={y - 6 * k} gap={6 * k} r={5 * k} slant={-1} />
    </>
  )
}
