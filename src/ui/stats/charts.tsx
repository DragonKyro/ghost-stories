// Small SVG charts for the stats screen: a multi-line chart with a crosshair
// readout, and horizontal bar lists. Thin marks, hairline grid, direct labels,
// a legend for 2+ series, hover tooltips, and a table view for every chart.

import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Chart surface and text tokens (the stats cards sit on --bg-elevated). */
export const SURFACE = '#241b15'
const GRID = '#3a2e25'
const INK = '#f4e9d6'
const MUTED = '#a89a84'

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(480)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

/** The smallest clean step giving at most 6 ticks from 0 to max. */
function tickStep(max: number): number {
  for (const step of [1, 2, 3, 4, 5, 10, 20, 25, 50, 100]) if (max / step <= 6) return step
  return Math.ceil(max / 6)
}

function niceMax(v: number): number {
  const top = Math.max(1, Math.ceil(v))
  const step = tickStep(top)
  return Math.ceil(top / step) * step
}

function ticks(max: number): number[] {
  const step = tickStep(max)
  const out: number[] = []
  for (let v = 0; v <= max; v += step) out.push(v)
  return out
}

const textW = (t: string, size = 11) => t.length * size * 0.58

export interface Series {
  id: string
  label: string
  color: string
  values: Array<number | null>
}

export function LineChart({ title, x, series, height = 170, yMax, caption }: { title: string; x: number[]; series: Series[]; height?: number; yMax?: number; caption?: string }) {
  const [box, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const multi = series.length > 1
  const last = x.length - 1
  // End labels: one per distinct end value, naming every series ending there.
  const ends = new Map<number, Series[]>()
  for (const s of series) {
    const v = s.values[last]
    if (v == null) continue
    ends.set(v, [...(ends.get(v) ?? []), s])
  }
  const w = Math.max(220, width)
  // Names at the line ends when they fit; on narrow charts just the value (the legend names the lines).
  const named = (v: number, list: Series[]) => (multi ? `${list.map((s) => s.label).join(' · ')} ${v}` : String(v))
  const namedW = Math.max(24, ...[...ends.entries()].map(([v, list]) => textW(named(v, list))))
  const useNames = namedW <= w * 0.26
  const endText = (v: number, list: Series[]) => (useNames ? named(v, list) : String(v))
  const labelW = useNames ? namedW : 24
  const m = { l: 30, r: labelW + 16, t: 10, b: 24 }
  const plotW = w - m.l - m.r
  const plotH = height - m.t - m.b
  const top = yMax != null ? yMax : niceMax(Math.max(1, ...series.flatMap((s) => s.values.map((v) => v ?? 0))))
  // X is the turn number itself (some turns resolve inside another, so points aren't evenly spaced).
  const x0 = x[0] ?? 0
  const x1 = x[last] ?? 1
  const xs = (i: number) => m.l + (x1 === x0 ? plotW / 2 : ((x[i]! - x0) / (x1 - x0)) * plotW)
  // Series sharing a value sit a hair apart, so a line hidden under another still shows.
  const dodge = (k: number) => (multi ? (k - (series.length - 1) / 2) * 2.5 : 0)
  const ys = (v: number, k = -1) => m.t + plotH - (v / top) * plotH + (k >= 0 ? dodge(k) : 0)

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect()
    const px = e.clientX - r.left + m.l
    let best = 0
    for (let i = 1; i < x.length; i++) if (Math.abs(xs(i) - px) < Math.abs(xs(best) - px)) best = i
    setHover(best)
  }

  return (
    <div className="st-chart" ref={box}>
      <div className="st-chart-head">
        <h3>{title}</h3>
        <button className="gs-btn small" onClick={() => setTable(!table)}>
          {table ? 'Chart' : 'Table'}
        </button>
      </div>
      {multi && (
        <div className="st-legend">
          {series.map((s) => (
            <span key={s.id}>
              <svg width={16} height={8} aria-hidden>
                <line x1={1} y1={4} x2={15} y2={4} stroke={s.color} strokeWidth={2} strokeLinecap="round" />
              </svg>
              {s.label}
            </span>
          ))}
        </div>
      )}
      {table ? (
        <div className="st-tablewrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>Turn</th>
                {series.map((s) => (
                  <th key={s.id}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {x.map((t, i) => (
                <tr key={t}>
                  <td>{t}</td>
                  {series.map((s) => (
                    <td key={s.id}>{s.values[i] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <svg width={w} height={height} role="img" aria-label={title}>
            {ticks(top).map((v) => (
              <g key={v}>
                <line x1={m.l} x2={m.l + plotW} y1={ys(v)} y2={ys(v)} stroke={GRID} strokeWidth={1} />
                <text x={m.l - 6} y={ys(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {v}
                </text>
              </g>
            ))}
            {xTicks(x).map((i) => (
              <text key={i} x={xs(i)} y={height - 6} textAnchor="middle" fontSize={10} fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {x[i]}
              </text>
            ))}
            {!multi && series[0] && <path d={areaPath(series[0].values, xs, ys)} fill={series[0].color} opacity={0.1} />}
            {series.map((s, k) => (
              <path key={s.id} d={linePath(s.values, xs, (v) => ys(v, k))} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {series.map((s, k) => {
              const v = s.values[last]
              return v == null ? null : <circle key={s.id} cx={xs(last)} cy={ys(v, k)} r={4} fill={s.color} stroke={SURFACE} strokeWidth={2} />
            })}
            {[...ends.entries()].map(([v, list]) => (
              <g key={v} transform={`translate(${xs(last) + 9},${ys(v) + 3.5})`}>
                {multi ? (
                  <text fontSize={11} fill={INK}>
                    {endText(v, list)}
                  </text>
                ) : (
                  <text fontSize={11} fill={INK} fontWeight={600}>
                    {v}
                  </text>
                )}
              </g>
            ))}
            {hover != null && (
              <g pointerEvents="none">
                <line x1={xs(hover)} x2={xs(hover)} y1={m.t} y2={m.t + plotH} stroke={MUTED} strokeWidth={1} />
                {series.map((s, k) => {
                  const v = s.values[hover]
                  return v == null ? null : <circle key={s.id} cx={xs(hover)} cy={ys(v, k)} r={4} fill={s.color} stroke={SURFACE} strokeWidth={2} />
                })}
              </g>
            )}
            <rect
              x={m.l}
              y={m.t}
              width={plotW}
              height={plotH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
          {hover != null && (
            <div className="st-tip" style={{ left: Math.min(xs(hover) + 10, w - 150), top: 6 }}>
              <div className="st-tip-x">Turn {x[hover]}</div>
              {series.map((s) => (
                <div key={s.id} className="st-tip-row">
                  <svg width={12} height={8} aria-hidden>
                    <line x1={1} y1={4} x2={11} y2={4} stroke={s.color} strokeWidth={2} strokeLinecap="round" />
                  </svg>
                  <strong>{s.values[hover] ?? '—'}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {caption && <p className="st-caption">{caption}</p>}
    </div>
  )
}

/** Indices of the points to label on the x axis: about 8, evenly spread by turn number. */
function xTicks(x: number[]): number[] {
  if (x.length <= 1) return x.length ? [0] : []
  const want = Math.min(x.length, 8)
  const x0 = x[0]!
  const x1 = x[x.length - 1]!
  const out = new Set<number>()
  for (let k = 0; k < want; k++) {
    const target = x0 + ((x1 - x0) * k) / (want - 1)
    let best = 0
    for (let i = 1; i < x.length; i++) if (Math.abs(x[i]! - target) < Math.abs(x[best]! - target)) best = i
    out.add(best)
  }
  return [...out]
}

function linePath(values: Array<number | null>, xs: (i: number) => number, ys: (v: number) => number): string {
  let d = ''
  let pen = false
  values.forEach((v, i) => {
    if (v == null) {
      pen = false
      return
    }
    d += `${pen ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`
    pen = true
  })
  return d
}

function areaPath(values: Array<number | null>, xs: (i: number) => number, ys: (v: number) => number): string {
  const pts = values.map((v, i) => [xs(i), ys(v ?? 0)] as const)
  if (pts.length === 0) return ''
  return `M${pts[0]![0]},${ys(0)}${pts.map(([px, py]) => `L${px.toFixed(1)},${py.toFixed(1)}`).join('')}L${pts[pts.length - 1]![0]},${ys(0)}Z`
}

export interface BarRow {
  id: string
  label: ReactNode
  /** Plain-text name for the table view and tooltips. */
  name: string
  value: number
  color: string
  /** A fair-die expectation, drawn as a hairline marker. */
  expected?: number
  note?: string
}

/** Horizontal bars on one baseline, value at the tip, optional expectation marker. */
export function BarList({
  title,
  rows,
  caption,
  valueLabel = 'Count',
  labelW = 92,
}: {
  title: string
  rows: BarRow[]
  caption?: string
  valueLabel?: string
  labelW?: number
}) {
  const [box, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<string | null>(null)
  const [table, setTable] = useState(false)
  const tipW = 44
  const w = Math.max(220, width)
  const plotW = w - labelW - tipW
  const max = Math.max(1, ...rows.map((r) => Math.max(r.value, r.expected ?? 0)))
  const sx = (v: number) => (v / max) * plotW
  const band = 26
  const barH = 14
  const showExpected = rows.some((r) => r.expected != null)
  return (
    <div className="st-chart" ref={box}>
      <div className="st-chart-head">
        <h3>{title}</h3>
        <button className="gs-btn small" onClick={() => setTable(!table)}>
          {table ? 'Chart' : 'Table'}
        </button>
      </div>
      {table ? (
        <div className="st-tablewrap">
          <table className="st-table">
            <thead>
              <tr>
                <th />
                <th>{valueLabel}</th>
                {showExpected && <th>Expected</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.value}</td>
                  {showExpected && <td>{r.expected?.toFixed(1)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {rows.map((r) => {
            const bw = sx(r.value)
            return (
              <div
                key={r.id}
                className="st-bar"
                style={{ height: band, gridTemplateColumns: `${labelW}px ${plotW + tipW}px` }}
                onPointerEnter={() => setHover(r.id)}
                onPointerLeave={() => setHover(null)}
                tabIndex={0}
                onFocus={() => setHover(r.id)}
                onBlur={() => setHover(null)}
                aria-label={`${r.name}: ${r.value}${r.expected != null ? `, expected ${r.expected.toFixed(1)}` : ''}`}
              >
                <div className="st-bar-label">{r.label}</div>
                <svg width={plotW + tipW} height={band} aria-hidden>
                  <line x1={0} x2={0} y1={2} y2={band - 2} stroke={GRID} strokeWidth={1} />
                  {bw > 0 && <path d={barPath(bw, (band - barH) / 2, barH)} fill={r.color} opacity={hover && hover !== r.id ? 0.55 : 1} />}
                  {r.expected != null && (
                    <line x1={sx(r.expected)} x2={sx(r.expected)} y1={3} y2={band - 3} stroke={INK} strokeWidth={1} opacity={0.65} />
                  )}
                  <text x={Math.max(bw, r.expected != null ? sx(r.expected) : 0) + 6} y={band / 2 + 4} fontSize={11} fill={INK} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.value}
                  </text>
                </svg>
                {hover === r.id && (
                  <div className="st-tip" style={{ left: labelW + Math.min(bw + 10, plotW - 60), top: -6 }}>
                    <div className="st-tip-row">
                      <strong>{r.value}</strong>
                      <span>{r.name}</span>
                    </div>
                    {r.expected != null && <div className="st-tip-x">fair die: {r.expected.toFixed(1)}</div>}
                    {r.note && <div className="st-tip-x">{r.note}</div>}
                  </div>
                )}
              </div>
            )
          })}
          {showExpected && (
            <p className="st-caption">
              <svg width={10} height={10} aria-hidden>
                <line x1={5} x2={5} y1={0} y2={10} stroke={INK} strokeWidth={1} opacity={0.65} />
              </svg>{' '}
              what a fair die would give over the same rolls
            </p>
          )}
        </div>
      )}
      {caption && <p className="st-caption">{caption}</p>}
    </div>
  )
}

/** A bar growing from x=0: square at the baseline, 4px rounded data end. */
function barPath(w: number, y: number, h: number): string {
  const r = Math.min(4, w, h / 2)
  return `M0,${y}H${w - r}Q${w},${y} ${w},${y + r}V${y + h - r}Q${w},${y + h} ${w - r},${y + h}H0Z`
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="st-tile">
      <div className="st-tile-label">{label}</div>
      <div className="st-tile-value">{value}</div>
      {sub && <div className="st-tile-sub">{sub}</div>}
    </div>
  )
}
