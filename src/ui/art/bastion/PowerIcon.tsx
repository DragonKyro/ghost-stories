// The eight Hero powers of Last Bastion, as pictograms on a dark enamel
// medallion with a gold bezel, ringed in the colour of the board that carries
// the power. Each pictures what the power does in Last Bastion.
import type { ReactNode } from 'react'
import { BASTION_POWER_NAME } from '@/game/rules'
import type { PowerId } from '@/game/types'
import { arcPts, brush, strokes, type Pt } from '../brush'
import { ArtSvg } from '../ArtSvg'
import { COLOR_DARK, COLOR_HEX } from '../palette'
import { POWER_COLOR, type PowerIconProps } from '../PowerIcon'
import { AnyEquipG, BAN, CombatFaceG, EnchantG, GraspG, NumberG, TOWER_PATH } from './glyphs'
import { HOLY, LB_GOLD, LB_GOLD_LIGHT, LB_INK, LEATHER, STEEL, WOOD_DARK } from './palette'

const pathOf = (pts: readonly Pt[]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')

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
  const h = w * 2
  const tip: Pt = [end[0] + ux * h, end[1] + uy * h]
  const l: Pt = [end[0] - uy * h * 0.95, end[1] + ux * h * 0.95]
  const rr: Pt = [end[0] + uy * h * 0.95, end[1] - ux * h * 0.95]
  return brush(pts, w, 'none') + pathOf([l, tip, rr]) + 'Z'
}

// ---- Twindalli: arrows loosed both ways from a tile ----------------------------
const BOLT_L = 'M6 50L22 38V45H38V55H22V62Z'
const BOLT_R = 'M94 50L78 38V45H62V55H78V62Z'

// ---- Elmer & Chestnut: a winged boot -----------------------------------------------
const BOOT = 'M40 20H62V58C62 62 66 64 72 66C80 68 86 72 86 80V84H34Q30 84 30 78L36 58Z'
const BOOT_CUFF = 'M38 20H64V30H38Z'
const BOOT_SOLE = 'M30 84H86V90H30Z'
const WING = strokes([
  [[[40, 32], [26, 26], [10, 26]], 9, 'tail'],
  [[[40, 40], [26, 38], [12, 40]], 8, 'tail'],
  [[[40, 48], [28, 50], [16, 54]], 7, 'tail'],
])

// ---- Sindara: a tower and a sword ------------------------------------------------
const SWORD_BLADE = 'M66 12L72 6L78 12V60H66Z'
const SWORD_GUARD = 'M56 60H88V67H56Z'
const SWORD_GRIP = 'M68.5 67H75.5V82H68.5Z'

// ---- Teagaan: a radiant hand driving off the claw -------------------------------
const PALM =
  'M36 92V66C30 60 26 52 26 44C26 40 31 39 33 43L38 52V22C38 18 44 18 44 22V46H46V14C46 10 52 10 52 14V46H54V18C54 14 60 14 60 18V48H62V28C62 24 68 24 68 28V62C68 74 62 84 60 92Z'
const RAYS = Array.from({ length: 9 }, (_, i) => {
  const a = Math.PI * (1.02 + (i / 8) * 0.96)
  const p = (r: number, da = 0): string => `${(50 + Math.cos(a + da) * r).toFixed(1)} ${(58 + Math.sin(a + da) * r).toFixed(1)}`
  return `M${p(30, -0.06)}L${p(46)}L${p(30, 0.06)}Z`
}).join('')

// The claw breaking apart in the light.
const SHARDS = 'M58 52L63 47L64 54ZM90 50L96 46L94 54ZM92 88L98 92L91 94Z'

// ---- Feng-Li: a reroll arrow around a die, a lucky star --------------------------
const REROLL = arcArrow(50, 52, 37, Math.PI * -0.3, Math.PI * 1.3, 6.5)
const STAR = (cx: number, cy: number, r: number): string =>
  'M' +
  Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const k = i % 2 ? r * 0.42 : r
    return `${(cx + Math.cos(a) * k).toFixed(1)} ${(cy + Math.sin(a) * k).toFixed(1)}`
  }).join('L') +
  'Z'

// ---- Kazgin: a mountain behind a grey die ----------------------------------------
const MOUNTAIN = 'M2 82L30 26L44 46L56 30L92 82Z'
const SNOW = 'M30 26L38 42L33 39L28 44L23 40Z' + 'M56 30L63 42L58 40L54 44L50 40Z'

// ---- Arne & Soko: a satchel spilling a token -------------------------------------
const BAG = 'M18 46Q18 40 26 40H74Q82 40 82 46L86 86Q86 92 78 92H22Q14 92 14 86Z'
const FLAP = 'M18 44Q50 36 82 44L80 64Q50 72 20 64Z'
const STRAP = 'M24 44Q24 14 50 12Q76 14 76 44'

function body(power: PowerId): ReactNode {
  switch (power) {
    case 'danceOfTheSpires':
      return (
        <>
          <rect x={36} y={36} width={28} height={28} rx={4} fill="#e9dfc8" stroke={LB_INK} strokeWidth={3} />
          <path d={TOWER_PATH} transform="translate(36 36) scale(0.28)" fill="#3a3e48" />
          <path d={BOLT_L} fill={LB_GOLD} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <path d={BOLT_R} fill={LB_GOLD} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 'danceOfTheTwinWinds':
      return (
        <>
          <path d={WING} fill="#f4f0e6" stroke={LB_INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d={BOOT} fill={LEATHER} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <path d={BOOT_CUFF} fill="#8a5a32" stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <path d={BOOT_SOLE} fill={WOOD_DARK} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <path d="M56 60Q66 64 74 70" fill="none" stroke="#8a5a32" strokeWidth={3} strokeLinecap="round" />
          <NumberG text="+1" x={50} y={-4} s={50} size={60} fill={LB_GOLD_LIGHT} halo={LB_INK} />
        </>
      )
    case 'heavenlyGust':
      return (
        <>
          <path d={TOWER_PATH} transform="translate(-14 0) scale(0.9 1)" fill="#b9bec7" stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <path d="M28 84V70Q32.4 64 36.8 70V84Z" fill="#2a1a10" />
          <rect x={29.4} y={44} width={6} height={9} rx={3} fill="#f3a13b" />
          <path d={SWORD_BLADE} fill={STEEL} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <path d="M72 12V58" stroke="#8d97a3" strokeWidth={2} />
          <path d={SWORD_GUARD} fill={LB_GOLD} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <path d={SWORD_GRIP} fill="#5a2a18" stroke={LB_INK} strokeWidth={2.5} />
          <circle cx={72} cy={87} r={5.5} fill={LB_GOLD} stroke={LB_INK} strokeWidth={2.5} />
          <NumberG text="+" x={34} y={4} s={34} size={60} fill={LB_GOLD_LIGHT} halo={LB_INK} />
        </>
      )
    case 'secondWind':
      return (
        <>
          <path d={RAYS} fill={HOLY} opacity={0.9} />
          <GraspG x={60} y={52} s={40} glow={false} />
          <path d={SHARDS} fill="#e0b5ff" />
          <path d={PALM} fill="#f6e6cc" stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" transform="translate(-6 0)" />
        </>
      )
    case 'godsFavorite':
      return (
        <>
          <path d={REROLL} fill={LB_GOLD} stroke={LB_INK} strokeWidth={2.2} strokeLinejoin="round" />
          <CombatFaceG face="white" x={26} y={28} s={48} />
          <path d={STAR(78, 20, 15)} fill={LB_GOLD_LIGHT} stroke={LB_INK} strokeWidth={2.5} strokeLinejoin="round" />
        </>
      )
    case 'strengthOfMountain':
      return (
        <>
          <path d={MOUNTAIN} fill="#6e737d" stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <path d={SNOW} fill="#f4f6f8" />
          <CombatFaceG face="white" grey x={40} y={42} s={52} />
          <NumberG text="+1" x={-6} y={46} s={52} size={60} fill={LB_GOLD_LIGHT} halo={LB_INK} />
        </>
      )
    case 'bottomlessPockets':
      return (
        <>
          <path d={STRAP} fill="none" stroke={LB_INK} strokeWidth={9} />
          <path d={STRAP} fill="none" stroke="#8a5a32" strokeWidth={5} />
          <path d={BAG} fill={LEATHER} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <path d={FLAP} fill="#7a4e2c" stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
          <rect x={44} y={58} width={12} height={12} rx={2} fill={LB_GOLD} stroke={LB_INK} strokeWidth={2.5} />
          <AnyEquipG x={30} y={66} s={40} />
        </>
      )
    case 'enfeeblementMantra':
      return (
        <>
          <EnchantG x={4} y={8} s={70} />
          <NumberG text="−1" x={46} y={48} s={54} size={60} fill={LB_GOLD_LIGHT} halo={LB_INK} />
        </>
      )
  }
}

export function HeroPowerIcon({ power, size = 40, inactive = false, title, ...rest }: PowerIconProps) {
  const color = POWER_COLOR[power]
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? BASTION_POWER_NAME[power]} {...rest}>
      <g opacity={inactive ? 0.42 : 1}>
        <circle cx={50} cy={50} r={49} fill={COLOR_HEX[color]} stroke={LB_INK} strokeWidth={2.5} />
        <circle cx={50} cy={50} r={43} fill="url(#lb-gold)" stroke={COLOR_DARK[color]} strokeWidth={2} />
        <circle cx={50} cy={50} r={39} fill="url(#lb-piece-field)" stroke={LB_INK} strokeWidth={2} />
        <g transform="translate(14 14) scale(0.72)">{body(power)}</g>
      </g>
      {inactive && (
        <>
          <path d="M16 16L84 84" stroke="#f3ead6" strokeWidth={15} strokeLinecap="round" opacity={0.85} />
          <path d="M16 16L84 84" stroke={BAN} strokeWidth={9} strokeLinecap="round" />
        </>
      )}
    </ArtSvg>
  )
}

