// White Moon expansion pieces: villager tokens (12 families), Su-Ling, the
// Portal and the moon-crystal receptacles.
import type { ReactNode } from 'react'
import type { FamilyId } from '@/game/types'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { brush, ring, strokes } from './brush'
import { CrystalG } from './glyphs'
import { INK } from './palette'

type P = ArtBaseProps & { size?: number }

// ---------------------------------------------------------------------------
// Villagers
// ---------------------------------------------------------------------------
interface FamilyLook {
  name: string
  band: string
  members: 1 | 2 | 3
}

export const FAMILY_LOOK: Record<FamilyId, FamilyLook> = {
  hua: { name: 'Hua', band: '#c4587a', members: 3 },
  zhou: { name: 'Zhou', band: '#b8874a', members: 3 },
  li: { name: 'Li', band: '#6a4c8c', members: 3 },
  sun: { name: 'Sun', band: '#d9782f', members: 3 },
  miao: { name: 'Miao', band: '#2f7d86', members: 2 },
  xiang: { name: 'Xiang', band: '#2f3d6b', members: 2 },
  sheng: { name: 'Sheng', band: '#7b7a3a', members: 2 },
  wu: { name: 'Wu', band: '#55565e', members: 2 },
  chang: { name: 'Chang', band: '#d4a244', members: 1 },
  teng: { name: 'Teng', band: '#3f8a73', members: 1 },
  long: { name: 'Long', band: '#a3243b', members: 1 },
  weng: { name: 'Weng', band: '#2c69b8', members: 1 },
}

const EYES = strokes([
  [[[40, 57], [43, 56.4], [46, 57]], 3.2, 'none'],
  [[[54, 57], [57, 56.4], [60, 57]], 3.2, 'none'],
])
const OLD_EYES = strokes([
  [[[40, 57], [43, 58.5], [46, 57]], 2.6, 'none'],
  [[[54, 57], [57, 58.5], [60, 57]], 2.6, 'none'],
])
const HAIR = '#16110d'

function Face({ old = false, blush = false, skin = 'url(#gs-skin)' }: { old?: boolean; blush?: boolean; skin?: string }) {
  return (
    <>
      <ellipse cx={50} cy={58} rx={16} ry={18} fill={skin} stroke="#7a5236" strokeWidth={1.6} />
      <path d={old ? OLD_EYES : EYES} fill={INK} />
      {blush && (
        <>
          <circle cx={39} cy={65} r={3.5} fill="#e06a5a" opacity={0.55} />
          <circle cx={61} cy={65} r={3.5} fill="#e06a5a" opacity={0.55} />
        </>
      )}
      <path d="M46 68Q50 70.5 54 68" fill="none" stroke="#7a3a2a" strokeWidth={1.8} strokeLinecap="round" />
    </>
  )
}

const FLOWER = [0, 1, 2, 3, 4].map((i) => {
  const a = (i / 5) * Math.PI * 2 - Math.PI / 2
  return [66 + Math.cos(a) * 5, 34 + Math.sin(a) * 5] as const
})

function villager(family: FamilyId): ReactNode {
  switch (family) {
    case 'hua': // young woman, top bun with a flower
      return (
        <>
          <circle cx={50} cy={30} r={9} fill={HAIR} />
          <path d="M33 60C30 42 38 36 50 36C62 36 70 42 67 60C64 48 58 44 50 44C42 44 36 48 33 60Z" fill={HAIR} />
          <Face blush />
          {FLOWER.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4} fill="#f29bb5" stroke="#a83c5c" strokeWidth={1} />
          ))}
          <circle cx={66} cy={34} r={2.6} fill="#f6d35b" />
        </>
      )
    case 'zhou': // farmer in a conical straw hat
      return (
        <>
          <Face />
          <path d="M14 50L50 22L86 50Q50 44 14 50Z" fill="#dcb46a" stroke="#6b4a1e" strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M32 47L50 22M50 45V22M68 47L50 22" stroke="#8a6428" strokeWidth={1.5} />
          <path d="M36 62Q38 78 50 80Q62 78 64 62" fill="none" stroke="#6b4a1e" strokeWidth={1.4} />
        </>
      )
    case 'li': // grandmother: grey bun and hairpin, kind wrinkles
      return (
        <>
          <ellipse cx={50} cy={31} rx={11} ry={8} fill="#b4ada4" stroke="#6d665e" strokeWidth={1.5} />
          <path d="M37 32L64 28" stroke="#d4a857" strokeWidth={2.4} strokeLinecap="round" />
          <path d="M33 58C31 44 39 38 50 38C61 38 69 44 67 58C63 49 57 46 50 46C43 46 37 49 33 58Z" fill="#c9c2b8" stroke="#6d665e" strokeWidth={1.2} />
          <Face old />
          <path d="M37 62Q39 64 41 62M59 62Q61 64 63 62" fill="none" stroke="#8a6040" strokeWidth={1} />
        </>
      )
    case 'sun': // child with two hair buns
      return (
        <>
          <circle cx={33} cy={36} r={8} fill={HAIR} />
          <circle cx={67} cy={36} r={8} fill={HAIR} />
          <path d="M34 54C33 44 40 40 50 40C60 40 67 44 66 54C60 48 40 48 34 54Z" fill={HAIR} />
          <circle cx={33} cy={36} r={3} fill="#e0503c" />
          <circle cx={67} cy={36} r={3} fill="#e0503c" />
          <Face blush />
        </>
      )
    case 'miao': // girl with long braids
      return (
        <>
          <path d="M33 62C30 42 38 36 50 36C62 36 70 42 67 62C64 48 58 45 50 45C42 45 36 48 33 62Z" fill={HAIR} />
          <path d={brush([[34, 58], [32, 72], [34, 86]], 7, 'tail')} fill={HAIR} />
          <path d={brush([[66, 58], [68, 72], [66, 86]], 7, 'tail')} fill={HAIR} />
          <circle cx={33.5} cy={80} r={2.4} fill="#e8c04a" />
          <circle cx={66.5} cy={80} r={2.4} fill="#e8c04a" />
          <Face blush />
        </>
      )
    case 'xiang': // scholar in a winged black cap
      return (
        <>
          <Face />
          <path d="M35 46C35 30 65 30 65 46Z" fill={HAIR} />
          <rect x={40} y={28} width={20} height={9} rx={3} fill={HAIR} />
          <path d="M14 40H86" stroke={HAIR} strokeWidth={3.5} strokeLinecap="round" />
          <path d="M46 72Q50 78 54 72" fill="none" stroke={HAIR} strokeWidth={1.5} />
        </>
      )
    case 'sheng': // monk: shaved head, ordination dots
      return (
        <>
          <ellipse cx={50} cy={52} rx={17} ry={22} fill="url(#gs-skin)" stroke="#7a5236" strokeWidth={1.6} />
          <circle cx={45} cy={40} r={1.6} fill="#8a6040" />
          <circle cx={50} cy={38} r={1.6} fill="#8a6040" />
          <circle cx={55} cy={40} r={1.6} fill="#8a6040" />
          <path d={EYES} fill={INK} transform="translate(0 2)" />
          <path d="M46 69Q50 71.5 54 69" fill="none" stroke="#7a3a2a" strokeWidth={1.8} strokeLinecap="round" />
          <path d="M32 78Q50 88 68 78" fill="none" stroke="#5a2a14" strokeWidth={3.5} strokeDasharray="3.5 2.5" />
        </>
      )
    case 'wu': // soldier: iron helmet with a red tassel
      return (
        <>
          <Face />
          <path d="M31 52C31 32 69 32 69 52L72 56H28Z" fill="#6f7178" stroke="#2b2c30" strokeWidth={2} strokeLinejoin="round" />
          <path d="M50 34V26" stroke="#2b2c30" strokeWidth={3} />
          <path d={brush([[50, 26], [58, 20], [66, 22]], 7, 'tail')} fill="#c1392b" />
          <path d="M40 46H60" stroke="#a7a9ae" strokeWidth={1.6} />
        </>
      )
    case 'chang': // merchant: skullcap with a red button, long moustache
      return (
        <>
          <Face />
          <path d="M34 48C34 32 66 32 66 48Q50 43 34 48Z" fill={HAIR} />
          <circle cx={50} cy={33} r={3.4} fill="#c1392b" />
          <path d={brush([[50, 64], [42, 66], [36, 74]], 3.6, 'tail')} fill={HAIR} />
          <path d={brush([[50, 64], [58, 66], [64, 74]], 3.6, 'tail')} fill={HAIR} />
        </>
      )
    case 'teng': // old sage: white beard and brows
      return (
        <>
          <Face old />
          <path d="M36 50Q42 46 47 50M53 50Q58 46 64 50" fill="none" stroke="#f4efe6" strokeWidth={3} strokeLinecap="round" />
          <path d="M38 64C38 78 44 90 50 92C56 90 62 78 62 64C56 70 44 70 38 64Z" fill="#f4efe6" stroke="#a49c90" strokeWidth={1.2} />
          <path d="M34 50C34 40 40 38 44 40M66 50C66 40 60 38 56 40" fill="none" stroke="#e8e2d8" strokeWidth={3} />
        </>
      )
    case 'long': // noble: tall golden headdress
      return (
        <>
          <path d="M33 62C30 46 38 40 50 40C62 40 70 46 67 62C64 50 58 47 50 47C42 47 36 50 33 62Z" fill={HAIR} />
          <Face />
          <path d="M34 44L38 24L44 34L50 18L56 34L62 24L66 44Z" fill="url(#gs-gold)" stroke="#7a5418" strokeWidth={1.8} strokeLinejoin="round" />
          <circle cx={50} cy={36} r={3} fill="#c1392b" />
          <circle cx={38} cy={24} r={2} fill="#f6ecd6" />
          <circle cx={62} cy={24} r={2} fill="#f6ecd6" />
          <circle cx={50} cy={18} r={2.2} fill="#f6ecd6" />
        </>
      )
    case 'weng': // fisherman: knotted headscarf
      return (
        <>
          <Face />
          <path d="M33 52C32 36 42 32 50 32C58 32 68 36 67 52Q50 44 33 52Z" fill="#3a6fb0" stroke="#173a6a" strokeWidth={2} />
          <path d={brush([[66, 44], [76, 48], [82, 58]], 6, 'tail')} fill="#3a6fb0" />
          <path d={brush([[66, 46], [74, 54], [76, 64]], 5, 'tail')} fill="#2c5a94" />
          <path d="M38 44Q50 40 62 44" fill="none" stroke="#f6ecd6" strokeWidth={1.6} strokeDasharray="2 2.5" />
        </>
      )
  }
}

export function VillagerToken({ family, size = 32, title, ...rest }: P & { family: FamilyId }) {
  const look = FAMILY_LOOK[family]
  const pips = look.members
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? `${look.name} family villager (${pips} member${pips > 1 ? 's' : ''})`} {...rest}>
      <circle cx={50} cy={50} r={48} fill="#f6ecd6" opacity={0.85} />
      <circle cx={50} cy={50} r={45} fill={look.band} stroke="#1d1712" strokeWidth={3} />
      <circle cx={50} cy={50} r={36} fill="url(#gs-paper)" stroke="#1d1712" strokeOpacity={0.6} strokeWidth={2} />
      {villager(family)}
      {Array.from({ length: pips }, (_, i) => (
        <circle key={i} cx={50 + (i - (pips - 1) / 2) * 11} cy={91} r={4} fill="#f6ecd6" stroke="#1d1712" strokeWidth={1.5} />
      ))}
    </ArtSvg>
  )
}

// ---------------------------------------------------------------------------
// Su-Ling: the spirit of the village's guardian girl.
// ---------------------------------------------------------------------------
const SULING_HAIR =
  'M50 14C38 14 32 22 32 34C32 50 30 66 24 80C34 74 38 62 40 50L40 34C42 28 46 26 50 26C54 26 58 28 60 34L60 50C62 62 66 74 76 80C70 66 68 50 68 34C68 22 62 14 50 14Z'
const SULING_ROBE = 'M38 42C32 50 30 66 30 80C34 90 44 96 50 96C56 96 66 90 70 80C70 66 68 50 62 42C58 46 42 46 38 42Z'
const SULING_SLEEVES = 'M38 50C30 58 30 70 38 74L50 66L62 74C70 70 70 58 62 50C58 56 54 60 50 62C46 60 42 56 38 50Z'

export function SuLingFigure({ size = 40, title, ...rest }: P) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Su-Ling'} {...rest}>
      <circle cx={50} cy={46} r={48} fill="url(#gs-moon-halo)" />
      <path d="M70 6A20 20 0 1 0 88 34A16 16 0 1 1 70 6Z" fill="#f3dc95" opacity={0.9} />
      <path d={SULING_ROBE} fill="url(#gs-spirit-fade)" stroke="#9fb8d8" strokeWidth={1.6} />
      <path d={SULING_HAIR} fill="#141019" />
      <ellipse cx={50} cy={32} rx={8.5} ry={10} fill="url(#gs-skin-pale)" stroke="#8a8fa8" strokeWidth={1} />
      <path d="M45 32Q47 33.5 49 32M51 32Q53 33.5 55 32" fill="none" stroke="#1d1712" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M48.5 37Q50 38 51.5 37" fill="none" stroke="#b8322a" strokeWidth={1.2} strokeLinecap="round" />
      <path d={SULING_SLEEVES} fill="#f2f6fb" stroke="#9fb8d8" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M50 52L47 64H53Z" fill="url(#gs-skin-pale)" stroke="#8a8fa8" strokeWidth={1} />
      <circle cx={50} cy={21} r={2.6} fill="#9ec6ef" />
      <path d={brush([[30, 88], [42, 92], [50, 97]], 4, 'head')} fill="#c9dcf2" opacity={0.7} />
      <path d={brush([[70, 88], [60, 93], [52, 98]], 4, 'head')} fill="#c9dcf2" opacity={0.7} />
    </ArtSvg>
  )
}

// ---------------------------------------------------------------------------
// The Portal: a moon gate onto the other side.
// ---------------------------------------------------------------------------
const PORTAL_SWIRL =
  brush([[50, 56], [56, 52], [55, 45], [47, 42], [39, 47], [38, 58], [46, 67], [58, 68], [67, 59], [68, 46], [61, 35], [50, 31]], 5, 'head', { min: 0.2 }) +
  brush([[50, 56], [44, 60], [45, 67]], 4, 'head')
const PORTAL_ROOF = brush([[2, 22], [14, 18], [50, 10], [86, 18], [98, 22]], 10, 'belly', { min: 0.4 })

export function PortalIcon({ size = 40, title, ...rest }: P) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Portal'} {...rest}>
      <rect x={7} y={18} width={86} height={78} rx={3} fill="#f6ecd6" opacity={0.8} />
      <rect x={10} y={20} width={80} height={74} fill="#b9ad97" stroke="#3b3129" strokeWidth={3} />
      <path d="M10 44H32M68 44H90M10 70H28M72 70H90M22 20V44M78 20V44M18 70V94M82 70V94" stroke="#7d705d" strokeWidth={1.6} />
      <path d={PORTAL_ROOF} fill="#1d1712" />
      <circle cx={50} cy={56} r={31} fill="#18243f" />
      <circle cx={50} cy={56} r={31} fill="url(#gs-wash-blue)" />
      <circle cx={50} cy={56} r={22} fill="url(#gs-moon-halo)" />
      <path d={PORTAL_SWIRL} fill="#cfe4fa" />
      <circle cx={34} cy={44} r={1.6} fill="#fff" />
      <circle cx={64} cy={70} r={1.4} fill="#fff" />
      <circle cx={62} cy={40} r={1.1} fill="#fff" />
      <circle cx={50} cy={56} r={31} fill="none" stroke="#3b3129" strokeWidth={5} />
      <circle cx={50} cy={56} r={34.5} fill="none" stroke="#e8dfcc" strokeWidth={2} />
    </ArtSvg>
  )
}

// ---------------------------------------------------------------------------
// Receptacle: a stone basin at a village corner that holds a moon crystal.
// ---------------------------------------------------------------------------
export function ReceptacleIcon({ filled, size = 32, title, ...rest }: P & { filled: boolean }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? (filled ? 'Receptacle (filled)' : 'Receptacle (empty)')} {...rest}>
      {filled && <circle cx={50} cy={40} r={40} fill="url(#gs-moon-halo)" />}
      <path d="M14 56H86C84 72 70 80 50 80C30 80 16 72 14 56Z" fill="#f6ecd6" opacity={0.8} stroke="#f6ecd6" strokeWidth={6} strokeLinejoin="round" />
      <path d="M38 78H62L66 94H34Z" fill="url(#gs-stone)" stroke="#2a241f" strokeWidth={2.5} strokeLinejoin="round" />
      {filled ? (
        <CrystalG x={30} y={18} s={40} />
      ) : (
        <path d="M50 18L62 30L57 56H43L38 30Z" fill="none" stroke="#9fb8d8" strokeWidth={2.5} strokeDasharray="4 3.5" strokeLinejoin="round" />
      )}
      <path d="M14 56H86C84 72 70 80 50 80C30 80 16 72 14 56Z" fill="url(#gs-stone)" stroke="#2a241f" strokeWidth={2.5} strokeLinejoin="round" />
      <ellipse cx={50} cy={56} rx={36} ry={6} fill="#2a241f" stroke="#8a8174" strokeWidth={2} />
      <path d={ring(50, 68, 9, 2.6, -2.6, 5.2)} fill="#c9bfae" opacity={0.6} />
      {filled && <path d="M40 52L44 46L48 52Z" fill="#cfe4fa" opacity={0.8} />}
    </ArtSvg>
  )
}
