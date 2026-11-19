// A Horde card: a painted-enamel frame in the card's colour bound in iron
// corner brackets, a stone name plaque, resistance gems (Equipment roundels,
// so colour reads by symbol too), the monster in its colour's landscape, and
// three effect stones (entrance / ongoing or recurring / exit). Warlords get a
// black-iron and gold frame, the Warlord mark, gems on a gold band and a larger
// figure with regalia.
import type { Ability, GhostCard, TaoColor } from '@/game/types'
import { ArtSvg } from '../ArtSvg'
import type { GhostCardArtProps } from '../GhostCardArt'
import { hashStr } from '../brush'
import { COLOR_HEX } from '../palette'
import { BastionAbilityGlyph } from './AbilityIcon'
import { EquipG, WarlordMarkG } from './glyphs'
import { Backdrop } from './monsters/backdrops'
import { tintFor } from './monsters/common'
import { designFor } from './monsters'
import { STONES_COMPACT, STONES_NORMAL, WIN_COMPACT, WIN_NORMAL, type StoneLayout } from './monsters/layout'
import { LB_INK } from './palette'

const TAO_ORDER: readonly TaoColor[] = ['red', 'blue', 'green', 'yellow', 'black']
const SERIF = "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif"

// ---------------------------------------------------------------------------
// Frame.
// ---------------------------------------------------------------------------
/** An iron (or gold) L-bracket over the top-left corner; mirrored for the others. */
const BRACKET = 'M1.5 40V13Q1.5 1.5 13 1.5H40L35 9.5H16Q9.5 9.5 9.5 16V35Z'
const BRACKET_SPIKE = 'M40 1.5L50 5.5L35 9.5ZM1.5 40L5.5 50L9.5 35Z'
const CORNERS = ['', 'translate(200 0) scale(-1 1)', 'translate(0 300) scale(1 -1)', 'translate(200 300) scale(-1 -1)']

function Frame({ color, boss }: { color: TaoColor; boss: boolean }) {
  if (boss) {
    return (
      <>
        <rect x={1} y={1} width={198} height={298} rx={12} fill="url(#lb-card-warlord)" stroke="#000" strokeWidth={2} />
        <rect x={5} y={5} width={190} height={290} rx={9} fill="none" stroke="url(#lb-gold)" strokeWidth={3} />
        <rect x={10} y={10} width={180} height={280} rx={6} fill="none" stroke="#e2b65a" strokeOpacity={0.45} strokeWidth={1} />
        {CORNERS.map((tr, i) => (
          <g key={i} transform={tr || undefined}>
            <path d={BRACKET_SPIKE} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={1.2} strokeLinejoin="round" />
            <path d={BRACKET} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={1.4} strokeLinejoin="round" />
            <circle cx={9} cy={9} r={2.6} fill="#7a1a1e" stroke={LB_INK} strokeWidth={0.8} />
          </g>
        ))}
      </>
    )
  }
  return (
    <>
      <rect x={1} y={1} width={198} height={298} rx={12} fill={`url(#lb-card-frame-${color})`} stroke={LB_INK} strokeWidth={2} />
      <rect x={3.5} y={3.5} width={193} height={293} rx={10} fill="none" stroke="#fff" strokeOpacity={0.22} strokeWidth={1.2} />
      {color === 'black' && <rect x={6} y={6} width={188} height={288} rx={8} fill="none" stroke="#b45cff" strokeOpacity={0.55} strokeWidth={1.4} />}
      {CORNERS.map((tr, i) => (
        <g key={i} transform={tr || undefined}>
          <path d={BRACKET} fill="url(#lb-iron)" stroke={LB_INK} strokeWidth={1.4} strokeLinejoin="round" />
          <circle cx={7.5} cy={7.5} r={2.2} fill="#8d929c" stroke={LB_INK} strokeWidth={0.8} />
          <circle cx={26} cy={5.5} r={1.5} fill="#8d929c" />
          <circle cx={5.5} cy={26} r={1.5} fill="#8d929c" />
        </g>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Name plaque.
// ---------------------------------------------------------------------------
const PLAQUE = 'M27 10H173L183 25L173 40H27L17 25Z'

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
  return w + text.length * 0.03
}

function NamePlaque({ name, boss }: { name: string; boss: boolean }) {
  const avail = 146
  let lines: string[] = [name]
  let fs = Math.min(16, avail / textEm(name))
  if (fs < 10.5) {
    const two = splitName(name)
    if (two) {
      lines = two
      fs = Math.min(12, avail / Math.max(textEm(two[0]), textEm(two[1])))
    }
  }
  return (
    <g>
      <path d={PLAQUE} transform="translate(1.5 2)" fill="#000" opacity={0.35} />
      <path d={PLAQUE} fill={boss ? 'url(#lb-card-plaque-dark)' : 'url(#lb-card-plaque)'} stroke={boss ? '#e2b65a' : LB_INK} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M29 13.5H171L178.5 25" fill="none" stroke="#fff" strokeOpacity={boss ? 0.15 : 0.6} strokeWidth={1.2} />
      {lines.map((ln, i) => {
        const est = textEm(ln) * fs
        const y = lines.length === 1 ? 25.5 : 20.5 + i * 10.5
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
            fill={boss ? '#f3d68a' : '#1f1a14'}
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

// ---------------------------------------------------------------------------
// Resistance gems.
// ---------------------------------------------------------------------------
function Gems({ resistance, compact, boss }: { resistance: GhostCard['resistance']; compact: boolean; boss: boolean }) {
  const gems: TaoColor[] = []
  for (const c of TAO_ORDER) for (let i = 0; i < (resistance[c] ?? 0); i++) gems.push(c)
  if (gems.length === 0) return null
  const half = Math.ceil(gems.length / 2)
  const rows: TaoColor[][] = compact && gems.length > 5 ? [gems.slice(0, half), gems.slice(half)] : [gems]
  const maxW = compact ? 184 : 168
  const widest = Math.max(...rows.map((r) => r.length))
  const s = Math.min(compact ? (rows.length > 1 ? 29 : 50) : 25, maxW / widest)
  const step = s * 0.97
  const y0 = compact ? (rows.length > 1 ? 3.5 : 5) : 45
  const rowH = s * 0.9
  const bandW = (widest - 1) * step + s + (compact ? 8 : 12)
  const bandH = rows.length * rowH + s * 0.1 + 6
  return (
    <g>
      {(boss || !compact) && (
        <rect
          x={100 - bandW / 2}
          y={Math.max(1.5, y0 - 3)}
          width={bandW}
          height={bandH - Math.max(0, 1.5 - (y0 - 3))}
          rx={Math.min(bandH / 2, 14)}
          fill={boss ? 'url(#lb-gold)' : '#120f14'}
          fillOpacity={boss ? 1 : 0.6}
          stroke={boss ? LB_INK : 'none'}
          strokeWidth={1.4}
        />
      )}
      {rows.map((row, ri) => {
        const w = (row.length - 1) * step + s
        const x0 = 100 - w / 2
        const y = y0 + ri * rowH
        return (
          <g key={ri}>
            {row.map((c, i) => (
              <g key={i}>
                {compact && !boss && <circle cx={x0 + i * step + s / 2 + 1} cy={y + s / 2 + 2} r={s * 0.46} fill="#000" opacity={0.45} />}
                <EquipG color={c} x={x0 + i * step} y={y} s={s} outline={false} />
              </g>
            ))}
          </g>
        )
      })}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Effect stones: iron-rimmed roundels.
// ---------------------------------------------------------------------------
function Stones({ card, compact }: { card: GhostCard; compact: boolean }) {
  const L: StoneLayout = compact ? STONES_COMPACT : STONES_NORMAL
  const groups: Ability[][] = [card.left, card.center, card.right]
  const s = L.r * (compact ? 1.78 : 1.62)
  return (
    <g>
      {groups.map((abilities, i) => {
        const cx = L.cx[i]
        const cy = L.cy
        const shown = abilities.slice(0, 2)
        if (shown.length === 0) {
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={L.r * 0.86} fill="#000" fillOpacity={0.32} stroke="#000" strokeOpacity={0.35} strokeWidth={2} />
              <circle cx={cx} cy={cy} r={L.r * 0.86} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={1.2} transform={`translate(0.8 1.2)`} />
            </g>
          )
        }
        return (
          <g key={i}>
            <circle cx={cx + 1.5} cy={cy + 3} r={L.r * 1.06} fill="url(#lb-card-shadow)" />
            <circle cx={cx} cy={cy} r={L.r} fill="url(#lb-iron)" stroke={LB_INK} strokeWidth={1.8} />
            <circle cx={cx} cy={cy} r={L.r * 0.84} fill="url(#lb-card-stone)" stroke={LB_INK} strokeWidth={1.2} />
            {shown.length === 1 ? (
              <BastionAbilityGlyph kind={shown[0].kind} group={shown[0].group} x={cx - s / 2} y={cy - s / 2} s={s} />
            ) : (
              <>
                <BastionAbilityGlyph kind={shown[0].kind} group={shown[0].group} x={cx - s * 0.6} y={cy - s * 0.58} s={s * 0.64} />
                <BastionAbilityGlyph kind={shown[1].kind} group={shown[1].group} x={cx - s * 0.04} y={cy - s * 0.08} s={s * 0.64} />
              </>
            )}
          </g>
        )
      })}
    </g>
  )
}

// ---------------------------------------------------------------------------

export function HordeCardArt({ card, width = 120, compact = false, title, ...rest }: GhostCardArtProps) {
  const boss = Boolean(card.incarnation)
  const t = tintFor(card.color)
  const win = compact ? WIN_COMPACT : WIN_NORMAL
  const { design, alt } = designFor(card)
  const mirror = !boss && (hashStr(card.id) & 1) === 1
  // Warlords stand larger in the window, feet a little below its edge so
  // their crowns stay in view.
  const k = Math.min(win.w / 160, win.h / 150) * (boss ? 1.06 : 1)
  const fit = `translate(${win.x + (win.w - 160 * k) / 2} ${win.y + win.h - 150 * k + (boss ? 3 * k : 0)}) scale(${k})`
  const edge = boss ? (card.color === 'black' ? '#a77cd6' : COLOR_HEX[card.color]) : LB_INK
  const clip = `url(#lb-card-win-${compact ? 'c' : 'n'})`
  return (
    <ArtSvg width={width} height={width * 1.5} viewBox="0 0 200 300" title={title ?? card.name} {...rest}>
      <Frame color={card.color} boss={boss} />
      {!compact && <NamePlaque name={card.name} boss={boss} />}
      <g clipPath={clip}>
        <Backdrop color={card.color} win={win} />
        <g transform={fit}>{mirror ? <g transform="translate(160 0) scale(-1 1)">{design(t, boss, alt)}</g> : design(t, boss, alt)}</g>
        <rect x={win.x} y={win.y} width={win.w} height={win.h} fill="url(#lb-card-vignette)" />
      </g>
      <rect x={win.x} y={win.y} width={win.w} height={win.h} rx={6} fill="none" stroke={edge} strokeWidth={boss ? 3.5 : 2.4} />
      {boss && <rect x={win.x - 3} y={win.y - 3} width={win.w + 6} height={win.h + 6} rx={8} fill="none" stroke="#e2b65a" strokeWidth={1.4} />}
      {boss && (compact ? <WarlordMarkG x={win.x + win.w - 34} y={win.y + 3} s={31} /> : <WarlordMarkG x={win.x + 4} y={win.y + 4} s={30} />)}
      <Gems resistance={card.resistance} compact={compact} boss={boss} />
      <Stones card={card} compact={compact} />
    </ArtSvg>
  )
}
