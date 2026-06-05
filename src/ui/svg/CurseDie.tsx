import type { ReactElement } from 'react'
import type { CurseFace } from '@/game/types'

type Props = {
  face: CurseFace
  size?: number
}

const GLYPHS: Record<CurseFace, ReactElement> = {
  none: <circle cx={20} cy={20} r={3} fill="#8a7e6b" />,
  haunt: (
    // ghost silhouette
    <path
      d="M14 14 Q14 10 20 10 Q26 10 26 14 L26 28 L23 26 L20 28 L17 26 L14 28 Z"
      fill="#c1392b"
    />
  ),
  spawnGhost: (
    // plus sign
    <>
      <rect x={18} y={10} width={4} height={20} fill="#2c69b8" />
      <rect x={10} y={18} width={20} height={4} fill="#2c69b8" />
    </>
  ),
  loseAllTao: (
    // crossed-out token
    <>
      <circle cx={20} cy={20} r={8} fill="#d4a857" />
      <path d="M12 12 L28 28" stroke="#241b15" strokeWidth={3} />
    </>
  ),
  loseQi: (
    // heart-with-slash
    <>
      <path
        d="M20 28 Q12 22 12 16 Q12 12 16 12 Q19 12 20 15 Q21 12 24 12 Q28 12 28 16 Q28 22 20 28 Z"
        fill="#c1392b"
      />
      <path d="M12 12 L28 28" stroke="#241b15" strokeWidth={2} />
    </>
  ),
}

export function CurseDie({ face, size = 40 }: Props) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} style={{ display: 'block' }}>
      <rect
        x={3}
        y={3}
        width={34}
        height={34}
        fill="#1a1410"
        stroke="#c1392b"
        strokeWidth={1.5}
        rx={5}
      />
      {GLYPHS[face]}
    </svg>
  )
}
