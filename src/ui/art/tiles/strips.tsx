// The parchment action strip at the foot of each active tile (y 192–240): a
// small pictographic summary of the tile's action.
import type { ReactNode } from 'react'
import type { TileKind } from '@/game/types'
import { ring, strokes } from '../brush'
import {
  ArrowG,
  BuddhaG,
  CoinClusterG,
  CoinG,
  CrossG,
  CurseFaceG,
  GhostCardG,
  MonkG,
  NumG,
  QiG,
  TaoDieFaceG,
  TileG,
  WispG,
  place,
  type At,
} from '../glyphs'
import { INK, VERMILION } from '../palette'

const Y = 199 // top of a 34-unit icon row

/** A left-pointing arrow. */
function BackArrowG(at: At) {
  return (
    <g transform={place(at)}>
      <g transform="translate(100 0) scale(-1 1)">
        <ArrowG />
      </g>
    </g>
  )
}

/** An empty ghost space (dashed slot). */
function SlotG(at: At) {
  return (
    <g transform={place(at)}>
      <rect x={20} y={8} width={60} height={84} rx={6} fill="none" stroke={INK} strokeWidth={5} strokeDasharray="10 7" opacity={0.75} />
    </g>
  )
}

/** A Bloody Mantra card. */
const MANTRA_SCRIPT = strokes([
  [[[40, 26], [50, 24], [60, 26]], 6, 'tail'],
  [[[50, 24], [50, 40]], 6, 'tail'],
  [[[38, 46], [62, 44]], 6, 'both'],
  [[[44, 54], [56, 60], [44, 66]], 5, 'both'],
])
function MantraCardG({ ...at }: At) {
  return (
    <g transform={place(at)}>
      <rect x={20} y={6} width={60} height={88} rx={6} fill="#f6e7c4" stroke="#7a1d16" strokeWidth={6} />
      <path d={MANTRA_SCRIPT} fill={VERMILION} />
      <path d="M50 66C55 74 60 78 60 84A10 10 0 0 1 40 84C40 78 45 74 50 66Z" fill="#9c1f1a" />
    </g>
  )
}

/** A tombstone on its mound (a dead Taoist). */
function TombG(at: At) {
  return (
    <g transform={place(at)}>
      <ellipse cx={50} cy={88} rx={40} ry={9} fill="#8a7a58" />
      <path d="M26 88V40Q26 14 50 14Q74 14 74 40V88Z" fill="#b3ad9e" stroke={INK} strokeWidth={5} />
      <path d="M50 30V70M38 44H62" stroke={INK} strokeWidth={6} strokeLinecap="round" />
    </g>
  )
}

/** Two opposed arrows (swap). */
function SwapG(at: At) {
  return (
    <g transform={place(at)}>
      <ArrowG x={0} y={-14} s={100} />
      <BackArrowG x={0} y={14} s={100} />
    </g>
  )
}

const ENSO = ring(50, 50, 38, 11, -2.3, 5.7)
function CircleG(at: At) {
  return (
    <g transform={place(at)}>
      <path d={ENSO} fill={VERMILION} />
      <CoinG color="green" x={26} y={26} s={48} />
    </g>
  )
}

const STRIPS: Record<TileKind, () => ReactNode> = {
  circleOfPrayer: () => (
    <>
      <CoinClusterG x={46} y={Y + 2} s={30} />
      <ArrowG x={80} y={Y + 8} s={18} />
      <CircleG x={100} y={Y} s={34} />
      <GhostCardG x={144} y={Y} s={34} color="green" />
      <NumG text="−1" x={164} y={Y + 2} s={30} size={56} />
    </>
  ),
  buddhistTemple: () => (
    <>
      <NumG text="+1" x={74} y={Y} s={38} size={58} />
      <BuddhaG x={112} y={Y - 3} s={40} />
    </>
  ),
  cemetery: () => (
    <>
      <TombG x={36} y={Y} s={32} />
      <ArrowG x={66} y={Y + 8} s={18} />
      <MonkG color="red" x={82} y={Y} s={32} />
      <QiG x={112} y={Y + 6} s={22} />
      <QiG x={128} y={Y + 6} s={22} />
      <NumG text="+" x={148} y={Y + 6} s={20} size={70} />
      <CurseFaceG face="blank" x={170} y={Y + 2} s={30} />
    </>
  ),
  taoistAltar: () => (
    <>
      <TileG haunted x={52} y={Y + 2} s={30} />
      <ArrowG x={84} y={Y + 8} s={18} />
      <TileG x={104} y={Y + 2} s={30} />
      <NumG text="+" x={134} y={Y + 6} s={20} size={70} />
      <GhostCardG x={154} y={Y} s={34} />
    </>
  ),
  herbalistShop: () => (
    <>
      <TaoDieFaceG face="red" x={52} y={Y + 3} s={28} />
      <TaoDieFaceG face="white" x={82} y={Y + 3} s={28} />
      <ArrowG x={114} y={Y + 8} s={18} />
      <CoinG color="red" x={136} y={Y + 5} s={24} />
      <CoinClusterG x={162} y={Y + 4} s={26} />
    </>
  ),
  sorcerersHut: () => (
    <>
      <GhostCardG x={70} y={Y} s={34} />
      <CrossG x={72} y={Y + 2} s={30} />
      <NumG text="−1" x={106} y={Y + 2} s={30} size={56} />
      <QiG x={136} y={Y + 3} s={28} />
    </>
  ),
  nightWatchman: () => (
    <>
      <GhostCardG x={66} y={Y} s={34} />
      <BackArrowG x={100} y={Y + 8} s={18} />
      <WispG x={120} y={Y + 1} s={32} />
      <WispG x={146} y={Y + 5} s={24} />
    </>
  ),
  pavilion: () => (
    <>
      <GhostCardG x={40} y={Y} s={34} />
      <ArrowG x={72} y={Y + 8} s={18} />
      <SlotG x={88} y={Y} s={34} />
      <MonkG color="blue" x={134} y={Y} s={32} />
      <ArrowG x={164} y={Y + 8} s={18} />
      <TileG x={182} y={Y + 4} s={26} />
    </>
  ),
  teaHouse: () => (
    <>
      <CoinClusterG x={50} y={Y + 4} s={26} />
      <NumG text="+" x={74} y={Y + 6} s={20} size={70} />
      <QiG x={92} y={Y + 3} s={28} />
      <ArrowG x={122} y={Y + 8} s={18} />
      <GhostCardG x={140} y={Y} s={34} />
    </>
  ),
  kungFuSchool: () => (
    <>
      <TaoDieFaceG face="red" x={44} y={Y + 6} s={22} />
      <TaoDieFaceG face="blue" x={66} y={Y + 6} s={22} />
      <TaoDieFaceG face="white" x={88} y={Y + 6} s={22} />
      <ArrowG x={114} y={Y + 8} s={18} />
      <GhostCardG x={132} y={Y} s={34} color="red" />
      <GhostCardG x={152} y={Y} s={34} color="red" />
    </>
  ),
  calligrapher: () => (
    <>
      <MantraCardG x={44} y={Y} s={34} />
      <SwapG x={76} y={Y + 8} s={18} />
      <MantraCardG x={92} y={Y} s={34} />
      <path d="M134 202L128 230" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      <QiG x={138} y={Y + 6} s={22} />
      <ArrowG x={160} y={Y + 8} s={16} />
      <MantraCardG x={174} y={Y} s={34} />
    </>
  ),
}

export function StripIcons({ kind }: { kind: TileKind }) {
  const S = STRIPS[kind]
  return <S />
}
