import { useGameStore } from '@/store/gameStore'

export function MainMenu() {
  const setUiMode = useGameStore((s) => s.setUiMode)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 48, letterSpacing: 4 }}>GHOST STORIES</h1>
      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button style={{ padding: '12px 24px', fontSize: 16 }} onClick={() => setUiMode('newGame')}>
          New Game (local)
        </button>
        <button style={{ padding: '12px 24px', fontSize: 16 }} onClick={() => setUiMode('onlineSetup')}>
          Online Multiplayer
        </button>
        <button style={{ padding: '12px 24px', fontSize: 16 }} onClick={() => setUiMode('rulebook')}>
          Rulebook
        </button>
      </div>
    </div>
  )
}
