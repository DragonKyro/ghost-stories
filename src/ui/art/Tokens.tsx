// Game tokens: Tao, Qi, Yin-Yang, power tokens, Buddha and haunting figures,
// the Enfeeblement Mantra, markers, moon crystals.
import type { Color, TaoColor } from '@/game/types'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { brush, strokes } from './brush'
import { BuddhaG, CoinG, CrystalG, QiG, SWIRL_PATH, WispG, YinYangG } from './glyphs'
import { COLOR_DARK, COLOR_HEX, VERMILION } from './palette'

export interface TokenProps extends ArtBaseProps {
  size?: number
}

const TAO_NAME: Record<TaoColor, string> = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow', black: 'Black' }

export function TaoToken({ color, size = 24, title, ...rest }: TokenProps & { color: TaoColor }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? `${TAO_NAME[color]} Tao token`} {...rest}>
      <CoinG color={color} />
    </ArtSvg>
  )
}

export function QiToken({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Qi'} {...rest}>
      <QiG />
    </ArtSvg>
  )
}

export function YinYangToken({ size = 24, spent = false, title, ...rest }: TokenProps & { spent?: boolean }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? (spent ? 'Yin-Yang (spent)' : 'Yin-Yang')} {...rest}>
      <YinYangG spent={spent} />
    </ArtSvg>
  )
}

/** A power token in the colour of the board whose power it borrows. */
export function PowerToken({ color, size = 24, title, ...rest }: TokenProps & { color: Color }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Power token'} {...rest}>
      <circle cx={50} cy={50} r={47} fill="#f6ecd6" opacity={0.85} />
      <circle cx={50} cy={50} r={43} fill={`url(#gs-frame-${color})`} stroke={COLOR_DARK[color]} strokeWidth={4} />
      <circle cx={50} cy={50} r={33} fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={3} strokeDasharray="5 6" />
      <path d={SWIRL_PATH} transform="translate(50 50) scale(1.05) translate(-52 -50)" fill={color === 'yellow' ? '#5a3f10' : '#fbf1d8'} />
    </ArtSvg>
  )
}

export function BuddhaFigure({ size = 28, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Buddha figure'} {...rest}>
      <BuddhaG />
    </ArtSvg>
  )
}

export function HauntingFigure({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Haunting figure'} {...rest}>
      <WispG />
    </ArtSvg>
  )
}

// Talisman script: a column of loose red brush marks.
const TALISMAN_SCRIPT = strokes([
  [[[40, 22], [50, 20], [60, 22]], 6, 'tail'],
  [[[50, 20], [50, 30], [48, 36]], 6, 'tail'],
  [[[38, 40], [50, 36], [62, 42]], 6, 'both'],
  [[[44, 46], [56, 50], [44, 56], [56, 60]], 5, 'both'],
  [[[50, 58], [50, 70], [46, 78]], 6, 'tail'],
  [[[40, 66], [60, 64]], 5, 'both'],
])

/** The yellow Taoist's Enfeeblement Mantra: a talisman strip. */
export function MantraToken({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Enfeeblement Mantra'} {...rest}>
      <path d="M28 4H72L74 94L62 88L50 96L38 88L26 94Z" fill="#f6ecd6" opacity={0.85} transform="translate(0 0) scale(1)" stroke="#f6ecd6" strokeWidth={6} strokeLinejoin="round" />
      <path d="M30 6H70L72 90L61 84L50 92L39 84L28 90Z" fill="url(#gs-talisman)" stroke="#8a6620" strokeWidth={3} strokeLinejoin="round" />
      <path d={TALISMAN_SCRIPT} fill={VERMILION} />
      <rect x={40} y={74} width={20} height={10} fill="none" stroke={VERMILION} strokeWidth={2.5} />
    </ArtSvg>
  )
}

/** Inactive power marker: a slate disc over a silenced power swirl. */
export function InactiveMarker({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Power inactive'} {...rest}>
      <circle cx={50} cy={50} r={47} fill="#f6ecd6" opacity={0.8} />
      <circle cx={50} cy={50} r={43} fill="#2c2621" stroke="#0e0b09" strokeWidth={4} />
      <path d={SWIRL_PATH} fill="#6c645b" />
      <path d={brush([[22, 22], [50, 50], [78, 78]], 12, 'none')} fill={VERMILION} />
    </ArtSvg>
  )
}

export function MoonCrystal({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Moon crystal'} {...rest}>
      <CrystalG />
    </ArtSvg>
  )
}

/** Inactive Tao marker: Tao tokens can't be spent. */
export function TaoBlockMarker({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Tao tokens blocked'} {...rest}>
      <rect x={3} y={3} width={94} height={94} rx={18} fill="#f6ecd6" opacity={0.8} />
      <rect x={7} y={7} width={86} height={86} rx={15} fill="#2c2621" stroke="#0e0b09" strokeWidth={4} />
      <CoinG color="yellow" x={16} y={16} s={68} outline={false} hole="#2c2621" />
      <path d="M50 16V84M16 50H84" stroke="#0e0b09" strokeOpacity={0.6} strokeWidth={4} />
      <path d={strokes([[[[18, 30], [50, 34], [82, 30]], 7, 'none'], [[[18, 70], [50, 66], [82, 70]], 7, 'none']])} fill="#8d847a" />
      <circle cx={50} cy={50} r={12} fill={COLOR_HEX.red} stroke="#0e0b09" strokeWidth={3} />
      <rect x={42} y={47} width={16} height={6} fill="#f6ecd6" />
    </ArtSvg>
  )
}
