// Active Taoist's hand — Tao tokens, Yin-Yang, Buddha figurines, power tokens.
// In hot-seat we show whoever is currently revealed (the handoff screen flips
// this when the turn changes).

import { TAOIST_COLOR_HEX, TAOIST_COLORS } from '@/ui/shared/playerColors'
import { YinYangToken } from '@/ui/svg/YinYangToken'
import { useGameStore } from '@/store/gameStore'
import type { GameState, TaoColor, TaoistColor } from '@/game/types'

const TAO_HEX: Record<TaoColor, string> = {
  red: '#c1392b',
  green: '#2f8f5d',
  blue: '#2c69b8',
  yellow: '#d4a857',
  black: '#1a1410',
}

export function HandPanel({ game }: { game: GameState }) {
  const revealed = useGameStore((s) => s.revealedTaoist)
  const activeColor = game.turnOrder[game.turnIndex] as TaoistColor

  // Show the revealed seat in hot-seat; fall back to active for AI / setup.
  const showColor = revealed ?? activeColor
  const t = game.taoists[showColor]
  if (t.isNeutral) {
    return (
      <div style={panelStyle}>
        <div style={{ color: 'var(--ink-muted)' }}>Neutral board ({showColor})</div>
      </div>
    )
  }
  if (!t.alive) {
    return (
      <div style={panelStyle}>
        <div style={{ color: 'var(--ink-muted)' }}>{showColor} is dead. Cemetery to revive.</div>
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 14, height: 14, borderRadius: '50%',
            background: TAOIST_COLOR_HEX[showColor],
          }} />
          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{showColor}</span>
          {showColor === activeColor && (
            <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>ACTING</span>
          )}
        </div>

        <span style={{ fontSize: 12 }}>
          <strong style={{ color: '#c1392b' }}>♥ {t.qi}</strong> Qi
        </span>

        {/* Yin-Yang */}
        <div title={t.yinYang ? 'Yin-Yang available' : 'Yin-Yang spent'}>
          <YinYangToken size={28} spent={!t.yinYang} />
        </div>

        {/* Buddha hand */}
        {t.buddhasInHand > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ padding: '2px 6px', background: '#d4a857', color: '#1a1410', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
              ☸ × {t.buddhasInHand}
            </span>
          </div>
        )}

        {/* Power tokens */}
        {t.powerTokens > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ padding: '2px 6px', background: '#3a2e25', color: '#f4e9d6', borderRadius: 4, fontSize: 11 }}>
              ⚙ × {t.powerTokens}
            </span>
          </div>
        )}

        {/* Tao tokens */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]).map((c) => (
            t.tao[c] > 0 ? (
              <div key={c} style={{
                width: 22, height: 22, borderRadius: '50%',
                background: TAO_HEX[c], border: '1.5px solid #f4e9d6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
                color: c === 'yellow' ? '#1a1410' : '#f4e9d6',
              }}>
                {t.tao[c]}
              </div>
            ) : null
          ))}
        </div>
      </div>

      {/* Other Taoists at a glance */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--ink-muted)' }}>
        {TAOIST_COLORS.filter((c) => c !== showColor).map((c) => {
          const o = game.taoists[c]
          if (o.isNeutral) return <span key={c}>{c}: neutral</span>
          if (!o.alive) return <span key={c} style={{ color: '#c1392b' }}>{c}: dead</span>
          return <span key={c}>{c}: ♥{o.qi} · {Object.values(o.tao).reduce((a, b) => a + b, 0)} tao</span>
        })}
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  padding: 12,
  background: 'var(--bg-elevated)',
  border: '1px solid var(--rule)',
  borderRadius: 6,
}
