import type { TaoDieFace } from '@/game/types'

type Props = {
  face: TaoDieFace
  size?: number
}

const FACE_HEX: Record<TaoDieFace, string> = {
  red: '#c1392b',
  green: '#2f8f5d',
  blue: '#2c69b8',
  yellow: '#d4a857',
  black: '#1a1410',
  wild: '#f4e9d6',
}

// The Ghost Stories Tao die has 6 faces: red, green, blue, yellow, and 2 white
// (wild). We render a single visible face here — for an animated roll the
// component would just swap `face`.
export function TaoDie({ face, size = 36 }: Props) {
  const isBlack = face === 'black'
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} style={{ display: 'block' }}>
      <rect
        x={3}
        y={3}
        width={34}
        height={34}
        fill="#f4e9d6"
        stroke="#241b15"
        strokeWidth={1.5}
        rx={5}
      />
      <circle cx={20} cy={20} r={12} fill={FACE_HEX[face]} stroke={isBlack ? '#f4e9d6' : '#241b15'} strokeWidth={1} />
      {face === 'wild' && (
        // Wild face shows a small star
        <path
          d="M20 12 L22 18 L28 18 L23 22 L25 28 L20 24 L15 28 L17 22 L12 18 L18 18 Z"
          fill="#d4a857"
        />
      )}
    </svg>
  )
}
