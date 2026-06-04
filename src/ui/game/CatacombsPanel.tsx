// Side-panel block for Black Secret state.

import type { GameState } from '@/game/types'

export function CatacombsPanel({ game }: { game: GameState }) {
  if (!game.blackSecret) return null
  const bs = game.blackSecret
  return (
    <div style={{
      padding: 8,
      background: 'var(--bg-elevated)',
      border: '1px solid #c1392b',
      borderRadius: 6,
    }}>
      <h3 style={{ margin: 0, fontSize: 13, color: '#c1392b' }}>🩸 Wu-Feng · {bs.wuFengTag}</h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 12 }}>
        <span>Reserve demons:</span>
        {bs.reserveDemons.length === 0 && <span style={{ color: 'var(--ink-muted)' }}>none</span>}
        {bs.reserveDemons.map((d) => (
          <span key={d} style={{ padding: '1px 6px', background: '#3a2e25', border: '1px solid #8a7e6b', borderRadius: 4 }}>
            cost {d === 'cost2' ? 2 : d === 'cost3' ? 3 : 4}
          </span>
        ))}
      </div>

      {bs.catacombsDemons.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 12 }}>
          <strong>In catacombs:</strong>{' '}
          {bs.catacombsDemons.map((d, i) => (
            <span key={i} style={{ padding: '1px 6px', marginRight: 4, background: '#c1392b22', border: '1px solid #c1392b', borderRadius: 4 }}>
              res {d.resistance} ({d.color}) @{d.squareIdx}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 6, fontSize: 12 }}>
        <strong>Curse pyramid</strong>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {[1, 2, 3, 4].map((lvl) => {
            const n = bs.curses[lvl as 1 | 2 | 3 | 4]
            return (
              <div key={lvl} style={{
                flex: 1,
                padding: '4px 6px',
                background: n > 0 ? '#7d2820' : 'var(--bg)',
                border: '1px solid var(--rule)',
                borderRadius: 4,
                textAlign: 'center',
                color: n > 0 ? '#f4e9d6' : 'var(--ink-muted)',
              }}>
                lvl {lvl}<br />{n}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-muted)' }}>
        Skeletons available: {bs.skeletonsAvailable} · Mantras in play: {bs.bloodyMantras.length}
      </div>
    </div>
  )
}
