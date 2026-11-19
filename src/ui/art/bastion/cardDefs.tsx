// Defs used only by the Horde cards (rendered inside <BastionDefs />).
// Prefix every id with lb-card-. Clip paths are in card units (viewBox
// 0 0 200 300), so one definition serves every card.
import type { TaoColor } from '@/game/types'
import { HIDE, SKY } from './monsters/common'
import { WIN_COMPACT, WIN_NORMAL } from './monsters/layout'

const TAO: readonly TaoColor[] = ['red', 'blue', 'green', 'yellow', 'black']

export function CardDefs() {
  return (
    <>
      <clipPath id="lb-card-win-n">
        <rect x={WIN_NORMAL.x} y={WIN_NORMAL.y} width={WIN_NORMAL.w} height={WIN_NORMAL.h} rx={6} />
      </clipPath>
      <clipPath id="lb-card-win-c">
        <rect x={WIN_COMPACT.x} y={WIN_COMPACT.y} width={WIN_COMPACT.w} height={WIN_COMPACT.h} rx={6} />
      </clipPath>
      {TAO.map((c) => (
        <linearGradient key={`sky-${c}`} id={`lb-card-sky-${c}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[c][0]} />
          <stop offset="0.55" stopColor={SKY[c][1]} />
          <stop offset="1" stopColor={SKY[c][2]} />
        </linearGradient>
      ))}
      {TAO.map((c) => (
        <linearGradient key={`hide-${c}`} id={`lb-card-hide-${c}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={HIDE[c].light} />
          <stop offset="0.45" stopColor={HIDE[c].base} />
          <stop offset="1" stopColor={HIDE[c].deep} />
        </linearGradient>
      ))}
      {TAO.map((c) => (
        <radialGradient key={`aura-${c}`} id={`lb-card-aura-${c}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={HIDE[c].aura} stopOpacity="0.75" />
          <stop offset="0.55" stopColor={HIDE[c].aura} stopOpacity="0.28" />
          <stop offset="1" stopColor={HIDE[c].aura} stopOpacity="0" />
        </radialGradient>
      ))}
      {/* Monster frame: painted enamel in the card colour. */}
      {TAO.map((c) => (
        <linearGradient key={`frame-${c}`} id={`lb-card-frame-${c}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={HIDE[c].frame[0]} />
          <stop offset="0.5" stopColor={HIDE[c].frame[1]} />
          <stop offset="1" stopColor={HIDE[c].frame[2]} />
        </linearGradient>
      ))}
      <linearGradient id="lb-card-warlord" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3b3644" />
        <stop offset="0.4" stopColor="#17141c" />
        <stop offset="1" stopColor="#050407" />
      </linearGradient>
      <linearGradient id="lb-card-plaque" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3ead6" />
        <stop offset="0.55" stopColor="#ddd0b2" />
        <stop offset="1" stopColor="#b9a681" />
      </linearGradient>
      <linearGradient id="lb-card-plaque-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2e2935" />
        <stop offset="1" stopColor="#0c0a0f" />
      </linearGradient>
      <radialGradient id="lb-card-stone" cx="0.4" cy="0.32" r="0.75">
        <stop offset="0" stopColor="#f4ecda" />
        <stop offset="0.65" stopColor="#d6cbb0" />
        <stop offset="1" stopColor="#a99b7e" />
      </radialGradient>
      <radialGradient id="lb-card-vignette" cx="0.5" cy="0.45" r="0.75">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.55" />
      </radialGradient>
      <radialGradient id="lb-card-shadow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0.55" stopColor="#000" stopOpacity="0.5" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="lb-card-lava" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff9a2a" stopOpacity="0" />
        <stop offset="0.5" stopColor="#ff9a2a" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="lb-card-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="1" />
        <stop offset="0.7" stopColor="#fff" stopOpacity="0.85" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <mask id="lb-card-fade-mask" maskContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill="url(#lb-card-fade)" />
      </mask>
      <radialGradient id="lb-card-eye-toxic" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#d8ff5a" stopOpacity="0.9" />
        <stop offset="1" stopColor="#8ad62a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lb-card-eye-frost" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#bff3ff" stopOpacity="0.9" />
        <stop offset="1" stopColor="#5cc8ff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lb-card-orb" cx="0.4" cy="0.35" r="0.65">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </>
  )
}
