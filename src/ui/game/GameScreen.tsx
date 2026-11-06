// The game screen: header, the table, and the side panel (what to do now,
// recent events, log / chat / expansion boards). Also hosts the AI driver,
// the hot-seat hand-off and the end-of-game screen.

import { useEffect, useRef, useState } from 'react'
import { waitingFor } from '@/game/engine'
import { hauntedCount, incarnationsInDeck, COLOR_NAME, seatName as seatLabel } from '@/game/rules'
import type { GameState } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { useLogStore } from '@/store/logStore'
import { useUiStore } from '@/store/uiStore'
import { useNetworkStore } from '@/store/networkStore'
import { ChatPanel } from '@/ui/online/ChatPanel'
import { ConnectionBadge } from '@/ui/online/ConnectionBadge'
import { RulebookOverlay } from '@/rulebook'
import { Board } from './Board'
import { useInteraction } from './interaction'
import { TurnPanel } from './TurnPanel'
import { PromptPanel } from './PromptPanel'
import { LogPanel, RecentEvents } from './LogPanel'
import { Inspector } from './Inspector'
import { AIDriver } from './AIDriver'
import { HandoffOverlay, GameOverOverlay } from './Overlays'
import { ExpansionPanel } from './ExpansionPanel'
import { useCanAct, isAiSeat } from './seats'
import './game.css'

function useTileSize(): number {
  const [t, setT] = useState(150)
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth - 380 - 30
      const h = window.innerHeight - 64
      setT(Math.max(88, Math.min(200, Math.floor(Math.min(w, h) / 5.45))))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return t
}

export function GameScreen() {
  const game = useGameStore((g) => g.game)
  const error = useGameStore((g) => g.error)
  const clearError = useGameStore((g) => g.clearError)
  const t = useTileSize()
  const [rules, setRules] = useState(false)

  useEffect(() => {
    if (!error) return
    const id = setTimeout(clearError, 4500)
    return () => clearTimeout(id)
  }, [error, clearError])

  if (!game) return null
  return (
    <div className="gs-screen" style={{ ['--t' as string]: `${t}px` }}>
      <Header game={game} onRules={() => setRules(true)} />
      <BoardArea game={game} tile={t} />
      <Side game={game} />
      <AIDriver />
      <HandoffOverlay game={game} />
      {game.phase === 'gameOver' && <GameOverOverlay game={game} />}
      {rules && <RulebookOverlay onClose={() => setRules(false)} />}
      {error && (
        <div className="gs-toast" onClick={clearError}>
          {error}
        </div>
      )}
    </div>
  )
}

function Header({ game, onRules }: { game: GameState; onRules: () => void }) {
  const quit = useGameStore((g) => g.quitGame)
  const startedAt = useGameStore((g) => g.startedAt)
  const online = useNetworkStore((n) => n.connection === 'in-game' || n.connection === 'lobby')
  const leave = useNetworkStore((n) => n.leaveRoom)
  const haunted = hauntedCount(game)
  const dead = game.whiteMoon?.dead.length ?? 0
  return (
    <div className="gs-header">
      <span className="gs-title">Ghost Stories</span>
      <span className="gs-stat">
        Turn <strong>{game.turn}</strong> · <strong>{COLOR_NAME[game.active]}</strong>
      </span>
      <span className="gs-stat" title="Ghost cards left in the deck">
        Deck <strong>{game.deck.length}</strong>
      </span>
      <span className="gs-stat" title="Incarnations of Wu-Feng still hidden in the deck">
        Wu-Feng hidden <strong>{incarnationsInDeck(game)}</strong>
      </span>
      <span className={`gs-stat ${haunted >= 2 ? 'gs-danger' : ''}`} title="A third haunted tile loses the game">
        Haunted <strong>{haunted}/3</strong>
      </span>
      {game.whiteMoon && (
        <span className={`gs-stat ${dead >= 9 ? 'gs-danger' : ''}`} title="The twelfth dead villager loses the game">
          Villagers dead <strong>{dead}/12</strong>
        </span>
      )}
      <span className="gs-stat">
        <Clock since={startedAt} />
      </span>
      <span className="gs-spacer" />
      <ConnectionBadge />
      <button className="gs-btn small" onClick={onRules}>
        Rules
      </button>
      <button
        className="gs-btn small"
        onClick={() => {
          if (game.phase !== 'gameOver' && !window.confirm('Leave this game?')) return
          if (online) leave()
          else quit()
        }}
      >
        Leave
      </button>
    </div>
  )
}

function Clock({ since }: { since: number }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const s = Math.max(0, Math.floor((Date.now() - since) / 1000))
  return <span>{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</span>
}

function BoardArea({ game, tile }: { game: GameState; tile: number }) {
  const ia = useInteraction(game)
  const wrap = useRef<HTMLDivElement>(null)
  return (
    <div className="gs-boardwrap" ref={wrap}>
      <div style={{ position: 'relative' }}>
        <Board game={game} ia={ia} tile={tile} />
        <Inspector game={game} tile={tile} />
      </div>
      {ia.hint && (
        <div className="gs-hint" style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', maxWidth: 520, zIndex: 30 }}>
          {ia.hint}
        </div>
      )}
    </div>
  )
}

function Side({ game }: { game: GameState }) {
  const panel = useUiStore((u) => u.sidePanel)
  const setPanel = useUiStore((u) => u.setSidePanel)
  const online = useNetworkStore((n) => n.connection === 'in-game')
  const canAct = useCanAct()
  const seat = waitingFor(game)
  const reset = useUiStore((u) => u.reset)
  const lastTurn = useRef(game.turn)
  useEffect(() => {
    if (game.turn !== lastTurn.current) {
      lastTurn.current = game.turn
      reset()
    }
  }, [game.turn, reset])
  const hasExpansion = !!(game.whiteMoon || game.blackSecret)
  return (
    <div className="gs-side">
      <div className="gs-card" style={{ flex: '0 0 auto', maxHeight: 130, overflowY: 'auto', padding: '6px 10px' }}>
        <RecentEvents />
      </div>
      <div style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0, paddingBottom: 8 }}>
        {game.prompt ? (
          <PromptPanel game={game} prompt={game.prompt} />
        ) : game.phase === 'yang' && seat && canAct(seat) ? (
          <TurnPanel game={game} />
        ) : game.phase !== 'gameOver' ? (
          <div className="gs-card">
            <h3>{seat ? `${seatLabel(seat)}'s move` : 'The ghosts move…'}</h3>
            <p className="gs-mini">
              {seat && isAiSeat(game, seat) ? 'The AI is thinking.' : seat ? `Waiting for ${useNetworkStore.getState().connection === 'in-game' ? 'them' : seatLabel(seat)}.` : ''}
            </p>
          </div>
        ) : null}
      </div>
      <div className="gs-tabs">
        <button className={panel === 'log' ? 'on' : ''} onClick={() => setPanel('log')}>
          Log
        </button>
        {online && (
          <button className={panel === 'chat' ? 'on' : ''} onClick={() => setPanel('chat')}>
            Chat
          </button>
        )}
        {hasExpansion && (
          <button className={panel === 'expansion' ? 'on' : ''} onClick={() => setPanel('expansion')}>
            {game.blackSecret ? 'Wu-Feng & catacombs' : 'White Moon'}
          </button>
        )}
      </div>
      <div className="gs-tabbody" style={{ flex: '0 0 30vh' }}>
        {panel === 'chat' && online ? (
          <ChatPanel title={null} height="100%" />
        ) : panel === 'expansion' && hasExpansion ? (
          <ExpansionPanel game={game} />
        ) : (
          <LogPanel />
        )}
      </div>
    </div>
  )
}

export function useLogLength(): number {
  return useLogStore((l) => l.entries.length)
}
