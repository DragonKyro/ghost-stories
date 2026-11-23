// The action strip at the foot of each Bastion tile (y 196–233): a small
// pictographic summary of what the tile does, built from the Bastion glyphs.
import type { ReactNode } from 'react'
import type { TileKind } from '@/game/types'
import { ArrowG, CrossG, NumG } from '../../glyphs'
import { CombatFaceG, EquipG, GraspG, HeroG, HordeCardG, HornG, LifeG, NetG, place, StandardG, TowerTileG, TrapG, WarlordMarkG, type At } from '../glyphs'
import { LB_INK } from '../palette'
import { STRIP_Y as Y } from './kit'

const HALO = '#f3e8cf'

function Arrow(at: At) {
  return <ArrowG fill={LB_INK} {...at} />
}
function BackArrow(at: At) {
  return (
    <g transform={place(at)}>
      <g transform="translate(100 0) scale(-1 1)">
        <ArrowG fill={LB_INK} />
      </g>
    </g>
  )
}
function Num({ text, ...at }: At & { text: string }) {
  return <NumG text={text} fill={LB_INK} halo={HALO} size={58} {...at} />
}

/** An empty Horde space (dashed slot). */
function SlotG(at: At) {
  return (
    <g transform={place(at)}>
      <rect x={22} y={8} width={56} height={84} rx={7} fill="none" stroke={LB_INK} strokeWidth={5} strokeDasharray="10 7" opacity={0.75} />
    </g>
  )
}

/** "Not Warlords": the Warlord crown, struck through. */
function NoWarlordG(at: At) {
  return (
    <g transform={place(at)}>
      <circle cx={50} cy={50} r={44} fill={HALO} stroke="#8c1d17" strokeWidth={7} />
      <WarlordMarkG x={20} y={18} s={60} />
      <path d="M20 80L80 20" stroke="#8c1d17" strokeWidth={9} strokeLinecap="round" />
    </g>
  )
}

/** Two opposed arrows (swap). */
function SwapG(at: At) {
  return (
    <g transform={place(at)}>
      <ArrowG fill={LB_INK} x={0} y={-16} s={100} />
      <BackArrow x={0} y={16} s={100} />
    </g>
  )
}

/** Four small Equipment tokens: one of any colour. */
function EquipClusterG(at: At) {
  return (
    <g transform={place(at)}>
      <EquipG color="red" x={0} y={0} s={52} />
      <EquipG color="green" x={48} y={0} s={52} />
      <EquipG color="blue" x={0} y={48} s={52} />
      <EquipG color="yellow" x={48} y={48} s={52} />
    </g>
  )
}

/** A boot with a speed line: one movement. */
function BootG(at: At) {
  return (
    <g transform={place(at)}>
      <path d="M36 14H64V58L86 66Q94 70 92 80V86H30L32 58Z" fill="#6b4528" stroke={LB_INK} strokeWidth={5} strokeLinejoin="round" />
      <path d="M30 78H92" stroke={LB_INK} strokeWidth={5} />
      <path d="M36 24H64" stroke="#e2b65a" strokeWidth={5} />
      <path d="M6 34H24M2 50H22M8 66H24" stroke={LB_INK} strokeWidth={5} strokeLinecap="round" />
    </g>
  )
}

/** A thin "or" divider. */
function OrG(at: At) {
  return (
    <g transform={place(at)}>
      <path d="M62 8L38 92" stroke={LB_INK} strokeWidth={6} strokeLinecap="round" opacity={0.7} />
    </g>
  )
}

const STRIPS: Partial<Record<TileKind, () => ReactNode>> = {
  // Standard token of a colour → that colour's Horde cards −1.
  circleOfPrayer: () => (
    <>
      <StandardG color="green" x={58} y={Y} s={34} />
      <Arrow x={92} y={Y + 8} s={18} />
      <HordeCardG color="green" x={110} y={Y} s={34} />
      <Num text="−1" x={140} y={Y + 2} s={30} />
    </>
  ),
  // Trap → an empty space of your Horde board (not Warlords).
  buddhistTemple: () => (
    <>
      <TrapG x={50} y={Y} s={34} />
      <Arrow x={86} y={Y + 8} s={18} />
      <SlotG x={104} y={Y} s={34} />
      <NoWarlordG x={160} y={Y + 5} s={24} />
    </>
  ),
  // 1 Equipment → a Hero, or heal a taken-out Hero (3 Life + Call to Arms).
  cemetery: () => (
    <>
      <EquipClusterG x={40} y={Y + 5} s={25} />
      <Arrow x={66} y={Y + 8} s={16} />
      <HeroG color="red" x={82} y={Y + 1} s={30} />
      <OrG x={110} y={Y + 2} s={30} />
      <HeroG color="grey" x={138} y={Y + 1} s={30} />
      <Arrow x={164} y={Y + 8} s={16} />
      <LifeG x={180} y={Y + 2} s={17} />
      <Num text="3" x={192} y={Y - 1} s={20} />
      <HornG x={182} y={Y + 17} s={16} />
    </>
  ),
  // Net → a Monster card: its abilities are cancelled (not Warlords).
  taoistAltar: () => (
    <>
      <NetG x={52} y={Y + 1} s={32} />
      <Arrow x={86} y={Y + 8} s={18} />
      <HordeCardG x={104} y={Y} s={34} />
      <NetG x={110} y={Y + 9} s={22} outline={false} />
      <NoWarlordG x={160} y={Y + 5} s={24} />
    </>
  ),
  // 2 Combat dice → the matching Equipment (white: any colour).
  herbalistShop: () => (
    <>
      <CombatFaceG face="red" x={46} y={Y + 3} s={28} />
      <CombatFaceG face="white" x={76} y={Y + 3} s={28} />
      <Arrow x={108} y={Y + 8} s={18} />
      <EquipG color="red" x={130} y={Y + 4} s={26} />
      <EquipClusterG x={160} y={Y + 4} s={26} />
    </>
  ),
  // −1 Life → eliminate a Monster (no exit effect; not Warlords).
  sorcerersHut: () => (
    <>
      <Num text="−1" x={40} y={Y + 2} s={30} />
      <LifeG x={68} y={Y + 4} s={26} />
      <Arrow x={98} y={Y + 8} s={18} />
      <HordeCardG x={116} y={Y} s={34} />
      <CrossG x={118} y={Y + 2} s={30} />
      <NoWarlordG x={160} y={Y + 5} s={24} />
    </>
  ),
  // Remove up to 2 Grasp of Evil figures (from tiles or Horde cards).
  nightWatchman: () => (
    <>
      <TowerTileG x={44} y={Y + 2} s={30} />
      <OrG x={70} y={Y + 4} s={26} />
      <HordeCardG x={88} y={Y} s={34} />
      <BackArrow x={120} y={Y + 8} s={18} />
      <GraspG x={140} y={Y} s={32} glow={false} />
      <GraspG x={164} y={Y + 4} s={26} glow={false} />
      <Num text="2" x={186} y={Y + 4} s={22} />
    </>
  ),
  // Move a Horde card to a free space, or swap two.
  pavilion: () => (
    <>
      <HordeCardG x={34} y={Y} s={34} />
      <Arrow x={64} y={Y + 8} s={16} />
      <SlotG x={78} y={Y} s={34} />
      <OrG x={108} y={Y + 2} s={30} />
      <HordeCardG color="red" x={134} y={Y} s={34} />
      <SwapG x={164} y={Y + 8} s={18} />
      <HordeCardG color="blue" x={180} y={Y} s={34} />
    </>
  ),
  // A Hero gains 1 Life and 1 movement.
  teaHouse: () => (
    <>
      <HeroG color="red" x={50} y={Y + 1} s={32} />
      <Num text="+" x={82} y={Y + 5} s={22} />
      <LifeG x={104} y={Y + 4} s={26} />
      <Num text="+" x={130} y={Y + 5} s={22} />
      <BootG x={152} y={Y + 2} s={30} />
    </>
  ),
}

export function StripIcons({ kind }: { kind: TileKind }) {
  const S = STRIPS[kind]
  return S ? <S /> : null
}
