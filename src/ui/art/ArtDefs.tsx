// Shared <defs> for every art component. Render <ArtDefs /> ONCE near the app
// root; the other components reference these by url(#gs-...). Gradients use
// objectBoundingBox units, so they fit any shape they're applied to.
import { prng, smooth, type Pt } from './brush'
import { COLOR_DARK, COLOR_HEX, COLOR_LIGHT } from './palette'
import type { TaoColor } from '@/game/types'
import { GhostDefs } from './ghostDefs'
import { TileDefs } from './tileDefs'

/** Named watercolour washes: url(#gs-wash-<key>). */
export const WASHES = {
  red: COLOR_HEX.red,
  blue: COLOR_HEX.blue,
  green: COLOR_HEX.green,
  yellow: COLOR_HEX.yellow,
  black: '#2a221c',
  gold: '#d9a441',
  violet: '#6a4c8c',
  jade: '#3f8a73',
  ochre: '#b8874a',
  crimson: '#a3243b',
  indigo: '#2f3d6b',
  olive: '#7b7a3a',
  sepia: '#8a5a32',
  rose: '#c46a7a',
  teal: '#2f7d86',
  night: '#2b2537',
  ash: '#8d8a86',
  mist: '#e9e6f2',
  ink: '#1d1712',
} as const
export type WashKey = keyof typeof WASHES

const TAO: readonly TaoColor[] = ['red', 'blue', 'green', 'yellow', 'black']

// Paper fibres: a 120×120 tile of short curved hairs and specks.
const FIBRES = ((): { hairs: string; specks: Pt[] } => {
  const rnd = prng(11)
  let hairs = ''
  for (let i = 0; i < 22; i++) {
    const x = rnd() * 120
    const y = rnd() * 120
    const a = rnd() * Math.PI
    const l = 5 + rnd() * 15
    const b = (rnd() - 0.5) * 5
    const ex = x + Math.cos(a) * l
    const ey = y + Math.sin(a) * l
    hairs += smooth([
      [x, y],
      [(x + ex) / 2 - Math.sin(a) * b, (y + ey) / 2 + Math.cos(a) * b],
      [ex, ey],
    ])
  }
  const specks: Pt[] = []
  for (let i = 0; i < 14; i++) specks.push([rnd() * 120, rnd() * 120])
  return { hairs, specks }
})()

// Paper mottling: a 220×220 tile of faint blotches.
const MOTTLE = ((): Array<[number, number, number, number]> => {
  const rnd = prng(5)
  const out: Array<[number, number, number, number]> = []
  for (let i = 0; i < 7; i++) out.push([rnd() * 220, rnd() * 220, 18 + rnd() * 34, 0.05 + rnd() * 0.06])
  return out
})()

// Dry-brush streaks to lay over solid ink areas (hair, roofs, robes).
const STREAKS = ((): string => {
  const rnd = prng(23)
  let d = ''
  for (let i = 0; i < 9; i++) {
    const y = rnd() * 40
    const x = rnd() * 20 - 10
    const l = 18 + rnd() * 30
    d += smooth([
      [x, y],
      [x + l / 2, y + (rnd() - 0.5) * 3],
      [x + l, y + (rnd() - 0.5) * 3],
    ])
  }
  return d
})()

/** Global CSS for the art set: `gs-rolling` wobbles a die (or anything) mid-roll. */
const ART_CSS = `
@keyframes gs-wobble {
  0% { transform: rotate(0deg) translate(0, 0); }
  20% { transform: rotate(-16deg) translate(-3%, -6%); }
  45% { transform: rotate(13deg) translate(3%, -2%); }
  70% { transform: rotate(-8deg) translate(-2%, -4%); }
  100% { transform: rotate(0deg) translate(0, 0); }
}
.gs-rolling { animation: gs-wobble 0.45s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes gs-breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.gs-pulse { animation: gs-breathe 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .gs-rolling, .gs-pulse { animation: none; } }
`

export function ArtDefs() {
  return (
    <svg
      width={0}
      height={0}
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <style>{ART_CSS}</style>
      <defs>
        {/* ---------------- Paper ---------------- */}
        <linearGradient id="gs-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5ecd6" />
          <stop offset="0.55" stopColor="#ecdfc3" />
          <stop offset="1" stopColor="#dccaa3" />
        </linearGradient>
        <linearGradient id="gs-paper-strip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6d5b0" />
          <stop offset="1" stopColor="#d5bf93" />
        </linearGradient>
        <radialGradient id="gs-vignette" cx="0.5" cy="0.5" r="0.72">
          <stop offset="0.55" stopColor="#7a5a30" stopOpacity="0" />
          <stop offset="1" stopColor="#6b4a22" stopOpacity="0.38" />
        </radialGradient>
        <pattern id="gs-fibre" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d={FIBRES.hairs} fill="none" stroke="#7a5c36" strokeOpacity="0.2" strokeWidth="0.5" strokeLinecap="round" />
          {FIBRES.specks.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.9 : 0.5} fill="#6b4f2c" fillOpacity="0.16" />
          ))}
        </pattern>
        <pattern id="gs-fibre-light" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d={FIBRES.hairs} fill="none" stroke="#e8e2f2" strokeOpacity="0.14" strokeWidth="0.5" strokeLinecap="round" />
        </pattern>
        <pattern id="gs-mottle" width="220" height="220" patternUnits="userSpaceOnUse">
          {MOTTLE.map(([x, y, r, o], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="url(#gs-blotch)" fillOpacity={o * 9} />
          ))}
        </pattern>
        <radialGradient id="gs-blotch">
          <stop offset="0" stopColor="#a5824e" stopOpacity="0.12" />
          <stop offset="1" stopColor="#a5824e" stopOpacity="0" />
        </radialGradient>
        <pattern id="gs-streaks" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d={STREAKS} fill="none" stroke="#efe4cc" strokeOpacity="0.22" strokeWidth="0.8" strokeLinecap="round" />
        </pattern>

        {/* ---------------- Watercolour washes ---------------- */}
        {(Object.keys(WASHES) as WashKey[]).map((k) => (
          <radialGradient key={k} id={`gs-wash-${k}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={WASHES[k]} stopOpacity="0.62" />
            <stop offset="0.55" stopColor={WASHES[k]} stopOpacity="0.32" />
            <stop offset="1" stopColor={WASHES[k]} stopOpacity="0" />
          </radialGradient>
        ))}
        {/* Vertical sky washes */}
        <linearGradient id="gs-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f1a2b" />
          <stop offset="0.6" stopColor="#3b3449" />
          <stop offset="1" stopColor="#5a5266" />
        </linearGradient>
        <linearGradient id="gs-night-strip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4356" />
          <stop offset="1" stopColor="#38313f" />
        </linearGradient>
        <radialGradient id="gs-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f4f1e4" />
          <stop offset="0.7" stopColor="#d9d3c4" />
          <stop offset="1" stopColor="#bdb4a6" />
        </radialGradient>
        <radialGradient id="gs-moon-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.3" stopColor="#e8e3f4" stopOpacity="0.35" />
          <stop offset="1" stopColor="#e8e3f4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gs-mist" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e6e2ef" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#d6d0e3" stopOpacity="0.22" />
          <stop offset="1" stopColor="#d6d0e3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gs-mist-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ded9ea" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ded9ea" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ded9ea" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="gs-eye-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f4fff0" />
          <stop offset="0.3" stopColor="#a9ffc8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#58f09a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gs-red-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1d6" />
          <stop offset="0.3" stopColor="#ff6a4a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#d01e10" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gs-spirit" cx="0.45" cy="0.35" r="0.65">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#e7ece6" />
          <stop offset="1" stopColor="#b5c0bb" />
        </radialGradient>
        <linearGradient id="gs-spirit-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f4ef" stopOpacity="0.95" />
          <stop offset="0.65" stopColor="#dfe6e1" stopOpacity="0.7" />
          <stop offset="1" stopColor="#dfe6e1" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="gs-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff2c4" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#f0c860" stopOpacity="0.45" />
          <stop offset="1" stopColor="#d4a857" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gs-fire" cx="0.5" cy="0.7" r="0.6">
          <stop offset="0" stopColor="#fff4c8" />
          <stop offset="0.45" stopColor="#f5a83a" />
          <stop offset="1" stopColor="#c8401e" />
        </radialGradient>
        <radialGradient id="gs-lantern" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#ffe9a6" />
          <stop offset="0.55" stopColor="#f08a3c" />
          <stop offset="1" stopColor="#b8322a" />
        </radialGradient>
        <radialGradient id="gs-lamp-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb54a" stopOpacity="0" />
        </radialGradient>

        {/* ---------------- Materials ---------------- */}
        <linearGradient id="gs-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8e7a6" />
          <stop offset="0.35" stopColor="#dcb158" />
          <stop offset="0.7" stopColor="#a87b2b" />
          <stop offset="1" stopColor="#e2bd62" />
        </linearGradient>
        <radialGradient id="gs-gold-r" cx="0.38" cy="0.32" r="0.7">
          <stop offset="0" stopColor="#fff3c2" />
          <stop offset="0.45" stopColor="#e0b55c" />
          <stop offset="1" stopColor="#8f6520" />
        </radialGradient>
        <radialGradient id="gs-qi" cx="0.42" cy="0.62" r="0.62">
          <stop offset="0" stopColor="#ffe3d6" />
          <stop offset="0.35" stopColor="#f17a68" />
          <stop offset="0.8" stopColor="#c62f2a" />
          <stop offset="1" stopColor="#8e1915" />
        </radialGradient>
        <radialGradient id="gs-stone" cx="0.4" cy="0.32" r="0.72">
          <stop offset="0" stopColor="#a39a8c" />
          <stop offset="0.6" stopColor="#6c6357" />
          <stop offset="1" stopColor="#3d362f" />
        </radialGradient>
        <radialGradient id="gs-stone-pale" cx="0.4" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#f2ead8" />
          <stop offset="0.65" stopColor="#d4c6a6" />
          <stop offset="1" stopColor="#a8977a" />
        </radialGradient>
        <linearGradient id="gs-ivory" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.6" stopColor="#efe5cf" />
          <stop offset="1" stopColor="#d6c7a6" />
        </linearGradient>
        <linearGradient id="gs-ebony" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a413a" />
          <stop offset="0.5" stopColor="#241d18" />
          <stop offset="1" stopColor="#0f0b09" />
        </linearGradient>
        <linearGradient id="gs-wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5e3b1e" />
          <stop offset="0.5" stopColor="#8a5a2e" />
          <stop offset="1" stopColor="#5a381b" />
        </linearGradient>
        <linearGradient id="gs-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3dcb8" />
          <stop offset="1" stopColor="#d8b086" />
        </linearGradient>
        <linearGradient id="gs-skin-pale" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6efe4" />
          <stop offset="1" stopColor="#d9d3cb" />
        </linearGradient>
        <linearGradient id="gs-moonstone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4fbff" />
          <stop offset="0.45" stopColor="#b5d6f0" />
          <stop offset="1" stopColor="#5b7fb8" />
        </linearGradient>
        <linearGradient id="gs-talisman" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7df7a" />
          <stop offset="1" stopColor="#e2b93e" />
        </linearGradient>
        <radialGradient id="gs-seal" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#d9483c" />
          <stop offset="1" stopColor="#962219" />
        </radialGradient>
        <linearGradient id="gs-bone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6efdc" />
          <stop offset="1" stopColor="#c9bc9c" />
        </linearGradient>
        <radialGradient id="gs-earth" cx="0.45" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#5a4330" />
          <stop offset="0.7" stopColor="#3a2a1d" />
          <stop offset="1" stopColor="#24180f" />
        </radialGradient>
        {/* Logo: mountain ranges that fade into the mist below. */}
        <linearGradient id="gs-fade-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f86a3" stopOpacity="0.75" />
          <stop offset="1" stopColor="#8f86a3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gs-fade-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c4560" stopOpacity="0.95" />
          <stop offset="1" stopColor="#4c4560" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gs-fade-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#120e14" />
          <stop offset="0.75" stopColor="#120e14" stopOpacity="0.7" />
          <stop offset="1" stopColor="#120e14" stopOpacity="0" />
        </linearGradient>
        {/* Fades any group out towards its left / right edges: mask="url(#gs-mask-hfade)". */}
        <linearGradient id="gs-hfade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.16" stopColor="#fff" />
          <stop offset="0.84" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="gs-mask-hfade" maskContentUnits="objectBoundingBox">
          <rect x="0" y="0" width="1" height="1" fill="url(#gs-hfade)" />
        </mask>
        <linearGradient id="gs-title" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbf3e0" />
          <stop offset="0.6" stopColor="#efe1c2" />
          <stop offset="1" stopColor="#c9b48c" />
        </linearGradient>
        <linearGradient id="gs-blood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d3302a" />
          <stop offset="1" stopColor="#6e0f0c" />
        </linearGradient>

        {/* Tao coins, per colour: url(#gs-coin-red) etc. */}
        {TAO.map((c) => (
          <radialGradient key={c} id={`gs-coin-${c}`} cx="0.36" cy="0.3" r="0.78">
            <stop offset="0" stopColor={c === 'black' ? '#6e655d' : COLOR_LIGHT[c]} />
            <stop offset="0.5" stopColor={c === 'yellow' ? '#e2b84a' : COLOR_HEX[c]} />
            <stop offset="1" stopColor={COLOR_DARK[c]} />
          </radialGradient>
        ))}
        {/* Card / frame body per colour: url(#gs-frame-red) etc. */}
        {TAO.map((c) => (
          <linearGradient key={c} id={`gs-frame-${c}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c === 'black' ? '#4d4540' : COLOR_LIGHT[c]} />
            <stop offset="0.45" stopColor={c === 'black' ? '#2b2420' : COLOR_HEX[c]} />
            <stop offset="1" stopColor={COLOR_DARK[c]} />
          </linearGradient>
        ))}

        {/* ---------------- Filters (use sparingly) ---------------- */}
        {/* Roughens edges into ragged ink. Logo / large seals only. */}
        <filter id="gs-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Soft blur for mist banks in big pieces. */}
        <filter id="gs-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>

        <TileDefs />
        <GhostDefs />
      </defs>
    </svg>
  )
}
