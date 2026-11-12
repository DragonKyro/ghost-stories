// The eight Taoist powers, as pictograms on a stone disc rimmed in the
// board's colour.
import type { ReactNode } from 'react'
import type { Color, PowerId } from '@/game/types'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { arcPts, brush, strokes, type Pt } from './brush'
import { CoinG, MonkG, NumG, ROOF_PATH, TaoDieFaceG, WispG } from './glyphs'
import { COLOR_DARK, COLOR_HEX, INK, VERMILION } from './palette'

export const POWER_COLOR: Record<PowerId, Color> = {
  danceOfTheSpires: 'red',
  danceOfTheTwinWinds: 'red',
  heavenlyGust: 'blue',
  secondWind: 'blue',
  godsFavorite: 'green',
  strengthOfMountain: 'green',
  bottomlessPockets: 'yellow',
  enfeeblementMantra: 'yellow',
}

export const POWER_LABEL: Record<PowerId, string> = {
  danceOfTheSpires: 'Dance of the Spires',
  danceOfTheTwinWinds: 'Dance of the Twin Winds',
  heavenlyGust: 'Heavenly Gust',
  secondWind: 'Second Wind',
  godsFavorite: "The Gods' Favorite",
  strengthOfMountain: 'Strength of a Mountain',
  bottomlessPockets: 'Bottomless Pockets',
  enfeeblementMantra: 'Enfeeblement Mantra',
}

// ---------------------------------------------------------------------------
// Static brush paths.
// ---------------------------------------------------------------------------
const pathOf = (pts: Pt[]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')

/** A curved arrow along an arc, with its head at the end. */
function arcArrow(cx: number, cy: number, r: number, a0: number, a1: number, w: number): string {
  const pts = arcPts(cx, cy, r, r, a0, a1, 10)
  const end = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  const dx = end[0] - prev[0]
  const dy = end[1] - prev[1]
  const d = Math.hypot(dx, dy) || 1
  const ux = dx / d
  const uy = dy / d
  const h = w * 2.1
  const tip: Pt = [end[0] + ux * h, end[1] + uy * h]
  const l: Pt = [end[0] - uy * h * 0.9, end[1] + ux * h * 0.9]
  const rr: Pt = [end[0] + uy * h * 0.9, end[1] - ux * h * 0.9]
  return brush(pts, w, 'head', { min: 0.25 }) + pathOf([l, tip, rr]) + 'Z'
}

const SPIRES_ARC = 'M24 60Q44 2 76 44'
const TWIN_ARROWS = arcArrow(50, 50, 36, Math.PI * 1.05, Math.PI * 1.85, 6) + arcArrow(50, 50, 36, Math.PI * 0.05, Math.PI * 0.85, 6)
const GUST = strokes([
  [[[14, 30], [40, 26], [60, 28], [70, 20], [64, 12], [56, 16]], 6, 'head'],
  [[[22, 42], [52, 40], [76, 40], [86, 32], [80, 24]], 6, 'head'],
])
const PALM =
  'M40 62C38 72 44 80 52 80C61 80 66 72 64 62Z' +
  strokes([
    [[[42, 62], [40, 46], [39, 36]], 6.5, 'none'],
    [[[48, 61], [48, 42], [48, 32]], 6.5, 'none'],
    [[[55, 61], [56, 44], [57, 34]], 6.5, 'none'],
    [[[61, 63], [63, 50], [65, 42]], 6, 'none'],
    [[[42, 70], [35, 64], [30, 56]], 6, 'none'],
    [[[52, 78], [52, 88], [52, 98]], 15, 'none'],
  ])
const SPIRAL = brush(
  [[50, 52], [56, 48], [55, 40], [46, 37], [37, 43], [35, 55], [43, 66], [57, 68], [68, 58], [71, 43], [64, 28], [50, 22]],
  8,
  'head',
  { min: 0.2 },
)
const REROLL = arcArrow(50, 52, 38, Math.PI * -0.35, Math.PI * 1.25, 6.5)
const RAYS = strokes([
  [[[50, 4], [50, 9], [50, 13]], 4, 'head'],
  [[[36, 7], [39, 11], [41, 15]], 3.5, 'head'],
  [[[64, 7], [61, 11], [59, 15]], 3.5, 'head'],
])
const MOUNTAIN_FILL = 'M4 84L28 40L38 54L54 18L74 52L82 44L96 84Z'
const MOUNTAIN_INK = strokes([
  [[[6, 82], [18, 60], [28, 40], [34, 50], [38, 54]], 6, 'tail'],
  [[[38, 54], [46, 34], [54, 18], [64, 36], [74, 52], [82, 44], [94, 82]], 6, 'tail'],
  [[[54, 18], [52, 36], [46, 56]], 3.5, 'tail'],
])
const POUCH = 'M30 48C18 60 16 86 32 92C42 96 58 96 68 92C84 86 82 60 70 48C62 44 38 44 30 48Z'
const POUCH_TIE = brush([[30, 47], [50, 52], [70, 47]], 7, 'none')
const POUCH_FOLDS = strokes([
  [[[40, 56], [36, 72], [38, 86]], 3, 'both'],
  [[[60, 56], [64, 72], [62, 86]], 3, 'both'],
])
const TALISMAN_INK = strokes([
  [[[47, 28], [53, 27]], 2.6, 'none'],
  [[[50, 27], [50, 38]], 2.6, 'tail'],
  [[[46, 33], [54, 33]], 2.4, 'none'],
  [[[47, 40], [53, 42], [47, 45]], 2.2, 'both'],
])

function body(power: PowerId): ReactNode {
  switch (power) {
    case 'danceOfTheSpires':
      return (
        <>
          <path d={ROOF_PATH} transform="translate(2 52) scale(0.46)" fill={INK} />
          <rect x={14} y={72} width={18} height={14} fill="none" stroke={INK} strokeWidth={3.5} />
          <path d={ROOF_PATH} transform="translate(52 34) scale(0.5)" fill={INK} />
          <rect x={64} y={54} width={22} height={32} fill="none" stroke={INK} strokeWidth={3.5} />
          <path d="M60 30L76 34L60 38" fill={INK} />
          <path d={SPIRES_ARC} fill="none" stroke={VERMILION} strokeWidth={3.5} strokeDasharray="5 5" strokeLinecap="round" />
          <g transform="rotate(32 50 30)">
            <MonkG color="red" x={30} y={2} s={46} />
          </g>
        </>
      )
    case 'danceOfTheTwinWinds':
      return (
        <>
          <path d={TWIN_ARROWS} fill={COLOR_DARK.red} />
          <MonkG color="red" x={18} y={28} s={36} />
          <MonkG color="grey" x={48} y={34} s={36} />
        </>
      )
    case 'heavenlyGust':
      return (
        <>
          <path d={GUST} fill={COLOR_DARK.blue} />
          <g transform="translate(-14 4) scale(0.92)">
            <path d={PALM} fill="url(#gs-skin)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke" />
          </g>
          <g transform="translate(110 4) scale(-0.92 0.92)">
            <path d={PALM} fill="url(#gs-skin)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke" />
          </g>
        </>
      )
    case 'secondWind':
      return (
        <>
          <path d={SPIRAL} fill={COLOR_DARK.blue} />
          <text
            x={70}
            y={86}
            textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontWeight={700}
            fontSize={40}
            fill={INK}
            stroke="#f6ecd6"
            strokeWidth={6}
            paintOrder="stroke"
          >
            ×2
          </text>
        </>
      )
    case 'godsFavorite':
      return (
        <>
          <path d={REROLL} fill={COLOR_DARK.green} />
          <path d={RAYS} fill="#b8862b" />
          <g transform="rotate(-12 50 54)">
            <TaoDieFaceG face="green" x={26} y={30} s={48} />
          </g>
        </>
      )
    case 'strengthOfMountain':
      return (
        <>
          <path d={MOUNTAIN_FILL} fill={COLOR_HEX.green} opacity={0.35} />
          <path d={MOUNTAIN_INK} fill={INK} />
          <g transform="translate(56 54)">
            <rect x={0} y={0} width={36} height={36} rx={7} fill="#9b958c" stroke="#3d3833" strokeWidth={3} />
            <rect x={4} y={4} width={28} height={28} rx={5} fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={1.5} />
            <circle cx={18} cy={18} r={6} fill="#f6ecd6" stroke="#3d3833" strokeWidth={2} />
          </g>
          <NumG text="+1" x={4} y={62} s={40} size={56} />
        </>
      )
    case 'bottomlessPockets':
      return (
        <>
          <CoinG color="red" x={22} y={14} s={30} />
          <CoinG color="blue" x={50} y={8} s={30} />
          <CoinG color="green" x={36} y={-2} s={30} />
          <CoinG color="black" x={62} y={26} s={24} />
          <path d={POUCH} fill="#c9933c" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
          <path d={POUCH_FOLDS} fill="#7a5418" />
          <path d={POUCH_TIE} fill={VERMILION} />
          <CoinG color="yellow" x={40} y={58} s={26} />
        </>
      )
    case 'enfeeblementMantra':
      return (
        <>
          <WispG x={4} y={8} s={88} />
          <g transform="rotate(-8 50 36)">
            <path d="M42 22H58L59 50L50 47L41 50Z" fill="url(#gs-talisman)" stroke="#8a6620" strokeWidth={1.8} strokeLinejoin="round" />
            <path d={TALISMAN_INK} fill={VERMILION} />
          </g>
          <NumG text="−1" x={56} y={62} s={40} size={56} />
        </>
      )
  }
}

export interface PowerIconProps extends ArtBaseProps {
  power: PowerId
  size?: number
  /** Greyed out: the power is blocked / the board is possessed. */
  inactive?: boolean
}

export function PowerIcon({ power, size = 40, inactive = false, title, ...rest }: PowerIconProps) {
  const color = POWER_COLOR[power]
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? POWER_LABEL[power]} {...rest}>
      <g opacity={inactive ? 0.45 : 1}>
        <circle cx={50} cy={50} r={48} fill="url(#gs-stone-pale)" stroke={COLOR_HEX[color]} strokeWidth={5} />
        <circle cx={50} cy={50} r={42} fill="none" stroke={COLOR_DARK[color]} strokeOpacity={0.5} strokeWidth={1.5} />
        <g transform="translate(11 11) scale(0.78)">{body(power)}</g>
      </g>
      {inactive && <path d="M20 20L80 80" stroke={VERMILION} strokeWidth={8} strokeLinecap="round" />}
    </ArtSvg>
  )
}
