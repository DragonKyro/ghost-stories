// Hot-seat hand-off between players sharing a device, and the end of the game.

import { useEffect, useRef } from 'react'
import { LOSS_TEXT } from '@/game/ops'
import { COLOR_NAME } from '@/game/rules'
import type { GameState } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { useLogStore } from '@/store/logStore'
import { useNetworkStore } from '@/store/networkStore'
import { useUiStore } from '@/store/uiStore'
import { Logo, TaoistFigure } from '@/ui/art'
import { sharedDevice } from './seats'
import { colorVars } from './Board'

export function HandoffOverlay({ game }: { game: GameState }) {
  const handoff = useGameStore((g) => g.handoff)
  const setHandoff = useGameStore((g) => g.setHandoff)
  const online = useNetworkStore((n) => n.connection === 'in-game')
  const last = useRef(game.active)
  useEffect(() => {
    if (game.active === last.current) return
    last.current = game.active
    if (!online && sharedDevice(game) && game.taoists[game.active].kind === 'human' && game.taoists[game.active].alive && game.phase !== 'gameOver') {
      setHandoff(game.active)
    }
  }, [game, online, setHandoff])
  if (!handoff) return null
  return (
    <div className="gs-overlay" onClick={() => setHandoff(null)}>
      <div className="gs-dialog" style={colorVars(handoff)}>
        <TaoistFigure color={handoff} size={90} />
        <h2 style={{ color: 'var(--pc-light)' }}>{COLOR_NAME[handoff]}'s turn</h2>
        <p className="gs-mini">The ghosts have acted (see “Just now”). Tap anywhere when you're ready.</p>
      </div>
    </div>
  )
}

export function GameOverOverlay({ game }: { game: GameState }) {
  const quit = useGameStore((g) => g.quitGame)
  const online = useNetworkStore((n) => n.connection === 'in-game')
  const leave = useNetworkStore((n) => n.leaveRoom)
  const entries = useLogStore((l) => l.entries)
  const exorcised = entries.filter((e) => e.kind === 'exorcised').length
  const win = game.outcome?.result === 'win'
  return (
    <div className="gs-overlay">
      <div className="gs-dialog">
        <div className="gs-logo">
          <Logo width={260} />
        </div>
        <h2 style={{ color: win ? '#f3dc95' : '#e0563f', marginTop: 10 }}>{win ? 'Victory' : 'Defeat'}</h2>
        <p>{win ? 'The last incarnation of Wu-Feng is exorcised. The village is saved!' : game.outcome?.result === 'loss' ? `The village falls: ${LOSS_TEXT[game.outcome.reason]}` : ''}</p>
        <p className="gs-mini">
          {game.turn} turns · {exorcised} ghosts exorcised · {game.deck.length} cards left in the deck
        </p>
        <div className="gs-btnrow" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="gs-btn primary" onClick={() => useUiStore.getState().setShowStats(true)}>
            See the stats
          </button>
          <button className="gs-btn" onClick={() => (online ? leave() : quit())}>
            Back to the menu
          </button>
          <button
            className="gs-btn"
            onClick={() => {
              const el = document.querySelector('.gs-overlay') as HTMLElement | null
              if (el) el.style.display = 'none'
            }}
          >
            Look at the board
          </button>
        </div>
      </div>
    </div>
  )
}
