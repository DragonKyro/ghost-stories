// Horde card effect pictograms, in Last Bastion terms (Life, Equipment, the
// Grasp of Evil, the Corruption die…). Drawn dark-on-light for the pale
// effect stones of the Horde cards; `plate` adds a stone disc for use alone.
import type { ReactNode } from 'react'
import type { AbilityKind } from '@/game/types'
import { ArtSvg } from '../ArtSvg'
import type { AbilityIconProps } from '../AbilityIcon'
import {
  AnyEquipG,
  ArrowG,
  CombatFaceG,
  EquipG,
  GraspG,
  HeroesBadgeG,
  HordeCardG,
  HornG,
  LifeG,
  LockG,
  MedallionG,
  NoG,
  NumberG,
  place,
  TowerTileG,
  type At,
} from './glyphs'
import { CORRUPT_GLOW, CORRUPT_LIGHT, LB_INK, VOID } from './palette'

export const BASTION_ABILITY_LABEL: Record<AbilityKind, string> = {
  addGhost: 'Another Horde card comes into play',
  hauntTile: 'The first Bastion tile in front falls into the Grasp of Evil',
  loseQi: 'Lose 1 Life token',
  haunterDirect: 'Its Grasp of Evil figure starts on the Horde board',
  haunter: 'Its Grasp of Evil figure advances toward the Bastion',
  tormentor: 'Roll the Corruption die each Horde phase',
  devourer: 'Devourer',
  powerBlocker: "Blocks this board's Hero power",
  taoBlocker: "Equipment tokens can't be used in Combat",
  dieCaptor: 'Locks a Combat die',
  diceImmune: 'Combat dice have no effect (Equipment only)',
  curse: 'Roll the Corruption die',
  loseTao: 'Lose 1 Equipment token',
  rewardQiOrYinYang: 'Gain 1 Life token or regain a Call to Arms',
  rewardTao1: 'Take 1 Equipment token',
  rewardTao2: 'Take 2 Equipment tokens',
  rewardCrystal: 'Take a crystal',
  incarnationReward: 'Warlord reward: 1 Life token and 1 Call to Arms',
}

/** A Corruption die marked with the Baleful Queen's eye: "roll the Corruption die". */
function CorruptionDieG({ ...at }: At) {
  return (
    <g transform={place(at)}>
      <rect x={3} y={3} width={94} height={94} rx={18} fill="#f3ead6" opacity={0.75} />
      <rect x={7} y={7} width={86} height={86} rx={15} fill="url(#lb-obsidian)" stroke="#000" strokeWidth={4} />
      <path d="M14 50Q50 14 86 50Q50 86 14 50Z" fill={CORRUPT_LIGHT} />
      <circle cx={50} cy={50} r={17} fill={CORRUPT_GLOW} />
      <ellipse cx={50} cy={50} rx={6} ry={13} fill={VOID} />
      <circle cx={44} cy={44} r={3.4} fill="#fff" opacity={0.8} />
    </g>
  )
}

/** The cycle mark: "every Horde phase". */
const CYCLE = 'M78 20A30 30 0 1 1 30 22'

function body(kind: AbilityKind): ReactNode {
  switch (kind) {
    case 'addGhost':
      return (
        <>
          <HordeCardG x={-2} y={4} s={92} />
          <NumberG text="+" x={50} y={-6} s={56} size={70} />
        </>
      )
    case 'hauntTile':
      return <TowerTileG grasp x={0} y={0} s={100} />
    case 'loseQi':
      return (
        <>
          <NumberG text="−1" x={-8} y={2} s={62} size={58} />
          <LifeG x={36} y={28} s={64} />
        </>
      )
    case 'haunterDirect':
      return (
        <>
          <HordeCardG x={-8} y={36} s={60} />
          <ArrowG x={24} y={8} s={36} deg={-35} />
          <GraspG x={42} y={14} s={62} />
        </>
      )
    case 'haunter':
      return (
        <>
          <GraspG x={2} y={10} s={84} />
          <ArrowG x={54} y={-2} s={46} deg={-90} />
        </>
      )
    case 'tormentor':
      return (
        <>
          <path d={CYCLE} fill="none" stroke="#f3ead6" strokeWidth={13} strokeLinecap="round" />
          <path d={CYCLE} fill="none" stroke={LB_INK} strokeWidth={6} strokeLinecap="round" />
          <path d="M84 8L82 30L62 24Z" fill={LB_INK} />
          <g transform="rotate(-16 50 54)">
            <CorruptionDieG x={22} y={26} s={58} />
          </g>
        </>
      )
    case 'devourer':
      return (
        <>
          <path d="M50 10C28 10 16 26 16 46C16 58 22 66 30 70V84C30 88 33 90 36 90H64C67 90 70 88 70 84V70C78 66 84 58 84 46C84 26 72 10 50 10Z" fill="#ece4d2" stroke={LB_INK} strokeWidth={4} />
          <path d="M28 46a10 11 0 1 0 20 0a10 11 0 1 0 -20 0ZM52 46a10 11 0 1 0 20 0a10 11 0 1 0 -20 0ZM45 66L50 58L55 66Z" fill={LB_INK} />
        </>
      )
    case 'powerBlocker':
      return (
        <>
          <MedallionG x={8} y={8} s={84} />
          <NoG x={2} y={2} s={96} />
        </>
      )
    case 'taoBlocker':
      return (
        <>
          <EquipG color="red" x={0} y={4} s={52} />
          <EquipG color="blue" x={44} y={0} s={52} />
          <LockG x={22} y={34} s={62} />
        </>
      )
    case 'dieCaptor':
      return (
        <>
          <CombatFaceG face="red" x={2} y={4} s={74} />
          <LockG x={48} y={42} s={54} />
        </>
      )
    case 'diceImmune':
      return (
        <>
          <CombatFaceG face="white" x={12} y={12} s={76} />
          <NoG x={0} y={0} s={100} />
        </>
      )
    case 'curse':
      return <CorruptionDieG x={6} y={6} s={88} />
    case 'loseTao':
      return (
        <>
          <NumberG text="−1" x={-8} y={2} s={62} size={58} />
          <AnyEquipG x={38} y={30} s={62} />
        </>
      )
    case 'rewardQiOrYinYang':
      return (
        <>
          <LifeG x={0} y={2} s={56} />
          <path d="M70 12L30 88" stroke="#f3ead6" strokeWidth={12} strokeLinecap="round" />
          <path d="M70 12L30 88" stroke={LB_INK} strokeWidth={6} strokeLinecap="round" />
          <HornG x={44} y={44} s={56} />
        </>
      )
    case 'rewardTao1':
    case 'rewardTao2':
      return (
        <>
          <AnyEquipG x={4} y={4} s={92} />
          <NumberG text={kind === 'rewardTao1' ? '1' : '2'} x={0} y={2} s={100} size={58} fill="#fbf6ea" halo={LB_INK} />
        </>
      )
    case 'rewardCrystal':
      return (
        <>
          <path d="M50 6L80 36L50 94L20 36Z" fill="#e8f4ff" stroke={LB_INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M20 36H80M50 6L38 36L50 94L62 36Z" fill="none" stroke="#7aa8d6" strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 'incarnationReward':
      return (
        <>
          <LifeG x={0} y={8} s={52} />
          <NumberG text="+" x={22} y={14} s={50} size={70} />
          <HornG x={44} y={4} s={52} />
        </>
      )
  }
}

/** Draws an effect pictogram into a 100-box, for embedding in other art. */
export function BastionAbilityGlyph({ kind, group, plate = false, ...at }: At & { kind: AbilityKind; group?: boolean; plate?: boolean }) {
  const showGroup = group || kind === 'incarnationReward'
  return (
    <g transform={place(at)}>
      {plate && (
        <>
          <circle cx={50} cy={50} r={48} fill="url(#lb-iron)" stroke={LB_INK} strokeWidth={3} />
          <circle cx={50} cy={50} r={42} fill="url(#lb-piece-stone)" />
        </>
      )}
      <g transform={plate ? 'translate(15 15) scale(0.7)' : undefined}>{body(kind)}</g>
      {showGroup && <HeroesBadgeG x={plate ? 62 : 60} y={plate ? 60 : 58} s={plate ? 38 : 42} />}
    </g>
  )
}

export function BastionAbilityIcon({ kind, group, size = 32, plate = true, title, ...rest }: AbilityIconProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? BASTION_ABILITY_LABEL[kind] + (group ? ' (every board)' : '')} {...rest}>
      <BastionAbilityGlyph kind={kind} group={group} plate={plate} />
    </ArtSvg>
  )
}
