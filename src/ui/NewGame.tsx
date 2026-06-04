import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TAOIST_COLORS, TAOIST_COLOR_HEX } from './shared/playerColors'
import type { Difficulty, GameConfig, TaoistColor } from '@/game/types'

const DIFFICULTIES: Array<{ id: Difficulty; label: string; desc: string }> = [
  { id: 'initiation', label: 'Initiation', desc: '4 Qi · all Tao colors · 1 incarnation' },
  { id: 'normal', label: 'Normal', desc: '3 Qi · no black Tao · 1 incarnation' },
  { id: 'nightmare', label: 'Nightmare', desc: '3 Qi · 4 incarnations (3 if <4 players)' },
  { id: 'hell', label: 'Hell', desc: 'Nightmare + no Yin-Yang token' },
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

  const handleStart = () => {
    const seatConfig: GameConfig['seats'] = {}
    for (const c of TAOIST_COLORS) {
      if (seats[c] !== 'neutral') seatConfig[c] = seats[c]
    }
    if (Object.keys(seatConfig).length === 0) {
      alert('At least one seat must be human or AI.')
      return
    }
    startGame({ difficulty, seats: seatConfig })
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 32 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>New Game</h2>
        <button onClick={() => setUiMode('mainMenu')}>← Back</button>
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

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button style={{ padding: '12px 24px', fontSize: 16, background: 'var(--accent)', color: '#1a1410' }} onClick={handleStart}>
          Start Game
        </button>
      </div>
    </div>
  )
}
