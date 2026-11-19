// The landscape behind each Horde card, by colour, drawn in a 176×142 space and
// stretched over the window: red hellfire crags, green dark forest and swamp,
// blue ice cliffs over a frozen sea, yellow bone fields under a sickly sun,
// black the Baleful Queen's citadel in a violet storm.
import type { ReactNode } from 'react'
import type { TaoColor } from '@/game/types'
import { brush, prng, strokes, type Pt } from '../../brush'
import type { Rect } from './layout'

function pine(x: number, base: number, h: number): string {
  const w = h * 0.42
  let d = `M${x - 1.5} ${base}h3v${-h * 0.18}h-3Z`
  for (let i = 0; i < 4; i++) {
    const top = base - h + i * h * 0.2
    const bot = top + h * 0.34
    const half = w * (0.3 + i * 0.2)
    d += `M${x} ${top}L${x - half} ${bot}L${x + half} ${bot}Z`
  }
  return d
}

function specks(seed: number, n: number, x0: number, x1: number, y0: number, y1: number): Array<[number, number, number]> {
  const rnd = prng(seed)
  return Array.from({ length: n }, () => [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 0.6 + rnd() * 1.2])
}

const RED = {
  far: 'M0 92L12 72L22 82L36 50L48 74L62 58L76 84L92 62L106 80L122 48L136 74L150 60L162 76L176 58V142H0Z',
  near: 'M0 112L16 100L28 108L40 96L52 110L70 104L92 112L112 100L130 110L146 98L160 106L176 100V142H0Z',
  cracks: strokes([
    [[[8, 126], [26, 122], [40, 128], [58, 124]], 2.4, 'both'],
    [[[112, 130], [128, 124], [146, 128], [170, 122]], 2.4, 'both'],
    [[[66, 138], [84, 134], [100, 138]], 2, 'both'],
  ]),
  embers: specks(7, 14, 4, 172, 6, 100),
}

const GREEN = {
  far: [pine(10, 118, 64), pine(26, 116, 46), pine(42, 118, 30), pine(136, 118, 34), pine(150, 116, 56), pine(168, 118, 70)].join(''),
  // Dead, twisted trunks framing the window.
  trunks:
    brush([[6, 142], [10, 110], [4, 80], [12, 46], [6, 10]], 12, 'tail') +
    brush([[8, 70], [20, 58], [34, 54]], 4, 'tail') +
    brush([[170, 142], [164, 108], [172, 72], [164, 30]], 11, 'tail') +
    brush([[166, 84], [150, 74], [138, 76]], 4, 'tail'),
  water: 'M0 118Q44 112 88 118T176 116V142H0Z',
  ripples: strokes([
    [[[14, 126], [40, 124], [62, 127]], 1.6, 'both'],
    [[[104, 130], [130, 127], [160, 130]], 1.6, 'both'],
    [[[40, 136], [66, 134], [92, 137]], 1.4, 'both'],
  ]),
  spores: specks(17, 12, 10, 166, 10, 110),
}

const BLUE = {
  clouds: 'M0 0H176V26C160 34 146 22 128 30C112 38 98 24 80 32C62 40 46 26 28 34C16 38 8 32 0 34Z',
  cliffL: 'M0 40L18 34L30 52L26 74L40 96L36 118L0 120Z',
  cliffLFacet: 'M18 34L30 52L14 62ZM26 74L40 96L22 92Z',
  cliffR: 'M176 30L156 38L148 60L156 80L140 104L146 120L176 120Z',
  cliffRFacet: 'M156 38L148 60L164 64ZM156 80L140 104L160 100Z',
  sea: 'M0 112Q44 106 88 112T176 110V142H0Z',
  floes: 'M14 124L34 120L44 124L30 128ZM108 130L132 126L146 130L124 134ZM62 136L80 133L88 137L70 139Z',
  snow: specks(29, 22, 2, 174, 2, 112),
  bolt: 'M128 0L118 22L126 22L112 46L132 18L124 18L134 0Z',
}

const YELLOW = {
  ground: 'M0 110Q30 102 64 108T130 104T176 108V142H0Z',
  stones: 'M14 108V88Q14 80 22 80Q30 80 30 88V108ZM146 104V90Q146 84 152 84Q158 84 158 90V104ZM162 108V96Q162 92 166 92Q170 92 170 96V108Z',
  arch: 'M112 108V74Q112 56 128 56Q144 56 144 74V108H136V76Q136 66 128 66Q120 66 120 76V108Z',
  ribs: strokes([
    [[[26, 128], [30, 118], [40, 114]], 2.6, 'tail'],
    [[[34, 130], [38, 120], [48, 116]], 2.6, 'tail'],
    [[[42, 131], [46, 122], [55, 119]], 2.4, 'tail'],
    [[[22, 131], [40, 132], [58, 131]], 2.2, 'none'],
  ]),
  skulls: [
    [150, 128],
    [72, 134],
  ] as Pt[],
  motes: specks(41, 10, 8, 168, 10, 100),
}

const BLACK = {
  citadel:
    'M54 112V74L60 64V40L64 30L68 40V60L76 52V24L80 6L84 24V52L92 60V40L96 30L100 40V64L106 74V112Z' +
    'M20 112V88L26 80L32 88V112ZM140 112V84L146 74L152 84V112Z',
  wall: 'M0 112H176V122H0Z',
  battlements: 'M0 112V106H8V112H16V106H24V112H32V106H40V112H136V106H144V112H152V106H160V112H168V106H176V112Z',
  windows: 'M78 34h4v8h-4ZM65 48h3v6h-3ZM93 48h3v6h-3ZM79 64h3v6h-3Z',
  ground: 'M0 120Q50 114 88 122T176 118V142H0Z',
  swirl: strokes([
    [[[0, 30], [30, 20], [60, 30], [92, 18]], 8, 'both'],
    [[[90, 40], [120, 28], [150, 38], [176, 26]], 7, 'both'],
  ]),
  bolt: 'M30 0L22 20L30 20L18 44L36 16L28 16L36 0Z',
}

export function Backdrop({ color, win }: { color: TaoColor; win: Rect }) {
  const k = `translate(${win.x} ${win.y}) scale(${win.w / 176} ${win.h / 142})`
  let land: ReactNode = null
  switch (color) {
    case 'red':
      land = (
        <>
          <path d={RED.far} fill="#3a0b07" />
          <rect y={86} width={176} height={36} fill="url(#lb-card-lava)" />
          <path d={RED.near} fill="#160403" />
          <path d={RED.cracks} fill="#ff8a2a" />
          {RED.embers.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#ffc35a" opacity={0.85} />
          ))}
        </>
      )
      break
    case 'green':
      land = (
        <>
          <path d={GREEN.far} fill="#0d2117" />
          <path d={GREEN.water} fill="#1c3828" />
          <path d={GREEN.ripples} fill="#8fbf6a" opacity={0.5} />
          <path d={GREEN.trunks} fill="#050c08" />
          {GREEN.spores.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#d8ff5a" opacity={0.75} />
          ))}
        </>
      )
      break
    case 'blue':
      land = (
        <>
          <path d={BLUE.clouds} fill="#050c1e" opacity={0.85} />
          <path d={BLUE.bolt} fill="#e8f8ff" opacity={0.8} />
          <path d={BLUE.cliffL} fill="#9ec7e6" />
          <path d={BLUE.cliffLFacet} fill="#5f8fbf" />
          <path d={BLUE.cliffR} fill="#9ec7e6" />
          <path d={BLUE.cliffRFacet} fill="#5f8fbf" />
          <path d={BLUE.sea} fill="#0f2950" />
          <path d={BLUE.floes} fill="#d8eefa" opacity={0.85} />
          {BLUE.snow.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r * 0.8} fill="#ffffff" opacity={0.75} />
          ))}
        </>
      )
      break
    case 'yellow':
      land = (
        <>
          <circle cx={134} cy={34} r={26} fill="#f6e9a0" opacity={0.25} />
          <circle cx={134} cy={34} r={14} fill="#f3e6a0" opacity={0.85} />
          <path d={YELLOW.arch} fill="#2a2210" />
          <path d={YELLOW.stones} fill="#2a2210" />
          <path d={YELLOW.ground} fill="#3a2f14" />
          <path d={YELLOW.ribs} fill="#e6d9b2" opacity={0.85} />
          {YELLOW.skulls.map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={6} ry={5} fill="#e6d9b2" />
              <circle cx={x - 2.2} cy={y} r={1.4} fill="#3a2f14" />
              <circle cx={x + 2.2} cy={y} r={1.4} fill="#3a2f14" />
            </g>
          ))}
          {YELLOW.motes.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#d8ff8a" opacity={0.6} />
          ))}
        </>
      )
      break
    case 'black':
      land = (
        <>
          <path d={BLACK.swirl} fill="#7a4aa8" opacity={0.35} />
          <path d={BLACK.bolt} fill="#e0b5ff" opacity={0.85} />
          <path d={BLACK.citadel} fill="#07040b" />
          <path d={BLACK.windows} fill="#c27cff" />
          <path d={BLACK.battlements} fill="#07040b" />
          <path d={BLACK.wall} fill="#07040b" />
          <path d={BLACK.ground} fill="#0d0912" />
        </>
      )
      break
  }
  return (
    <g>
      <rect x={win.x} y={win.y} width={win.w} height={win.h} fill={`url(#lb-card-sky-${color})`} />
      <g transform={k}>
        {land}
        {/* the glow the figure stands in */}
        <ellipse cx={88} cy={74} rx={74} ry={66} fill={`url(#lb-card-aura-${color})`} />
      </g>
    </g>
  )
}
