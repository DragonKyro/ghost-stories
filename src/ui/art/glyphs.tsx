// Small reusable pictograms, each drawn in a 100×100 box and placed with
// {x, y, s} (top-left corner and box size, in the parent's units). These are
// the building blocks of AbilityIcon, the dice, the tokens and the action
// strips on the village tiles.
import type { ReactNode } from 'react'
import type { Color, CurseFace, DieFace, TaoColor } from '@/game/types'
import { brush, ring, strokes, type Pt } from './brush'
import { COLOR_DARK, COLOR_HEX, GOLD_DEEP, INK, VERMILION } from './palette'

export interface At {
  x?: number
  y?: number
  /** Size of the 100×100 box in parent units. */
  s?: number
}

export function place({ x = 0, y = 0, s = 100 }: At): string {
  return `translate(${x} ${y}) scale(${s / 100})`
}

/** Wraps children (drawn in a 100-box) at a placement. */
export function Box({ at, children, opacity }: { at: At; children: ReactNode; opacity?: number }) {
  return (
    <g transform={place(at)} opacity={opacity}>
      {children}
    </g>
  )
}

// ---------------------------------------------------------------------------
// 鬼 (gui, "ghost") — brushed by hand so it never depends on a CJK font.
// ---------------------------------------------------------------------------
export const GUI_PATH = strokes([
  [[[55, 4], [50, 11], [44, 18]], 10, 'tail'],
  [[[27, 23], [28, 40], [29, 58]], 9, 'tail'],
  [[[27, 23], [50, 21], [75, 19]], 8, 'none'],
  [[[74, 19], [73, 38], [71, 58]], 9, 'tail'],
  [[[50, 22], [50, 40], [50, 56]], 6.5, 'none'],
  [[[30, 39], [50, 38], [71, 37]], 6.5, 'none'],
  [[[30, 56], [50, 55], [71, 54]], 7, 'none'],
  [[[41, 58], [37, 72], [27, 85], [10, 95]], 11, 'tail'],
  [[[57, 58], [57, 72], [59, 84], [68, 90], [84, 90], [94, 80]], 10, 'tail'],
  [[[75, 60], [70, 68], [64, 76]], 6.5, 'tail'],
  [[[64, 76], [73, 75], [83, 72]], 6, 'tail'],
  [[[79, 63], [82, 67], [85, 72]], 6.5, 'head'],
])

export function GuiG({ fill = INK, ...at }: At & { fill?: string }) {
  return <path transform={place(at)} d={GUI_PATH} fill={fill} />
}

// ---------------------------------------------------------------------------
// Tao coin: round cash coin with a square hole.
// ---------------------------------------------------------------------------
export function CoinG({ color, hole = '#241a12', outline = true, ...at }: At & { color: TaoColor; hole?: string; outline?: boolean }) {
  const rim = color === 'black' ? '#000' : COLOR_DARK[color]
  return (
    <g transform={place(at)}>
      {outline && <circle cx={50} cy={50} r={47} fill="#f6ecd6" opacity={0.85} />}
      <circle cx={50} cy={50} r={44} fill={`url(#gs-coin-${color})`} stroke={rim} strokeWidth={4} />
      <circle cx={50} cy={50} r={33} fill="none" stroke={color === 'black' ? '#8d847a' : '#fff'} strokeOpacity={0.35} strokeWidth={3} />
      <rect x={38} y={38} width={24} height={24} rx={2} fill={hole} stroke={rim} strokeWidth={3} />
      <path d="M22 36 Q30 20 46 16" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={5} strokeLinecap="round" />
    </g>
  )
}

/** Four coins in quadrants (red, green / blue, yellow) — "Tao of your choice". */
export function CoinClusterG({ center, ...at }: At & { center?: TaoColor }) {
  return (
    <g transform={place(at)}>
      <CoinG color="red" x={2} y={2} s={50} />
      <CoinG color="green" x={48} y={2} s={50} />
      <CoinG color="blue" x={2} y={48} s={50} />
      <CoinG color="yellow" x={48} y={48} s={50} />
      {center && <CoinG color={center} x={27} y={27} s={46} />}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Qi: a drop of life energy.
// ---------------------------------------------------------------------------
const QI_DROP = 'M50 4C58 22 84 40 84 63A34 33 0 0 1 16 63C16 40 42 22 50 4Z'
const QI_SWIRL = brush([[56, 76], [42, 74], [38, 62], [48, 54], [58, 60], [54, 68]], 7, 'head')

export function QiG({ outline = true, ...at }: At & { outline?: boolean }) {
  return (
    <g transform={place(at)}>
      {outline && <path d={QI_DROP} fill="none" stroke="#f6ecd6" strokeOpacity={0.85} strokeWidth={7} strokeLinejoin="round" />}
      <path d={QI_DROP} fill="url(#gs-qi)" stroke="#7a1410" strokeWidth={3.5} strokeLinejoin="round" />
      <path d={QI_SWIRL} fill="#fff" fillOpacity={0.85} />
      <ellipse cx={36} cy={46} rx={5} ry={9} fill="#fff" fillOpacity={0.45} transform="rotate(25 36 46)" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Yin-Yang.
// ---------------------------------------------------------------------------
export function YinYangG({ spent = false, ...at }: At & { spent?: boolean }) {
  const dark = spent ? '#6f6860' : '#16110d'
  const light = spent ? '#b9b2a6' : '#fbf6ea'
  return (
    <g transform={place(at)} opacity={spent ? 0.75 : 1}>
      <circle cx={50} cy={50} r={47} fill={spent ? '#7b7266' : 'url(#gs-gold)'} />
      <circle cx={50} cy={50} r={41} fill={light} />
      <path d="M50 9A41 41 0 0 1 50 91A20.5 20.5 0 0 1 50 50A20.5 20.5 0 0 0 50 9Z" fill={dark} />
      <circle cx={50} cy={29.5} r={6.5} fill={dark} />
      <circle cx={50} cy={70.5} r={6.5} fill={light} />
      {spent && <path d="M18 82L82 18" stroke="#3b332c" strokeWidth={6} strokeLinecap="round" opacity={0.8} />}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Ghost hand reaching upward.
// ---------------------------------------------------------------------------
export const HAND_PATH =
  brush([[50, 100], [49, 84], [50, 66]], 24, 'head', { min: 0.2 }) +
  'M36 62C34 50 42 44 52 44C62 44 66 52 64 62C62 70 40 72 36 62Z' +
  strokes([
    [[[40, 52], [34, 36], [30, 22], [33, 10]], 8, 'tail'],
    [[[48, 48], [47, 30], [49, 14], [54, 4]], 8, 'tail'],
    [[[56, 49], [60, 32], [65, 18], [71, 12]], 8, 'tail'],
    [[[62, 56], [70, 46], [77, 38], [83, 36]], 7, 'tail'],
    [[[39, 62], [29, 56], [21, 46], [19, 38]], 7, 'tail'],
  ])

export function HandG({ fill = INK, ...at }: At & { fill?: string }) {
  return <path transform={place(at)} d={HAND_PATH} fill={fill} />
}

// ---------------------------------------------------------------------------
// Village tile pictogram (a little house on a square tile).
// ---------------------------------------------------------------------------
const ROOF = brush([[14, 44], [26, 40], [50, 28], [74, 40], [86, 44]], 9, 'belly', { min: 0.35 })

export function TileG({ haunted = false, ink = INK, ...at }: At & { haunted?: boolean; ink?: string }) {
  return (
    <g transform={place(at)}>
      <rect x={6} y={6} width={88} height={88} rx={9} fill={haunted ? '#3b3449' : '#efe4cc'} stroke={ink} strokeWidth={5} />
      <path d={ROOF} fill={haunted ? '#9a91aa' : ink} />
      <rect x={28} y={44} width={44} height={36} fill="none" stroke={haunted ? '#9a91aa' : ink} strokeWidth={5} />
      <rect x={44} y={56} width={12} height={24} fill={haunted ? '#9a91aa' : ink} />
      {haunted && (
        <>
          <circle cx={36} cy={60} r={5} fill="url(#gs-eye-glow)" />
          <circle cx={64} cy={60} r={5} fill="url(#gs-eye-glow)" />
        </>
      )}
    </g>
  )
}

/** A tile with a ghost hand rising behind it ("haunt a tile"). */
export function HauntTileG({ ink = INK, paper = '#efe4cc', ...at }: At & { ink?: string; paper?: string }) {
  return (
    <g transform={place(at)}>
      <HandG fill={ink} x={30} y={-2} s={66} />
      <rect x={8} y={46} width={60} height={48} rx={6} fill={paper} stroke={ink} strokeWidth={5} />
      <path d={ROOF} transform="translate(8 34) scale(0.6)" fill={ink} />
      <rect x={24} y={62} width={28} height={24} fill="none" stroke={ink} strokeWidth={4.5} />
      <rect x={34} y={70} width={8} height={16} fill={ink} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Ghost card with 鬼 ("bring a ghost into play").
// ---------------------------------------------------------------------------
export function GhostCardG({ ink = INK, paper = '#f6eedb', color, ...at }: At & { ink?: string; paper?: string; color?: TaoColor }) {
  const edge = color ? COLOR_HEX[color] : ink
  return (
    <g transform={place(at)}>
      <rect x={18} y={6} width={64} height={88} rx={7} fill={paper} stroke={edge} strokeWidth={6} />
      <GuiG fill={ink} x={24} y={22} s={52} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Haunting figure: a pale wisp spirit.
// ---------------------------------------------------------------------------
const WISP =
  'M44 10C62 10 70 26 67 42C65 55 70 63 80 69C89 74 92 84 85 92C81 82 71 84 60 82C44 80 28 73 22 58C16 42 24 10 44 10Z'

export function WispG({ fill = 'url(#gs-spirit)', stroke = '#5d6b69', ...at }: At & { fill?: string; stroke?: string }) {
  return (
    <g transform={place(at)}>
      <path d={WISP} fill="none" stroke="#f6ecd6" strokeOpacity={0.6} strokeWidth={8} strokeLinejoin="round" />
      <path d={WISP} fill={fill} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
      <ellipse cx={36} cy={35} rx={4.5} ry={6.5} fill="#1d1712" />
      <ellipse cx={51} cy={35} rx={4.5} ry={6.5} fill="#1d1712" />
      <ellipse cx={43} cy={50} rx={4} ry={5.5} fill="#1d1712" opacity={0.8} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Dice.
// ---------------------------------------------------------------------------
export function TaoDieFaceG({ face, ...at }: At & { face: DieFace }) {
  return (
    <g transform={place(at)}>
      <rect x={5} y={5} width={90} height={90} rx={18} fill="url(#gs-ivory)" stroke="#5a4a36" strokeWidth={4} />
      <rect x={11} y={11} width={78} height={78} rx={13} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
      {face === 'white' ? (
        <>
          <circle cx={50} cy={50} r={27} fill="#fffdf6" stroke="#b9ad97" strokeWidth={4} />
          <path d={ring(50, 50, 18, 7, -2.4, 5.4)} fill="#c9bea8" />
          <circle cx={22} cy={22} r={6.5} fill={COLOR_HEX.red} />
          <circle cx={78} cy={22} r={6.5} fill={COLOR_HEX.green} />
          <circle cx={22} cy={78} r={6.5} fill={COLOR_HEX.blue} />
          <circle cx={78} cy={78} r={6.5} fill={COLOR_HEX.yellow} />
        </>
      ) : (
        <CoinG color={face} x={18} y={18} s={64} outline={false} hole="#efe4cc" />
      )}
    </g>
  )
}

const BONE = '#ece2cb'

export function CurseFaceG({ face, ...at }: At & { face: CurseFace }) {
  return (
    <g transform={place(at)}>
      <rect x={5} y={5} width={90} height={90} rx={18} fill="url(#gs-ebony)" stroke="#000" strokeWidth={4} />
      <rect x={11} y={11} width={78} height={78} rx={13} fill="none" stroke="#8a7f74" strokeOpacity={0.45} strokeWidth={2} />
      <CurseSymbolG face={face} x={14} y={14} s={72} />
    </g>
  )
}

/** The pale symbol of a curse-die face (no die body). */
export function CurseSymbolG({ face, fill = BONE, ...at }: At & { face: CurseFace; fill?: string }) {
  let body: ReactNode = null
  switch (face) {
    case 'blank':
      body = null
      break
    case 'haunt':
      body = <HauntTileG ink={fill} paper="#1d1712" x={6} y={4} s={92} />
      break
    case 'ghost':
      body = <GhostCardG ink={fill} paper="#1d1712" x={0} y={0} s={100} />
      break
    case 'loseTao':
      body = (
        <>
          <circle cx={34} cy={36} r={20} fill="none" stroke={fill} strokeWidth={6} />
          <rect x={28} y={30} width={12} height={12} fill={fill} />
          <circle cx={66} cy={36} r={20} fill="none" stroke={fill} strokeWidth={6} />
          <rect x={60} y={30} width={12} height={12} fill={fill} />
          <circle cx={50} cy={66} r={20} fill="none" stroke={fill} strokeWidth={6} />
          <rect x={44} y={60} width={12} height={12} fill={fill} />
          <path d={strokes([[[[12, 12], [50, 50], [90, 90]], 11, 'both'], [[[88, 12], [50, 50], [12, 90]], 11, 'both']])} fill={VERMILION} />
        </>
      )
      break
    case 'loseQi':
      body = (
        <>
          <NumG text="−1" fill={fill} halo="#1d1712" x={-10} y={4} s={70} size={56} />
          <path d={QI_DROP} transform="translate(50 20) scale(0.52)" fill="none" stroke={fill} strokeWidth={9} />
          <path d={QI_SWIRL} transform="translate(50 20) scale(0.52)" fill={fill} />
        </>
      )
      break
  }
  return <g transform={place(at)}>{body}</g>
}

// ---------------------------------------------------------------------------
// Misc pictograms.
// ---------------------------------------------------------------------------
/** A brush-stroke arrow pointing right. */
export function ArrowG({ fill = INK, ...at }: At & { fill?: string }) {
  return (
    <g transform={place(at)}>
      <path d={brush([[10, 52], [40, 49], [72, 50]], 12, 'head', { min: 0.3 })} fill={fill} />
      <path d="M62 30L92 50L62 70Q68 50 62 30Z" fill={fill} />
    </g>
  )
}

/** Red brush X. */
export const CROSS_PATH = strokes([
  [[[14, 16], [50, 50], [86, 86]], 13, 'both'],
  [[[86, 14], [50, 50], [14, 86]], 13, 'both'],
])
export function CrossG({ fill = VERMILION, ...at }: At & { fill?: string }) {
  return (
    <g transform={place(at)}>
      <path d={CROSS_PATH} fill="none" stroke="#f6ecd6" strokeOpacity={0.8} strokeWidth={6} strokeLinejoin="round" />
      <path d={CROSS_PATH} fill={fill} />
    </g>
  )
}

// Brush-painted signs, centred on (0, 0), for a 60-unit numeral.
const MINUS_PATH = brush([[-15, 1], [0, -1], [15, 0]], 11, 'none')
const PLUS_PATH = MINUS_PATH + brush([[0, -15], [0, 0], [0, 15]], 11, 'none')

/**
 * Big numeral / "−1" / "+1" / "+" label, with a pale halo so it reads on
 * anything. The sign is a brush stroke (font minus signs are too thin at
 * small sizes); digits are bold serif text.
 */
export function NumG({ text, fill = INK, halo = '#f6ecd6', size = 60, ...at }: At & { text: string; fill?: string; halo?: string; size?: number }) {
  const first = text.charAt(0)
  const sign = first === '−' || first === '-' ? MINUS_PATH : first === '+' ? PLUS_PATH : null
  const digits = sign ? text.slice(1) : text
  const k = size / 60
  const signX = digits ? 50 - 17 * k : 50
  const haloW = size * 0.14
  return (
    <g transform={place(at)}>
      {sign && (
        <path
          d={sign}
          transform={`translate(${signX} 50) scale(${k})`}
          fill={fill}
          stroke={halo}
          strokeWidth={haloW / k}
          paintOrder="stroke"
          strokeLinejoin="round"
        />
      )}
      {digits && (
        <text
          x={sign ? 50 + 15 * k : 50}
          y={50}
          dy="0.36em"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight={700}
          fontSize={size * 1.08}
          fill={fill}
          stroke={halo}
          strokeWidth={haloW}
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {digits}
        </text>
      )}
    </g>
  )
}

/** A tiny monk: robe in the Taoist's colour. */
export function MonkG({ color, lying = false, ...at }: At & { color: Color | 'grey'; lying?: boolean }) {
  const robe = color === 'grey' ? '#8d847a' : COLOR_HEX[color]
  const dark = color === 'grey' ? '#4a443e' : COLOR_DARK[color]
  return (
    <g transform={place(at)}>
      <g transform={lying ? 'rotate(-90 50 50) translate(0 4)' : undefined}>
        <path d="M50 30C64 30 70 44 72 60L80 94H20L28 60C30 44 36 30 50 30Z" fill={robe} stroke={dark} strokeWidth={4} strokeLinejoin="round" />
        <path d="M42 34L50 56L58 34" fill="none" stroke="#f6ecd6" strokeWidth={4} strokeLinejoin="round" />
        <circle cx={50} cy={20} r={13} fill="url(#gs-skin)" stroke={dark} strokeWidth={4} />
        <path d="M80 8L76 96" stroke="#5e3b1e" strokeWidth={5} strokeLinecap="round" />
      </g>
    </g>
  )
}

/** A tiny gold seated Buddha with a halo. */
export function BuddhaG(at: At) {
  return (
    <g transform={place(at)}>
      <circle cx={50} cy={34} r={33} fill="url(#gs-halo)" />
      <circle cx={50} cy={32} r={24} fill="none" stroke="#f3dc95" strokeOpacity={0.9} strokeWidth={3.5} />
      {/* seated body with crossed legs */}
      <path
        d="M50 45C61 45 67 52 69 62C70 68 70 72 69 75L88 82C93 86 91 92 84 92H16C9 92 7 86 12 82L31 75C30 72 30 68 31 62C33 52 39 45 50 45Z"
        fill="url(#gs-gold)"
        stroke="#f6ecd6"
        strokeOpacity={0.7}
        strokeWidth={6}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
      <path d="M50 45C61 45 67 52 69 62C70 68 70 72 69 75L88 82C93 86 91 92 84 92H16C9 92 7 86 12 82L31 75C30 72 30 68 31 62C33 52 39 45 50 45Z" fill="none" stroke={GOLD_DEEP} strokeWidth={3} strokeLinejoin="round" />
      <path d="M31 75Q50 84 69 75M40 78Q50 72 60 78" fill="none" stroke={GOLD_DEEP} strokeWidth={3} strokeLinecap="round" />
      <circle cx={50} cy={31} r={12} fill="url(#gs-gold-r)" stroke={GOLD_DEEP} strokeWidth={3} />
      <circle cx={50} cy={17} r={5} fill="url(#gs-gold-r)" stroke={GOLD_DEEP} strokeWidth={2.5} />
      <path d="M44 32Q46 34 48 32M52 32Q54 34 56 32" fill="none" stroke={GOLD_DEEP} strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

/** "The group": a little crowd on a vermilion seal. */
export function GroupBadgeG(at: At) {
  return (
    <g transform={place(at)}>
      <circle cx={50} cy={50} r={46} fill="url(#gs-seal)" stroke="#f6ecd6" strokeWidth={5} />
      <g fill="#f6ecd6" stroke="#a3271f" strokeWidth={3.5}>
        <circle cx={27} cy={34} r={8.5} />
        <path d="M17 82V56C17 49 21 45 27 45C33 45 37 49 37 56V82Z" />
        <circle cx={73} cy={34} r={8.5} />
        <path d="M63 82V56C63 49 67 45 73 45C79 45 83 49 83 56V82Z" />
        <circle cx={50} cy={27} r={10} />
        <path d="M37 90V52C37 44 42 39 50 39C58 39 63 44 63 52V90Z" />
      </g>
    </g>
  )
}

/** Moon crystal: a faceted moonstone. */
export function CrystalG(at: At) {
  return (
    <g transform={place(at)}>
      <path d="M50 4L76 30L66 92H34L24 30Z" fill="#f6ecd6" fillOpacity={0.7} stroke="#f6ecd6" strokeOpacity={0.7} strokeWidth={7} strokeLinejoin="round" />
      <path d="M50 4L76 30L66 92H34L24 30Z" fill="url(#gs-moonstone)" stroke="#2e4a78" strokeWidth={3.5} strokeLinejoin="round" />
      <path d="M50 4L44 30L50 92M24 30H76M44 30L34 92M56 30L66 92M50 4L56 30" fill="none" stroke="#2e4a78" strokeOpacity={0.45} strokeWidth={2.5} />
      <path d="M33 34L40 34L36 70Z" fill="#fff" fillOpacity={0.7} />
    </g>
  )
}

/** A padlock. */
export function PadlockG({ ...at }: At) {
  return (
    <g transform={place(at)}>
      <path d="M30 48V34C30 12 70 12 70 34V48" fill="none" stroke="#f6ecd6" strokeOpacity={0.8} strokeWidth={16} />
      <path d="M30 48V34C30 12 70 12 70 34V48" fill="none" stroke="#3a332c" strokeWidth={9} />
      <rect x={18} y={44} width={64} height={50} rx={9} fill="#3a332c" stroke="#f6ecd6" strokeOpacity={0.8} strokeWidth={4} />
      <circle cx={50} cy={64} r={7} fill="url(#gs-gold-r)" />
      <path d="M46 66L44 82H56L54 66Z" fill="url(#gs-gold-r)" />
    </g>
  )
}

/** Power stone: a river stone with a golden swirl (a Taoist power). */
export const SWIRL_PATH = brush(
  [[50, 50], [56, 46], [56, 38], [48, 33], [38, 37], [33, 48], [37, 61], [50, 68], [64, 65], [72, 52], [70, 36]],
  9,
  'head',
  { min: 0.25 },
)
export function PowerStoneG(at: At) {
  return (
    <g transform={place(at)}>
      <path d="M50 8C76 8 92 26 92 50C92 76 74 92 50 92C24 92 8 74 8 50C8 26 26 8 50 8Z" fill="url(#gs-stone)" stroke="#f6ecd6" strokeOpacity={0.6} strokeWidth={4} />
      <path d={SWIRL_PATH} fill="url(#gs-gold)" />
    </g>
  )
}

/** A gaping maw on a red disc (Devourer). */
export function MawG(at: At) {
  const teethTop: Pt[] = [[22, 40], [30, 54], [38, 40], [46, 56], [54, 40], [62, 56], [70, 40], [78, 54]]
  const teethBot: Pt[] = [[26, 70], [34, 58], [42, 72], [50, 58], [58, 72], [66, 58], [74, 70]]
  return (
    <g transform={place(at)}>
      <circle cx={50} cy={50} r={46} fill={COLOR_HEX.red} stroke="#f6ecd6" strokeOpacity={0.8} strokeWidth={5} />
      <circle cx={50} cy={50} r={41} fill="none" stroke={COLOR_DARK.red} strokeWidth={3} />
      <path d="M14 46C22 28 78 28 86 46C84 70 70 84 50 84C30 84 16 70 14 46Z" fill="#160d0b" />
      <path d={`M${teethTop.map((p) => p.join(' ')).join('L')}L80 38Q50 30 20 38Z`} fill="#f4ecd8" />
      <path d={`M${teethBot.map((p) => p.join(' ')).join('L')}Q50 84 26 70Z`} fill="#f4ecd8" />
      <path d={brush([[28, 24], [38, 30], [44, 32]], 6, 'tail')} fill="#160d0b" />
      <path d={brush([[72, 24], [62, 30], [56, 32]], 6, 'tail')} fill="#160d0b" />
    </g>
  )
}

/** A half-black heraldic shield (dice immunity). */
export function ShieldG(at: At) {
  const d = 'M50 6L88 18C88 52 80 80 50 95C20 80 12 52 12 18Z'
  return (
    <g transform={place(at)}>
      <path d={d} fill="#fbf6ea" stroke="#f6ecd6" strokeOpacity={0.8} strokeWidth={9} strokeLinejoin="round" />
      <path d="M50 6L12 18C12 52 20 80 50 95Z" fill="#16110d" />
      <path d="M50 6L88 18C88 52 80 80 50 95Z" fill="#fbf6ea" />
      <path d={d} fill="none" stroke="#16110d" strokeWidth={5} strokeLinejoin="round" />
      <circle cx={31} cy={40} r={7} fill="#fbf6ea" />
      <circle cx={69} cy={58} r={7} fill="#16110d" />
    </g>
  )
}

/** Small ink seal with 鬼 — Wu-Feng's mark. */
export function SealG({ fill = 'url(#gs-seal)', ...at }: At & { fill?: string }) {
  return (
    <g transform={place(at)}>
      <rect x={6} y={6} width={88} height={88} rx={10} fill={fill} />
      <rect x={13} y={13} width={74} height={74} rx={5} fill="none" stroke="#f3e3cf" strokeWidth={3.5} />
      <GuiG fill="#f6e8d6" x={20} y={18} s={62} />
    </g>
  )
}

export { ROOF as ROOF_PATH, WISP as WISP_PATH, QI_DROP as QI_DROP_PATH }
