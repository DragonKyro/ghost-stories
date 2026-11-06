// The game screen: header, the table, and the side panel (what to do now,
// recent events, log / chat / expansion boards). Also hosts the AI driver,
// the hot-seat hand-off and the end-of-game screen.
//
// Two layouts: wide (board left, panel right) and stacked (phones in
// portrait, narrow windows: board on top, panel below with tabs).

import { useEffect, useState } from 'react'
import { waitingFor } from '@/game/engine'
import { hauntedCount, incarnationsInDeck, COLOR_NAME, seatName as seatLabel } from '@/game/rules'
import type { GameState } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { useUiStore } from '@/store/uiStore'
import { useNetworkStore } from '@/store/networkStore'
import { ChatPanel } from '@/ui/online/ChatPanel'
import { ConnectionBadge } from '@/ui/online/ConnectionBadge'
import { RulebookOverlay } from '@/rulebook'
import { StatsView } from '@/ui/stats/StatsView'
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

export interface Layout {
  /** Village tile size in px. */
  t: number
  /** Board on top, panel below (phones, narrow windows). */
  stacked: boolean
  /** Small tiles: plates and tiles drop text. */
  compact: boolean
  /** Side panel width (wide layout). */
  side: number
  /** Short screen (phone in landscape): tabs instead of a fixed log, a slimmer header. */
  short: boolean
}

/** The board is 5.45 tiles across and down (3 tiles + 2 boards + gaps). */
const BOARD_TILES = 5.45 // 3 + 2 × 1.18, plus a little air

export function computeLayout(w: number, h: number): Layout {
  const stacked = w < 760 || (w < 1000 && h > w * 1.1)
  const clamp = (x: number) => Math.max(48, Math.min(200, Math.floor(x)))
  if (stacked) {
    const t = clamp(Math.min((w - 8) / BOARD_TILES, (h * 0.6 - 40) / BOARD_TILES))
    return { t, stacked, compact: t < 112, side: 0, short: false }
  }
  const short = h < 560
  const side = w < 1150 ? 320 : 380
  const t = clamp(Math.min((w - side - 24) / BOARD_TILES, (h - (short ? 42 : 52)) / BOARD_TILES))
  return { t, stacked, compact: t < 112, side, short }
}

/** The usable viewport (the layout viewport can briefly differ from the window on phones). */
function viewport(): { w: number; h: number } {
  const de = document.documentElement
  return { w: Math.min(window.innerWidth, de.clientWidth || Infinity), h: Math.min(window.innerHeight, de.clientHeight || Infinity) }
}

function useLayout(): Layout {
  const [layout, setLayout] = useState(() => {
    const v = viewport()
    return computeLayout(v.w, v.h)
  })
  useEffect(() => {
    const fit = () => {
      const v = viewport()
      setLayout((old) => {
        const next = computeLayout(v.w, v.h)
        return next.t === old.t && next.stacked === old.stacked && next.side === old.side && next.short === old.short ? old : next
      })
    }
    const ro = new ResizeObserver(fit)
    ro.observe(document.documentElement)
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    window.visualViewport?.addEventListener('resize', fit)
    fit()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
      window.visualViewport?.removeEventListener('resize', fit)
    }
  }, [])
  return layout
}

export function GameScreen() {
  const game = useGameStore((g) => g.game)
  const error = useGameStore((g) => g.error)
  const clearError = useGameStore((g) => g.clearError)
  const layout = useLayout()
  const [rules, setRules] = useState(false)
  const showStats = useUiStore((u) => u.showStats)
  const setShowStats = useUiStore((u) => u.setShowStats)

  useEffect(() => {
    if (!error) return
    const id = setTimeout(clearError, 4500)
    return () => clearTimeout(id)
  }, [error, clearError])

  if (!game) return null
  return (
    <div
      className={`gs-screen ${layout.stacked ? 'stacked' : ''} ${layout.compact ? 'compact' : ''}`}
      style={{ ['--t' as string]: `${layout.t}px`, ['--side' as string]: `${layout.side}px` }}
    >
      <Header game={game} onRules={() => setRules(true)} stacked={layout.stacked || layout.short} />
      <BoardArea game={game} layout={layout} />
      {layout.stacked || layout.short ? <BottomPanel game={game} /> : <Side game={game} />}
      <AIDriver />
      <HandoffOverlay game={game} />
      {game.phase === 'gameOver' && <GameOverOverlay game={game} />}
      {rules && <RulebookOverlay onClose={() => setRules(false)} />}
      {showStats && <StatsView game={game} onClose={() => setShowStats(false)} />}
      {error && (
        <div className="gs-toast" onClick={clearError}>
          {error}
        </div>
      )}
    </div>
  )
}

function Header({ game, onRules, stacked }: { game: GameState; onRules: () => void; stacked: boolean }) {
  const quit = useGameStore((g) => g.quitGame)
  const startedAt = useGameStore((g) => g.startedAt)
  const online = useNetworkStore((n) => n.connection === 'in-game' || n.connection === 'lobby')
  const leave = useNetworkStore((n) => n.leaveRoom)
  const haunted = hauntedCount(game)
  const dead = game.whiteMoon?.dead.length ?? 0
  return (
    <div className="gs-header">
      {!stacked && <span className="gs-title">Ghost Stories</span>}
      <span className="gs-stat">
        {stacked ? 'T' : 'Turn '}
        <strong>{game.turn}</strong> · <strong>{COLOR_NAME[game.active]}</strong>
      </span>
      <span className="gs-stat" title="Ghost cards left in the deck">
        Deck <strong>{game.deck.length}</strong>
      </span>
      {!stacked && (
        <span className="gs-stat" title="Incarnations of Wu-Feng still hidden in the deck">
          Wu-Feng hidden <strong>{incarnationsInDeck(game)}</strong>
        </span>
      )}
      <span className={`gs-stat ${haunted >= 2 ? 'gs-danger' : ''}`} title="A third haunted tile loses the game">
        {stacked ? 'Haunt' : 'Haunted'} <strong>{haunted}/3</strong>
      </span>
      {game.whiteMoon && (
        <span className={`gs-stat ${dead >= 9 ? 'gs-danger' : ''}`} title="The twelfth dead villager loses the game">
          {stacked ? 'Dead' : 'Villagers dead'} <strong>{dead}/12</strong>
        </span>
      )}
      {!stacked && (
        <span className="gs-stat">
          <Clock since={startedAt} />
        </span>
      )}
      <span className="gs-spacer" />
      <ConnectionBadge />
      <button className="gs-btn small" onClick={() => useUiStore.getState().setShowStats(true)}>
        Stats
      </button>
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

function BoardArea({ game, layout }: { game: GameState; layout: Layout }) {
  const ia = useInteraction(game)
  return (
    <div className="gs-boardwrap">
      <div style={{ position: 'relative' }}>
        <Board game={game} ia={ia} tile={layout.t} compact={layout.compact} />
        <Inspector game={game} tile={layout.t} stacked={layout.stacked} />
      </div>
      {ia.hint && <div className="gs-hint gs-boardhint">{touchWording(ia.hint)}</div>}
    </div>
  )
}

const COARSE = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
/** "Click" → "Tap" on touch screens. */
function touchWording(text: string): string {
  return COARSE ? text.replace(/Click/g, 'Tap').replace(/click/g, 'tap') : text
}

/** What the player can do now (or who we're waiting on). */
function ActionArea({ game }: { game: GameState }) {
  const canAct = useCanAct()
  const seat = waitingFor(game)
  if (game.prompt) return <PromptPanel game={game} prompt={game.prompt} />
  if (game.phase === 'yang' && seat && canAct(seat)) return <TurnPanel game={game} />
  if (game.phase === 'gameOver') return null
  return (
    <div className="gs-card">
      <h3>{seat ? `${seatLabel(seat)}'s move` : 'The ghosts move…'}</h3>
      <p className="gs-mini">
        {seat && isAiSeat(game, seat) ? 'The AI is thinking.' : seat ? `Waiting for ${useNetworkStore.getState().connection === 'in-game' ? 'them' : seatLabel(seat)}.` : ''}
      </p>
    </div>
  )
}

/** Clear the board selection whenever the turn changes. */
function useResetOnTurn(game: GameState): void {
  const reset = useUiStore((u) => u.reset)
  const [turn, setTurn] = useState(game.turn)
  useEffect(() => {
    if (game.turn !== turn) {
      setTurn(game.turn)
      reset()
    }
  }, [game.turn, turn, reset])
}

function Side({ game }: { game: GameState }) {
  const panel = useUiStore((u) => u.sidePanel)
  const setPanel = useUiStore((u) => u.setSidePanel)
  const online = useNetworkStore((n) => n.connection === 'in-game')
  useResetOnTurn(game)
  const hasExpansion = !!(game.whiteMoon || game.blackSecret)
  return (
    <div className="gs-side">
      <div className="gs-card" style={{ flex: '0 0 auto', maxHeight: 130, overflowY: 'auto', padding: '6px 10px' }}>
        <RecentEvents />
      </div>
      <div style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0, paddingBottom: 8 }}>
        <ActionArea game={game} />
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
        {panel === 'chat' && online ? <ChatPanel title={null} height="100%" /> : panel === 'expansion' && hasExpansion ? <ExpansionPanel game={game} /> : <LogPanel />}
      </div>
    </div>
  )
}

/** Stacked layout: the latest events, then tabs (Play / Log / Chat / expansion). */
function BottomPanel({ game }: { game: GameState }) {
  const [tab, setTab] = useState<'play' | 'log' | 'chat' | 'expansion'>('play')
  const online = useNetworkStore((n) => n.connection === 'in-game')
  const canAct = useCanAct()
  useResetOnTurn(game)
  const hasExpansion = !!(game.whiteMoon || game.blackSecret)
  const myMove = (game.prompt && canAct(game.prompt.owner)) || (!game.prompt && game.phase === 'yang' && canAct(game.active))
  // A question for this device brings the Play tab forward.
  useEffect(() => {
    if (myMove) setTab('play')
  }, [myMove, game.prompt?.kind])
  return (
    <div className="gs-bottom">
      <div className="gs-tabs gs-bottom-tabs">
        <button className={tab === 'play' ? 'on' : ''} onClick={() => setTab('play')}>
          Play{myMove && tab !== 'play' ? ' •' : ''}
        </button>
        <button className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>
          Log
        </button>
        {online && (
          <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>
            Chat
          </button>
        )}
        {hasExpansion && (
          <button className={tab === 'expansion' ? 'on' : ''} onClick={() => setTab('expansion')}>
            {game.blackSecret ? 'Wu-Feng' : 'White Moon'}
          </button>
        )}
      </div>
      <div className="gs-bottom-body">
        {tab === 'play' && (
          <>
            <div className="gs-card gs-bottom-recent">
              <RecentEvents />
            </div>
            <ActionArea game={game} />
          </>
        )}
        {tab === 'log' && <LogPanel />}
        {tab === 'chat' && online && <ChatPanel title={null} height="100%" />}
        {tab === 'expansion' && hasExpansion && <ExpansionPanel game={game} />}
      </div>
    </div>
  )
}
