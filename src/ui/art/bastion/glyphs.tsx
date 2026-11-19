// Last Bastion pictograms, each drawn in a 100×100 box and placed with
// {x, y, s} like the Ghost Stories glyphs (../glyphs.tsx). They are the shared
// vocabulary of the Bastion set: the tokens, dice, ability icons, Horde cards
// and the action strips of the Bastion tiles are all built from them.
//
// Every colour also carries a symbol (red flame, blue drop, green leaf,
// yellow sun, black skull), so Equipment tokens, die faces and resistance
// gems read without relying on colour alone.
import type { ReactNode } from 'react'
import type { Color, CurseFace, DieFace, TaoColor } from '@/game/types'
import { brush, strokes } from '../brush'
import { NumG, place, type At } from '../glyphs'
import { COLOR_DARK, COLOR_HEX } from '../palette'
import {
  CORRUPT_DEEP,
  CORRUPT_GLOW,
  CORRUPT_LIGHT,
  CRIMSON,
  CRIMSON_DARK,
  IRON_LIGHT,
  LB_GOLD_DEEP,
  LB_INK,
  PARCHMENT,
  STONE_DARK,
  VOID,
} from './palette'

export type { At }
export { place }

/** Pale halo drawn under a piece so it stands out on busy art. */
export const HALO = '#f3ead6'
/** Red of "can't" marks (prohibition slashes, struck-out powers). */
export const BAN = '#e8382c'

// ---------------------------------------------------------------------------
// Colour symbols.
// ---------------------------------------------------------------------------
const FLAME = 'M50 12C60 28 74 38 72 58C71 72 61 82 50 82C39 82 29 72 28 58C27 46 35 39 40 30C42 40 45 45 50 48C53 36 47 24 50 12Z'
const FLAME_CORE = 'M50 52C55 60 60 64 59 70C58 76 54 79 50 79C46 79 42 76 41 70C41 64 46 60 50 52Z'
const DROP = 'M50 12C59 30 73 44 73 60A23 23 0 0 1 27 60C27 44 41 30 50 12Z'
const LEAF = 'M24 76C22 46 42 24 78 22C80 56 58 78 24 76Z'
const LEAF_RIB = brush([[28, 72], [46, 54], [70, 30]], 4.5, 'tail')
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 - Math.PI / 2
  const c = Math.cos(a)
  const s = Math.sin(a)
  const p = (r: number, da: number) => `${(50 + Math.cos(a + da) * r).toFixed(1)} ${(50 + Math.sin(a + da) * r).toFixed(1)}`
  return `M${p(22, -0.22)}L${(50 + c * 38).toFixed(1)} ${(50 + s * 38).toFixed(1)}L${p(22, 0.22)}Z`
}).join('')
const SKULL = 'M50 16C33 16 22 28 22 44C22 54 27 61 34 65V76C34 79 36 81 39 81H61C64 81 66 79 66 76V65C73 61 78 54 78 44C78 28 67 16 50 16Z'
const SKULL_HOLES = 'M33 44a8 9 0 1 0 16 0a8 9 0 1 0 -16 0ZM51 44a8 9 0 1 0 16 0a8 9 0 1 0 -16 0ZM46 60L50 53L54 60Z'
const SKULL_TEETH = 'M42 68V80M50 68V80M58 68V80'

/** The symbol of a colour, in `fill` (holes punched in `hole` for the skull). */
export function ColorSymbolG({ color, fill = '#fff6e0', hole, ...at }: At & { color: TaoColor; fill?: string; hole?: string }) {
  let body: ReactNode
  switch (color) {
    case 'red':
      body = (
        <>
          <path d={FLAME} fill={fill} />
          <path d={FLAME_CORE} fill={hole ?? COLOR_DARK.red} opacity={0.55} />
        </>
      )
      break
    case 'blue':
      body = (
        <>
          <path d={DROP} fill={fill} />
          <path d="M38 62Q40 72 50 74" fill="none" stroke={hole ?? COLOR_DARK.blue} strokeOpacity={0.6} strokeWidth={5} strokeLinecap="round" />
        </>
      )
      break
    case 'green':
      body = (
        <>
          <path d={LEAF} fill={fill} />
          <path d={LEAF_RIB} fill={hole ?? COLOR_DARK.green} opacity={0.65} />
        </>
      )
      break
    case 'yellow':
      body = (
        <>
          <path d={SUN_RAYS} fill={fill} />
          <circle cx={50} cy={50} r={17} fill={fill} />
        </>
      )
      break
    case 'black':
      body = (
        <>
          <path d={SKULL} fill={fill} />
          <path d={SKULL_HOLES} fill={hole ?? '#141218'} />
          <path d={SKULL_TEETH} stroke={hole ?? '#141218'} strokeWidth={3} />
        </>
      )
      break
  }
  return <g transform={place(at)}>{body}</g>
}

/** Ink for a symbol on the enamel of `color` (dark on the light yellow). */
export function symbolInk(color: TaoColor): string {
  return color === 'yellow' ? '#5a3c0c' : color === 'black' ? '#d9d3c4' : '#fff6e0'
}

// ---------------------------------------------------------------------------
// Equipment token: an iron-rimmed enamel roundel with the colour's symbol.
// ---------------------------------------------------------------------------
const RIVETS = [45, 135, 225, 315].map((deg) => {
  const a = (deg * Math.PI) / 180
  return [50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40] as const
})

function EquipRim() {
  return (
    <>
      <circle cx={50} cy={50} r={45} fill="url(#lb-iron)" stroke={LB_INK} strokeWidth={3} />
      {RIVETS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.2} fill={IRON_LIGHT} stroke={LB_INK} strokeWidth={1} />
      ))}
    </>
  )
}

export function EquipG({ color, outline = true, ...at }: At & { color: TaoColor; outline?: boolean }) {
  return (
    <g transform={place(at)}>
      {outline && <circle cx={50} cy={50} r={48} fill={HALO} opacity={0.85} />}
      <EquipRim />
      <circle cx={50} cy={50} r={34} fill={`url(#lb-enamel-${color})`} stroke={color === 'black' ? '#000' : COLOR_DARK[color]} strokeWidth={2.5} />
      <ColorSymbolG color={color} fill={symbolInk(color)} x={24} y={24} s={52} />
      <path d="M26 38Q32 24 46 19" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={4} strokeLinecap="round" />
    </g>
  )
}

const QUARTERS: Array<[TaoColor, string]> = [
  ['red', 'M50 50L50 16A34 34 0 0 1 84 50Z'],
  ['green', 'M50 50L84 50A34 34 0 0 1 50 84Z'],
  ['yellow', 'M50 50L50 84A34 34 0 0 1 16 50Z'],
  ['blue', 'M50 50L16 50A34 34 0 0 1 50 16Z'],
]

/** "An Equipment token of any colour": the enamel quartered red / green / yellow / blue. */
export function AnyEquipG({ outline = true, ...at }: At & { outline?: boolean }) {
  return (
    <g transform={place(at)}>
      {outline && <circle cx={50} cy={50} r={48} fill={HALO} opacity={0.85} />}
      <EquipRim />
      {QUARTERS.map(([c, d]) => (
        <path key={c} d={d} fill={`url(#lb-enamel-${c})`} />
      ))}
      <circle cx={50} cy={50} r={34} fill="none" stroke={LB_INK} strokeWidth={2.5} />
      <path d="M50 16V84M16 50H84" stroke={LB_INK} strokeWidth={2} strokeOpacity={0.6} />
      <path d="M26 38Q32 24 46 19" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={4} strokeLinecap="round" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Life token: a heart-shaped ruby.
// ---------------------------------------------------------------------------
export const HEART = 'M50 86C30 72 10 57 10 36C10 21 21 12 33 12C41 12 47 17 50 24C53 17 59 12 67 12C79 12 90 21 90 36C90 57 70 72 50 86Z'

export function LifeG({ outline = true, cracked = false, ...at }: At & { outline?: boolean; cracked?: boolean }) {
  return (
    <g transform={place(at)}>
      {outline && <path d={HEART} fill={HALO} stroke={HALO} strokeWidth={8} strokeLinejoin="round" opacity={0.85} />}
      <path d={HEART} fill="url(#lb-heart)" stroke="#3a0608" strokeWidth={3.5} strokeLinejoin="round" />
      {/* facets */}
      <path d="M50 24L50 86M24 30L50 52L76 30M14 44L50 52L86 44" fill="none" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={2} />
      <path d="M22 30Q26 20 36 19" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={4.5} strokeLinecap="round" />
      {cracked && <path d="M50 24L44 40L54 50L46 64L52 80" fill="none" stroke="#1a0204" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Call to Arms token: a war horn on a crimson roundel.
// ---------------------------------------------------------------------------
const HORN = brush([[14, 74], [28, 76], [46, 68], [62, 52], [72, 30]], 34, 'head', { min: 0.2 })
const HORN_BANDS = 'M38 64L45 79M53 52L65 62'
const HORN_STRAP = 'M22 72Q40 92 64 62'

export function HornG({ spent = false, outline = true, ...at }: At & { spent?: boolean; outline?: boolean }) {
  const field = spent ? '#4a464f' : CRIMSON
  return (
    <g transform={place(at)}>
      {outline && <circle cx={50} cy={50} r={48} fill={HALO} opacity={0.85} />}
      <circle cx={50} cy={50} r={45} fill={spent ? '#8a8690' : 'url(#lb-gold)'} stroke={LB_INK} strokeWidth={3} />
      <circle cx={50} cy={50} r={37} fill={field} stroke={spent ? '#222' : CRIMSON_DARK} strokeWidth={2} />
      <g opacity={spent ? 0.6 : 1}>
        <path d={HORN_STRAP} fill="none" stroke={spent ? '#2a272e' : '#3a1d10'} strokeWidth={3} />
        <path d={HORN} fill={spent ? '#a39d92' : '#f3e6c4'} stroke={LB_INK} strokeWidth={2.6} strokeLinejoin="round" />
        <ellipse cx={73} cy={29} rx={10} ry={15} transform="rotate(34 73 29)" fill={spent ? '#3a3640' : '#3b1e12'} stroke={LB_INK} strokeWidth={2.6} />
        <path d={HORN_BANDS} stroke={spent ? '#6b665e' : LB_GOLD_DEEP} strokeWidth={4.5} strokeLinecap="round" />
      </g>
      {spent && <path d="M24 76L76 24" stroke="#1a171d" strokeWidth={7} strokeLinecap="round" opacity={0.7} />}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Grasp of Evil: a black claw rising out of a violet glow. The pale-violet
// rim keeps it readable on the dark UI, the glow on light tile art.
// ---------------------------------------------------------------------------
const CLAW_VEIN = '#6b2fa0'
const CLAW_WRIST = 'M35 99C35 88 36 80 39 72L61 72C64 80 65 88 65 99Z'
const CLAW_PALM = 'M29 74C26 62 30 51 39 46L61 46C70 51 74 62 71 74C63 81 37 81 29 74Z'
const CLAW_FINGERS = strokes([
  [[[33, 64], [21, 56], [13, 42], [17, 28]], 14, 'tail'],
  [[[40, 50], [33, 33], [33, 17], [41, 5]], 14, 'tail'],
  [[[56, 48], [61, 31], [62, 15], [55, 3]], 14, 'tail'],
  [[[66, 58], [78, 46], [86, 32], [82, 18]], 14, 'tail'],
])
const CLAW_VEINS = 'M40 94C40 84 41 78 44 74M56 76C59 80 60 88 60 94'
const CLAW_SHAPES = [CLAW_WRIST, CLAW_PALM, CLAW_FINGERS]

export function GraspG({ glow = true, ...at }: At & { glow?: boolean }) {
  return (
    <g transform={place(at)}>
      {glow && (
        <g className="lb-grasp-pulse">
          <ellipse cx={50} cy={50} rx={50} ry={52} fill="url(#lb-corrupt-glow)" />
        </g>
      )}
      {/* dark outer edge, then the pale-violet rim, then the claw */}
      <g fill={VOID} stroke={VOID} strokeWidth={12} strokeLinejoin="round">
        {CLAW_SHAPES.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill={CORRUPT_LIGHT} stroke={CORRUPT_LIGHT} strokeWidth={7} strokeLinejoin="round">
        {CLAW_SHAPES.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {CLAW_SHAPES.map((d, i) => (
        <path key={i} d={d} fill={VOID} />
      ))}
      <path d={CLAW_VEINS} fill="none" stroke={CLAW_VEIN} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={50} cy={63} rx={9} ry={6.5} fill="url(#lb-violet-eye)" />
      <ellipse cx={50} cy={63} rx={2.4} ry={4.2} fill={VOID} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Trap figure: closed iron jaws with interlocking teeth and side springs.
// ---------------------------------------------------------------------------
const TRAP_TEETH_TOP = Array.from({ length: 5 }, (_, i) => {
  const x = 17 + i * 13.2
  return `M${x} 40L${x + 6.6} 60L${x + 13.2} 40Z`
}).join('')
const TRAP_TEETH_BOTTOM = Array.from({ length: 4 }, (_, i) => {
  const x = 23.6 + i * 13.2
  return `M${x} 64L${x + 6.6} 44L${x + 13.2} 64Z`
}).join('')
const JAW_TOP = 'M12 42A38 32 0 0 1 88 42Z'
const JAW_BOTTOM = 'M12 62A38 28 0 0 0 88 62Z'

export function TrapG({ outline = true, ...at }: At & { outline?: boolean }) {
  return (
    <g transform={place(at)}>
      {outline && <ellipse cx={50} cy={51} rx={49} ry={44} fill={HALO} opacity={0.85} />}
      {/* side springs */}
      <rect x={1} y={44} width={16} height={16} rx={3} fill={IRON_LIGHT} stroke={LB_INK} strokeWidth={2.5} />
      <rect x={83} y={44} width={16} height={16} rx={3} fill={IRON_LIGHT} stroke={LB_INK} strokeWidth={2.5} />
      {/* the dark mouth between the jaws, the teeth interlocking across it */}
      <rect x={12} y={40} width={76} height={24} fill="#141218" />
      <path d={TRAP_TEETH_TOP} fill="#f4f6f8" stroke={LB_INK} strokeWidth={2} strokeLinejoin="round" />
      <path d={TRAP_TEETH_BOTTOM} fill="#f4f6f8" stroke={LB_INK} strokeWidth={2} strokeLinejoin="round" />
      <path d={JAW_TOP} fill={IRON_LIGHT} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
      <path d={JAW_BOTTOM} fill={IRON_LIGHT} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M24 26Q36 16 54 15" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={4} strokeLinecap="round" />
      <path d="M34 82H66" stroke="#2c2e34" strokeWidth={3} strokeLinecap="round" />
      <circle cx={12} cy={52} r={5} fill="#a9adb5" stroke={LB_INK} strokeWidth={2} />
      <circle cx={88} cy={52} r={5} fill="#a9adb5" stroke={LB_INK} strokeWidth={2} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Net figure: a knotted rope net with stone weights.
// ---------------------------------------------------------------------------
const NET_LINES = (() => {
  let d = ''
  for (let i = 0; i <= 4; i++) {
    const t = i / 4
    d += `M${18 + t * 64} 18Q${50 + (t - 0.5) * 30} 50 ${14 + t * 72} 84`
    d += `M18 ${18 + t * 66}Q50 ${30 + t * 50} 82 ${18 + t * 66}`
  }
  return d
})()

export function NetG({ outline = true, ...at }: At & { outline?: boolean }) {
  return (
    <g transform={place(at)}>
      {outline && <rect x={6} y={8} width={88} height={86} rx={16} fill={HALO} opacity={0.8} />}
      <path d={NET_LINES} fill="none" stroke="#3a2412" strokeWidth={7} strokeLinecap="round" />
      <path d={NET_LINES} fill="none" stroke="#d4ad6e" strokeWidth={3.6} strokeLinecap="round" />
      {[[16, 86], [50, 88], [84, 86]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={7} fill={STONE_DARK} stroke={LB_INK} strokeWidth={2} />
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Enchantment (Mylfaar): a glowing rune disc.
// ---------------------------------------------------------------------------
const RUNES = strokes([
  [[[50, 20], [50, 80]], 6, 'none'],
  [[[50, 33], [35, 22]], 5.5, 'none'],
  [[[50, 33], [65, 22]], 5.5, 'none'],
  [[[50, 60], [35, 72]], 5.5, 'none'],
  [[[50, 60], [65, 72]], 5.5, 'none'],
])
const RUNE_TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2
  const p = (r: number) => `${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`
  return `M${p(37)}L${p(42)}`
}).join('')

export function EnchantG({ outline = true, ...at }: At & { outline?: boolean }) {
  return (
    <g transform={place(at)}>
      {outline && <circle cx={50} cy={50} r={48} fill={HALO} opacity={0.75} />}
      <circle cx={50} cy={50} r={45} fill="#18264d" stroke={LB_INK} strokeWidth={3} />
      <circle cx={50} cy={50} r={44} fill="url(#lb-holy-glow)" opacity={0.3} />
      <path d={RUNE_TICKS} stroke="#9fd2ff" strokeWidth={3} strokeLinecap="round" />
      <circle cx={50} cy={50} r={33} fill="none" stroke="#9fd2ff" strokeWidth={2.5} />
      <path d={RUNES} fill="#9fd2ff" stroke="#9fd2ff" strokeWidth={5} opacity={0.45} />
      <path d={RUNES} fill="#f2f9ff" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Standard token: a pennant in a colour on a short pole.
// ---------------------------------------------------------------------------
export function StandardG({ color, outline = true, ...at }: At & { color: TaoColor; outline?: boolean }) {
  const flag = 'M28 14H84L72 34L84 54H28Z'
  return (
    <g transform={place(at)}>
      {outline && (
        <g fill={HALO} stroke={HALO} strokeWidth={8} strokeLinejoin="round" opacity={0.8}>
          <path d={flag} />
          <rect x={20} y={8} width={8} height={86} />
        </g>
      )}
      <rect x={20} y={8} width={8} height={86} rx={2} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={2} />
      <circle cx={24} cy={8} r={5} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={2} />
      <path d={flag} fill={`url(#lb-cloth-${color})`} stroke={LB_INK} strokeWidth={2.6} strokeLinejoin="round" />
      <ColorSymbolG color={color} fill={symbolInk(color)} x={36} y={18} s={32} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// A Bastion tile (a square of masonry with a tower) and a Horde card.
// ---------------------------------------------------------------------------
export const TOWER_PATH = 'M34 84V40H30V26H38V32H44V26H56V32H62V26H70V40H66V84Z'

export function TowerTileG({ grasp = false, ink = LB_INK, ...at }: At & { grasp?: boolean; ink?: string }) {
  return (
    <g transform={place(at)}>
      <rect x={8} y={8} width={84} height={84} rx={8} fill={grasp ? CORRUPT_DEEP : PARCHMENT} stroke={ink} strokeWidth={4} />
      <path d={TOWER_PATH} fill={grasp ? '#76599a' : STONE_DARK} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M45 84V70Q50 64 55 70V84Z" fill={grasp ? VOID : '#2a1a10'} />
      <rect x={46} y={46} width={8} height={10} rx={4} fill={grasp ? CORRUPT_GLOW : '#f3a13b'} />
      {grasp && <GraspG x={44} y={36} s={54} glow={false} />}
    </g>
  )
}

// Demon horns sweeping out from the temples, then up.
const CARD_HORNS = strokes([
  [[[44, 41], [37, 39.5], [32.5, 34], [32.5, 25]], 7, 'tail'],
  [[[56, 41], [63, 39.5], [67.5, 34], [67.5, 25]], 7, 'tail'],
])
const DIE_HORNS = strokes([
  [[[43, 53], [33, 49], [27, 41], [28, 27]], 9, 'tail'],
  [[[57, 53], [67, 49], [73, 41], [72, 27]], 9, 'tail'],
])

export function HordeCardG({ color, ink = LB_INK, ...at }: At & { color?: TaoColor; ink?: string }) {
  return (
    <g transform={place(at)}>
      <rect x={22} y={8} width={56} height={84} rx={7} fill={color ? `url(#lb-cloth-${color})` : STONE_DARK} stroke={ink} strokeWidth={4} />
      <rect x={30} y={18} width={40} height={40} rx={4} fill="#1b1720" stroke={ink} strokeWidth={2} />
      {/* horned head in the window */}
      <path d={CARD_HORNS} fill="#e2d8c4" />
      <path d="M38 57C38 45 42 37 50 37C58 37 62 45 62 57Z" fill="#5a5363" />
      <circle cx={45.5} cy={46} r={2.6} fill="#ffb13b" />
      <circle cx={54.5} cy={46} r={2.6} fill="#ffb13b" />
      {[34, 50, 66].map((x) => (
        <circle key={x} cx={x} cy={75} r={6} fill="#2a2630" stroke="#cfc6b4" strokeWidth={1.6} />
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Tiny hero (strips, ability icons): a helmed head and shoulders.
// ---------------------------------------------------------------------------
export function HeroG({ color, ...at }: At & { color: Color | 'grey' }) {
  const fill = color === 'grey' ? '#8a8690' : `url(#lb-cloth-${color})`
  const rim = color === 'grey' ? '#3a3640' : COLOR_DARK[color]
  return (
    <g transform={place(at)}>
      <path d="M18 94C18 70 30 60 50 60C70 60 82 70 82 94Z" fill={fill} stroke={rim} strokeWidth={4} strokeLinejoin="round" />
      <path d="M30 40C30 22 38 12 50 12C62 12 70 22 70 40V52H30Z" fill="url(#lb-steel)" stroke={LB_INK} strokeWidth={3.5} strokeLinejoin="round" />
      <path d="M36 36H64M50 24V52" stroke={LB_INK} strokeWidth={4} strokeLinecap="round" />
      <path d="M50 12C54 4 62 2 66 6" fill="none" stroke={CRIMSON} strokeWidth={6} strokeLinecap="round" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// The Warlord mark: a horned crown.
// ---------------------------------------------------------------------------
export function WarlordMarkG({ fill = 'url(#lb-gold)', ink = LB_INK, ...at }: At & { fill?: string; ink?: string }) {
  return (
    <g transform={place(at)}>
      <path d="M14 78L10 30L32 50L50 18L68 50L90 30L86 78Z" fill={fill} stroke={ink} strokeWidth={4} strokeLinejoin="round" />
      <path d="M14 78H86V88H14Z" fill={fill} stroke={ink} strokeWidth={4} strokeLinejoin="round" />
      <circle cx={50} cy={60} r={7} fill={CRIMSON} stroke={ink} strokeWidth={2.5} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Marks: padlock ("can't be used"), prohibition, arrows, numbers, the group.
// ---------------------------------------------------------------------------
/** An iron padlock. */
export function LockG(at: At) {
  return (
    <g transform={place(at)}>
      <path d="M30 46V32C30 18 39 10 50 10C61 10 70 18 70 32V46" fill="none" stroke={LB_INK} strokeWidth={15} strokeLinecap="round" />
      <path d="M30 46V32C30 18 39 10 50 10C61 10 70 18 70 32V46" fill="none" stroke={IRON_LIGHT} strokeWidth={8} strokeLinecap="round" />
      <rect x={18} y={42} width={64} height={50} rx={9} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={4} />
      <circle cx={50} cy={62} r={7} fill={LB_INK} />
      <path d="M50 64L50 80" stroke={LB_INK} strokeWidth={6} strokeLinecap="round" />
    </g>
  )
}

/** A red prohibition ring with a slash. */
export function NoG({ ring = true, ...at }: At & { ring?: boolean }) {
  return (
    <g transform={place(at)}>
      {ring && <circle cx={50} cy={50} r={40} fill="none" stroke={HALO} strokeWidth={15} opacity={0.8} />}
      {ring && <circle cx={50} cy={50} r={40} fill="none" stroke={BAN} strokeWidth={9} />}
      <path d="M22 78L78 22" stroke={HALO} strokeWidth={15} strokeLinecap="round" opacity={0.8} />
      <path d="M22 78L78 22" stroke={BAN} strokeWidth={9} strokeLinecap="round" />
    </g>
  )
}

/** A bold arrow pointing right (rotate with `deg`). */
export function ArrowG({ deg = 0, fill = LB_INK, halo = HALO, ...at }: At & { deg?: number; fill?: string; halo?: string }) {
  const d = 'M10 40H58V22L92 50L58 78V60H10Z'
  return (
    <g transform={place(at)}>
      <g transform={deg ? `rotate(${deg} 50 50)` : undefined}>
        <path d={d} fill={halo} stroke={halo} strokeWidth={10} strokeLinejoin="round" opacity={0.85} />
        <path d={d} fill={fill} />
      </g>
    </g>
  )
}

/** "−1", "+1", "2"…: bold numerals with a pale halo (centred in the box). */
export function NumberG({ text, fill = LB_INK, halo = HALO, size = 60, ...at }: At & { text: string; fill?: string; halo?: string; size?: number }) {
  return <NumG text={text} fill={fill} halo={halo} size={size} {...at} />
}

/** "The group": three heroes on a crimson shield. */
export function HeroesBadgeG(at: At) {
  return (
    <g transform={place(at)}>
      <path d="M8 10H92V48C92 72 72 88 50 96C28 88 8 72 8 48Z" fill={HALO} stroke={HALO} strokeWidth={6} strokeLinejoin="round" />
      <path d="M8 10H92V48C92 72 72 88 50 96C28 88 8 72 8 48Z" fill={CRIMSON} stroke={LB_GOLD_DEEP} strokeWidth={5} strokeLinejoin="round" />
      <g fill="#f6ecd6" stroke={CRIMSON_DARK} strokeWidth={3}>
        <circle cx={28} cy={36} r={8} />
        <path d="M18 76V56C18 50 22 46 28 46C34 46 38 50 38 56V76Z" />
        <circle cx={72} cy={36} r={8} />
        <path d="M62 76V56C62 50 66 46 72 46C78 46 82 50 82 56V76Z" />
        <circle cx={50} cy={30} r={9.5} />
        <path d="M37 86V50C37 43 42 39 50 39C58 39 63 43 63 50V86Z" />
      </g>
    </g>
  )
}

/** A hero-power medallion (a gold star on dark enamel): "the Hero power". */
export function MedallionG({ ...at }: At) {
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? 13 : 30
    return `${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`
  }).join('L')
  return (
    <g transform={place(at)}>
      <circle cx={50} cy={50} r={46} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={4} />
      <circle cx={50} cy={50} r={36} fill="#232838" stroke={LB_GOLD_DEEP} strokeWidth={2} />
      <path d={`M${star}Z`} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={2.5} strokeLinejoin="round" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Dice.
// ---------------------------------------------------------------------------
/** A Combat die face: bone die, an enamel roundel with the colour's symbol; white is wild. */
export function CombatFaceG({ face, grey = false, ...at }: At & { face: DieFace; grey?: boolean }) {
  return (
    <g transform={place(at)}>
      <rect x={5} y={5} width={90} height={90} rx={16} fill={grey ? 'url(#lb-piece-greydie)' : 'url(#lb-bone)'} stroke={LB_INK} strokeWidth={4} />
      <rect x={11} y={11} width={78} height={78} rx={11} fill="none" stroke="#fff" strokeOpacity={grey ? 0.3 : 0.55} strokeWidth={2} />
      {face === 'white' ? (
        <>
          <path d="M50 14L59 41L86 50L59 59L50 86L41 59L14 50L41 41Z" fill="#fffdf6" stroke="#6e6758" strokeWidth={3.5} strokeLinejoin="round" />
          <path d="M50 30L54 46L70 50L54 54L50 70L46 54L30 50L46 46Z" fill="url(#lb-gold)" />
          <circle cx={23} cy={23} r={6.5} fill={COLOR_HEX.red} stroke={LB_INK} strokeWidth={1.5} />
          <circle cx={77} cy={23} r={6.5} fill={COLOR_HEX.green} stroke={LB_INK} strokeWidth={1.5} />
          <circle cx={23} cy={77} r={6.5} fill={COLOR_HEX.blue} stroke={LB_INK} strokeWidth={1.5} />
          <circle cx={77} cy={77} r={6.5} fill={COLOR_HEX.yellow} stroke={LB_INK} strokeWidth={1.5} />
        </>
      ) : (
        <>
          <circle cx={50} cy={50} r={35} fill={`url(#lb-enamel-${face})`} stroke={face === 'black' ? '#000' : COLOR_DARK[face]} strokeWidth={3} />
          <ColorSymbolG color={face} fill={symbolInk(face)} x={24} y={24} s={52} />
        </>
      )}
    </g>
  )
}

/** The pale-violet symbol of a Corruption die face (no die body). */
export function CorruptionSymbolG({ face, fill = CORRUPT_LIGHT, ...at }: At & { face: CurseFace; fill?: string }) {
  let body: ReactNode = null
  switch (face) {
    case 'blank':
      body = (
        <>
          <circle cx={50} cy={50} r={14} fill="none" stroke={fill} strokeWidth={5} opacity={0.55} />
          <circle cx={50} cy={50} r={4} fill={fill} opacity={0.55} />
        </>
      )
      break
    case 'haunt':
      // A tower in the Grasp: a pale tower, a black claw closing over it.
      body = (
        <>
          <path d="M22 96V40H16V18H28V28H38V18H62V28H72V18H84V40H78V96Z" fill={fill} />
          <path d="M44 96V78Q50 70 56 78V96Z" fill={VOID} />
          <GraspG x={30} y={30} s={58} glow={false} />
        </>
      )
      break
    case 'ghost':
      // A Horde card: a pale card with a horned head.
      body = (
        <>
          <rect x={20} y={4} width={60} height={92} rx={8} fill={fill} />
          <path d={DIE_HORNS} fill={VOID} />
          <path d="M37 76C37 58 42 48 50 48C58 48 63 58 63 76Z" fill={VOID} />
          <path d="M43.5 70L45.5 79L47.5 70ZM52.5 70L54.5 79L56.5 70Z" fill={fill} />
          <circle cx={45} cy={60} r={3.4} fill={CORRUPT_GLOW} />
          <circle cx={55} cy={60} r={3.4} fill={CORRUPT_GLOW} />
          <path d="M30 88H70" stroke={VOID} strokeWidth={4} strokeLinecap="round" />
        </>
      )
      break
    case 'loseTao':
      // Every Equipment token lost: a stack of token rims, struck out.
      body = (
        <>
          {[18, 50, 82].map((x) => (
            <g key={x}>
              <circle cx={x} cy={50} r={15} fill={fill} />
              <circle cx={x} cy={50} r={6} fill={VOID} opacity={0.75} />
            </g>
          ))}
          <path d="M14 86L86 14" stroke="#1a1020" strokeWidth={16} strokeLinecap="round" />
          <path d="M14 86L86 14" stroke={BAN} strokeWidth={9} strokeLinecap="round" />
        </>
      )
      break
    case 'loseQi':
      body = <LifeG x={6} y={6} s={88} outline={false} cracked />
      break
  }
  return <g transform={place(at)}>{body}</g>
}

/** A Corruption die face: an obsidian die with a violet sheen. */
export function CorruptionFaceG({ face, ...at }: At & { face: CurseFace }) {
  return (
    <g transform={place(at)}>
      <rect x={5} y={5} width={90} height={90} rx={16} fill="url(#lb-obsidian)" stroke="#000" strokeWidth={4} />
      <rect x={11} y={11} width={78} height={78} rx={11} fill="none" stroke={CORRUPT_GLOW} strokeOpacity={0.45} strokeWidth={2.5} />
      <CorruptionSymbolG face={face} x={16} y={16} s={68} />
    </g>
  )
}
