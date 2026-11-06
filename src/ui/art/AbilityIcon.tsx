// Ghost ability pictograms, after the icon legend of the rules summary.
import type { ReactNode } from 'react'
import type { AbilityKind } from '@/game/types'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { brush } from './brush'
import {
  CoinClusterG,
  CoinG,
  CrossG,
  CrystalG,
  GhostCardG,
  GroupBadgeG,
  GuiG,
  HauntTileG,
  MawG,
  NumG,
  PadlockG,
  PowerStoneG,
  QiG,
  ShieldG,
  TaoDieFaceG,
  WispG,
  YinYangG,
  type At,
  place,
} from './glyphs'
import { VERMILION } from './palette'

export const ABILITY_LABEL: Record<AbilityKind, string> = {
  addGhost: 'Bring a ghost into play',
  hauntTile: 'Haunt the tile in front',
  loseQi: 'Lose 1 Qi',
  haunterDirect: 'Haunting figure starts on the board',
  haunter: 'Haunter',
  tormentor: 'Tormentor: roll the curse die',
  devourer: 'Devourer: kills a villager',
  powerBlocker: "Blocks this board's power",
  taoBlocker: 'Tao tokens cannot be spent',
  dieCaptor: 'Holds a Tao die captive',
  diceImmune: 'Tao dice have no effect',
  curse: 'Roll the curse die',
  loseTao: 'Lose 1 Tao token',
  rewardQiOrYinYang: 'Gain 1 Qi or regain Yin-Yang',
  rewardTao1: 'Take 1 Tao token',
  rewardTao2: 'Take 2 Tao tokens',
  rewardCrystal: 'Take a moon crystal',
  incarnationReward: '1 Qi and 1 Yin-Yang to the group',
}

// A curse die tumbling mid-roll (tormentor).
function TumblingDieG(at: At) {
  return (
    <g transform={place(at)}>
      <path d="M50 8L88 28V72L50 94L12 72V28Z" fill="none" stroke="#f6ecd6" strokeOpacity={0.8} strokeWidth={7} strokeLinejoin="round" />
      <path d="M50 8L88 28L50 48L12 28Z" fill="#5a5048" stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      <path d="M12 28L50 48V94L12 72Z" fill="#2a221d" stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      <path d="M50 48L88 28V72L50 94Z" fill="#15100d" stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      <g transform="matrix(0.38 0.2 0 0.46 12 28)">
        <GuiG fill="#ece2cb" x={12} y={10} s={78} />
      </g>
      <circle cx={50} cy={28} r={5} fill="#ece2cb" opacity={0.7} />
    </g>
  )
}

// A flat curse die face with 鬼 ("roll the curse die").
function CurseDieG(at: At) {
  return (
    <g transform={place(at)}>
      <rect x={5} y={5} width={90} height={90} rx={16} fill="#f6ecd6" fillOpacity={0.8} />
      <rect x={9} y={9} width={82} height={82} rx={13} fill="url(#gs-ebony)" stroke="#000" strokeWidth={3} />
      <GuiG fill="#ece2cb" x={18} y={16} s={66} />
    </g>
  )
}

const SLASH = brush([[14, 14], [50, 50], [86, 86]], 6, 'both')

function body(kind: AbilityKind): ReactNode {
  switch (kind) {
    case 'addGhost':
      return <GhostCardG x={2} y={2} s={96} />
    case 'hauntTile':
      return <HauntTileG x={2} y={2} s={98} />
    case 'loseQi':
      return (
        <>
          <NumG text="−1" x={-8} y={4} s={64} size={56} />
          <QiG x={42} y={18} s={60} />
        </>
      )
    case 'haunterDirect':
      return (
        <>
          <rect x={10} y={42} width={40} height={54} rx={5} fill="#f6eedb" stroke="#1d1712" strokeWidth={5} />
          <path d="M22 70Q30 54 38 70" fill="none" stroke="#1d1712" strokeWidth={4} />
          <path d={brush([[30, 44], [34, 28], [48, 18]], 9, 'head', { min: 0.3 })} fill={VERMILION} />
          <path d="M44 6L62 16L44 28Z" fill={VERMILION} />
          <WispG x={46} y={30} s={56} />
        </>
      )
    case 'haunter':
      return <WispG x={4} y={2} s={94} />
    case 'tormentor':
      return (
        <>
          <TumblingDieG x={12} y={8} s={80} />
          <path d={brush([[10, 30], [6, 50], [12, 72]], 6, 'both')} fill="#1d1712" />
          <path d={brush([[90, 72], [94, 50], [88, 28]], 6, 'both')} fill="#1d1712" />
        </>
      )
    case 'devourer':
      return <MawG x={2} y={2} s={96} />
    case 'powerBlocker':
      return (
        <>
          <PowerStoneG x={4} y={4} s={92} />
          <CrossG x={8} y={8} s={84} />
        </>
      )
    case 'taoBlocker':
      return (
        <>
          <CoinG color="red" x={0} y={2} s={46} />
          <CoinG color="blue" x={54} y={2} s={46} />
          <CoinG color="green" x={27} y={-4} s={46} />
          <PadlockG x={16} y={26} s={70} />
        </>
      )
    case 'dieCaptor':
      return (
        <>
          <NumG text="−1" x={-8} y={4} s={64} size={56} />
          <TaoDieFaceG face="red" x={40} y={22} s={60} />
        </>
      )
    case 'diceImmune':
      return <ShieldG x={4} y={2} s={94} />
    case 'curse':
      return <CurseDieG x={4} y={4} s={92} />
    case 'loseTao':
      return (
        <>
          <NumG text="−1" x={-8} y={4} s={64} size={56} />
          <CoinClusterG x={40} y={20} s={62} center="black" />
        </>
      )
    case 'rewardQiOrYinYang':
      return (
        <>
          <YinYangG x={48} y={0} s={52} />
          <path d={SLASH} fill="#1d1712" />
          <QiG x={0} y={46} s={54} />
        </>
      )
    case 'rewardTao1':
    case 'rewardTao2':
      return (
        <>
          <CoinClusterG x={2} y={2} s={96} />
          <NumG text={kind === 'rewardTao1' ? '1' : '2'} x={0} y={2} s={100} size={58} fill="#fbf6ea" halo="#1d1712" />
        </>
      )
    case 'rewardCrystal':
      return <CrystalG x={6} y={2} s={90} />
    case 'incarnationReward':
      return (
        <>
          <QiG x={0} y={20} s={50} />
          <NumG text="+" x={24} y={20} s={50} size={70} fill={VERMILION} />
          <YinYangG x={50} y={22} s={48} />
        </>
      )
  }
}

export interface AbilityIconProps extends ArtBaseProps {
  kind: AbilityKind
  /** Adds the "group" mark: the ability hits every player and board. */
  group?: boolean
  size?: number
  /** Draw a pale stone disc behind the pictogram (default true). Ghost cards turn this off. */
  plate?: boolean
}

/** Draws an ability pictogram into a 100-box, for embedding in other art. */
export function AbilityGlyph({ kind, group, plate = false, ...at }: At & { kind: AbilityKind; group?: boolean; plate?: boolean }) {
  const showGroup = group || kind === 'incarnationReward'
  return (
    <g transform={place(at)}>
      {plate && <circle cx={50} cy={50} r={48} fill="url(#gs-stone-pale)" stroke="#4a3d2e" strokeWidth={3} />}
      <g transform={plate ? 'translate(13 13) scale(0.74)' : undefined}>{body(kind)}</g>
      {showGroup && <GroupBadgeG x={plate ? 62 : 60} y={plate ? 62 : 60} s={plate ? 38 : 42} />}
    </g>
  )
}

export function AbilityIcon({ kind, group, size = 32, plate = true, title, ...rest }: AbilityIconProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? ABILITY_LABEL[kind] + (group ? ' (the group)' : '')} {...rest}>
      <AbilityGlyph kind={kind} group={group} plate={plate} />
    </ArtSvg>
  )
}
