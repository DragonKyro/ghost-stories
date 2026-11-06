// Black Secret expansion pieces: demons, the Shadow of Wu-Feng, skeleton
// tokens, ladders, curse tokens and catacomb tokens.
import type { ReactNode } from 'react'
import type { CatacombTokenKind, DemonId, TaoColor } from '@/game/types'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { brush, mirrorX, ring, strokes, type Pt } from './brush'
import { BuddhaG, GuiG, QI_DROP_PATH } from './glyphs'
import { COLOR_HEX, COLOR_LIGHT, VERMILION } from './palette'

type P = ArtBaseProps & { size?: number }

// ---------------------------------------------------------------------------
// Demons: imp → fiend → archfiend, growing in size, horns and menace.
// ---------------------------------------------------------------------------
const DEMON_BODY = 'M14 98C16 80 26 69 38 65H62C74 69 84 80 86 98Z'
const DEMON_HEAD = 'M50 27C64 27 72 37 72 49C72 61 62 71 50 71C38 71 28 61 28 49C28 37 36 27 50 27Z'
const DEMON_EARS = 'M30 46L13 34L31 56ZM70 46L87 34L69 56Z'
const both = (pts: Pt[], w: number): string => brush(pts, w, 'tail') + brush(mirrorX(pts, 50), w, 'tail')
const HORNS: Record<DemonId, string> = {
  imp: both([[40, 33], [36, 25], [35, 17]], 8),
  fiend: both([[40, 32], [32, 22], [28, 12], [31, 3]], 10),
  archfiend: both([[40, 31], [28, 22], [16, 25], [12, 37], [19, 46], [26, 41]], 11),
}
const WINGS =
  'M36 68L10 26L13 44L2 46L11 58L3 68L20 74Z' + 'M64 68L90 26L87 44L98 46L89 58L97 68L80 74Z'
const DEMON_BROWS = strokes([
  [[[35, 40], [42, 44], [47, 47]], 4, 'head'],
  [[[65, 40], [58, 44], [53, 47]], 4, 'head'],
])
const DEMON_EYES = 'M36 47L47 51L37 54ZM64 47L53 51L63 54Z'
const DEMON_MOUTH = 'M36 58Q50 70 64 58Q50 63 36 58Z'
const DEMON_FANGS = 'M40 59.5L42.5 66L45 61ZM55 61L57.5 66L60 59.5Z'

const DEMON_LOOK: Record<DemonId, { k: number; skin: string; shade: string; label: string }> = {
  imp: { k: 0.68, skin: '#c8452f', shade: '#6e1b10', label: 'Imp' },
  fiend: { k: 0.85, skin: '#8f1f1a', shade: '#3e0c0a', label: 'Fiend' },
  archfiend: { k: 1, skin: '#3b1320', shade: '#14060a', label: 'Archfiend' },
}

export function DemonFigure({ id, size = 40, title, ...rest }: P & { id: DemonId }) {
  const L = DEMON_LOOK[id]
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? L.label} {...rest}>
      {id !== 'imp' && <ellipse cx={50} cy={56} rx={50 * L.k} ry={46 * L.k} fill="url(#gs-wash-crimson)" />}
      <g transform={`translate(50 99) scale(${L.k}) translate(-50 -99)`}>
        <g fill="#f6ecd6" opacity={0.7} stroke="#f6ecd6" strokeWidth={5} strokeLinejoin="round">
          {id === 'archfiend' && <path d={WINGS} />}
          <path d={DEMON_BODY} />
          <path d={DEMON_HEAD} />
          <path d={DEMON_EARS} />
          <path d={HORNS[id]} />
        </g>
        {id === 'archfiend' && <path d={WINGS} fill="#1d0a10" stroke="#5a1424" strokeWidth={2} strokeLinejoin="round" />}
        <path d={DEMON_BODY} fill={L.shade} stroke="#0b0806" strokeWidth={2} />
        <path d="M38 65L50 80L62 65" fill="none" stroke={L.skin} strokeWidth={3} />
        <path d={HORNS[id]} fill={id === 'imp' ? '#2a1a12' : '#e9dcc0'} stroke="#2a1a12" strokeWidth={1.4} />
        <path d={DEMON_EARS} fill={L.skin} stroke="#0b0806" strokeWidth={2} strokeLinejoin="round" />
        <path d={DEMON_HEAD} fill={L.skin} stroke="#0b0806" strokeWidth={2.2} />
        <ellipse cx={46} cy={40} rx={12} ry={7} fill="#fff" opacity={0.14} />
        <path d={DEMON_BROWS} fill="#0b0806" />
        <path d={DEMON_EYES} fill="#ffd24a" stroke="#0b0806" strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M41 49.5V53M59 49.5V53" stroke="#0b0806" strokeWidth={2} />
        <path d={DEMON_MOUTH} fill="#0b0806" />
        <path d={DEMON_FANGS} fill="#f6ecd6" />
        {id === 'archfiend' && <path d="M40 30L44 20L48 28L50 16L52 28L56 20L60 30Z" fill="url(#gs-gold)" stroke="#5a3a14" strokeWidth={1.2} />}
      </g>
    </ArtSvg>
  )
}

// ---------------------------------------------------------------------------
// The Shadow of Wu-Feng.
// ---------------------------------------------------------------------------
const SHADOW_ROBE =
  'M50 8C66 8 74 22 74 38C74 56 80 74 92 96L82 90L76 97L66 90L58 98L50 91L42 98L34 90L24 97L18 90L8 96C20 74 26 56 26 38C26 22 34 8 50 8Z'
const SHADOW_SMOKE = strokes([
  [[[24, 60], [14, 52], [12, 40], [18, 32]], 4, 'head'],
  [[[76, 60], [86, 50], [86, 38], [80, 30]], 4, 'head'],
  [[[30, 82], [18, 78], [10, 70]], 3, 'head'],
])
const SHADOW_CROWN = 'M36 16L38 2L44 12L50 -2L56 12L62 2L64 16Z'

export function ShadowFigure({ size = 48, title, ...rest }: P) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Shadow of Wu-Feng'} {...rest}>
      <ellipse cx={50} cy={52} rx={50} ry={50} fill="url(#gs-wash-crimson)" />
      <path d={SHADOW_SMOKE} fill="#3a2a36" opacity={0.8} />
      <path d={SHADOW_ROBE} fill="none" stroke="#f6ecd6" strokeOpacity={0.55} strokeWidth={5} strokeLinejoin="round" />
      <path d={SHADOW_CROWN} transform="translate(0 6)" fill="#16101a" stroke="#c1392b" strokeWidth={1.6} strokeLinejoin="round" />
      <path d={SHADOW_ROBE} fill="#120d12" stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d={SHADOW_ROBE} fill="url(#gs-streaks)" opacity={0.6} />
      <path d="M38 62Q50 70 62 62M34 76Q50 84 66 76" fill="none" stroke="#3b2a36" strokeWidth={2} />
      <ellipse cx={50} cy={36} rx={14} ry={17} fill="#000" />
      <circle cx={43} cy={36} r={8} fill="url(#gs-red-glow)" />
      <circle cx={57} cy={36} r={8} fill="url(#gs-red-glow)" />
      <path d="M39 35L47 37.5L40 39ZM61 35L53 37.5L60 39Z" fill="#fff2d0" />
    </ArtSvg>
  )
}

// ---------------------------------------------------------------------------
// Skeleton token.
// ---------------------------------------------------------------------------
const BONES = strokes([
  [[[18, 22], [50, 52], [82, 82]], 9, 'none'],
  [[[82, 22], [50, 52], [18, 82]], 9, 'none'],
])
const BONE_KNOBS: Pt[] = [
  [15, 22], [20, 17], [85, 22], [80, 17], [15, 82], [20, 87], [85, 82], [80, 87],
]
const SKULL = 'M50 20C64 20 72 30 72 42C72 50 68 54 66 56V66H34V56C32 54 28 50 28 42C28 30 36 20 50 20Z'

function SkullG({ fill = 'url(#gs-bone)' }: { fill?: string }) {
  return (
    <>
      {BONE_KNOBS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={6} fill={fill} stroke="#3a2e22" strokeWidth={1.5} />
      ))}
      <path d={BONES} fill={fill} stroke="#3a2e22" strokeWidth={1.5} />
      <path d={SKULL} fill={fill} stroke="#3a2e22" strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx={41} cy={42} rx={6} ry={7} fill="#1a120d" />
      <ellipse cx={59} cy={42} rx={6} ry={7} fill="#1a120d" />
      <path d="M50 49L46 56H54Z" fill="#1a120d" />
      <path d="M40 60V66M45 60V66M50 60V66M55 60V66M60 60V66" stroke="#3a2e22" strokeWidth={1.6} />
    </>
  )
}

export function SkeletonToken({ size = 32, title, ...rest }: P) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Skeleton'} {...rest}>
      <circle cx={50} cy={50} r={48} fill="#f6ecd6" opacity={0.8} />
      <circle cx={50} cy={50} r={45} fill="#2a221d" stroke="#0b0806" strokeWidth={3} />
      <circle cx={50} cy={50} r={38} fill="url(#gs-wash-crimson)" />
      <g transform="translate(9 8) scale(0.82)">
        <SkullG />
      </g>
    </ArtSvg>
  )
}

// ---------------------------------------------------------------------------
// Ladder down to the catacombs.
// ---------------------------------------------------------------------------
const RAILS = brush([[33, 4], [31.5, 50], [29, 92]], 6, 'none') + brush([[67, 4], [68.5, 50], [71, 92]], 6, 'none')
const RUNGS = [12, 26, 40, 54].map((y) => brush([[33 - y * 0.03, y], [50, y + 0.5], [67 + y * 0.03, y]], 5, 'none')).join('')
const LOW_RUNGS = [68, 82].map((y) => brush([[32 - y * 0.03, y], [50, y + 0.5], [68 + y * 0.03, y]], 5, 'none')).join('')

export function LadderIcon({ size = 32, title, ...rest }: P) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Ladder'} {...rest}>
      <path d="M10 60H90L98 96H2Z" fill="#f6ecd6" opacity={0.8} />
      <path d="M13 62H87L94 94H6Z" fill="#0b0806" stroke="#5a4632" strokeWidth={3} strokeLinejoin="round" />
      <path d="M18 66H82L86 76H14Z" fill="#2a1f17" opacity={0.6} />
      <path d={RAILS} fill="url(#gs-wood)" stroke="#2a1a0c" strokeWidth={1.2} />
      <path d={RUNGS} fill="#8a5a2e" stroke="#2a1a0c" strokeWidth={1.2} />
      <path d={LOW_RUNGS} fill="#5a3a1e" opacity={0.55} />
      <path d="M8 90H92L94 94H6Z" fill="#0b0806" />
    </ArtSvg>
  )
}

// ---------------------------------------------------------------------------
// Curse tokens: a cursed coin in the curse's colour; the level is shown by pips.
// ---------------------------------------------------------------------------
export function CurseTokenArt({ level, color, size = 32, title, ...rest }: P & { level: 1 | 2 | 3 | 4; color: TaoColor }) {
  const rim = color === 'black' ? '#8d8a86' : COLOR_HEX[color]
  const glyph = color === 'black' ? '#d8d0c4' : COLOR_LIGHT[color]
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? `Level ${level} ${color} curse`} {...rest}>
      <circle cx={50} cy={50} r={48} fill="#f6ecd6" opacity={0.8} />
      <circle cx={50} cy={50} r={45} fill="url(#gs-ebony)" stroke={rim} strokeWidth={6} />
      <circle cx={50} cy={54} r={34} fill={`url(#gs-wash-${color === 'black' ? 'ash' : color})`} />
      <GuiG fill={glyph} x={29} y={40} s={44} />
      {Array.from({ length: level }, (_, i) => {
        const x = 50 + (i - (level - 1) / 2) * 15
        return <path key={i} d={`M${x} 12L${x + 6.5} 22L${x} 32L${x - 6.5} 22Z`} fill="url(#gs-gold)" stroke="#2a1d0a" strokeWidth={1.6} />
      })}
    </ArtSvg>
  )
}

// ---------------------------------------------------------------------------
// Catacomb tokens (face-up).
// ---------------------------------------------------------------------------
const CLODS = 'M18 70C22 62 34 62 36 70C34 76 22 78 18 70ZM56 76C60 68 76 68 78 76C74 84 60 84 56 76ZM40 40C44 34 54 34 56 40C54 46 44 46 40 40ZM66 28C68 24 76 24 78 28C76 32 68 32 66 28Z'
const PEBBLES: Array<[number, number, number]> = [[28, 30, 3], [70, 52, 2.5], [46, 84, 2.8], [24, 50, 2], [84, 62, 2.2]]
const CRACK = brush([[58, 26], [54, 40], [60, 50], [55, 66]], 3, 'both')
const URN = 'M36 30H64L62 36C76 44 78 68 66 88H34C22 68 24 44 38 36Z'

function catacomb(kind: CatacombTokenKind): ReactNode {
  switch (kind) {
    case 'dirt':
      return (
        <>
          <path d={CLODS} fill="#7a5a3a" opacity={0.85} />
          {PEBBLES.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#b39a78" />
          ))}
        </>
      )
    case 'buddha':
      return <BuddhaG x={12} y={10} s={76} />
    case 'bloodOfTheJust':
      return (
        <>
          <path d={ring(50, 52, 34, 5, -2.2, 5.6)} fill="url(#gs-gold)" />
          <path d={QI_DROP_PATH} transform="translate(22 18) scale(0.56)" fill="url(#gs-blood)" stroke="#3a0806" strokeWidth={3.5} />
          <ellipse cx={42} cy={52} rx={3.5} ry={6} fill="#fff" opacity={0.45} transform="rotate(25 42 52)" />
        </>
      )
    case 'cursedTablet':
      return (
        <>
          <ellipse cx={50} cy={54} rx={36} ry={40} fill="url(#gs-wash-violet)" />
          <path d="M30 90V30C30 12 70 12 70 30V90Z" fill="url(#gs-stone)" stroke="#16110d" strokeWidth={3} />
          <GuiG fill={VERMILION} x={33} y={30} s={34} />
          <path d={CRACK} fill="#16110d" />
          <path d="M26 90H74" stroke="#16110d" strokeWidth={4} />
        </>
      )
    case 'bones':
      return (
        <g transform="translate(8 6) scale(0.84)">
          <SkullG />
        </g>
      )
    case 'bloodOfSuLing':
      return (
        <>
          <path d="M66 14A16 16 0 1 0 82 36A13 13 0 1 1 66 14Z" fill="#f3dc95" />
          <path d={QI_DROP_PATH} transform="translate(18 22) scale(0.6)" fill="url(#gs-moonstone)" stroke="#2e4a78" strokeWidth={3.5} />
          <ellipse cx={38} cy={58} rx={3.5} ry={6} fill="#fff" opacity={0.7} transform="rotate(25 38 58)" />
        </>
      )
    case 'urn':
      return (
        <>
          <ellipse cx={50} cy={26} rx={18} ry={5} fill="#3e6a5a" stroke="#16110d" strokeWidth={2} />
          <circle cx={50} cy={19} r={5} fill="url(#gs-gold)" stroke="#16110d" strokeWidth={1.5} />
          <path d={URN} fill="#4f8573" stroke="#16110d" strokeWidth={3} strokeLinejoin="round" />
          <path d="M28 52H72M27 70H73" stroke="url(#gs-gold)" strokeWidth={4} />
          <path d="M44 58Q50 54 56 58Q50 64 44 58Z" fill="#16110d" opacity={0.6} />
          <ellipse cx={40} cy={50} rx={4} ry={12} fill="#fff" opacity={0.18} />
        </>
      )
  }
}

const CATACOMB_LABEL: Record<CatacombTokenKind, string> = {
  dirt: 'Dirt',
  buddha: 'Buddha',
  bloodOfTheJust: 'Blood of the Just',
  cursedTablet: 'Cursed Tablet',
  bones: 'Bones',
  bloodOfSuLing: 'Blood of Su-Ling',
  urn: 'Urn',
}

export function CatacombTokenArt({ kind, size = 32, title, ...rest }: P & { kind: CatacombTokenKind }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? CATACOMB_LABEL[kind]} {...rest}>
      <rect x={2} y={2} width={96} height={96} rx={14} fill="#f6ecd6" opacity={0.75} />
      <rect x={5} y={5} width={90} height={90} rx={11} fill="url(#gs-earth)" stroke="#120c08" strokeWidth={3} />
      <rect x={10} y={10} width={80} height={80} rx={8} fill="none" stroke="#8a6a48" strokeOpacity={0.45} strokeWidth={1.5} />
      {catacomb(kind)}
    </ArtSvg>
  )
}
