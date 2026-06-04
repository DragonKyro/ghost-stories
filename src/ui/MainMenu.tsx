import { useGameStore } from '@/store/gameStore'

export function MainMenu() {
  const setUiMode = useGameStore((s) => s.setUiMode)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 48, letterSpacing: 4 }}>GHOST STORIES</h1>
      <p style={{ color: 'var(--ink-muted)', maxWidth: 480, textAlign: 'center', margin: 0 }}>
        1–4 Taoist monks defend a Chinese village from the ghosts of Wu-Feng. A faithful
        re-implementation of Antoine Bauza's 2008 cooperative board game.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button style={{ padding: '12px 24px', fontSize: 16 }} onClick={() => setUiMode('newGame')}>
          New Game
        </button>
      </div>
      <div style={{ color: 'var(--ink-muted)', fontSize: 12, marginTop: 32 }}>
        Phase 2 hot-seat build · online multiplayer coming in Phase 4
      </div>
    </div>
  )
}
