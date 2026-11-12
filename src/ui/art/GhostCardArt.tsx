// A ghost card: coloured frame, name banner, resistance coins, an ink-wash
// ghost, and the three ability stones (on arrival / each Yin phase / when
// exorcised). Wu-Feng incarnations get a black-and-gold frame and a seal.
import type { ReactNode } from 'react'
import type { Ability, GhostCard, TaoColor } from '@/game/types'
import { AbilityGlyph } from './AbilityIcon'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { blob, brush, hashStr, strokes, type Pt } from './brush'
import { CoinG, SealG } from './glyphs'
import { COLOR_DARK, COLOR_HEX } from './palette'
import { tintFor, type Design } from './ghosts/common'
import { GHOST_DESIGNS, KEYWORDS, SPECIAL_DESIGNS, type GhostDesignId } from './ghosts/designs'
import { INCARNATION_DESIGNS } from './ghosts/incarnations'
import { STONES_COMPACT, STONES_NORMAL, WIN_COMPACT, WIN_NORMAL, type Rect, type StoneLayout } from './ghosts/layout'

export interface GhostCardArtProps extends ArtBaseProps {
  card: GhostCard
  width?: number
  /** Board size (70–95px wide): no name, bigger coins and stones. */
  compact?: boolean
}

const TAO_ORDER: readonly TaoColor[] = ['red', 'blue', 'green', 'yellow', 'black']
const DESIGN_IDS = Object.keys(GHOST_DESIGNS) as GhostDesignId[]
const SERIF = "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif"

function isSkeleton(card: GhostCard): boolean {
  return card.id === 'skeleton' || card.id === 'bones'
}
function isSummon(card: GhostCard): boolean {
  return card.id.startsWith('summon')
}

function pickDesign(card: GhostCard): Design {
  if (card.incarnation) return INCARNATION_DESIGNS[card.incarnation]
  if (isSkeleton(card)) return SPECIAL_DESIGNS.skeleton
  if (isSummon(card)) return SPECIAL_DESIGNS.summon
  for (const [re, id] of KEYWORDS) if (re.test(card.name)) return GHOST_DESIGNS[id]
  return GHOST_DESIGNS[DESIGN_IDS[hashStr(card.id) % DESIGN_IDS.length]]
}

// ---------------------------------------------------------------------------
// Backdrops: a landscape hint per colour (mountain, river, forest, marsh, ash),
// drawn in a 176×142 space and stretched over the window.
// ---------------------------------------------------------------------------
function pine(x: number, base: number, h: number): string {
  const w = h * 0.5
  let d = `M${x - 1.5} ${base}h3v${-h * 0.2}h-3Z`
  for (let i = 0; i < 3; i++) {
    const top = base - h + i * h * 0.24
    const bot = top + h * 0.42
    const half = w * (0.45 + i * 0.22)
    d += `M${x} ${top}L${x - half} ${bot}L${x + half} ${bot}Z`
  }
  return d
}
const BACK = {
  mountainsFar: 'M0 100L22 70L36 84L62 42L86 78L106 56L132 90L152 64L176 82V142H0Z',
  mountainsNear: 'M0 122L30 96L50 110L78 86L104 114L128 98L152 116L176 104V142H0Z',
  pines: [pine(14, 142, 70), pine(32, 142, 50), pine(150, 142, 76), pine(168, 142, 52), pine(132, 142, 40)].join(''),
  waves: strokes([
    [[[0, 112], [30, 106], [60, 114], [92, 106], [124, 114], [156, 106], [176, 110]], 3.2, 'both'],
    [[[0, 126], [34, 120], [66, 128], [100, 120], [132, 128], [176, 122]], 3, 'both'],
    [[[6, 138], [40, 133], [74, 140], [108, 134], [146, 140], [176, 136]], 2.6, 'both'],
    [[[132, 100], [146, 92], [158, 96], [154, 104], [146, 102]], 2.4, 'both'],
  ]),
  reeds: ((): string => {
    const list: Array<readonly [readonly Pt[], number]> = []
    const xs = [8, 16, 22, 30, 146, 154, 162, 170]
    xs.forEach((x, i) => {
      const top = 70 + ((i * 17) % 30)
      list.push([[[x, 142], [x + (i % 2 ? 3 : -3), (142 + top) / 2], [x + (i % 2 ? 6 : -5), top]], 2.4])
    })
    return list.map(([p, w]) => brush(p, w, 'tail')).join('')
  })(),
  reedHeads: [
    [3, 72],
    [22, 84],
    [152, 76],
    [176, 92],
  ] as Pt[],
  smoke: strokes([
    [[[10, 130], [30, 108], [18, 90], [36, 74], [52, 82]], 5, 'both'],
    [[[170, 128], [150, 110], [164, 92], [146, 78], [132, 86]], 5, 'both'],
    [[[60, 142], [76, 126], [70, 112]], 4, 'both'],
  ]),
}

function Backdrop({ color, win, inc }: { color: TaoColor; win: Rect; inc: boolean }) {
  const t = tintFor(color, inc)
  const k = `translate(${win.x} ${win.y}) scale(${win.w / 176} ${win.h / 142})`
  let land: ReactNode = null
  switch (color) {
    case 'red':
      land = (
        <>
          <path d={BACK.mountainsFar} fill={t.deep} opacity={0.22} />
          <path d={BACK.mountainsNear} fill={t.deep} opacity={0.32} />
        </>
      )
      break
    case 'blue':
      land = <path d={BACK.waves} fill={t.deep} opacity={0.4} />
      break
    case 'green':
      land = <path d={BACK.pines} fill={t.deep} opacity={0.35} />
      break
    case 'yellow':
      land = (
        <>
          <path d={BACK.reeds} fill={t.deep} opacity={0.45} />
          {BACK.reedHeads.map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={2.6} ry={7} fill={t.deep} opacity={0.5} />
          ))}
        </>
      )
      break
    case 'black':
      land = <path d={BACK.smoke} fill="#2a221c" opacity={0.3} />
      break
  }
  const base = color === 'black' ? (inc ? '#b9b0a6' : '#cdc6bc') : inc ? '#e2d5ba' : '#efe4cc'
  return (
    <g>
      <rect x={win.x} y={win.y} width={win.w} height={win.h} fill={base} />
      <g transform={k}>
        <ellipse cx={88} cy={56} rx={110} ry={86} fill={t.wash} />
        {inc && <ellipse cx={88} cy={60} rx={110} ry={90} fill={t.wash} />}
        {land}
        <rect y={96} width={176} height={36} fill="url(#gs-mist-band)" />
      </g>
      <rect x={win.x} y={win.y} width={win.w} height={win.h} fill="url(#gs-fibre)" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Frame, banner, coins, stones.
// ---------------------------------------------------------------------------
const SCROLL_CURL_L = 'M24 12C16 12 13 16 13 21C13 26 16 30 22 30C26 30 28 27 28 24C28 21 25 20 23 21'
const CORNER_SCROLL = brush([[6, 34], [7, 14], [14, 7], [34, 6]], 3, 'both') + brush([[12, 22], [14, 15], [21, 13], [24, 18], [19, 21]], 2.2, 'both')

function Frame({ color, inc }: { color: TaoColor; inc: boolean }) {
  if (inc) {
    return (
      <>
        <rect x={1} y={1} width={198} height={298} rx={13} fill="url(#gs-ghost-lacquer)" stroke="#8a6620" strokeWidth={2} />
        <rect x={1} y={1} width={198} height={298} rx={13} fill="url(#gs-streaks)" opacity={0.6} />
        <rect x={5} y={5} width={190} height={290} rx={10} fill="none" stroke="url(#gs-gold)" strokeWidth={2.4} />
        <rect x={9.5} y={9.5} width={181} height={281} rx={7} fill="none" stroke="#d9b45a" strokeOpacity={0.55} strokeWidth={1} />
        {[
          '',
          'translate(200 0) scale(-1 1)',
          'translate(0 300) scale(1 -1)',
          'translate(200 300) scale(-1 -1)',
        ].map((tr, i) => (
          <path key={i} d={CORNER_SCROLL} transform={tr || undefined} fill="url(#gs-gold)" />
        ))}
      </>
    )
  }
  return (
    <>
      <rect x={1} y={1} width={198} height={298} rx={13} fill={`url(#gs-frame-${color})`} stroke={COLOR_DARK[color]} strokeWidth={2} />
      <rect x={1} y={1} width={198} height={298} rx={13} fill="url(#gs-streaks)" opacity={0.7} />
      <rect x={5.5} y={5.5} width={189} height={289} rx={10} fill="none" stroke="#fff6e0" strokeOpacity={0.3} strokeWidth={1.5} />
    </>
  )
}

/** Split a long name into two balanced lines at a space. */
function splitName(name: string): [string, string] | null {
  const spaces: number[] = []
  for (let i = 0; i < name.length; i++) if (name[i] === ' ') spaces.push(i)
  if (spaces.length === 0) return null
  const mid = name.length / 2
  const at = spaces.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best), spaces[0])
  return [name.slice(0, at), name.slice(at + 1)]
}

/** Rough width of `text` in bold small caps, in units of the font size. */
function textEm(text: string): number {
  let w = 0
  for (const ch of text) {
    if (ch === ' ') w += 0.3
    else if (/[MW]/.test(ch)) w += 0.98
    else if (/[A-Z]/.test(ch)) w += 0.78
    else if (/[mw]/.test(ch)) w += 0.82
    else if (/[a-z]/.test(ch)) w += 0.64
    else w += 0.5
  }
  return w + text.length * 0.03 // letter spacing
}

function NameBanner({ name, inc }: { name: string; inc: boolean }) {
  const avail = 138
  let lines: string[] = [name]
  let fs = Math.min(16, avail / textEm(name))
  if (fs < 10.5) {
    const two = splitName(name)
    if (two) {
      lines = two
      fs = Math.min(12, avail / Math.max(textEm(two[0]), textEm(two[1])))
    }
  }
  const fill = inc ? '#f0d488' : '#1d1712'
  return (
    <g>
      <path d="M22 12H178V40H22Z" fill={inc ? 'url(#gs-ghost-banner-dark)' : 'url(#gs-ghost-banner)'} stroke={inc ? '#c99a3c' : '#3b3129'} strokeWidth={1.3} />
      <path d={SCROLL_CURL_L} fill={inc ? '#2c231d' : '#e8d8b4'} stroke={inc ? '#c99a3c' : '#3b3129'} strokeWidth={1.3} />
      <path d={SCROLL_CURL_L} transform="translate(200 0) scale(-1 1)" fill={inc ? '#2c231d' : '#e8d8b4'} stroke={inc ? '#c99a3c' : '#3b3129'} strokeWidth={1.3} />
      {lines.map((ln, i) => {
        const est = textEm(ln) * fs
        const y = lines.length === 1 ? 26 : 22 + i * 10.5
        return (
          <text
            key={i}
            x={100}
            y={y}
            dy="0.35em"
            textAnchor="middle"
            fontFamily={SERIF}
            fontWeight={700}
            fontSize={fs}
            fontVariant="small-caps"
            letterSpacing={0.4}
            fill={fill}
            textLength={est > avail ? avail : undefined}
            lengthAdjust={est > avail ? 'spacingAndGlyphs' : undefined}
          >
            {ln}
          </text>
        )
      })}
    </g>
  )
}

function Pips({ resistance, compact }: { resistance: GhostCard['resistance']; compact: boolean }) {
  const pips: TaoColor[] = []
  for (const c of TAO_ORDER) for (let i = 0; i < (resistance[c] ?? 0); i++) pips.push(c)
  if (pips.length === 0) return null
  const rows: TaoColor[][] = compact && pips.length > 5 ? [pips.slice(0, Math.ceil(pips.length / 2)), pips.slice(Math.ceil(pips.length / 2))] : [pips]
  const maxW = compact ? 188 : 170
  const widest = Math.max(...rows.map((r) => r.length))
  const s = Math.min(compact ? (rows.length > 1 ? 32 : 50) : 22, maxW / widest)
  const step = s * 0.98
  const y0 = compact ? (rows.length > 1 ? 3 : 5) : 46
  return (
    <g>
      {rows.map((row, ri) => {
        const w = (row.length - 1) * step + s
        const x0 = 100 - w / 2
        const y = y0 + ri * (s * 0.92)
        return (
          <g key={ri}>
            {!compact && ri === 0 && (
              <rect x={x0 - 5} y={y - 2} width={w + 10} height={s + 4} rx={(s + 4) / 2} fill="#140e0a" fillOpacity={0.55} />
            )}
            {row.map((c, i) => (
              <CoinG key={i} color={c} x={x0 + i * step} y={y} s={s} />
            ))}
          </g>
        )
      })}
    </g>
  )
}

const stonePaths = (L: StoneLayout, seed: number): string[] => L.cx.map((cx, i) => blob(cx, L.cy, L.r, L.r * 0.9, seed + i * 7, 0.06, 8))
const STONE_PATHS_N = stonePaths(STONES_NORMAL, 101)
const STONE_PATHS_C = stonePaths(STONES_COMPACT, 101)

function Stones({ card, compact, inc }: { card: GhostCard; compact: boolean; inc: boolean }) {
  const L = compact ? STONES_COMPACT : STONES_NORMAL
  const paths = compact ? STONE_PATHS_C : STONE_PATHS_N
  const groups: Ability[][] = [card.left, card.center, card.right]
  const s = L.r * (compact ? 1.95 : 1.75)
  return (
    <g>
      {groups.map((abilities, i) => {
        const cx = L.cx[i]
        const cy = L.cy
        const shown = abilities.slice(0, 2)
        if (shown.length === 0) {
          return (
            <path key={i} d={paths[i]} fill="#000" fillOpacity={inc ? 0.35 : 0.22} stroke="#fff6e0" strokeOpacity={0.18} strokeWidth={1.5} />
          )
        }
        return (
          <g key={i}>
            <ellipse cx={cx + 1.5} cy={cy + 3} rx={L.r * 1.08} ry={L.r * 0.98} fill="url(#gs-ghost-stone-shadow)" />
            <path d={paths[i]} fill="url(#gs-stone-pale)" stroke="#3d3226" strokeWidth={2} />
            <path d={`M${cx - L.r * 0.6} ${cy - L.r * 0.5}Q${cx - L.r * 0.2} ${cy - L.r * 0.85} ${cx + L.r * 0.3} ${cy - L.r * 0.78}`} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" />
            {shown.length === 1 ? (
              <AbilityGlyph kind={shown[0].kind} group={shown[0].group} x={cx - s / 2} y={cy - s / 2} s={s} />
            ) : (
              <>
                <AbilityGlyph kind={shown[0].kind} group={shown[0].group} x={cx - s * 0.62} y={cy - s * 0.58} s={s * 0.66} />
                <AbilityGlyph kind={shown[1].kind} group={shown[1].group} x={cx - s * 0.04} y={cy - s * 0.1} s={s * 0.66} />
              </>
            )}
          </g>
        )
      })}
    </g>
  )
}

export function GhostCardArt({ card, width = 120, compact = false, title, ...rest }: GhostCardArtProps) {
  const inc = Boolean(card.incarnation)
  const special = isSkeleton(card) || isSummon(card)
  const t = tintFor(card.color, inc)
  const win = compact ? WIN_COMPACT : WIN_NORMAL
  const design = pickDesign(card)
  const mirror = !inc && !special && (hashStr(card.id) & 1) === 1
  const k = Math.min(win.w / 160, win.h / 150)
  const fit = `translate(${win.x + (win.w - 160 * k) / 2} ${win.y + win.h - 150 * k}) scale(${k})`
  const edge = inc ? (card.color === 'black' ? '#8d8a86' : COLOR_HEX[card.color]) : '#2a211a'
  return (
    <ArtSvg width={width} height={width * 1.5} viewBox="0 0 200 300" title={title ?? card.name} {...rest}>
      <Frame color={card.color} inc={inc || isSummon(card)} />
      {!compact && <NameBanner name={card.name} inc={inc} />}
      <g clipPath={`url(#gs-ghost-win-${compact ? 'c' : 'n'})`}>
        <Backdrop color={card.color} win={win} inc={inc} />
        <g transform={fit}>{mirror ? <g transform="translate(160 0) scale(-1 1)">{design(t)}</g> : design(t)}</g>
        <rect x={win.x} y={win.y} width={win.w} height={win.h} fill="url(#gs-vignette)" />
      </g>
      <rect x={win.x} y={win.y} width={win.w} height={win.h} rx={7} fill="none" stroke={edge} strokeWidth={inc ? 3.5 : 2.2} />
      {inc && <rect x={win.x - 3} y={win.y - 3} width={win.w + 6} height={win.h + 6} rx={9} fill="none" stroke="#d9b45a" strokeWidth={1.2} />}
      {inc && (compact ? <SealG x={158} y={win.y + 4} s={30} /> : <SealG x={win.x + 4} y={win.y + 4} s={30} />)}
      <Pips resistance={card.resistance} compact={compact} />
      <Stones card={card} compact={compact} inc={inc} />
    </ArtSvg>
  )
}
