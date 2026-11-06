// A Taoist monk: robe in the player colour, topknot, staff with a gourd,
// prayer beads. `lying` lays the figure down (dead, on the Cemetery);
// `active` adds a soft golden glow.
import type { Color } from '@/game/types'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { brush, strokes } from './brush'
import { WispG } from './glyphs'
import { COLOR_DARK, COLOR_LIGHT } from './palette'

export interface TaoistFigureProps extends ArtBaseProps {
  color: Color
  size?: number
  lying?: boolean
  active?: boolean
}

const ROBE = 'M40 29C33 31 29 37 28 46C26 58 23 76 20 92Q48 98 76 92C73 77 70 60 68 46C67 37 62 31 55 29Z'
const SLEEVE_L = 'M31 37C26 48 27 59 37 63C46 66 54 60 57 55C50 52 44 49 41 42Z'
const SLEEVE_R = 'M58 33C66 36 73 41 77 47C76 53 70 56 63 55C61 48 60 40 58 33Z'
const HAIR = 'M38.5 21C38 13 43 10 47.5 10C52 10 56.5 13 56 21C53 17 50 16 47 16C44 16 41 17 38.5 21Z'
const STAFF = brush([[78, 3], [77.5, 50], [76.5, 97]], 4.8, 'none')
const FOLDS = strokes([
  [[[44, 64], [41, 78], [37, 92]], 2.6, 'head'],
  [[[56, 64], [59, 78], [62, 92]], 2.6, 'head'],
  [[[50, 66], [50, 80], [49, 93]], 2, 'head'],
])
const SASH_TAIL = brush([[52, 57], [53, 64], [55, 73]], 4, 'tail')
const BEADS: Array<[number, number]> = [
  [43, 60],
  [43.5, 64],
  [45, 67.5],
  [47.5, 70],
  [50.5, 70.5],
  [53, 69],
]

function Figure({ color, lying }: { color: Color; lying: boolean }) {
  const dark = COLOR_DARK[color]
  const robe = `url(#gs-frame-${color})`
  const sash = color === 'yellow' ? '#7a4f1a' : '#f1e3c4'
  return (
    <g>
      {/* pale outline so the figure pops on busy tiles */}
      <g fill="#f6ecd6" stroke="#f6ecd6" strokeWidth={6} strokeLinejoin="round" opacity={0.75}>
        <path d={ROBE} />
        <path d={SLEEVE_R} />
        <circle cx={47.5} cy={21} r={9} />
        <circle cx={47.5} cy={9} r={5} />
        <path d={STAFF} />
        <circle cx={82.5} cy={20} r={5.5} />
      </g>
      <path d={STAFF} fill="#5e3b1e" />
      {/* gourd tied to the staff */}
      <path d="M78 12Q82 13 82 16" fill="none" stroke="#b8322a" strokeWidth={1.6} />
      <circle cx={82.5} cy={16.5} r={3} fill="#c98a3a" stroke="#5a3a14" strokeWidth={1.4} />
      <circle cx={82.5} cy={22.5} r={4.6} fill="#c98a3a" stroke="#5a3a14" strokeWidth={1.4} />
      <path d={ROBE} fill={robe} stroke={dark} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={FOLDS} fill={dark} opacity={0.55} />
      {/* sash */}
      <path d="M30 55Q49 59 68 55L68 59Q49 63 30 59Z" fill={sash} stroke={dark} strokeWidth={1.2} />
      <path d={SASH_TAIL} fill={sash} />
      {/* collar */}
      <path d="M41 29L48 41L55 29" fill="none" stroke="#f6ecd6" strokeWidth={3.2} strokeLinejoin="round" />
      <path d="M41 29L48 41L55 29" fill="none" stroke={dark} strokeWidth={1} strokeLinejoin="round" />
      {/* sleeves */}
      <path d={SLEEVE_R} fill={robe} stroke={dark} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={76} cy={48} r={4.2} fill="url(#gs-skin)" stroke="#8a6040" strokeWidth={1.2} />
      <path d={SLEEVE_L} fill={robe} stroke={dark} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M33 45Q38 56 50 58" fill="none" stroke={COLOR_LIGHT[color]} strokeOpacity={0.6} strokeWidth={1.6} />
      {BEADS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.9} fill="#3a1f12" stroke="#c98a3a" strokeWidth={0.7} />
      ))}
      <circle cx={48.5} cy={72.5} r={2.4} fill="#b8322a" />
      {/* head */}
      <circle cx={47.5} cy={21} r={8.6} fill="url(#gs-skin)" stroke="#6b4a30" strokeWidth={1.4} />
      <path d={HAIR} fill="#16110d" />
      <circle cx={47.5} cy={9} r={4.6} fill="#16110d" />
      <path d="M40.5 9.5L55 8" stroke="#d4a857" strokeWidth={1.6} strokeLinecap="round" />
      {lying ? (
        <path d="M42.5 22.5Q44.5 24 46.5 22.5M49.5 22.5Q51.5 24 53.5 22.5" fill="none" stroke="#1d1712" strokeWidth={1.3} strokeLinecap="round" />
      ) : (
        <path d={strokes([[[[42.5, 22], [44.5, 21.6], [46, 22]], 1.8, 'none'], [[[50, 22], [51.5, 21.6], [53.5, 22]], 1.8, 'none']])} fill="#1d1712" />
      )}
      <path d="M46 26.5Q48 27.5 50 26.5" fill="none" stroke="#7a3a2a" strokeWidth={1} strokeLinecap="round" />
    </g>
  )
}

export function TaoistFigure({ color, size = 48, lying = false, active = false, title, ...rest }: TaoistFigureProps) {
  const label = title ?? `${color[0].toUpperCase()}${color.slice(1)} Taoist${lying ? ' (dead)' : ''}`
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={label} {...rest}>
      {active && (
        <g className="gs-pulse">
          <ellipse cx={50} cy={52} rx={48} ry={50} fill="url(#gs-halo)" />
        </g>
      )}
      {active && <ellipse cx={48} cy={94} rx={30} ry={5.5} fill="none" stroke={COLOR_LIGHT[color]} strokeWidth={2.5} />}
      {lying ? (
        <>
          <ellipse cx={52} cy={90} rx={44} ry={6} fill="#1d1712" opacity={0.3} />
          <g transform="translate(0 12) rotate(-90 50 50)">
            <Figure color={color} lying />
          </g>
          <WispG x={2} y={8} s={26} />
        </>
      ) : (
        <>
          <ellipse cx={48} cy={95} rx={27} ry={4} fill="#1d1712" opacity={0.3} />
          <Figure color={color} lying={false} />
        </>
      )}
    </ArtSvg>
  )
}
