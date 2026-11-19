// Shared <defs> of the Last Bastion art set (rendered inside <ArtDefs />).
// Every id starts with lb-; the tiles, cards and pieces add their own
// (lb-tile-, lb-card-, lb-piece-) from their defs files.
import type { TaoColor } from '@/game/types'
import { COLOR_DARK, COLOR_HEX, COLOR_LIGHT } from '../palette'
import { CardDefs } from './cardDefs'
import { LogoDefs } from './Logo'
import { PieceDefs } from './pieceDefs'
import { TileDefs } from './tileDefs'
import {
  CORRUPT,
  CORRUPT_DEEP,
  CORRUPT_GLOW,
  IRON,
  IRON_LIGHT,
  LB_GOLD,
  LB_GOLD_DEEP,
  LB_GOLD_LIGHT,
  PARCHMENT,
  PARCHMENT_DARK,
  STEEL,
  STEEL_SHADE,
  STONE,
  STONE_DARK,
  STONE_LIGHT,
  TORCH,
  TORCH_LIGHT,
} from './palette'

const TAO: readonly TaoColor[] = ['red', 'blue', 'green', 'yellow', 'black']

/**
 * Ambient motion for the Bastion art. Tag a <g> with one of these classes:
 *   lb-flicker      torch / hearth flames (scales from the base of its box)
 *   lb-grasp-pulse  the violet glow of the Grasp of Evil
 *   lb-shimmer      holy light, water, magic (slow opacity breathing)
 *   lb-sway         banners and pennants (skews from the left edge)
 * Keep it to a few small groups per piece; cards don't animate (twelve sit on
 * the board). Reduced motion turns it all off.
 */
export const BASTION_ART_CSS = `
@keyframes lb-flicker {
  0%, 100% { opacity: 1; transform: scale(1, 1); }
  25% { opacity: 0.86; transform: scale(0.95, 1.06); }
  55% { opacity: 0.96; transform: scale(1.04, 0.95); }
  80% { opacity: 0.9; transform: scale(0.98, 1.03); }
}
.lb-flicker { animation: lb-flicker 1.7s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
@keyframes lb-glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
.lb-grasp-pulse { animation: lb-glow 3.2s ease-in-out infinite; }
.lb-shimmer { animation: lb-glow 4.2s ease-in-out infinite; }
@keyframes lb-sway { 0%, 100% { transform: skewY(0deg); } 50% { transform: skewY(-4deg); } }
.lb-sway { animation: lb-sway 3.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 0 50%; }
@media (prefers-reduced-motion: reduce) { .lb-flicker, .lb-grasp-pulse, .lb-shimmer, .lb-sway { animation: none; } }
`

export function BastionDefs() {
  return (
    <>
      <style>{BASTION_ART_CSS}</style>
      {/* Enamel of each colour (Equipment tokens, resistance gems, die faces). */}
      {TAO.map((c) => (
        <radialGradient key={c} id={`lb-enamel-${c}`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor={c === 'black' ? '#5b5866' : COLOR_LIGHT[c]} />
          <stop offset="0.55" stopColor={c === 'black' ? '#26242c' : COLOR_HEX[c]} />
          <stop offset="1" stopColor={c === 'black' ? '#0b0a0e' : COLOR_DARK[c]} />
        </radialGradient>
      ))}
      {/* Cloth / painted wood in each colour (hero tabards, banners, Horde frames). */}
      {TAO.map((c) => (
        <linearGradient key={c} id={`lb-cloth-${c}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={c === 'black' ? '#4a4652' : COLOR_LIGHT[c]} />
          <stop offset="0.45" stopColor={c === 'black' ? '#24222a' : COLOR_HEX[c]} />
          <stop offset="1" stopColor={c === 'black' ? '#08070a' : COLOR_DARK[c]} />
        </linearGradient>
      ))}
      <linearGradient id="lb-gold" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stopColor={LB_GOLD_LIGHT} />
        <stop offset="0.5" stopColor={LB_GOLD} />
        <stop offset="1" stopColor={LB_GOLD_DEEP} />
      </linearGradient>
      <linearGradient id="lb-iron" x1="0" y1="0" x2="0.5" y2="1">
        <stop offset="0" stopColor={IRON_LIGHT} />
        <stop offset="0.5" stopColor={IRON} />
        <stop offset="1" stopColor="#1c1e23" />
      </linearGradient>
      <linearGradient id="lb-steel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.45" stopColor={STEEL} />
        <stop offset="1" stopColor={STEEL_SHADE} />
      </linearGradient>
      <linearGradient id="lb-stone" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor={STONE_LIGHT} />
        <stop offset="0.5" stopColor={STONE} />
        <stop offset="1" stopColor={STONE_DARK} />
      </linearGradient>
      <linearGradient id="lb-parchment" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6ecd4" />
        <stop offset="0.6" stopColor={PARCHMENT} />
        <stop offset="1" stopColor={PARCHMENT_DARK} />
      </linearGradient>
      <radialGradient id="lb-heart" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#ff9a8a" />
        <stop offset="0.45" stopColor="#d22b2b" />
        <stop offset="1" stopColor="#6a0c12" />
      </radialGradient>
      <linearGradient id="lb-bone" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fbf7ee" />
        <stop offset="0.6" stopColor="#e6dcc8" />
        <stop offset="1" stopColor="#b8ab92" />
      </linearGradient>
      <linearGradient id="lb-obsidian" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4a3a5c" />
        <stop offset="0.45" stopColor="#1d1426" />
        <stop offset="1" stopColor="#07050a" />
      </linearGradient>
      {/* Glows: torchlight, holy light, corruption. Transparent at the rim. */}
      <radialGradient id="lb-torch-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={TORCH_LIGHT} stopOpacity="0.85" />
        <stop offset="0.4" stopColor={TORCH} stopOpacity="0.35" />
        <stop offset="1" stopColor={TORCH} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lb-holy-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="0.45" stopColor="#fff1b8" stopOpacity="0.35" />
        <stop offset="1" stopColor="#fff1b8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lb-corrupt-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={CORRUPT_GLOW} stopOpacity="0.8" />
        <stop offset="0.5" stopColor={CORRUPT} stopOpacity="0.4" />
        <stop offset="1" stopColor={CORRUPT_DEEP} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lb-eye-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff6d8" />
        <stop offset="0.35" stopColor="#ffb13b" stopOpacity="0.9" />
        <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lb-violet-eye" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.35" stopColor={CORRUPT_GLOW} stopOpacity="0.9" />
        <stop offset="1" stopColor={CORRUPT_GLOW} stopOpacity="0" />
      </radialGradient>
      <LogoDefs />
      <CardDefs />
      <TileDefs />
      <PieceDefs />
    </>
  )
}
