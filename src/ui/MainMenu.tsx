import { useGameStore } from '@/store/gameStore'
import { warmUpNetwork } from '@/store/networkStore'
import { Logo, TaoistFigure } from '@/ui/art'
import { COLORS } from '@/game/types'
import './menu.css'

export function MainMenu() {
  const setUiMode = useGameStore((s) => s.setUiMode)
  return (
    <div className="gs-menu">
      <div className="gs-menu-inner">
        <Logo width={460} />
        <p className="gs-menu-sub">A cooperative game for 1–4 Taoist monks against the ghosts of Wu-Feng.</p>
        <div className="gs-menu-monks">
          {COLORS.map((c) => (
            <TaoistFigure key={c} color={c} size={64} />
          ))}
        </div>
        <div className="gs-menu-buttons">
          <button className="gs-btn primary" onClick={() => setUiMode('newGame')}>
            Play on this device
          </button>
          <button
            className="gs-btn"
            onClick={() => {
              warmUpNetwork()
              setUiMode('online')
            }}
          >
            Play online
          </button>
          <button className="gs-btn" onClick={() => setUiMode('rulebook')}>
            Rulebook
          </button>
        </div>
        <p className="gs-mini" style={{ marginTop: 24 }}>
          Based on Ghost Stories by Antoine Bauza (Repos Production). A fan-made version for playing with friends; all art drawn for this project.
        </p>
      </div>
    </div>
  )
}
