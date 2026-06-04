import type { ReactElement } from 'react'
import type { VillageTileKind } from '@/game/types'

type Props = {
  kind: VillageTileKind
  haunted?: boolean
  size?: number
}

const TILE_LABELS: Record<VillageTileKind, string> = {
  circleOfPrayer: 'Circle of Prayer',
  buddhistTemple: 'Buddhist Temple',
  cemetery: 'Cemetery',
  taoistAltar: 'Taoist Altar',
  herbalistShop: 'Herbalist',
  sorcerersHut: "Sorcerer's Hut",
  nightWatchmanBeat: 'Night Watch',
  pavilionOfHeavenlyWind: 'Pavilion',
  teaHouse: 'Tea House',
  kungFuSchool: 'Kung-Fu School',
  calligrapher: 'Calligrapher',
}

// Each kind gets a distinct icon glyph. These are placeholders — clear,
// non-copyrighted pictograms. Phase 2 will replace them with proper inline
// illustrations.
const TILE_GLYPHS: Record<VillageTileKind, ReactElement> = {
  // Circle of Prayer — a circle with a smaller dot
  circleOfPrayer: (
    <>
      <circle cx={60} cy={56} r={26} fill="none" stroke="#d4a857" strokeWidth={3} />
      <circle cx={60} cy={56} r={6} fill="#d4a857" />
    </>
  ),
  // Buddhist Temple — torii gate
  buddhistTemple: (
    <>
      <rect x={30} y={28} width={60} height={6} fill="#d4a857" />
      <rect x={32} y={36} width={56} height={4} fill="#d4a857" />
      <rect x={38} y={42} width={6} height={40} fill="#d4a857" />
      <rect x={76} y={42} width={6} height={40} fill="#d4a857" />
    </>
  ),
  // Cemetery — gravestone
  cemetery: (
    <>
      <path d="M40 80 L40 50 Q40 36 60 36 Q80 36 80 50 L80 80 Z" fill="#8a7e6b" />
      <line x1={50} y1={56} x2={70} y2={56} stroke="#241b15" strokeWidth={2} />
      <line x1={60} y1={50} x2={60} y2={64} stroke="#241b15" strokeWidth={2} />
    </>
  ),
  // Taoist Altar — yin-yang
  taoistAltar: (
    <>
      <circle cx={60} cy={56} r={26} fill="#f4e9d6" stroke="#241b15" strokeWidth={2} />
      <path
        d="M60 30 a26 26 0 0 1 0 52 a13 13 0 0 1 0 -26 a13 13 0 0 0 0 -26 Z"
        fill="#241b15"
      />
      <circle cx={60} cy={43} r={3} fill="#241b15" />
      <circle cx={60} cy={69} r={3} fill="#f4e9d6" />
    </>
  ),
  // Herbalist — bundled herbs
  herbalistShop: (
    <>
      <path d="M60 30 Q50 50 50 78 M60 30 Q70 50 70 78 M60 30 L60 78" stroke="#2f8f5d" strokeWidth={3} fill="none" />
      <ellipse cx={60} cy={32} rx={12} ry={4} fill="#d4a857" />
    </>
  ),
  // Sorcerer's Hut — flame
  sorcerersHut: (
    <>
      <path
        d="M60 30 Q50 50 56 60 Q48 56 52 70 Q56 80 60 78 Q64 80 68 70 Q72 56 64 60 Q70 50 60 30 Z"
        fill="#c1392b"
        stroke="#7d2820"
        strokeWidth={1}
      />
    </>
  ),
  // Night Watchman — crescent moon
  nightWatchmanBeat: (
    <>
      <path
        d="M50 36 a22 22 0 1 0 14 40 a18 18 0 1 1 -14 -40 Z"
        fill="#f4e9d6"
      />
    </>
  ),
  // Pavilion of Heavenly Wind — swirl
  pavilionOfHeavenlyWind: (
    <>
      <path
        d="M60 56 m-22 0 a22 22 0 1 1 44 0 a14 14 0 1 0 -28 0 a6 6 0 1 1 12 0"
        fill="none"
        stroke="#2c69b8"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </>
  ),
  // Tea House — cup with steam
  teaHouse: (
    <>
      <path d="M44 56 L46 78 Q46 80 48 80 L72 80 Q74 80 74 78 L76 56 Z" fill="#8a7e6b" />
      <ellipse cx={60} cy={56} rx={16} ry={4} fill="#241b15" />
      <path d="M52 50 q-2 -6 2 -10 M60 50 q-2 -6 2 -10 M68 50 q-2 -6 2 -10" stroke="#f4e9d6" strokeWidth={1.5} fill="none" />
    </>
  ),
  // Kung-Fu School (White Moon) — clenched fist motif
  kungFuSchool: (
    <>
      <circle cx={60} cy={56} r={22} fill="none" stroke="#d4a857" strokeWidth={2} />
      <path
        d="M48 50 L48 64 Q48 70 54 70 L66 70 Q72 70 72 64 L72 50 Q72 46 68 46 L52 46 Q48 46 48 50 Z"
        fill="#d4a857"
      />
      <path d="M48 54 L72 54 M48 60 L72 60 M48 66 L72 66" stroke="#241b15" strokeWidth={1} />
    </>
  ),
  // Calligrapher (Black Secret) — ink brush stroke + scroll
  calligrapher: (
    <>
      <rect x={36} y={42} width={48} height={36} fill="#f4e9d6" stroke="#241b15" strokeWidth={1} />
      {/* Brush stroke calligraphy */}
      <path
        d="M44 52 Q55 56 60 50 Q65 44 76 50 M44 64 Q55 70 60 64 Q65 58 76 64"
        stroke="#241b15"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      {/* Brush handle */}
      <line x1={80} y1={36} x2={88} y2={28} stroke="#8a7e6b" strokeWidth={3} strokeLinecap="round" />
      <circle cx={80} cy={36} r={3} fill="#241b15" />
    </>
  ),
}

export function VillageTile({ kind, haunted = false, size = 120 }: Props) {
  const bg = haunted ? '#1a1410' : '#241b15'
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <rect
        x={2}
        y={2}
        width={116}
        height={116}
        fill={bg}
        stroke={haunted ? '#3a2e25' : '#d4a857'}
        strokeWidth={2}
        rx={6}
      />
      {!haunted && TILE_GLYPHS[kind]}
      {haunted && (
        // Haunted side: faded glyph with overlaid "X"
        <g opacity={0.3}>{TILE_GLYPHS[kind]}</g>
      )}
      {haunted && (
        <path d="M30 30 L90 90 M90 30 L30 90" stroke="#c1392b" strokeWidth={3} />
      )}
      <text x={60} y={108} fontSize={9} fill={haunted ? '#3a2e25' : '#8a7e6b'} textAnchor="middle">
        {haunted ? 'haunted' : TILE_LABELS[kind]}
      </text>
    </svg>
  )
}
