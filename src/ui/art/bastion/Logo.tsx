// Title art for Last Bastion: a crimson kite shield with a gold tower over
// crossed swords, "LAST BASTION" in gilded capitals, and the fortress on its
// crag against a burning dusk while the Horde's torches gather in the valley.
// Transparent background — made for the dark menu screen.
import { ArtSvg, type ArtBaseProps } from '../ArtSvg'
import { prng, smooth, type Pt } from '../brush'
import { CRIMSON, CRIMSON_DARK, LB_GOLD, LB_GOLD_DEEP, LB_GOLD_LIGHT, LB_INK, STEEL, STEEL_SHADE, TORCH, TORCH_LIGHT } from './palette'

const TITLE_FONT = "'Palatino Linotype', Palatino, 'Book Antiqua', 'URW Palladio L', Georgia, serif"

// ---- the fortress (right) ---------------------------------------------------
// Drawn at full size, then scaled down to stand on the gilded rule (y 118).
const HILL = smooth([[392, 214], [420, 202], [452, 196], [500, 194], [556, 195], [598, 200], [624, 212], [624, 220], [392, 220]], true)
const FORT_FIT = 'translate(176 -14.6) scale(0.66)'

/** A run of merlons along y, from x0 to x1. */
function merlons(x0: number, x1: number, y: number, w = 7, h = 7): string {
  let d = ''
  for (let x = x0; x + w <= x1 + 0.1; x += w * 2) d += `M${x} ${y}h${w}v${-h}h${-w}Z`
  return d
}
const WALL = `M436 198V160H586V196Z${merlons(436, 586, 160, 6, 6)}`
const KEEP = `M494 172V74H544V172Z${merlons(494, 544, 74, 7.2, 8)}`
const TOWER_L = 'M446 166V112H474V166Z'
const ROOF_L = 'M442 113L460 70L478 113Z'
const TOWER_R = 'M560 166V104H588V166Z'
const ROOF_R = 'M556 105L574 58L592 105Z'
const GATE = 'M510 198V178Q519 168 528 178V198Z'
const WINDOWS: Array<[number, number, number, number]> = [
  [504, 92, 5, 9],
  [532, 92, 5, 9],
  [517, 118, 5, 10],
  [456, 126, 4, 8],
  [570, 120, 4, 8],
  [504, 146, 5, 8],
  [532, 146, 5, 8],
]
// Banner on the keep: pole and a swallow-tailed flag.
const BANNER = 'M521 74V30'
const FLAG = 'M522 32H560L551 41L560 50H522Z'

// ---- sky ---------------------------------------------------------------------
const CLOUDS: Array<[string, number]> = [
  [smooth([[408, 26], [440, 16], [476, 20], [500, 10], [540, 12], [574, 6], [600, 14], [596, 28], [556, 30], [512, 28], [470, 34], [430, 36]], true), 0.8],
  [smooth([[420, 62], [452, 54], [486, 58], [500, 52], [470, 68], [440, 70]], true), 0.55],
]

// Watch fires of the Horde along the foot of the hill.
const CAMPFIRES: Pt[] = (() => {
  const rnd = prng(41)
  const out: Pt[] = []
  for (let i = 0; i < 9; i++) out.push([404 + i * 20 + rnd() * 8, 113 + rnd() * 3])
  return out
})()

// ---- the crest (left) ------------------------------------------------------
const SHIELD = 'M75 8L138 24Q142 92 75 150Q8 92 12 24Z'
const SHIELD_INNER = 'M75 20L127 33Q128 88 75 136Q22 88 23 33Z'
const CREST_TOWER = `M52 112V62H46V48H54V54H62V48H70V54H80V48H88V54H96V48H104V62H98V112Z`
const CREST_GATE = 'M66 112V94Q75 84 84 94V112Z'
/** A sword (point up) centred on x = 0, for rotating behind the shield. */
const SWORD_BLADE = 'M-5.5 -104L0 -122L5.5 -104L5.5 40H-5.5Z'
const SWORD_GUARD = 'M-22 40H22V48H-22Z'
const SWORD_GRIP = 'M-4 48H4V70H-4Z'

function Sword({ angle }: { angle: number }) {
  return (
    <g transform={`translate(75 84) rotate(${angle})`}>
      <path d={SWORD_BLADE} fill={STEEL} stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
      <path d="M0 -116V36" stroke={STEEL_SHADE} strokeWidth={2.4} />
      <path d={SWORD_GUARD} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
      <path d={SWORD_GRIP} fill="#3a2414" stroke={LB_INK} strokeWidth={2.6} />
      <circle cx={0} cy={75} r={7} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={2.6} />
    </g>
  )
}

export function BastionLogo({ width = 480, title = 'Last Bastion', ...rest }: ArtBaseProps & { width?: number }) {
  return (
    <ArtSvg width={width} height={(width * 260) / 600} viewBox="0 0 600 260" title={title} {...rest}>
      {/* dusk: the sun sunk behind the keep, storm clouds above */}
      <ellipse cx={510} cy={78} rx={110} ry={66} fill="url(#lb-logo-dusk)" />
      <circle cx={518} cy={70} r={34} fill="url(#lb-logo-sun)" />
      {CLOUDS.map(([d, o], i) => (
        <path key={i} d={d} fill="#1a1622" opacity={o} />
      ))}

      {/* the fortress on its hill, standing on the rule */}
      <g transform={FORT_FIT}>
        <g fill="#100d14">
          <path d={HILL} />
          <path d={WALL} />
          <path d={TOWER_L} />
          <path d={ROOF_L} />
          <path d={TOWER_R} />
          <path d={ROOF_R} />
          <path d={KEEP} />
        </g>
        <path d={`${ROOF_L}${ROOF_R}`} fill="none" stroke="#4a2a2a" strokeWidth={2} />
        <path d={GATE} fill="#3a1a10" />
        <g className="lb-flicker">
          {WINDOWS.map(([x, y, w, h], i) => (
            <g key={i}>
              <ellipse cx={x + w / 2} cy={y + h / 2} rx={w * 2.4} ry={h * 1.6} fill="url(#lb-torch-glow)" opacity={0.55} />
              <rect x={x} y={y} width={w} height={h} rx={w / 2} fill={TORCH_LIGHT} />
            </g>
          ))}
        </g>
        <path d={BANNER} stroke="#100d14" strokeWidth={3.5} />
        <g className="lb-sway">
          <path d={FLAG} fill={CRIMSON} stroke="#100d14" strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M530 41h12" stroke={LB_GOLD} strokeWidth={3} strokeLinecap="round" />
        </g>
      </g>
      <g className="lb-shimmer">
        {CAMPFIRES.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill="url(#lb-torch-glow)" />
            <circle cx={x} cy={y} r={1.1} fill={i % 3 === 0 ? TORCH_LIGHT : TORCH} />
          </g>
        ))}
      </g>

      {/* the crest: crossed swords behind a kite shield */}
      <g transform="translate(30 46)">
        <Sword angle={-44} />
        <Sword angle={44} />
        <path d={SHIELD} fill="#000" opacity={0.5} transform="translate(4 6)" />
        <path d={SHIELD} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={4} strokeLinejoin="round" />
        <path d={SHIELD_INNER} fill={`url(#lb-logo-field)`} stroke={CRIMSON_DARK} strokeWidth={2} />
        <path d={CREST_TOWER} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={3} strokeLinejoin="round" />
        <path d={CREST_GATE} fill={CRIMSON_DARK} stroke={LB_INK} strokeWidth={2.4} />
        <rect x={72} y={68} width={6} height={12} rx={3} fill={CRIMSON_DARK} />
        <path d="M30 40Q48 26 74 22" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={5} strokeLinecap="round" />
      </g>

      {/* the title */}
      <g fontFamily={TITLE_FONT} fontWeight={700}>
        <text x={203} y={97} fontSize={60} letterSpacing={6} textLength={176} lengthAdjust="spacingAndGlyphs" fill="#000" opacity={0.6}>
          LAST
        </text>
        <text
          x={199}
          y={93}
          fontSize={60}
          letterSpacing={6}
          textLength={176}
          lengthAdjust="spacingAndGlyphs"
          fill="url(#lb-logo-gold)"
          stroke={LB_INK}
          strokeWidth={4}
          paintOrder="stroke"
        >
          LAST
        </text>
        <text x={203} y={209} fontSize={98} textLength={384} lengthAdjust="spacingAndGlyphs" fill="#000" opacity={0.6}>
          BASTION
        </text>
        <text
          x={198}
          y={204}
          fontSize={98}
          textLength={384}
          lengthAdjust="spacingAndGlyphs"
          fill="url(#lb-logo-gold)"
          stroke={LB_INK}
          strokeWidth={4.5}
          paintOrder="stroke"
        >
          BASTION
        </text>
      </g>
      {/* a gilded rule with a ruby between the words */}
      <path d="M200 118H578" stroke={LB_INK} strokeWidth={6} strokeLinecap="round" />
      <path d="M200 118H578" stroke={LB_GOLD} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M200 117H578" stroke={LB_GOLD_LIGHT} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
      <path d="M389 106L401 118L389 130L377 118Z" fill={CRIMSON} stroke={LB_GOLD} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M385 113L389 109L393 113" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.6} />
      <circle cx={200} cy={118} r={3} fill={LB_GOLD} />
      <circle cx={578} cy={118} r={3} fill={LB_GOLD} />
    </ArtSvg>
  )
}

/** Gradients used only by the logo (rendered once inside <BastionDefs />). */
export function LogoDefs() {
  return (
    <>
      <linearGradient id="lb-logo-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff3c4" />
        <stop offset="0.38" stopColor={LB_GOLD_LIGHT} />
        <stop offset="0.52" stopColor={LB_GOLD} />
        <stop offset="0.56" stopColor="#b8862f" />
        <stop offset="1" stopColor={LB_GOLD_DEEP} />
      </linearGradient>
      <linearGradient id="lb-logo-field" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#c8343a" />
        <stop offset="0.6" stopColor={CRIMSON} />
        <stop offset="1" stopColor={CRIMSON_DARK} />
      </linearGradient>
      <radialGradient id="lb-logo-dusk" cx="0.5" cy="0.6" r="0.5">
        <stop offset="0" stopColor="#e0703a" stopOpacity="0.55" />
        <stop offset="0.45" stopColor="#8a2a3a" stopOpacity="0.3" />
        <stop offset="1" stopColor="#3a1a3a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lb-logo-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffe2a0" />
        <stop offset="0.5" stopColor="#f3a13b" stopOpacity="0.85" />
        <stop offset="1" stopColor="#e2572b" stopOpacity="0" />
      </radialGradient>
    </>
  )
}
