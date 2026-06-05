import type { TaoistColor } from '@/game/types'
import { TAOIST_COLOR_HEX, TAOIST_COLOR_DARK } from '@/ui/shared/playerColors'

type Props = {
  color: TaoistColor
  size?: number
  dead?: boolean
}

export function Taoist({ color, size = 48, dead = false }: Props) {
  const fill = TAOIST_COLOR_HEX[color]
  const shadow = TAOIST_COLOR_DARK[color]
  return (
    <svg
      viewBox="0 0 32 48"
      width={size * (32 / 48)}
      height={size}
      style={{ display: 'block', transform: dead ? 'rotate(90deg)' : undefined }}
    >
      {/* Robe — wide cone */}
      <path
        d="M16 14 L4 44 L28 44 Z"
        fill={fill}
        stroke={shadow}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {/* Sash */}
      <rect x={10} y={28} width={12} height={2} fill={shadow} />
      {/* Head — hairline circle */}
      <circle cx={16} cy={10} r={5} fill="#f0d8b0" stroke={shadow} strokeWidth={1} />
      {/* Topknot */}
      <circle cx={16} cy={4.5} r={2} fill={shadow} />
      {/* Eyes */}
      <circle cx={14} cy={10} r={0.6} fill="#241b15" />
      <circle cx={18} cy={10} r={0.6} fill="#241b15" />
      {/* Arms */}
      <path d="M16 16 L7 30 M16 16 L25 30" stroke={shadow} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  )
}
