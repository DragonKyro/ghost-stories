// Shared building blocks of the Bastion tiles: the dusk sky / stone hall
// backdrops, flames and torches, masonry, the stone frame with its iron
// corners, the parchment action strip, and the Grasp of Evil overlay (black
// briars, violet glow, chains on the strip).
// Coordinates are the tile's 240×240 viewBox; the scene is y 0–192.
import type { ReactElement, ReactNode } from 'react'
import { brush, circ, ell, prng, rect, sampleSpline, smooth, type Pt } from '../../brush'
import { SCENE_H } from '../../tiles/kit'
import { CORRUPT_GLOW, CORRUPT_MID, IRON_LIGHT, LB_INK, MORTAR, VOID } from '../palette'

export interface SceneDef {
  /** Outdoors under the dusk sky, or inside a stone hall. */
  bg: 'sky' | 'hall'
  /** Where the warm light of the place glows on the backdrop (x, y, radius). */
  glow?: readonly [number, number, number]
  /** The vignette (y 0–192); `grasp` = the place is in the Grasp of Evil. */
  Scene: (p: { grasp: boolean }) => ReactElement
}

// ---------------------------------------------------------------------------
// Path helpers.
// ---------------------------------------------------------------------------
const f = (n: number): string => (Math.round(n * 10) / 10).toString()
export { circ, ell, rect }
/** A round-topped arch (door, window, niche) standing on y = base. */
export function arch(x: number, base: number, w: number, h: number): string {
  const r = w / 2
  return `M${f(x)} ${f(base)}V${f(base - h + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(base - h + r)}V${f(base)}Z`
}
/** A pointed (gothic) arch standing on y = base. */
export function pointedArch(x: number, base: number, w: number, h: number): string {
  const spring = base - h + w * 0.62
  return `M${f(x)} ${f(base)}V${f(spring)}Q${f(x)} ${f(base - h + w * 0.12)} ${f(x + w / 2)} ${f(base - h)}Q${f(x + w)} ${f(base - h + w * 0.12)} ${f(x + w)} ${f(spring)}V${f(base)}Z`
}
/**
 * A crenellated wall: its walkway top at `top`, merlons rising `mh` above it,
 * from x0 to x1 and down to `base`.
 */
export function crenels(x0: number, x1: number, top: number, base: number, merlon = 16, gap = 11, mh = 12): string {
  let d = `M${f(x0)} ${f(base)}V${f(top - mh)}`
  let x = x0
  while (x < x1) {
    const m = Math.min(x + merlon, x1)
    d += `H${f(m)}`
    if (m >= x1) break
    d += `V${f(top)}`
    const g = Math.min(m + gap, x1)
    d += `H${f(g)}`
    if (g >= x1) break
    d += `V${f(top - mh)}`
    x = g
  }
  return `${d}V${f(base)}Z`
}
/** Mortar joints for a block wall: rows of `rowH`, blocks about `blockW` wide, staggered. */
export function joints(x0: number, y0: number, x1: number, y1: number, rowH: number, blockW: number, seed = 1): string {
  const rnd = prng(seed)
  let d = ''
  let row = 0
  for (let y = y0; y < y1 - 0.5; y += rowH, row++) {
    const yb = Math.min(y + rowH, y1)
    if (yb < y1) d += `M${f(x0)} ${f(yb)}H${f(x1)}`
    let x = x0 + (row % 2 ? blockW * 0.5 : 0) + (rnd() - 0.5) * blockW * 0.3
    while (x < x1 - 4) {
      if (x > x0 + 4) d += `M${f(x)} ${f(y)}V${f(yb)}`
      x += blockW * (0.8 + rnd() * 0.4)
    }
  }
  return d
}
/** A flame standing on (x, y): w wide, h tall, with a flick to the right. */
export function flamePath(x: number, y: number, w: number, h: number): string {
  return (
    `M${f(x)} ${f(y)}` +
    `C${f(x - w * 0.62)} ${f(y)} ${f(x - w * 0.58)} ${f(y - h * 0.42)} ${f(x - w * 0.22)} ${f(y - h * 0.66)}` +
    `C${f(x - w * 0.04)} ${f(y - h * 0.78)} ${f(x - w * 0.14)} ${f(y - h * 0.9)} ${f(x + w * 0.06)} ${f(y - h)}` +
    `C${f(x + w * 0.1)} ${f(y - h * 0.78)} ${f(x + w * 0.58)} ${f(y - h * 0.6)} ${f(x + w * 0.52)} ${f(y - h * 0.28)}` +
    `C${f(x + w * 0.48)} ${f(y - h * 0.06)} ${f(x + w * 0.3)} ${f(y)} ${f(x)} ${f(y)}Z`
  )
}

// ---------------------------------------------------------------------------
// Light.
// ---------------------------------------------------------------------------
/** A flame with its glow; `anim` flickers it (only on the active side). */
export function Flame({ x, y, w, h, anim = false, glow = 1 }: { x: number; y: number; w: number; h: number; anim?: boolean; glow?: number }) {
  return (
    <>
      {glow > 0 && <ellipse cx={x} cy={y - h * 0.45} rx={w * 1.9 * glow} ry={h * 1.15 * glow} fill="url(#lb-torch-glow)" />}
      <g className={anim ? 'lb-flicker' : undefined}>
        <path d={flamePath(x, y, w, h)} fill="url(#lb-tile-fire)" stroke="#8a2a10" strokeWidth={1} strokeLinejoin="round" />
        <path d={flamePath(x, y - 1, w * 0.48, h * 0.55)} fill="#fff3c2" opacity={0.9} />
      </g>
    </>
  )
}


// ---------------------------------------------------------------------------
// Backdrops.
// ---------------------------------------------------------------------------
const STARS: Pt[] = [
  [24, 16], [58, 9], [92, 22], [140, 12], [176, 26], [206, 10], [226, 30], [118, 34], [70, 40],
]
const CLOUDS =
  smooth([[18, 58], [40, 50], [70, 54], [96, 48], [120, 56], [104, 62], [60, 64], [30, 64]], true) +
  smooth([[138, 74], [160, 66], [190, 70], [222, 64], [236, 72], [210, 80], [160, 80]], true)
/** Distant towers of the outer walls on the horizon. */
const FAR_WALLS = (() => {
  let d = 'M0 192V128'
  const towers: Array<[number, number, number]> = [
    [14, 108, 16],
    [62, 118, 12],
    [104, 102, 18],
    [158, 116, 12],
    [204, 106, 16],
  ]
  for (const [tx, ty, tw] of towers) {
    d += `L${tx} 126`
    d += `V${ty}H${tx + tw * 0.2}V${ty - 5}H${tx + tw * 0.4}V${ty}H${tx + tw * 0.6}V${ty - 5}H${tx + tw * 0.8}V${ty}H${tx + tw}V126`
  }
  return `${d}L240 124V192Z`
})()
const HALL_JOINTS = joints(0, 0, 240, 150, 19, 34, 7)

export function Backdrop({ def }: { def: SceneDef }) {
  return (
    <>
      {def.bg === 'sky' ? (
        <>
          <rect width={240} height={SCENE_H} fill="url(#lb-tile-sky)" />
          {STARS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.3 : 0.8} fill="#fff6dc" opacity={0.75} />
          ))}
          <path d={CLOUDS} fill="#c98f86" opacity={0.28} />
          <path d={FAR_WALLS} fill="#2b2f45" opacity={0.85} />
        </>
      ) : (
        <>
          <rect width={240} height={SCENE_H} fill="url(#lb-tile-hall)" />
          <path d={HALL_JOINTS} fill="none" stroke={MORTAR} strokeWidth={1.3} opacity={0.55} />
          <rect y={150} width={240} height={SCENE_H - 150} fill="url(#lb-tile-floor)" />
          <path d="M0 150H240" stroke={LB_INK} strokeWidth={1.6} opacity={0.6} />
        </>
      )}
      {def.glow && <circle cx={def.glow[0]} cy={def.glow[1]} r={def.glow[2]} fill="url(#lb-tile-warm)" />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Frame and strip.
// ---------------------------------------------------------------------------
const OUTER = 'M8 0H232Q240 0 240 8V232Q240 240 232 240H8Q0 240 0 232V8Q0 0 8 0Z'
const SCENE_WIN = { x: 7, y: 7, w: 226, h: 183 }
const STRIP_WIN = { x: 10, y: 196, w: 220, h: 37 }
const FRAME_BAND =
  OUTER +
  rect(SCENE_WIN.x, SCENE_WIN.y, SCENE_WIN.w, SCENE_WIN.h) +
  `M${STRIP_WIN.x + 3} ${STRIP_WIN.y}H${STRIP_WIN.x + STRIP_WIN.w - 3}Q${STRIP_WIN.x + STRIP_WIN.w} ${STRIP_WIN.y} ${STRIP_WIN.x + STRIP_WIN.w} ${STRIP_WIN.y + 3}V${STRIP_WIN.y + STRIP_WIN.h - 3}Q${STRIP_WIN.x + STRIP_WIN.w} ${STRIP_WIN.y + STRIP_WIN.h} ${STRIP_WIN.x + STRIP_WIN.w - 3} ${STRIP_WIN.y + STRIP_WIN.h}H${STRIP_WIN.x + 3}Q${STRIP_WIN.x} ${STRIP_WIN.y + STRIP_WIN.h} ${STRIP_WIN.x} ${STRIP_WIN.y + STRIP_WIN.h - 3}V${STRIP_WIN.y + 3}Q${STRIP_WIN.x} ${STRIP_WIN.y} ${STRIP_WIN.x + 3} ${STRIP_WIN.y}Z`
// Joints between the frame's stones.
const FRAME_JOINTS = (() => {
  let d = ''
  for (const x of [38, 84, 128, 172, 210]) d += `M${x} 0V7`
  for (const y of [40, 86, 134, 172]) d += `M0 ${y}H7M233 ${y}H240`
  d += 'M0 194H240'
  for (const x of [60, 120, 180]) d += `M${x} 233V240`
  return d
})()
const BRACKET = 'M1.5 9V3Q1.5 1.5 3 1.5H22L18 7H7V18L1.5 22Z'
const RIVETS: Pt[] = [
  [5, 5],
  [14, 4.5],
  [4.5, 14],
]
const CORNERS = ['', 'translate(240 0) scale(-1 1)', 'translate(0 240) scale(1 -1)', 'translate(240 240) scale(-1 -1)']
// Violet cracks in the frame's stone (Grasp of Evil).
const FRAME_CRACKS =
  'M0 120L4 124L2 130L6 136M240 60L235 64L238 70L234 76M100 0L104 5L100 7M150 240L154 235L151 233'

export function Frame({ grasp }: { grasp: boolean }) {
  return (
    <>
      <rect x={SCENE_WIN.x} y={SCENE_WIN.y} width={SCENE_WIN.w} height={SCENE_WIN.h} fill="url(#lb-tile-vignette)" />
      <path d={FRAME_BAND} fill={grasp ? 'url(#lb-tile-stone-grasp)' : 'url(#lb-stone)'} fillRule="evenodd" />
      <path d={FRAME_JOINTS} stroke={LB_INK} strokeWidth={1.1} opacity={0.6} />
      {grasp && <path d={FRAME_CRACKS} fill="none" stroke={CORRUPT_GLOW} strokeWidth={1.4} opacity={0.75} />}
      {/* bevel: light on the top / left of the band, shade below */}
      <path d="M2 236V4H236" fill="none" stroke="#fff" strokeOpacity={grasp ? 0.08 : 0.22} strokeWidth={1.2} />
      <rect x={SCENE_WIN.x} y={SCENE_WIN.y} width={SCENE_WIN.w} height={SCENE_WIN.h} fill="none" stroke={LB_INK} strokeWidth={2} />
      <rect x={SCENE_WIN.x + 1.8} y={SCENE_WIN.y + 1.8} width={SCENE_WIN.w - 3.6} height={SCENE_WIN.h - 3.6} fill="none" stroke={grasp ? CORRUPT_MID : 'url(#lb-gold)'} strokeWidth={1.1} opacity={0.7} />
      <rect x={STRIP_WIN.x} y={STRIP_WIN.y} width={STRIP_WIN.w} height={STRIP_WIN.h} rx={3} fill="none" stroke={LB_INK} strokeWidth={1.8} />
      <path d={OUTER} fill="none" stroke={LB_INK} strokeWidth={3} />
      {CORNERS.map((tr, i) => (
        <g key={i} transform={tr || undefined}>
          <path d={BRACKET} fill="url(#lb-iron)" stroke={LB_INK} strokeWidth={1.3} strokeLinejoin="round" />
          {RIVETS.map(([x, y], j) => (
            <circle key={j} cx={x} cy={y} r={1.5} fill={IRON_LIGHT} stroke={LB_INK} strokeWidth={0.6} />
          ))}
        </g>
      ))}
    </>
  )
}

/** The parchment plaque of the action strip; its icons go in a 34-unit row from y 199. */
export const STRIP_Y = 199

export function Strip({ grasp, children }: { grasp: boolean; children: ReactNode }) {
  return (
    <>
      <rect x={0} y={190} width={240} height={50} fill={grasp ? 'url(#lb-tile-plinth-grasp)' : 'url(#lb-tile-plinth)'} />
      <g filter={grasp ? 'url(#lb-tile-grasp-strip)' : undefined}>
        <rect x={STRIP_WIN.x} y={STRIP_WIN.y} width={STRIP_WIN.w} height={STRIP_WIN.h} rx={3} fill="url(#lb-parchment)" />
        <rect x={STRIP_WIN.x} y={STRIP_WIN.y} width={STRIP_WIN.w} height={5} fill="#000" opacity={0.14} />
        {children}
      </g>
      {grasp && <StripChains />}
    </>
  )
}

// Iron chains hanging across both ends of the strip, padlocked: the action is
// sealed (only a Call to Arms still reaches it).
function chainLinks(pts: readonly Pt[], every: number): Array<{ x: number; y: number; a: number; flat: boolean }> {
  const s = sampleSpline(pts, 12)
  const out: Array<{ x: number; y: number; a: number; flat: boolean }> = []
  let acc = 0
  let k = 0
  for (let i = 1; i < s.length; i++) {
    const dx = s[i][0] - s[i - 1][0]
    const dy = s[i][1] - s[i - 1][1]
    acc += Math.hypot(dx, dy)
    if (acc >= every) {
      acc = 0
      out.push({ x: s[i][0], y: s[i][1], a: (Math.atan2(dy, dx) * 180) / Math.PI, flat: k++ % 2 === 0 })
    }
  }
  return out
}
const CHAIN_L = chainLinks([[4, 190], [16, 206], [28, 222], [36, 236]], 6.5)
const CHAIN_R = chainLinks([[236, 190], [224, 206], [212, 222], [204, 236]], 6.5)

function StripChains() {
  return (
    <>
      <rect x={10} y={196} width={220} height={37} rx={3} fill="#160c22" opacity={0.28} />
      {[...CHAIN_L, ...CHAIN_R].map((l, i) => (
        <g key={i} transform={`translate(${f(l.x)} ${f(l.y)}) rotate(${f(l.a)})`}>
          {l.flat ? (
            <rect x={-4.6} y={-2.6} width={9.2} height={5.2} rx={2.6} fill="none" stroke={LB_INK} strokeWidth={3.4} />
          ) : (
            <rect x={-4.6} y={-1} width={9.2} height={2} rx={1} fill={LB_INK} />
          )}
          {l.flat ? (
            <rect x={-4.6} y={-2.6} width={9.2} height={5.2} rx={2.6} fill="none" stroke="#8d8a96" strokeWidth={1.6} />
          ) : (
            <rect x={-4} y={-0.5} width={8} height={1} rx={0.5} fill="#8d8a96" />
          )}
        </g>
      ))}
      <Padlock x={20} y={212} />
      <Padlock x={220} y={212} />
    </>
  )
}

function Padlock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-4.5 -2V-6A4.5 4.5 0 0 1 4.5 -6V-2" fill="none" stroke={LB_INK} strokeWidth={3.4} />
      <path d="M-4.5 -2V-6A4.5 4.5 0 0 1 4.5 -6V-2" fill="none" stroke="#9a96a3" strokeWidth={1.6} />
      <rect x={-7} y={-3} width={14} height={11} rx={2} fill="url(#lb-iron)" stroke={LB_INK} strokeWidth={1.6} />
      <circle cx={0} cy={1.6} r={1.6} fill={VOID} />
      <path d="M0 2V5.5" stroke={VOID} strokeWidth={1.4} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// The Grasp of Evil: black briars creeping in from the corners and edges, a
// violet glow at their roots, the edges sunk in darkness. The top-right
// corner stays clear (the board puts the Grasp figure there).
// ---------------------------------------------------------------------------
interface Briar {
  pts: Pt[]
  w: number
}
const BRIARS: Briar[] = [
  // bottom-left corner, up the left edge
  { pts: [[-6, 196], [14, 176], [12, 150], [26, 128], [20, 104], [30, 84]], w: 9 },
  { pts: [[-4, 184], [26, 182], [50, 170], [66, 176], [82, 166]], w: 7 },
  { pts: [[14, 150], [36, 146], [44, 132], [38, 120]], w: 4.5 },
  // bottom-right corner, up the right edge (stops well below the top-right corner)
  { pts: [[246, 194], [224, 178], [228, 156], [214, 140], [220, 122]], w: 8.5 },
  { pts: [[244, 182], [214, 184], [192, 172], [176, 178]], w: 6.5 },
  { pts: [[226, 156], [204, 152], [198, 138]], w: 4 },
  // a tendril down from the top-left, under the name band
  { pts: [[-6, 30], [10, 44], [8, 62], [20, 72]], w: 6 },
  // along the foot of the scene
  { pts: [[60, 196], [86, 186], [104, 190], [122, 184]], w: 5 },
  { pts: [[188, 196], [160, 188], [146, 192]], w: 4.5 },
]
// Thorns: little hooked triangles along each briar, alternating sides.
function thorns(b: Briar, seed: number): string {
  const rnd = prng(seed)
  const s = sampleSpline(b.pts, 8)
  let d = ''
  for (let i = 3; i < s.length - 2; i += 3) {
    const [x0, y0] = s[i - 1]
    const [x1, y1] = s[i + 1]
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const side = i % 2 ? 1 : -1
    const t = 1 - i / s.length
    const reach = (b.w * 0.55 + 3.5) * (0.7 + rnd() * 0.5) * (0.5 + t * 0.6)
    const [cx, cy] = s[i]
    const bx = cx + nx * side * b.w * 0.3
    const by = cy + ny * side * b.w * 0.3
    const tipX = bx + nx * side * reach + (dx / len) * reach * 0.55
    const tipY = by + ny * side * reach + (dy / len) * reach * 0.55
    const hw = 1.6 + b.w * 0.18
    d += `M${f(bx - (dx / len) * hw)} ${f(by - (dy / len) * hw)}L${f(tipX)} ${f(tipY)}L${f(bx + (dx / len) * hw)} ${f(by + (dy / len) * hw)}Z`
  }
  return d
}
const BRIAR_BODY = BRIARS.map((b) => brush(b.pts, b.w, 'tail', { min: 0.12 })).join('')
const BRIAR_THORNS = BRIARS.map((b, i) => thorns(b, 31 + i * 5)).join('')
// Violet sheen along the upper side of the briars.
// The floor splits under the briars.
const CRACK = 'M6 188L22 180L30 184L46 172L58 176L72 164L80 168L94 158'
const BRIAR_SHEEN = BRIARS.slice(0, 2)
  .concat(BRIARS.slice(3, 5))
  .map((b) => brush(b.pts.map(([x, y]) => [x + 0.8, y - b.w * 0.22] as const), b.w * 0.28, 'tail', { min: 0.1 }))
  .join('')

export function GraspOverlay() {
  return (
    <>
      <rect width={240} height={SCENE_H} fill="url(#lb-tile-grasp-vignette)" />
      <rect y={60} width={240} height={90} fill="url(#lb-tile-mist)" />
      <g className="lb-grasp-pulse">
        <ellipse cx={12} cy={178} rx={70} ry={50} fill="url(#lb-corrupt-glow)" />
        <ellipse cx={230} cy={176} rx={60} ry={44} fill="url(#lb-corrupt-glow)" />
        <ellipse cx={4} cy={44} rx={34} ry={30} fill="url(#lb-corrupt-glow)" opacity={0.7} />
      </g>
      <path d={CRACK} fill="none" stroke={CORRUPT_GLOW} strokeWidth={5} strokeLinejoin="round" opacity={0.35} />
      <path d={CRACK} fill="none" stroke={VOID} strokeWidth={1.8} strokeLinejoin="round" />
      {/* a violet rim so the black briars stand off the dark */}
      <g stroke={CORRUPT_MID} strokeWidth={3.4} strokeLinejoin="round">
        <path d={BRIAR_BODY} fill={CORRUPT_MID} />
        <path d={BRIAR_THORNS} fill={CORRUPT_MID} />
      </g>
      <path d={BRIAR_BODY} fill={VOID} />
      <path d={BRIAR_THORNS} fill={VOID} />
      <path d={BRIAR_SHEEN} fill={CORRUPT_GLOW} opacity={0.6} />
    </>
  )
}
