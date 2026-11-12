// Geometry helpers for the ink-brush look. Everything here is pure and
// deterministic: art modules call these at import time and keep the path
// strings as constants, so nothing is recomputed per render.

export type Pt = readonly [number, number]

/**
 * Width profile of a brush stroke along its length:
 * - `both`  tapers in and out (a sweeping stroke)
 * - `tail`  pressed start, tapering tail (the most common calligraphic stroke)
 * - `head`  the reverse of `tail`
 * - `belly` thin ends, fat middle (a leaf / petal)
 * - `none`  constant width with round caps
 */
export type Taper = 'both' | 'tail' | 'head' | 'belly' | 'none'

const r1 = (n: number): number => Math.round(n * 10) / 10
const fp = (p: Pt): string => `${r1(p[0])} ${r1(p[1])}`

function cr(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const t2 = t * t
  const t3 = t2 * t
  const axis = (i: 0 | 1): number =>
    0.5 *
    (2 * p1[i] +
      (-p0[i] + p2[i]) * t +
      (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 +
      (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)
  return [axis(0), axis(1)]
}

/** Sample a Catmull-Rom spline through `pts`. */
export function sampleSpline(pts: readonly Pt[], perSeg = 6): Pt[] {
  if (pts.length < 2) return pts.slice()
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let s = 0; s < perSeg; s++) out.push(cr(p0, p1, p2, p3, s / perSeg))
  }
  out.push(pts[pts.length - 1])
  return out
}

/** Cubic-Bezier segments (no leading M) through P[0..n], Catmull-Rom tangents. */
function smoothSegs(P: readonly Pt[], closed = false): string {
  const n = P.length
  if (n < 2) return ''
  let d = ''
  const at = (i: number): Pt => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))])
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${fp(c1)} ${fp(c2)} ${fp(p2)}`
  }
  return d
}

/** A smooth path through the points (for stroked lines and filled shapes). */
export function smooth(pts: readonly Pt[], closed = false): string {
  if (pts.length === 0) return ''
  return `M${fp(pts[0])}${smoothSegs(pts, closed)}${closed ? 'Z' : ''}`
}

/** A straight-segment polygon / polyline. */
export function poly(pts: readonly Pt[], closed = true): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${fp(p)}`).join('') + (closed ? 'Z' : '')
}

function profile(taper: Taper, t: number, min: number): number {
  switch (taper) {
    case 'none':
      return 1
    case 'both':
      return min + (1 - min) * Math.pow(Math.sin(Math.PI * t), 0.5)
    case 'belly':
      return min + (1 - min) * Math.sin(Math.PI * t)
    case 'tail':
      return t < 0.1 ? 0.72 + 0.28 * (t / 0.1) : min + (1 - min) * Math.pow(1 - (t - 0.1) / 0.9, 0.75)
    case 'head':
      return profile('tail', 1 - t, min)
  }
}

export interface BrushOpts {
  /** Width at the thin ends, as a fraction of the full width. */
  min?: number
  /** Spline samples per input segment. */
  perSeg?: number
}

/**
 * A tapered brush stroke along a smooth curve through `pts`, returned as a
 * closed, fillable outline. `w` is the full stroke width.
 */
export function brush(pts: readonly Pt[], w: number, taper: Taper = 'both', opts: BrushOpts = {}): string {
  const min = opts.min ?? 0.06
  const s = sampleSpline(pts, opts.perSeg ?? 6)
  const n = s.length
  if (n < 2) return ''
  const len: number[] = [0]
  for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]))
  const total = len[n - 1] || 1
  const left: Pt[] = []
  const right: Pt[] = []
  const tangents: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)]
    const b = s[Math.min(n - 1, i + 1)]
    let dx = b[0] - a[0]
    let dy = b[1] - a[1]
    const d = Math.hypot(dx, dy) || 1
    dx /= d
    dy /= d
    tangents.push([dx, dy])
    const hw = (w * profile(taper, len[i] / total, min)) / 2
    left.push([s[i][0] - dy * hw, s[i][1] + dx * hw])
    right.push([s[i][0] + dy * hw, s[i][1] - dx * hw])
  }
  // Thin the outline (every other sample) — the Bezier smoothing fills in.
  const thin = (P: Pt[]): Pt[] => P.filter((_, i) => i % 2 === 0 || i === P.length - 1)
  const L = thin(left)
  const R = thin(right).reverse()
  const endHw = (w * profile(taper, 1, min)) / 2
  const startHw = (w * profile(taper, 0, min)) / 2
  const te = tangents[n - 1]
  const ts = tangents[0]
  const end = s[n - 1]
  const start = s[0]
  let d = `M${fp(L[0])}${smoothSegs(L)}`
  d += `Q${fp([end[0] + te[0] * endHw * 1.35, end[1] + te[1] * endHw * 1.35])} ${fp(R[0])}`
  d += smoothSegs(R)
  d += `Q${fp([start[0] - ts[0] * startHw * 1.35, start[1] - ts[1] * startHw * 1.35])} ${fp(L[0])}Z`
  return d
}

/** Several brush strokes joined into one path string. */
export function strokes(list: ReadonlyArray<readonly [readonly Pt[], number, Taper?]>): string {
  return list.map(([pts, w, t]) => brush(pts, w, t ?? 'both')).join('')
}

/** Deterministic PRNG (mulberry32). */
export function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a string hash. */
export function hashStr(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** An irregular, hand-drawn-looking ellipse. */
export function blob(cx: number, cy: number, rx: number, ry: number, seed = 1, jitter = 0.1, n = 9): string {
  const rnd = prng(seed)
  const pts: Pt[] = []
  const a0 = rnd() * Math.PI * 2
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (rnd() - 0.5) * (Math.PI / n) * 0.6
    const k = 1 + (rnd() - 0.5) * 2 * jitter
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return smooth(pts, true)
}

/**
 * An ensō-like brush ring: a tapered stroke around a circle, starting at
 * angle `a0` (radians) and sweeping `sweep` radians.
 */
export function ring(cx: number, cy: number, r: number, w: number, a0 = -2.2, sweep = 5.9, taper: Taper = 'tail'): string {
  const pts: Pt[] = []
  const steps = 10
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (sweep * i) / steps
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return brush(pts, w, taper, { perSeg: 4 })
}

/** Points on an arc, for building curves. */
export function arcPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 8): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  return out
}

/** Translate / scale a point list. */
export function tx(pts: readonly Pt[], dx: number, dy: number, k = 1): Pt[] {
  return pts.map(([x, y]) => [x * k + dx, y * k + dy] as const)
}

/** Mirror a point list horizontally around x = cx. */
export function mirrorX(pts: readonly Pt[], cx: number): Pt[] {
  return pts.map(([x, y]) => [2 * cx - x, y] as const)
}
