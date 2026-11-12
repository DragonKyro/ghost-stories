// A Taoist exorcist-warrior: long fighting coat in the player colour, split
// over dark trousers and boots in a wide stance; an iron shoulder guard and
// leather bracers; a red headband streaming in the wind; a jian raised in one
// hand and a glowing paper talisman held up in sword-fingers in the other.
// `lying` lays the figure down (dead, on the Cemetery) in an effigy pose,
// hands folded on the sword; `active` adds a soft golden glow.
//
// The silhouette (diagonal blade, flared coat, topknot) is what carries it at
// the 24–36 px it is drawn at on the village tiles.
import type { Color } from '@/game/types'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { brush, poly, strokes } from './brush'
import { WispG } from './glyphs'
import { COLOR_DARK, COLOR_LIGHT, GOLD, VERMILION } from './palette'

export interface TaoistFigureProps extends ArtBaseProps {
  color: Color
  size?: number
  lying?: boolean
  active?: boolean
}

const PALE = '#f6ecd6'
const TRIM = '#f1e3c4'
const CLOTH_DARK = '#2b2420'
const LEATHER = '#4a3222'
const IRON = '#3d3934'
const IRON_HI = '#77706a'
const STEEL = '#e3e9ec'
const STEEL_SHADE = '#97a3aa'
const EDGE = '#221d19'

// ---- body (shared by both poses) -------------------------------------------
const TORSO = 'M36 31C40.5 29 54.5 29 58.8 31L60 38C59.2 45 58.3 50 57.8 55L37.2 55C36.8 50 35.6 45 34.6 38Z'
const COAT_L = 'M37.4 56.5C34.4 66 29.4 78 22.4 90Q30.5 93.2 39.2 91.2C41 80 43 70 45.4 59.5Z'
const COAT_R = 'M57.8 56.5C60.8 66 65.8 78 73.6 89.2Q65.8 92.8 56.8 91.2C55 80 53 70 50.4 59.5Z'
const TROUSERS = 'M43.6 57.5L51.8 57.5L57.6 92.4L52.2 93.2L47.7 71L43.2 93.2L37.8 92.4Z'
const BOOT_L = 'M33.2 89.6L41.2 89.6L41.8 95.6Q34.6 96.8 28.4 95.6Q28.8 91.8 33.2 91.2Z'
const BOOT_R = 'M54.4 89.6L62.4 89.6Q66.8 91.4 67.8 95.6Q61 96.8 53.8 95.6Z'
const BELT = 'M36.8 53.2Q47.6 56 58.4 53.2L58.8 58.4Q47.6 61.2 36.4 58.4Z'
const PAULDRON = 'M29.6 30.6C32.6 26.2 40.2 26.6 42.4 31C41.6 35.4 38.4 38.2 34.2 39.2C30.8 38.6 28.8 35.2 29.6 30.6Z'
const HAIR = 'M39.7 19.4C39 14.2 42.6 12.4 47.4 12.4C52.2 12.4 55.8 14.2 55.1 19.4C53 16.6 50.4 15.8 47.4 15.8C44.4 15.8 41.8 16.6 39.7 19.4Z'
const HEADBAND = 'M39.8 16.4Q47.4 13.6 55 16.4L55.2 18.9Q47.4 16.3 39.6 18.9Z'
const HEADBAND_TAILS = strokes([
  [[[40.2, 17.4], [34, 15.2], [27.6, 17.4], [20.6, 13.4]], 3.4, 'tail'],
  [[[40.4, 18.6], [35, 20.6], [29.6, 24.4], [23, 23.6]], 2.6, 'tail'],
])
const SASH_TAILS = strokes([
  [[[57.4, 57], [62.6, 61.6], [69.4, 60.6], [77.4, 65.6]], 3.6, 'tail'],
  [[[56.6, 58.4], [60.6, 64.6], [66.4, 66.8], [72.2, 72.6]], 2.8, 'tail'],
])
const COAT_FOLDS = strokes([
  [[[39.6, 64], [35.4, 76], [30.4, 88]], 2.2, 'head'],
  [[[55.6, 64], [60, 76], [65.4, 87.6]], 2.2, 'head'],
])
const TROUSER_FOLDS = strokes([
  [[[45.4, 62], [44.6, 74], [42.2, 86]], 1.3, 'both'],
  [[[50, 62], [51.4, 74], [53.6, 86]], 1.3, 'both'],
])
// Brows slanting down to the nose: a fierce frown.
const BROWS = strokes([
  [[[41.4, 18.4], [43.8, 19.2], [46.2, 20.9]], 2.3, 'tail'],
  [[[53.4, 18.4], [51, 19.2], [48.6, 20.9]], 2.3, 'tail'],
])
const EYES = 'M42.4 22.3Q44 21.1 45.9 22.5Q44 23.4 42.4 22.3ZM52.4 22.3Q50.8 21.1 48.9 22.5Q50.8 23.4 52.4 22.3Z'

// ---- standing: talisman arm (left) and sword arm (right) --------------------
const SLEEVE_L = 'M33.4 31.4C29.4 33 26.8 36.6 24.6 41.2L28.8 43.8C30.8 40.2 33.8 38.6 37.4 38.2Z'
const BRACER_L = 'M24.2 40.6L29 43.8L23.2 48.8L19.8 45.4Z'
const SLEEVE_R = 'M57.2 31C62.8 31 67.2 33.6 70.8 37.2L66.8 40.6C63.8 38.6 60.2 37.6 57.6 38Z'
const BRACER_R = 'M66.4 39.8L71.4 37.6L73.2 28.8L68.6 28.2Z'
// Talisman held between two raised fingers, tilted a little.
const TALISMAN = 'M16.4 27.6L22.4 26.9L23 41.6L17.6 42.3Z'
const TALISMAN_INK = strokes([
  [[[17.9, 30.2], [21.4, 29.7]], 1.1, 'tail'],
  [[[19.9, 30.4], [19.3, 33.6], [20.7, 36.4], [19.8, 39.6]], 1.4, 'tail'],
])
// The jian, fist at (70.8, 26.2), blade up and to the right.
const BLADE_LIGHT = poly([[72.8, 22], [88, 5.7], [91.5, 3.5], [73.8, 23]])
const BLADE_DARK = poly([[73.8, 23], [91.5, 3.5], [89.7, 7.2], [74.8, 23.9]])
const BLADE = poly([[72.8, 22], [88, 5.7], [91.5, 3.5], [89.7, 7.2], [74.8, 23.9]])
const TASSEL = brush([[67.2, 30.6], [65.6, 33.6], [64.6, 38.2]], 2.4, 'tail')

// ---- lying: arms folded on the sword ----------------------------------------
const FOLD_SLEEVE_L = 'M34 31.4C31.4 36 32 42 36.2 45.2L40.2 42C38.6 39.6 38.2 36 38.6 33Z'
const FOLD_BRACER_L = 'M36.4 42.6L45.6 43.2L45.6 47.2L37.4 46.6Z'
const FOLD_SLEEVE_R = 'M60.8 31.4C63.4 36 62.8 42 58.6 45.2L54.6 42C56.2 39.6 56.6 36 56.2 33Z'
const FOLD_BRACER_R = 'M58.4 42.6L49.2 43.2L49.2 47.2L57.4 46.6Z'
const FLAT_BLADE = poly([[46, 50], [48.8, 50], [48.6, 84], [47.4, 88.2], [46.2, 84]])
const FLAT_BLADE_SHADE = poly([[47.4, 50], [48.8, 50], [48.6, 84], [47.4, 88.2]])

function Arms({ lying, robe, dark }: { lying: boolean; robe: string; dark: string }) {
  if (lying) {
    return (
      <>
        <path d={FOLD_SLEEVE_L} fill={robe} stroke={dark} strokeWidth={1.8} strokeLinejoin="round" />
        <path d={FOLD_SLEEVE_R} fill={robe} stroke={dark} strokeWidth={1.8} strokeLinejoin="round" />
        {/* the sword laid along the body, hilt under the hands */}
        <path d={FLAT_BLADE} fill={STEEL} />
        <path d={FLAT_BLADE_SHADE} fill={STEEL_SHADE} />
        <path d={FLAT_BLADE} fill="none" stroke={EDGE} strokeWidth={0.8} strokeLinejoin="round" />
        <path d="M43.2 49.4L51.6 49.4" stroke={EDGE} strokeWidth={3} strokeLinecap="round" />
        <path d="M43.2 49.4L51.6 49.4" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" />
        <path d="M47.4 38.6L47.4 48" stroke="#3a1a12" strokeWidth={2.6} strokeLinecap="round" />
        <circle cx={47.4} cy={38} r={1.6} fill={GOLD} stroke="#6b4a1a" strokeWidth={0.6} />
        <path d={FOLD_BRACER_L} fill={LEATHER} stroke={EDGE} strokeWidth={1} strokeLinejoin="round" />
        <path d={FOLD_BRACER_R} fill={LEATHER} stroke={EDGE} strokeWidth={1} strokeLinejoin="round" />
        <circle cx={45.6} cy={45.2} r={2.7} fill="url(#gs-skin)" stroke="#8a6040" strokeWidth={0.9} />
        <circle cx={49.2} cy={45.2} r={2.7} fill="url(#gs-skin)" stroke="#8a6040" strokeWidth={0.9} />
      </>
    )
  }
  return (
    <>
      {/* talisman arm: out to the side, sword-fingers raised */}
      <ellipse cx={19.8} cy={34.4} rx={8.5} ry={11} fill="url(#gs-halo)" opacity={0.9} />
      <path d={SLEEVE_L} fill={robe} stroke={dark} strokeWidth={1.8} strokeLinejoin="round" />
      <path d={BRACER_L} fill={LEATHER} stroke={EDGE} strokeWidth={1} strokeLinejoin="round" />
      <path d="M24.4 41.8L28.2 44.4" stroke={GOLD} strokeWidth={0.9} />
      <path d={TALISMAN} fill="url(#gs-talisman)" stroke="#8a6a1a" strokeWidth={0.8} strokeLinejoin="round" />
      <path d={TALISMAN_INK} fill={VERMILION} />
      <rect x={19.2} y={40.4} width={2.6} height={6} rx={1.3} fill="url(#gs-skin)" stroke="#8a6040" strokeWidth={0.8} />
      <circle cx={20.6} cy={47} r={2.8} fill="url(#gs-skin)" stroke="#8a6040" strokeWidth={0.9} />

      {/* sword arm: raised, the jian up and to the right */}
      <path d={SLEEVE_R} fill={robe} stroke={dark} strokeWidth={1.8} strokeLinejoin="round" />
      <path d={BRACER_R} fill={LEATHER} stroke={EDGE} strokeWidth={1} strokeLinejoin="round" />
      <path d="M67 38.6L71.2 36.8" stroke={GOLD} strokeWidth={0.9} />
      <path d={TASSEL} fill={VERMILION} />
      <path d="M67.2 30.2L73.4 23.4" stroke="#3a1a12" strokeWidth={2.6} strokeLinecap="round" />
      <path d={BLADE_LIGHT} fill={STEEL} />
      <path d={BLADE_DARK} fill={STEEL_SHADE} />
      <path d={BLADE} fill="none" stroke={EDGE} strokeWidth={0.9} strokeLinejoin="round" />
      <path d="M76.2 19.8L86.4 8.8" stroke="#fff" strokeWidth={0.7} strokeLinecap="round" opacity={0.85} />
      <path d="M70.4 21L76 26.1" stroke={EDGE} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M70.4 21L76 26.1" stroke={GOLD} strokeWidth={1.9} strokeLinecap="round" />
      <circle cx={67.2} cy={30.2} r={1.7} fill={GOLD} stroke="#6b4a1a" strokeWidth={0.6} />
      <circle cx={70.8} cy={26.4} r={3.3} fill="url(#gs-skin)" stroke="#8a6040" strokeWidth={1} />
    </>
  )
}

function Figure({ color, lying }: { color: Color; lying: boolean }) {
  const dark = COLOR_DARK[color]
  const robe = `url(#gs-frame-${color})`
  return (
    <g>
      {/* pale outline so the figure pops on busy tiles */}
      <g fill={PALE} stroke={PALE} strokeWidth={5} strokeLinejoin="round" opacity={0.75}>
        <path d={COAT_L} />
        <path d={COAT_R} />
        <path d={TORSO} />
        <path d={PAULDRON} />
        <path d={BOOT_L} />
        <path d={BOOT_R} />
        <circle cx={47.4} cy={20} r={7.6} />
        <ellipse cx={47.4} cy={10.8} rx={3.9} ry={3.4} />
        {lying ? (
          <>
            <path d={FOLD_SLEEVE_L} />
            <path d={FOLD_SLEEVE_R} />
          </>
        ) : (
          <>
            <path d={SLEEVE_L} />
            <path d={BRACER_L} />
            <path d={TALISMAN} />
            <path d={SLEEVE_R} />
            <path d={BRACER_R} />
            <path d={BLADE} strokeWidth={3.4} />
          </>
        )}
      </g>

      {/* streamers behind the figure */}
      <path d={HEADBAND_TAILS} fill={VERMILION} stroke="#5a140f" strokeWidth={0.5} />
      <path d={SASH_TAILS} fill="#a3271f" stroke="#5a140f" strokeWidth={0.5} />

      {/* legs and coat */}
      <path d={TROUSERS} fill={CLOTH_DARK} stroke={EDGE} strokeWidth={1.2} strokeLinejoin="round" />
      <path d={TROUSER_FOLDS} fill="#4a3f37" />
      <path d={BOOT_L} fill="#1d1712" stroke={EDGE} strokeWidth={1} strokeLinejoin="round" />
      <path d={BOOT_R} fill="#1d1712" stroke={EDGE} strokeWidth={1} strokeLinejoin="round" />
      <path d="M29.4 95.2Q34.8 96 41.6 95.2M54.4 95.2Q61 96 67.4 95.2" fill="none" stroke="#6b5a4a" strokeWidth={0.8} />
      <path d={COAT_L} fill={robe} stroke={dark} strokeWidth={2} strokeLinejoin="round" />
      <path d={COAT_R} fill={robe} stroke={dark} strokeWidth={2} strokeLinejoin="round" />
      <path d={COAT_FOLDS} fill={dark} opacity={0.5} />
      {/* trim down the open front and along the hem */}
      <path d="M45.4 59.5C43 70 41 80 39.2 91.2M50.4 59.5C53 70 55 80 56.8 91.2" fill="none" stroke={TRIM} strokeWidth={1.5} />
      <path d="M23.6 89.4Q30.6 92.2 38.6 90.4M57.4 90.4Q65.6 92 72.6 88.6" fill="none" stroke={dark} strokeWidth={2.2} />

      {/* torso, crossed collar, belt */}
      <path d={TORSO} fill={robe} stroke={dark} strokeWidth={2} strokeLinejoin="round" />
      <path d="M42.2 29.8L49.6 42M52.8 29.8L47.6 36.4" fill="none" stroke={TRIM} strokeWidth={3} strokeLinejoin="round" />
      <path d="M42.2 29.8L49.6 42M52.8 29.8L47.6 36.4" fill="none" stroke={dark} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M36.2 41Q40 49 37.8 53" fill="none" stroke={COLOR_LIGHT[color]} strokeOpacity={0.55} strokeWidth={1.4} />
      <path d={BELT} fill="#241a14" stroke={EDGE} strokeWidth={1} strokeLinejoin="round" />
      <path d="M37.2 54.8Q47.6 57.4 58 54.8" fill="none" stroke={GOLD} strokeWidth={0.7} opacity={0.8} />
      <circle cx={47.6} cy={56.8} r={2.6} fill={GOLD} stroke="#6b4a1a" strokeWidth={0.8} />
      <circle cx={47.6} cy={56.8} r={1} fill="#6b4a1a" />

      <Arms lying={lying} robe={robe} dark={dark} />

      {/* iron shoulder guard, lamellar rows with a gold rim */}
      <path d={PAULDRON} fill={IRON} stroke={EDGE} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M31.2 31.8Q36 29 41 32.2M31 35.2Q35.4 32.8 39.8 35.4" fill="none" stroke={IRON_HI} strokeWidth={1.1} />
      <path d="M30.4 33.6C30.6 36.6 32.2 38.4 34.2 38.8C37.6 38 40.4 35.8 41.6 32.4" fill="none" stroke={GOLD} strokeWidth={1} />
      <circle cx={36} cy={29.6} r={1.2} fill={GOLD} stroke="#6b4a1a" strokeWidth={0.5} />

      {/* head: neck, face, topknot, headband */}
      <path d="M44.8 26.4L50 26.4L50.4 30.4L44.4 30.4Z" fill="#d8b086" />
      <circle cx={47.4} cy={20} r={7.4} fill="url(#gs-skin)" stroke="#6b4a30" strokeWidth={1.3} />
      <path d={HAIR} fill="#16110d" />
      {/* topknot bun, a hairpin through it */}
      <ellipse cx={47.4} cy={10.6} rx={3.9} ry={3.5} fill="#16110d" />
      <path d="M44.6 13.4Q47.4 14.6 50.2 13.4" fill="none" stroke={VERMILION} strokeWidth={1.4} />
      <path d="M42.4 11L52.6 9.4" stroke={GOLD} strokeWidth={1.4} strokeLinecap="round" />
      <path d={HEADBAND} fill={VERMILION} stroke="#5a140f" strokeWidth={0.6} />
      {lying ? (
        <path d="M42.6 22.2Q44.2 23.6 45.8 22.2M49 22.2Q50.6 23.6 52.2 22.2" fill="none" stroke="#1d1712" strokeWidth={1.2} strokeLinecap="round" />
      ) : (
        <>
          <path d={BROWS} fill="#16110d" />
          <path d={EYES} fill="#1d1712" />
        </>
      )}
      <path d="M45.6 25.7Q47.4 24.7 49.2 25.7" fill="none" stroke="#7a3a2a" strokeWidth={1} strokeLinecap="round" />
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
      {active && <ellipse cx={48} cy={94.6} rx={31} ry={5.2} fill="none" stroke={COLOR_LIGHT[color]} strokeWidth={2.5} />}
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
          <ellipse cx={48} cy={95.4} rx={29} ry={3.8} fill="#1d1712" opacity={0.3} />
          <Figure color={color} lying={false} />
        </>
      )}
    </ArtSvg>
  )
}
