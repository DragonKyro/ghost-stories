// Hero figures, one per player colour, each with its own silhouette so the
// four read apart at the 30–36 px they're drawn at on the Bastion tiles:
//   red    — a knight: plumed great helm, tabard, kite shield, longsword raised
//   blue   — a battle-mage: tall pointed hat, long robe, crystal staff, a spell in hand
//   green  — a ranger: pointed hood, tattered cloak, a drawn longbow, quiver
//   yellow — a dwarf: horned helm, braided beard, round shield, axe raised
// `lying` lays the figure flat (taken out), arms at rest and the weapon beside
// it; `wounded` adds bandages and a torn hem (healed once: the power is lost);
// `active` adds a warm golden halo. 100×100 box, standing on y ≈ 95.
import type { ReactElement } from 'react'
import type { Color } from '@/game/types'
import { ArtSvg } from '../ArtSvg'
import { brush } from '../brush'
import { COLOR_DARK, COLOR_LIGHT } from '../palette'
import type { TaoistFigureProps } from '../TaoistFigure'
import { ColorSymbolG, HALO, symbolInk } from './glyphs'
import { BRONZE, CRIMSON, LB_INK, LB_SKIN, LEATHER, STEEL_SHADE } from './palette'

export interface HeroFigureProps extends TaoistFigureProps {
  /** Healed once at the Dispensary: the Hero board shows its wounded side. */
  wounded?: boolean
}

const SKIN = LB_SKIN
const SKIN_EDGE = '#7a4e30'
const STEEL = 'url(#lb-steel)'
const GOLD = 'url(#lb-gold)'
const WOOD = 'url(#lb-piece-wood)'
const IVORY = '#efe3c6'
const LB_GOLD_FILL = '#e2b65a'

function Part({ d, fill, stroke = LB_INK, sw = 1.3, o }: { d: string; fill: string; stroke?: string; sw?: number; o?: number }) {
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" opacity={o} />
}
function Line({ d, stroke, sw = 1.2, o }: { d: string; stroke: string; sw?: number; o?: number }) {
  return <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={o} />
}
const cloth = (c: Color) => `url(#lb-cloth-${c})`

/** A straight band of width w from (x1, y1) to (x2, y2), as a closed path. */
function band(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const l = Math.hypot(x2 - x1, y2 - y1) || 1
  const px = (-(y2 - y1) / l) * (w / 2)
  const py = ((x2 - x1) / l) * (w / 2)
  const f = (n: number) => n.toFixed(1)
  return `M${f(x1 + px)} ${f(y1 + py)}L${f(x2 + px)} ${f(y2 + py)}L${f(x2 - px)} ${f(y2 - py)}L${f(x1 - px)} ${f(y1 - py)}Z`
}

interface Wound {
  /** Diagonal chest bandage (x1, y1, x2, y2) and where its stain sits. */
  chest: readonly [number, number, number, number]
  stain: readonly [number, number]
  /** A short wrap on a limb, standing / at rest. */
  wrap: readonly [number, number, number, number]
  wrapRest: readonly [number, number, number, number]
  /** The torn notch in the hem. */
  tear: string
}

interface Design {
  Figure: (p: { color: Color; rest: boolean }) => ReactElement
  /** Silhouette shapes for the pale halo: standing / at rest. */
  halo: { stand: readonly string[]; rest: readonly string[] }
  wound: Wound
}

// ===========================================================================
// Red — the knight.
// ===========================================================================
const KN = {
  plume: brush([[50, 8], [45, 2.5], [37, 1.5], [29, 5], [23, 12.5]], 9, 'tail'),
  helm: 'M40.5 11.5C40.5 7 44 4.8 48.5 4.8C53 4.8 56.5 7 56.5 11.5V25.5C56.5 27.3 55.3 28.4 53.5 28.4H43.5C41.7 28.4 40.5 27.3 40.5 25.5Z',
  visor: 'M42.2 15.4H54.8V18.8H42.2Z',
  helmRib: 'M48.5 5.4V15.4M48.5 18.8V28',
  gorget: 'M41.5 27.6H55.5L58.5 32.4H38.5Z',
  tabard: 'M39 31.5H58L60.8 55.5L63.8 80.5H52.2L48.5 74.5L44.8 80.5H33.2L36.2 55.5Z',
  belt: 'M36.6 52.4Q48.5 55 60.4 52.4L60.8 57.4Q48.5 60 36.2 57.4Z',
  legL: 'M38.4 79H45.8L45.2 91.6H38.6Z',
  legR: 'M51.2 79H58.6L58.4 91.6H51.8Z',
  footL: 'M37 90.8H46L46.6 96H31.6Q31.8 91.8 37 90.8Z',
  footR: 'M51 90.8H60Q65 91.8 65.4 96H50.4Z',
  pauldronL: 'M30.5 32C32 27.5 39 27 42 31C41.5 35.5 38 38 34.5 38.6C31.5 37.8 29.8 35.2 30.5 32Z',
  pauldronR: 'M66.5 32C65 27.5 58 27 55 31C55.5 35.5 59 38 62.5 38.6C65.5 37.8 67.2 35.2 66.5 32Z',
  shield: 'M15.5 37.5Q27 32.5 38.5 37.5V51.5Q38.5 68 27 80.5Q15.5 68 15.5 51.5Z',
  shieldInner: 'M18.8 39.8Q27 36.4 35.2 39.8V51.5Q35.2 65 27 75.6Q18.8 65 18.8 51.5Z',
  armR: 'M57 31C62.6 31 67 33.6 70.6 37.2L66.6 40.6C63.6 38.6 60 37.6 57.4 38Z',
  forearmR: 'M66.2 39.8L71.2 37.6L73 28.8L68.4 28.2Z',
  blade: 'M72.2 22.3L88 4.3L92 2.5L90.7 6.7L74.9 24.7Z',
  fuller: 'M74.6 22.4L88.4 6.4',
  guard: 'M69.8 20.2L77.3 26.8',
  // at rest
  armRestL: 'M31.4 35.6L37.6 35.8L37.2 54.4L31.8 54.2Z',
  armRestR: 'M65.6 35.6L59.4 35.8L59.8 54.4L65.2 54.2Z',
  swordRest: 'M20.4 35H23.6V84L22 90.5L20.4 84Z',
}

function Knight({ color, rest }: { color: Color; rest: boolean }) {
  const dark = COLOR_DARK[color]
  const shield = (
    <>
      <Part d={KN.shield} fill={STEEL} sw={1.6} />
      <Part d={KN.shieldInner} fill={cloth(color)} stroke={dark} sw={1} />
      <ColorSymbolG color={color} fill={symbolInk(color)} x={19.5} y={45} s={15} />
    </>
  )
  return (
    <g>
      <path d={KN.plume} fill={GOLD} stroke={LB_INK} strokeWidth={0.9} />
      {/* legs */}
      <Part d={KN.legL} fill={STEEL} />
      <Part d={KN.legR} fill={STEEL} />
      <Part d={KN.footL} fill={STEEL} />
      <Part d={KN.footR} fill={STEEL} />
      <Line d="M38.8 85.4H45.4M51.6 85.4H58.4" stroke={STEEL_SHADE} sw={1} />
      {/* body */}
      <Part d={KN.tabard} fill={cloth(color)} stroke={dark} sw={1.6} />
      <Line d="M39.6 60Q41 70 40.4 79M57.4 60Q56 70 56.6 79" stroke={dark} sw={1.1} o={0.6} />
      <Part d={KN.belt} fill={LEATHER} sw={1} />
      <rect x={46.4} y={54} width={4.2} height={4.4} rx={0.8} fill={GOLD} stroke={LB_INK} strokeWidth={0.7} />
      <ColorSymbolG color={color} fill={symbolInk(color)} x={42.5} y={35.5} s={12} />
      {rest ? (
        <>
          <Part d={KN.armRestL} fill={STEEL} />
          <Part d={KN.armRestR} fill={STEEL} />
          <circle cx={34.5} cy={56.4} r={3.2} fill={STEEL} stroke={LB_INK} strokeWidth={1} />
          <circle cx={62.5} cy={56.4} r={3.2} fill={STEEL} stroke={LB_INK} strokeWidth={1} />
          {/* sword laid alongside */}
          <Part d={KN.swordRest} fill={STEEL} sw={0.9} />
          <Line d="M16.6 34H27.4" stroke={LB_INK} sw={3} />
          <Line d="M16.6 34H27.4" stroke={LB_GOLD_FILL} sw={1.8} />
          <Line d="M22 33V26.6" stroke="#3a1a12" sw={2.6} />
          <circle cx={22} cy={25.6} r={1.8} fill={GOLD} stroke={LB_INK} strokeWidth={0.6} />
        </>
      ) : (
        <>
          <Part d={KN.armR} fill={STEEL} />
          <Part d={KN.forearmR} fill={STEEL} />
          <Line d="M69.4 26.4L73.6 23.4" stroke="#3a1a12" sw={2.6} />
          <Part d={KN.blade} fill={STEEL} sw={0.9} />
          <Line d={KN.fuller} stroke={STEEL_SHADE} sw={0.8} />
          <Line d={KN.guard} stroke={LB_INK} sw={3.2} />
          <Line d={KN.guard} stroke={LB_GOLD_FILL} sw={1.9} />
          <circle cx={70.8} cy={26.4} r={3.4} fill={STEEL} stroke={LB_INK} strokeWidth={1} />
          <circle cx={68.6} cy={29.4} r={1.8} fill={GOLD} stroke={LB_INK} strokeWidth={0.6} />
        </>
      )}
      <Part d={KN.pauldronR} fill={STEEL} />
      <Part d={KN.pauldronL} fill={STEEL} />
      {rest ? <g transform="translate(21.5 6)">{shield}</g> : shield}
      {/* head */}
      <Part d={KN.gorget} fill={STEEL} />
      <Part d={KN.helm} fill={STEEL} sw={1.4} />
      <path d={KN.visor} fill="#15131a" />
      <Line d={KN.helmRib} stroke={STEEL_SHADE} sw={1.2} />
      <circle cx={52} cy={22.4} r={0.8} fill="#15131a" />
      <circle cx={54} cy={22.4} r={0.8} fill="#15131a" />
    </g>
  )
}
const KNIGHT: Design = {
  Figure: Knight,
  halo: {
    stand: [KN.plume, KN.helm, KN.gorget, KN.tabard, KN.legL, KN.legR, KN.footL, KN.footR, KN.pauldronL, KN.pauldronR, KN.shield, KN.armR, KN.forearmR, KN.blade],
    rest: [KN.plume, KN.helm, KN.gorget, KN.tabard, KN.legL, KN.legR, KN.footL, KN.footR, KN.pauldronL, KN.pauldronR, KN.armRestL, KN.armRestR, KN.swordRest],
  },
  wound: {
    chest: [41, 33, 58.6, 51],
    stain: [53.4, 45.4],
    wrap: [38.4, 84, 7.4, 3.4],
    wrapRest: [38.4, 84, 7.4, 3.4],
    tear: 'M55.4 80.8L56.8 75.4L58.6 78.6L60.6 74.2L62.6 80.8Z',
  },
}

// ===========================================================================
// Blue — the battle-mage.
// ===========================================================================
const MG = {
  hat: 'M36.5 20.4Q43 11 48.8 4.6Q54 -0.6 62.8 0.6Q56.4 2.4 54.4 7.4L60.4 20.4Z',
  hatBand: 'M37.6 17.8Q48.5 15.8 59.4 17.8L60.4 20.4Q48.5 18.4 36.6 20.4Z',
  brim: 'M32.5 21a16 3.6 0 1 0 32 0a16 3.6 0 1 0 -32 0Z',
  beard: 'M43.8 28.2Q45.8 40 48.6 46.4Q51.2 40 53.2 28.2Q48.5 31.6 43.8 28.2Z',
  robe: 'M40.5 30.5H56.5Q61 32.5 61.8 40L67 94.2Q48.5 98.2 30 94.2L35.2 40Q36 32.5 40.5 30.5Z',
  mantle: 'M35 31.8Q48.5 26.6 62 31.8L63.4 41.4Q48.5 45 33.6 41.4Z',
  sash: 'M35.4 52.4Q48.5 55.8 61.6 52.4L61.8 56.2Q48.5 59.6 35.2 56.2Z',
  staff: brush([[73.5, 95.5], [72, 60], [70.4, 26], [69.6, 14]], 3.8, 'none'),
  crystal: 'M69.4 -0.6L73.8 7.6L69.4 15.6L65 7.6Z',
  sleeveR: 'M57 31.4Q66 33.6 70.8 41.4L72.6 49.6L65 50.4L60.6 40.6Z',
  sleeveL: 'M40 31.4Q31 32.4 25.4 38.2L21.6 45L28.6 47.6L35.6 40.8Z',
  // at rest
  sleeveRestL: 'M36.4 32.4Q32.4 40 31.6 54.4L39 55.2L40.4 38Z',
  sleeveRestR: 'M60.6 32.4Q64.6 40 65.4 54.4L58 55.2L56.6 38Z',
  staffRest: brush([[22, 96], [22, 50], [22, 14]], 3.8, 'none'),
}
const SPARKS = 'M11 22L12 25L15 26L12 27L11 30L10 27L7 26L10 25ZM25 24.4L25.7 26.3L27.6 27L25.7 27.7L25 29.6L24.3 27.7L22.4 27L24.3 26.3Z'

function Mage({ color, rest }: { color: Color; rest: boolean }) {
  const dark = COLOR_DARK[color]
  return (
    <g>
      {/* staff (behind the hand) */}
      {rest ? (
        <>
          <path d={MG.staffRest} fill={WOOD} stroke={LB_INK} strokeWidth={0.9} />
          <ellipse cx={22} cy={8} rx={9} ry={9} fill="url(#lb-piece-arcane)" />
          <g transform="translate(-47.4 0.4)">
            <Part d={MG.crystal} fill="#dff3ff" stroke="#1d4e8a" sw={1} />
          </g>
        </>
      ) : (
        <>
          <path d={MG.staff} fill={WOOD} stroke={LB_INK} strokeWidth={0.9} />
          <ellipse cx={69.4} cy={7.6} rx={11} ry={11} fill="url(#lb-piece-arcane)" />
          <Part d={MG.crystal} fill="#dff3ff" stroke="#1d4e8a" sw={1} />
          <Line d="M65.6 13Q69.4 18.6 73.2 13" stroke={LB_GOLD_FILL} sw={1.6} />
        </>
      )}
      {/* robe */}
      <Part d={MG.robe} fill={cloth(color)} stroke={dark} sw={1.6} />
      <Line d="M41 60Q38 76 36.4 92M56 60Q59 76 60.6 92" stroke={dark} sw={1.1} o={0.55} />
      <Line d="M48.5 44V96" stroke={LB_GOLD_FILL} sw={1.6} />
      <Line d="M30.8 92.6Q48.5 96.4 66.2 92.6" stroke={LB_GOLD_FILL} sw={1.8} />
      <Part d={MG.sash} fill="#e9d9a8" stroke={LB_INK} sw={0.8} />
      <Part d={MG.mantle} fill={dark} sw={1.1} />
      {rest ? (
        <>
          <Part d={MG.sleeveRestL} fill={cloth(color)} stroke={dark} sw={1.4} />
          <Part d={MG.sleeveRestR} fill={cloth(color)} stroke={dark} sw={1.4} />
          <circle cx={35.4} cy={56.6} r={2.8} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.8} />
          <circle cx={61.6} cy={56.6} r={2.8} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.8} />
        </>
      ) : (
        <>
          <Part d={MG.sleeveR} fill={cloth(color)} stroke={dark} sw={1.4} />
          <circle cx={70.8} cy={47.4} r={3} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.8} />
          <Part d={MG.sleeveL} fill={cloth(color)} stroke={dark} sw={1.4} />
          <circle cx={23.6} cy={41.6} r={3} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.8} />
          {/* the spell */}
          <ellipse cx={18} cy={32.6} rx={12} ry={12} fill="url(#lb-piece-arcane)" />
          <circle cx={18} cy={32.6} r={4.4} fill="#f4fbff" stroke="#5fb0ff" strokeWidth={1.3} />
          <path d={SPARKS} fill="#e8f6ff" />
        </>
      )}
      {/* head: face in the brim's shadow, a long beard, the hat */}
      <circle cx={48.5} cy={26.4} r={5.2} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.9} />
      <path d="M43.3 24.6Q48.5 22.6 53.7 24.6V22.6H43.3Z" fill="#000" opacity={0.35} />
      <circle cx={46.6} cy={26} r={0.8} fill="#1a1820" />
      <circle cx={50.4} cy={26} r={0.8} fill="#1a1820" />
      <Part d={MG.beard} fill="#ece7dc" stroke="#7f7a70" sw={0.9} />
      <Line d="M47 32Q48 38 48.6 42M50.4 32Q49.8 37 49.2 40" stroke="#a7a196" sw={0.7} />
      <Part d={MG.brim} fill={cloth(color)} stroke={dark} sw={1.3} />
      <Part d={MG.hat} fill={cloth(color)} stroke={dark} sw={1.4} />
      <Part d={MG.hatBand} fill={GOLD} sw={0.8} />
      <ColorSymbolG color={color} fill="#e8f6ff" x={44} y={8} s={9} />
    </g>
  )
}

const MAGE: Design = {
  Figure: Mage,
  halo: {
    stand: [MG.hat, MG.brim, MG.robe, MG.mantle, MG.sleeveR, MG.sleeveL, MG.staff, MG.crystal],
    rest: [MG.hat, MG.brim, MG.robe, MG.mantle, MG.sleeveRestL, MG.sleeveRestR, MG.staffRest],
  },
  wound: {
    chest: [37.6, 42, 60, 58],
    stain: [55.4, 54.6],
    wrap: [19.6, 43.6, 7, 3.2],
    wrapRest: [32, 50.4, 7, 3.2],
    tear: 'M57.6 95.2L59.4 89.4L61.4 92.8L63.4 88.2L65.6 94.4Z',
  },
}

// ===========================================================================
// Green — the ranger.
// ===========================================================================
const RG = {
  cloak: 'M37.4 27Q31 50 25.6 88.6L31.6 85.6L36 90.6L42 86.4L48.5 91.6L55 86.4L61 90.6L65.4 85.6L71.4 88.6Q66 50 59.6 27Z',
  hood: 'M38.2 27C36.6 17 40.6 8.6 46.4 5.6Q43.4 2.4 38.6 2.6Q44 0 49.6 3.6Q50.4 4 53.6 6.2C59 10.6 61 18.4 59.4 27C56.6 31 52.6 32 48.8 32C44.6 32 40.6 31 38.2 27Z',
  faceHole: 'M42.6 25C42.2 18.6 45 14 48.8 14C52.6 14 55.4 18.6 55 25C53.4 28.4 51.2 29.6 48.8 29.6C46.4 29.6 44.2 28.4 42.6 25Z',
  face: 'M44.2 21.8Q48.8 19.6 53.4 21.8L53 25.6Q51 28.6 48.8 28.6Q46.6 28.6 44.6 25.6Z',
  jerkin: 'M40.4 30.6H57.2L58.4 55H39.2Z',
  belt: 'M38.6 52.6Q48.8 55 59 52.6L59.4 57.4Q48.8 59.8 38.2 57.4Z',
  trousers: 'M42.6 56.6L55 56.6L59.4 91.6L54 92.4L48.8 70.6L43.6 92.4L38.2 91.6Z',
  bootL: 'M37.4 82.6H44.4L44.6 95.8H31.8Q32 91.6 37.2 90.6Z',
  bootR: 'M53.4 82.6H60.2L60.6 90.6Q65.6 91.6 65.8 95.8H53.6Z',
  quiver: 'M57.4 8.6L63.4 10.8L58.4 30.6L52.6 28.4Z',
  fletch: 'M56.8 9.6L58.4 2.8L60.2 10.2ZM60.2 10.8L63.2 4.6L63.4 11.8Z',
  bow: brush([[25.6, 14.6], [18.2, 28], [14.6, 47.6], [18.2, 67.2], [25.6, 80.6]], 5.4, 'both', { min: 0.35 }),
  armL: 'M40.6 31.4L37.4 38L19 50.2L16.4 45.4Z',
  armRUpper: 'M57 31.4Q62.4 34 63.6 42L59.6 44.6Q58 40 56 37.6Z',
  armRFore: 'M63.4 41.6L59.4 45.4L42.4 48.8L42.6 44.6Z',
  // at rest
  armRestL: 'M38.4 31.8Q35 40 34.6 54L40 54.6L41 37Z',
  armRestR: 'M59.2 31.8Q62.6 40 63 54L57.6 54.6L56.6 37Z',
  bowRest: brush([[22, 10], [17, 30], [15.6, 50], [17, 70], [22, 90]], 5.4, 'both', { min: 0.35 }),
}

function Ranger({ color, rest }: { color: Color; rest: boolean }) {
  const dark = COLOR_DARK[color]
  return (
    <g>
      {/* quiver on the back, cloak behind */}
      <Part d={RG.quiver} fill={LEATHER} sw={1} />
      <Line d="M58 9.6L56.2 18M61.2 10.8L59.6 17.6" stroke="#d8c8a2" sw={0.9} />
      <Part d={RG.fletch} fill="#f0e6d0" sw={0.8} />
      <Part d={RG.cloak} fill={cloth(color)} stroke={dark} sw={1.5} />
      <Line d="M34 50Q31 68 29.4 84M63 50Q66 68 67.6 84" stroke={dark} sw={1.1} o={0.6} />
      {/* legs */}
      <Part d={RG.trousers} fill="#3d4237" sw={1.1} />
      <Part d={RG.bootL} fill={LEATHER} sw={1.1} />
      <Part d={RG.bootR} fill={LEATHER} sw={1.1} />
      <Line d="M37.6 86.4H44.4M53.6 86.4H60.4" stroke="#2e1c10" sw={1} />
      {/* body */}
      <Part d={RG.jerkin} fill="#6e4a2a" sw={1.2} />
      <Line d="M48.8 32V52M46.6 36L51 38M46.6 41L51 43M46.6 46L51 48" stroke="#3a2412" sw={0.8} />
      <Part d={RG.belt} fill="#3a2412" sw={0.9} />
      <rect x={46.8} y={54} width={4} height={4.2} rx={0.8} fill={GOLD} stroke={LB_INK} strokeWidth={0.7} />
      {rest ? (
        <>
          <Part d={RG.armRestL} fill={cloth(color)} stroke={dark} sw={1.3} />
          <Part d={RG.armRestR} fill={cloth(color)} stroke={dark} sw={1.3} />
          <circle cx={37.2} cy={56.2} r={2.7} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.8} />
          <circle cx={60.4} cy={56.2} r={2.7} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.8} />
          <path d={RG.bowRest} fill={WOOD} stroke={LB_INK} strokeWidth={0.9} />
          <Line d="M22 10.4V89.6" stroke="#efe6cf" sw={0.9} />
        </>
      ) : (
        <>
          {/* the drawn longbow, arrow nocked */}
          <path d={RG.bow} fill={WOOD} stroke={LB_INK} strokeWidth={0.9} />
          <Line d="M25.2 14.8L42 46.8L25.2 80.4" stroke="#efe6cf" sw={1} />
          <Line d="M42 46.8H8" stroke="#5a3a1e" sw={1.7} />
          <path d="M3.2 46.8L9.4 43.4V50.2Z" fill={STEEL} stroke={LB_INK} strokeWidth={0.8} />
          <Line d="M42 46.8L45.2 43.6M42 46.8L45.2 50" stroke={CRIMSON} sw={2} />
          <Part d={RG.armL} fill={cloth(color)} stroke={dark} sw={1.3} />
          <path d="M23.6 43.4L27.6 49.6L21 52.6L18.6 48Z" fill={LEATHER} stroke={LB_INK} strokeWidth={0.8} />
          <circle cx={16.4} cy={47.8} r={3} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.8} />
          <Part d={RG.armRUpper} fill={cloth(color)} stroke={dark} sw={1.3} />
          <Part d={RG.armRFore} fill={LEATHER} sw={1} />
          <circle cx={42} cy={46.8} r={2.8} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.8} />
        </>
      )}
      {/* head: the pointed hood, the face in its shadow */}
      <Part d={RG.hood} fill={cloth(color)} stroke={dark} sw={1.5} />
      <path d={RG.faceHole} fill="#1c1915" />
      <path d={RG.face} fill={SKIN} />
      <path d="M44.2 21.8Q48.8 19.6 53.4 21.8V23.4Q48.8 21.4 44.2 23.4Z" fill="#000" opacity={0.35} />
      <Line d="M45.6 22.8L47.8 23.2M49.8 23.2L52 22.8" stroke="#1a1820" sw={1.1} />
      <ColorSymbolG color={color} fill="#f2ead4" x={44.2} y={28.4} s={9.2} />
    </g>
  )
}

const RANGER: Design = {
  Figure: Ranger,
  halo: {
    stand: [RG.cloak, RG.hood, RG.quiver, RG.trousers, RG.bootL, RG.bootR, RG.bow, RG.armL, RG.armRUpper, RG.armRFore],
    rest: [RG.cloak, RG.hood, RG.quiver, RG.trousers, RG.bootL, RG.bootR, RG.armRestL, RG.armRestR, RG.bowRest],
  },
  wound: {
    chest: [40.6, 33.4, 57.8, 51.4],
    stain: [52.6, 46],
    wrap: [27, 39.6, 3.4, 7],
    wrapRest: [34.6, 47, 6, 3.2],
    tear: 'M26.4 88.4L28.6 81.4L30.4 85.6L32.8 80.2L35.2 88Z',
  },
}

// ===========================================================================
// Yellow — the dwarf.
// ===========================================================================
const DW = {
  hornL: brush([[38.6, 31], [30.4, 25.4], [25, 17.6], [24.6, 8.6]], 8.4, 'tail'),
  hornR: brush([[58.4, 31], [66.6, 25.4], [72, 17.6], [72.4, 8.6]], 8.4, 'tail'),
  helm: 'M36.4 33.6C36.4 25.2 42 20.6 48.5 20.6C55 20.6 60.6 25.2 60.6 33.6Z',
  helmBand: 'M35.4 32.2H61.6V36.6H35.4Z',
  nasal: 'M47.4 36.2H49.6V42.4H47.4Z',
  face: 'M40.6 36.4H56.4V44.4H40.6Z',
  beard: 'M38.4 37.6C37.4 47 39.4 56.4 43.4 63.6L45.6 70.6L48.5 64.4L51.4 70.6L53.6 63.6C57.6 56.4 59.6 47 58.6 37.6C56 42.6 52.6 44.6 48.5 44.6C44.4 44.6 41 42.6 38.4 37.6Z',
  mustache: 'M42.2 44.2Q48.5 40.4 54.8 44.2Q51 47 48.5 45.6Q46 47 42.2 44.2Z',
  torso: 'M33.6 44.6Q48.5 40.4 63.4 44.6L66.2 74.6H30.8Z',
  belt: 'M31.4 66.4Q48.5 69.4 65.6 66.4L66 72.4Q48.5 75.4 31 72.4Z',
  trousers: 'M35.4 74H61.6L62.4 87H52.4L48.5 80.6L44.6 87H34.6Z',
  bootL: 'M33.6 85.4H45.2L45.8 96H28.4Q28.6 89.8 33.6 85.4Z',
  bootR: 'M51.8 85.4H63.4Q68.4 89.8 68.6 96H51.2Z',
  shield: 'M12 61a15.6 15.6 0 1 0 31.2 0a15.6 15.6 0 1 0 -31.2 0Z',
  shieldField: 'M15.2 61a12.4 12.4 0 1 0 24.8 0a12.4 12.4 0 1 0 -24.8 0Z',
  armUpper: 'M61.6 45C66.6 45.6 70.6 48.6 73 52.2L68.8 55.2C66.4 52.4 63.6 51 61.4 50.8Z',
  armFore: 'M68.6 54.6L73.4 52.2L75.6 41.4L71 40.6Z',
  haft: brush([[70.6, 51.4], [73.4, 38], [76.6, 16], [77.8, 6.8]], 3.4, 'none'),
  bladeL: 'M76.6 9.8Q68 5.6 64.4 13Q65.2 21.6 75.8 20.4Z',
  bladeR: 'M79.2 10.4Q88.2 7.6 91.4 15.6Q89.2 23.6 78.6 20.8Z',
  // at rest
  armRest: 'M62.4 45.6Q66.8 52 66.6 64.4L61 65L59.6 52Z',
  haftRest: brush([[82, 94], [82, 50], [82, 16]], 3.4, 'none'),
  bladeRestL: 'M80.8 14Q73 11 70 18.6Q71 26.6 80.6 25.6Z',
  bladeRestR: 'M83.2 14Q91 11 94 18.6Q93 26.6 83.4 25.6Z',
}
const SHIELD_RIVETS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.4
  return [27.6 + Math.cos(a) * 14, 61 + Math.sin(a) * 14] as const
})

function Dwarf({ color, rest }: { color: Color; rest: boolean }) {
  const dark = COLOR_DARK[color]
  return (
    <g>
      {/* horns behind the helm */}
      <path d={DW.hornL} fill={IVORY} stroke={LB_INK} strokeWidth={1.1} />
      <path d={DW.hornR} fill={IVORY} stroke={LB_INK} strokeWidth={1.1} />
      <Line d="M33 27.6L35.4 24.6M28.4 21.6L31.4 20" stroke="#a8977a" sw={0.9} />
      <Line d="M64 27.6L61.6 24.6M68.6 21.6L65.6 20" stroke="#a8977a" sw={0.9} />
      {/* axe (raised) */}
      {!rest && (
        <>
          <path d={DW.haft} fill={WOOD} stroke={LB_INK} strokeWidth={0.9} />
          <Part d={DW.bladeL} fill={STEEL} sw={1.1} />
          <Part d={DW.bladeR} fill={STEEL} sw={1.1} />
          <rect x={75.4} y={8.6} width={4.6} height={13} rx={1} fill="#3d4048" stroke={LB_INK} strokeWidth={0.8} transform="rotate(6 77.7 15)" />
        </>
      )}
      {rest && (
        <>
          <path d={DW.haftRest} fill={WOOD} stroke={LB_INK} strokeWidth={0.9} />
          <Part d={DW.bladeRestL} fill={STEEL} sw={1.1} />
          <Part d={DW.bladeRestR} fill={STEEL} sw={1.1} />
        </>
      )}
      {/* legs */}
      <Part d={DW.trousers} fill="#3d2a1e" sw={1.1} />
      <Part d={DW.bootL} fill={LEATHER} sw={1.2} />
      <Part d={DW.bootR} fill={LEATHER} sw={1.2} />
      <Line d="M33.4 89H45.6M51.6 89H63.6" stroke="#2e1c10" sw={1.1} />
      {/* body */}
      <Part d={DW.torso} fill={cloth(color)} stroke={dark} sw={1.6} />
      <Line d="M36 50Q34 62 33.4 72M61 50Q63 62 63.6 72" stroke={dark} sw={1.1} o={0.55} />
      <Part d={DW.belt} fill="#3a2412" sw={1} />
      <rect x={44.2} y={66.4} width={8.6} height={7.4} rx={1.4} fill={GOLD} stroke={LB_INK} strokeWidth={1} />
      <rect x={46.6} y={68.6} width={3.8} height={3} fill="#3a2412" />
      {rest ? (
        <>
          <Part d={DW.armRest} fill="#8d939c" sw={1.2} />
          <circle cx={63.8} cy={66.4} r={3.4} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.9} />
        </>
      ) : (
        <>
          <Part d={DW.armUpper} fill="#8d939c" sw={1.2} />
          <Part d={DW.armFore} fill={LEATHER} sw={1} />
          <circle cx={73.4} cy={38.8} r={3.4} fill={SKIN} stroke={SKIN_EDGE} strokeWidth={0.9} />
        </>
      )}
      {/* round shield on the left arm */}
      <Part d={DW.shield} fill="url(#lb-iron)" sw={1.4} />
      <Part d={DW.shieldField} fill={cloth(color)} stroke={dark} sw={1} />
      <ColorSymbolG color={color} fill={symbolInk(color)} x={18.6} y={52} s={18} />
      <circle cx={27.6} cy={61} r={3.6} fill={STEEL} stroke={LB_INK} strokeWidth={0.9} />
      {SHIELD_RIVETS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.9} fill="#c9ced6" />
      ))}
      {/* head: helm, face, the great braided beard */}
      <Part d={DW.face} fill={SKIN} stroke={SKIN_EDGE} sw={0.9} />
      <circle cx={48.5} cy={41.4} r={2.6} fill="#d9a27c" stroke={SKIN_EDGE} strokeWidth={0.7} />
      <circle cx={44.4} cy={39.2} r={0.9} fill="#1a1820" />
      <circle cx={52.6} cy={39.2} r={0.9} fill="#1a1820" />
      <Line d="M42.4 37.6L46 38.4M54.6 37.6L51 38.4" stroke="#5a2a12" sw={1.4} />
      <Part d={DW.beard} fill="url(#lb-piece-beard)" stroke="#4a1f0c" sw={1.1} />
      <Line d="M43 48Q44 56 46.4 62M48.5 47V62M54 48Q53 56 50.6 62" stroke="#5a2a12" sw={0.8} o={0.8} />
      <rect x={44} y={64.6} width={3.4} height={2.6} rx={0.6} fill={GOLD} stroke={LB_INK} strokeWidth={0.6} />
      <rect x={49.6} y={64.6} width={3.4} height={2.6} rx={0.6} fill={GOLD} stroke={LB_INK} strokeWidth={0.6} />
      <Part d={DW.mustache} fill="#8a3c1a" stroke="#4a1f0c" sw={0.8} />
      <Part d={DW.helm} fill={STEEL} sw={1.4} />
      <Part d={DW.helmBand} fill={BRONZE} sw={1} />
      {[40, 48.5, 57].map((x) => (
        <circle key={x} cx={x} cy={34.4} r={0.9} fill="#f3dc95" />
      ))}
      <Part d={DW.nasal} fill={STEEL} sw={0.8} />
    </g>
  )
}

const DWARF: Design = {
  Figure: Dwarf,
  halo: {
    stand: [DW.hornL, DW.hornR, DW.helm, DW.torso, DW.trousers, DW.bootL, DW.bootR, DW.shield, DW.armUpper, DW.armFore, DW.haft, DW.bladeL, DW.bladeR, DW.beard],
    rest: [DW.hornL, DW.hornR, DW.helm, DW.torso, DW.trousers, DW.bootL, DW.bootR, DW.shield, DW.armRest, DW.haftRest, DW.bladeRestL, DW.bladeRestR],
  },
  wound: {
    chest: [34.6, 47, 63.6, 62],
    stain: [60.2, 59.6],
    wrap: [68.6, 47.6, 3.4, 6],
    wrapRest: [60.4, 55, 6.4, 3.2],
    tear: 'M33 74.6L34.4 69.6L36.4 72.6L38.4 68.4L40.4 74.4Z',
  },
}

const DESIGNS: Record<Color, Design> = { red: KNIGHT, blue: MAGE, green: RANGER, yellow: DWARF }

// ===========================================================================

function WoundMarks({ w, rest }: { w: Wound; rest: boolean }) {
  const [x, y, ww, hh] = rest ? w.wrapRest : w.wrap
  return (
    <g>
      <path d={w.tear} fill="#1d1a1f" opacity={0.85} />
      <path d={band(...w.chest, 4.8)} fill="url(#lb-piece-bandage)" stroke="#6f675c" strokeWidth={0.8} strokeLinejoin="round" />
      <path d={band(w.chest[0], w.chest[1], w.chest[2], w.chest[3], 1)} fill="#b8ad99" opacity={0.6} />
      <circle cx={w.stain[0]} cy={w.stain[1]} r={2.1} fill="#b3201f" />
      <rect x={x} y={y} width={ww} height={hh} rx={1} fill="url(#lb-piece-bandage)" stroke="#6f675c" strokeWidth={0.7} />
    </g>
  )
}

function Hero({ color, rest, wounded }: { color: Color; rest: boolean; wounded: boolean }) {
  const d = DESIGNS[color]
  const { Figure } = d
  return (
    <g>
      {/* pale outline so the figure pops on busy tiles */}
      <g fill={HALO} stroke={HALO} strokeWidth={5} strokeLinejoin="round" opacity={0.75}>
        {(rest ? d.halo.rest : d.halo.stand).map((p, i) => (
          <path key={i} d={p} />
        ))}
      </g>
      <Figure color={color} rest={rest} />
      {wounded && <WoundMarks w={d.wound} rest={rest} />}
    </g>
  )
}

const LABEL: Record<Color, string> = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' }

export function HeroFigure({ color, size = 48, lying = false, active = false, wounded = false, title, ...rest }: HeroFigureProps) {
  const label = title ?? `${LABEL[color]} Hero${lying ? ' (taken out)' : wounded ? ' (wounded)' : ''}`
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={label} {...rest}>
      {active && (
        <g className="gs-pulse">
          <ellipse cx={50} cy={52} rx={50} ry={52} fill="url(#lb-torch-glow)" />
        </g>
      )}
      {active && <ellipse cx={48.5} cy={95} rx={30} ry={5} fill="none" stroke={COLOR_LIGHT[color]} strokeWidth={2.6} />}
      {lying ? (
        <>
          <ellipse cx={50} cy={84} rx={46} ry={7} fill={LB_INK} opacity={0.3} />
          <g transform="translate(0 4) rotate(-90 50 50)">
            <Hero color={color} rest wounded={wounded} />
          </g>
        </>
      ) : (
        <>
          <ellipse cx={48.5} cy={95.4} rx={27} ry={3.8} fill={LB_INK} opacity={0.32} />
          <Hero color={color} rest={false} wounded={wounded} />
        </>
      )}
    </ArtSvg>
  )
}
