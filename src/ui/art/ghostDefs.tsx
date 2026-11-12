// Shared defs used only by the ghost cards (rendered inside <ArtDefs />).
// Prefix every id with gs-ghost-. Clip paths are in card units (viewBox
// 0 0 200 300), so one definition serves every card.
import { WIN_COMPACT, WIN_NORMAL } from './ghosts/layout'

export function GhostDefs() {
  return (
    <>
      <clipPath id="gs-ghost-win-n">
        <rect x={WIN_NORMAL.x} y={WIN_NORMAL.y} width={WIN_NORMAL.w} height={WIN_NORMAL.h} rx={7} />
      </clipPath>
      <clipPath id="gs-ghost-win-c">
        <rect x={WIN_COMPACT.x} y={WIN_COMPACT.y} width={WIN_COMPACT.w} height={WIN_COMPACT.h} rx={7} />
      </clipPath>
      {/* Black lacquer of an incarnation's frame. */}
      <linearGradient id="gs-ghost-lacquer" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3a2f27" />
        <stop offset="0.4" stopColor="#16110e" />
        <stop offset="1" stopColor="#050403" />
      </linearGradient>
      <linearGradient id="gs-ghost-banner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbf4e2" />
        <stop offset="1" stopColor="#e2d0a8" />
      </linearGradient>
      <linearGradient id="gs-ghost-banner-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2c231d" />
        <stop offset="1" stopColor="#0d0a08" />
      </linearGradient>
      {/* Shadow under the ability stones. */}
      <radialGradient id="gs-ghost-stone-shadow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0.6" stopColor="#000" stopOpacity="0.45" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
    </>
  )
}
