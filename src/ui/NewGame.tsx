import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TAOIST_COLORS, TAOIST_COLOR_HEX } from './shared/playerColors'
import type { Difficulty, GameConfig, TaoistColor } from '@/game/types'

const DIFFICULTIES: Array<{ id: Difficulty; label: string; desc: string }> = [
  { id: 'initiation', label: 'Initiation', desc: '4 Qi · 1 own + 1 black Tao · Yin-Yang · 1 incarnation' },
  { id: 'normal', label: 'Normal', desc: '3 Qi · 1 own Tao (no black) · Yin-Yang · 1 incarnation' },
  { id: 'nightmare', label: 'Nightmare', desc: '3 Qi · Yin-Yang · 4 incarnations (3 in 1-2p)' },
  { id: 'hell', label: 'Hell', desc: 'Nightmare without the Yin-Yang token' },
]

type Seat = 'human' | 'ai' | 'neutral'

export function NewGame() {
  const setUiMode = useGameStore((s) => s.setUiMode)
  const startGame = useGameStore((s) => s.startGame)

  const [seats, setSeats] = useState<Record<TaoistColor, Seat>>({
    red: 'human',
    blue: 'human',
    green: 'human',
    yellow: 'human',
  })
  const [difficulty, setDifficulty] = useState<Difficulty>('initiation')
  const [whiteMoon, setWhiteMoon] = useState(false)
  const [blackSecret, setBlackSecret] = useState(false)
  const [wuFengTag, setWuFengTag] = useState('Wu-Feng')

  const handleStart = () => {
    const seatConfig: GameConfig['seats'] = {}
    for (const c of TAOIST_COLORS) {
      if (seats[c] !== 'neutral') seatConfig[c] = seats[c]
    }
    if (Object.keys(seatConfig).length === 0) {
      alert('At least one seat must be human or AI.')
      return
    }
    const expansions: NonNullable<GameConfig['expansions']> = []
    if (whiteMoon) expansions.push('whiteMoon')
    if (blackSecret) expansions.push('blackSecret')
    startGame({
      difficulty,
      seats: seatConfig,
      expansions: expansions.length > 0 ? expansions : undefined,
      wuFengPlayer: blackSecret ? { tag: wuFengTag.trim() || 'Wu-Feng' } : undefined,
    })
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 32 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>New Game</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setUiMode('rulebook')}>📖 Rulebook</button>
          <button onClick={() => setUiMode('mainMenu')}>← Back</button>
        </div>
      </header>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Difficulty</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DIFFICULTIES.map((d) => (
            <label key={d.id} style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              padding: '10px 14px',
              border: `1px solid ${difficulty === d.id ? 'var(--accent)' : 'var(--rule)'}`,
              borderRadius: 6,
              cursor: 'pointer',
            }}>
              <input type="radio" name="difficulty" checked={difficulty === d.id} onChange={() => setDifficulty(d.id)} />
              <div>
                <div style={{ fontWeight: 600 }}>{d.label}</div>
                <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>{d.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Seats</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TAOIST_COLORS.map((c) => (
            <div key={c} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              border: '1px solid var(--rule)',
              borderRadius: 6,
            }}>
              <span style={{
                display: 'inline-block', width: 16, height: 16,
                background: TAOIST_COLOR_HEX[c], borderRadius: '50%',
              }} />
              <span style={{ textTransform: 'capitalize', flex: 1 }}>{c} Taoist</span>
              <select value={seats[c]} onChange={(e) => setSeats((s) => ({ ...s, [c]: e.target.value as Seat }))}>
                <option value="human">Human (hot-seat)</option>
                <option value="ai">AI</option>
                <option value="neutral">Neutral board</option>
              </select>
            </div>
          ))}
        </div>
        <p style={{ color: 'var(--ink-muted)', fontSize: 12, marginTop: 8 }}>
          Neutral boards run a reduced Yin phase (no ghost arrival, no Yang phase) per the
          1-3 player rules. AI seats use a placeholder no-op driver — Phase 3 lands real AI.
        </p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Expansions</h3>
        <label style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '10px 14px',
          border: `1px solid ${whiteMoon ? 'var(--accent)' : 'var(--rule)'}`,
          borderRadius: 6,
          cursor: 'pointer',
          marginBottom: 6,
        }}>
          <input type="checkbox" checked={whiteMoon} onChange={(e) => setWhiteMoon(e.target.checked)} />
          <div>
            <div style={{ fontWeight: 600 }}>🌙 White Moon</div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
              Villagers (24 across 12 families), Devourer ghosts, Moon Crystals (from the
              Herbalist's white face, spendable like wild Tao). Save villagers via the Portal.
              Loses on 12 villager deaths. Kung-Fu School replaces Night Watchman. See the
              rulebook for what's simplified.
            </div>
          </div>
        </label>

        <label style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          padding: '10px 14px',
          border: `1px solid ${blackSecret ? 'var(--accent)' : 'var(--rule)'}`,
          borderRadius: 6,
          cursor: 'pointer',
        }}>
          <input type="checkbox" checked={blackSecret} onChange={(e) => setBlackSecret(e.target.checked)} style={{ marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>🩸 Black Secret — Enemy Wu-Feng player</div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
              One player takes the role of Wu-Feng. Every Yin step 3, instead of the ghost
              auto-placing, Wu-Feng chooses: place the ghost / summon a demon to the catacombs
              (cost ≤ ghost resistance) / throw a curse (matching color, level pyramid). Adds
              the Calligrapher tile (replaces Night Watchman). See the rulebook for what's
              simplified (catacomb tokens, individual curse effects, Shadow of Wu-Feng,
              Bloody Mantra Qi resolution, Blood Brothers).
            </div>
            {blackSecret && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                  Wu-Feng player tag:
                  <input
                    type="text"
                    value={wuFengTag}
                    onChange={(e) => setWuFengTag(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      border: '1px solid var(--rule)',
                      borderRadius: 4,
                    }}
                  />
                </label>
                <div style={{ color: 'var(--ink-muted)', fontSize: 11, marginTop: 4 }}>
                  In local play this is just a label. In a future online build it becomes a
                  per-seat assignment.
                </div>
              </div>
            )}
          </div>
        </label>
      </section>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button style={{ padding: '12px 24px', fontSize: 16, background: 'var(--accent)', color: '#1a1410' }} onClick={handleStart}>
          Start Game
        </button>
      </div>
    </div>
  )
}
