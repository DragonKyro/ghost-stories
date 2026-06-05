import type { GhostColor, GhostResistance, TaoColor } from '@/game/types'

type Props = {
  color: GhostColor
  resistance: GhostResistance
  width?: number
  // Optional placeholder labels for the three stones.
  leftLabel?: string
  centerLabel?: string
  rightLabel?: string
}

const GHOST_COLOR_HEX: Record<GhostColor, string> = {
  red: '#c1392b',
  green: '#2f8f5d',
  blue: '#2c69b8',
  yellow: '#d4a857',
  black: '#1a1410',
}

const TAO_COLOR_HEX: Record<TaoColor, string> = GHOST_COLOR_HEX

export function GhostCard({
  color,
  resistance,
  width = 100,
  leftLabel = '',
  centerLabel = '',
  rightLabel = '',
}: Props) {
  const height = width * 1.5
  const borderColor = GHOST_COLOR_HEX[color]

  // Resistance pips along the top: render each colored requirement.
  const pips: Array<{ color: TaoColor; idx: number }> = []
  for (const tc of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) {
    const n = resistance[tc] ?? 0
    for (let i = 0; i < n; i++) pips.push({ color: tc, idx: pips.length })
  }

  return (
    <svg viewBox="0 0 100 150" width={width} height={height} style={{ display: 'block' }}>
      <rect x={2} y={2} width={96} height={146} fill="#241b15" stroke={borderColor} strokeWidth={4} rx={4} />

      {/* Resistance pips */}
      <g transform="translate(10, 12)">
        {pips.map(({ color: c, idx }) => (
          <circle key={idx} cx={idx * 14 + 6} cy={6} r={5} fill={TAO_COLOR_HEX[c]} stroke="#f4e9d6" strokeWidth={0.6} />
        ))}
      </g>

      {/* Spook silhouette */}
      <path
        d="M30 60 Q30 38 50 38 Q70 38 70 60 L70 90 L62 86 L54 90 L46 86 L38 90 L30 86 Z"
        fill="#f4e9d6"
        opacity={0.7}
      />
      <circle cx={44} cy={56} r={2.5} fill="#241b15" />
      <circle cx={56} cy={56} r={2.5} fill="#241b15" />

      {/* Three ability stones along the bottom */}
      <g transform="translate(0, 108)">
        <circle cx={20} cy={18} r={14} fill="#1a1410" stroke="#8a7e6b" strokeWidth={1} />
        <circle cx={50} cy={18} r={14} fill="#1a1410" stroke="#8a7e6b" strokeWidth={1} />
        <circle cx={80} cy={18} r={14} fill="#1a1410" stroke="#8a7e6b" strokeWidth={1} />
        <text x={20} y={22} fontSize={9} textAnchor="middle" fill="#8a7e6b">{leftLabel || 'L'}</text>
        <text x={50} y={22} fontSize={9} textAnchor="middle" fill="#8a7e6b">{centerLabel || 'C'}</text>
        <text x={80} y={22} fontSize={9} textAnchor="middle" fill="#8a7e6b">{rightLabel || 'R'}</text>
      </g>
    </svg>
  )
}
