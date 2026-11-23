import { useGameStore } from '@/store/gameStore'
import { warmUpNetwork } from '@/store/networkStore'
import { Logo, TaoistFigure } from '@/ui/art'
import { COLORS, type GameVariant } from '@/game/types'
import './menu.css'

const GAMES: Array<{ id: GameVariant; label: string; sub: string }> = [
  { id: 'ghostStories', label: 'Ghost Stories', sub: '1–4 Taoist monks against the ghosts of Wu-Feng (2008)' },
  { id: 'bastion', label: 'Last Bastion', sub: '1–4 fantasy heroes defending the Bastion against the Baleful Queen (2019)' },
]

export function MainMenu() {
  const setUiMode = useGameStore((s) => s.setUiMode)
  const variant = useGameStore((s) => s.selectedVariant)
  const setVariant = useGameStore((s) => s.setSelectedVariant)
  const bastion = variant === 'bastion'
  return (
    <div className="gs-menu">
      <div className="gs-menu-inner">
        <div className="gs-ng-seg" role="radiogroup" aria-label="Select game" style={{ marginBottom: 14, maxWidth: 360, marginInline: 'auto' }}>
          {GAMES.map((g) => (
            <button key={g.id} role="radio" aria-checked={variant === g.id} className={variant === g.id ? 'on' : ''} title={g.sub} onClick={() => setVariant(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="gs-logo">
          <Logo width={460} variant={variant} />
        </div>
        <p className="gs-menu-sub">
          {bastion
            ? 'A cooperative game for 1–4 Heroes defending the Bastion against the hordes of the Baleful Queen.'
            : 'A cooperative game for 1–4 Taoist monks against the ghosts of Wu-Feng.'}
        </p>
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
          {bastion
            ? 'Based on Last Bastion by Antoine Bauza (Repos Production, 2019). A fan-made version for playing with friends; all art drawn for this project.'
            : 'Based on Ghost Stories by Antoine Bauza (Repos Production, 2008). A fan-made version for playing with friends; all art drawn for this project.'}
        </p>
      </div>
    </div>
  )
}
