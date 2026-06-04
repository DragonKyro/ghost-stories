// Top-level game screen. Positions the village in the center, 4 player boards
// on each side, and overlays the panels + dialogs.

import { useMemo } from 'react'
import { useGameStore } from '@/store/gameStore'
import { VillageBoardSVG } from './VillageBoardSVG'
import { PlayerBoard } from './PlayerBoard'
import { HandPanel } from './HandPanel'
import { LogPanel } from './LogPanel'
import { ActionBar } from './ActionBar'
import { ExorcismDialog } from './ExorcismDialog'
import { RequestHelpDialog } from './RequestHelpDialog'
import { HandoffOverlay } from './HandoffOverlay'
import { YinPhaseRunner } from './YinPhaseRunner'
import { AIDriver } from './AIDriver'
import { ChatPanel } from './ChatPanel'
import { useNetworkStore } from '@/store/networkStore'
import { adjacentTiles, ghostInstanceAt, isCornerTile, reachableGhostSpaces } from '@/game/helpers'
import { getGhostCard } from '@/game/ghostCatalogue'
import type { GameState, GhostRef, TaoistColor, VillageTileId } from '@/game/types'

export function GameView() {
  const game = useGameStore((s) => s.game)
  const overlay = useGameStore((s) => s.uiOverlay)

  if (!game) return null

  const activeColor = game.turnOrder[game.turnIndex] as TaoistColor

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100vh', gap: 12, padding: 12 }}>
      {/* Left: board + bottom controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <BoardArea game={game} />
        <ActionBar game={game} />
        <HandPanel game={game} />
      </div>

      {/* Right: side panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div style={{ padding: 8, background: 'var(--bg-elevated)', border: '1px solid var(--rule)', borderRadius: 6 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Game state</h3>
          <ul style={{ margin: '4px 0 0', padding: '0 0 0 16px', fontSize: 12, color: 'var(--ink-muted)' }}>
            <li>Phase: <strong>{game.phase}</strong></li>
            <li>Active board: <strong>{activeColor}</strong></li>
            <li>Haunted: <strong>{game.hauntedCount}/3</strong></li>
            <li>Deck: <strong>{game.ghostDeck.length}</strong> · Discard: {game.discardPile.length}</li>
            <li>Buddha supply: {game.buddhaSupply}</li>
            <ConnectionStatus />
          </ul>
        </div>
        <LogPanel />
        <ChatPanel />
      </div>

      {/* Modal overlays */}
      <YinPhaseRunner />
      <AIDriver />
      {overlay.kind === 'handoff' && <HandoffOverlay nextTaoist={overlay.nextTaoist} />}
      {game.phase === 'gameOver' && <GameOverOverlay game={game} />}
    </div>
  )
}

function BoardArea({ game }: { game: GameState }) {
  const overlay = useGameStore((s) => s.uiOverlay)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const dispatch = useGameStore((s) => s.dispatch)
  const activeColor = game.turnOrder[game.turnIndex] as TaoistColor
  const taoistId = `taoist-${activeColor}` as const
  const active = game.taoists[activeColor]

  // Pre-compute highlights for the current overlay.
  const { highlightTiles, highlightGhosts, highlightBuddhaSpaces } = useMemo(() => {
    const tiles = new Set<VillageTileId>()
    const ghosts = new Set<string>()
    const buddhas = new Set<string>()
    if (overlay.kind === 'selectMoveTarget' && active.tile && active.alive) {
      // Dance of the Spires = all tiles; else adjacent only.
      const power = game.boards[activeColor].activePowerId
      const isSpires = power === 'danceOfTheSpires'
      if (isSpires) {
        for (const v of game.village) tiles.add(v.id)
      } else {
        for (const n of adjacentTiles(game, active.tile)) tiles.add(n.id)
      }
    }
    if (overlay.kind === 'selectExorcismTarget' && active.tile && active.alive) {
      const reach = reachableGhostSpaces(game, active.tile)
      for (const r of reach) {
        if (ghostInstanceAt(game, r) != null) ghosts.add(`${r.board}/${r.space}`)
      }
    }
    if (overlay.kind === 'selectBuddhaTarget' && active.tile && active.alive) {
      const reach = reachableGhostSpaces(game, active.tile)
      for (const r of reach) {
        const empty = ghostInstanceAt(game, r) == null
        const hasBuddha = game.boards[r.board].buddhaSpaces[r.space]
        if (empty && !hasBuddha) buddhas.add(`${r.board}/${r.space}`)
      }
    }
    return { highlightTiles: tiles, highlightGhosts: ghosts, highlightBuddhaSpaces: buddhas }
  }, [overlay, game, activeColor])

  const handleTileClick = (tileId: VillageTileId) => {
    if (overlay.kind === 'selectMoveTarget') {
      const tile = game.village.find((v) => v.id === tileId)
      if (!tile) return
      if (!highlightTiles.has(tileId)) return
      // Spires (red active power) vs normal move.
      if (game.boards[activeColor].activePowerId === 'danceOfTheSpires') {
        dispatch({ type: 'usePower', taoistId, powerId: 'danceOfTheSpires', params: { kind: 'danceOfTheSpires', toTile: tileId } })
      } else {
        dispatch({ type: 'moveTaoist', taoistId, toTile: tileId })
      }
      setOverlay({ kind: 'none' })
      return
    }
    if (overlay.kind === 'yinYang' && active.yinYang) {
      // Yin-Yang: clicking a haunted tile flips it.
      const tile = game.village.find((v) => v.id === tileId)
      if (tile?.haunted) {
        dispatch({ type: 'useYinYang', taoistId, effect: { kind: 'flipHauntedTile', tile: tileId } })
        setOverlay({ kind: 'none' })
      }
    }
  }

  // Exorcism / Buddha selection state — we use a closure-local state via the overlay.
  // For corner-tile dual exorcism we need to collect up to 2 ghosts before opening the dialog.
  const handleGhostClick = (ref: GhostRef) => {
    if (overlay.kind === 'selectExorcismTarget') {
      const tile = active.tile ? game.village.find((v) => v.id === active.tile) : null
      const canDual = tile && isCornerTile(tile)
      // Single target for now — dual exorcism via shift-click would be a Phase 2 polish.
      void canDual
      // Open dialog with this single target.
      setOverlay({ kind: 'rollingExorcism', targets: [ref], spent: [] })
    }
  }

  const handleBuddhaSpaceClick = (ref: GhostRef) => {
    if (overlay.kind === 'selectBuddhaTarget') {
      dispatch({ type: 'placeBuddha', taoistId, spaces: [ref] })
      setOverlay({ kind: 'none' })
    }
  }

  return (
    <div style={{
      position: 'relative',
      flex: 1,
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gridTemplateRows: 'auto 1fr auto',
      alignItems: 'center',
      justifyItems: 'center',
      gap: 16,
      padding: 16,
      background: 'var(--bg)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      overflow: 'auto',
    }}>
      {/* North (red) */}
      <div style={{ gridColumn: 2, gridRow: 1 }}>
        <PlayerBoard
          game={game} color="red" side="north"
          onGhostClick={handleGhostClick}
          onBuddhaSpaceClick={handleBuddhaSpaceClick}
          highlightGhosts={highlightGhosts}
          highlightBuddhaSpaces={highlightBuddhaSpaces}
          active={activeColor === 'red'}
        />
      </div>
      {/* West (yellow) */}
      <div style={{ gridColumn: 1, gridRow: 2 }}>
        <PlayerBoard
          game={game} color="yellow" side="west"
          onGhostClick={handleGhostClick}
          onBuddhaSpaceClick={handleBuddhaSpaceClick}
          highlightGhosts={highlightGhosts}
          highlightBuddhaSpaces={highlightBuddhaSpaces}
          active={activeColor === 'yellow'}
        />
      </div>
      {/* Village */}
      <div style={{ gridColumn: 2, gridRow: 2 }}>
        <VillageBoardSVG game={game} onTileClick={handleTileClick} highlightTiles={highlightTiles} />
      </div>
      {/* East (blue) */}
      <div style={{ gridColumn: 3, gridRow: 2 }}>
        <PlayerBoard
          game={game} color="blue" side="east"
          onGhostClick={handleGhostClick}
          onBuddhaSpaceClick={handleBuddhaSpaceClick}
          highlightGhosts={highlightGhosts}
          highlightBuddhaSpaces={highlightBuddhaSpaces}
          active={activeColor === 'blue'}
        />
      </div>
      {/* South (green) */}
      <div style={{ gridColumn: 2, gridRow: 3 }}>
        <PlayerBoard
          game={game} color="green" side="south"
          onGhostClick={handleGhostClick}
          onBuddhaSpaceClick={handleBuddhaSpaceClick}
          highlightGhosts={highlightGhosts}
          highlightBuddhaSpaces={highlightBuddhaSpaces}
          active={activeColor === 'green'}
        />
      </div>

      {/* Dialogs */}
      {overlay.kind === 'rollingExorcism' && (
        <ExorcismDialog
          game={game}
          taoistId={taoistId}
          targets={overlay.targets}
          onClose={() => setOverlay({ kind: 'none' })}
        />
      )}
      {overlay.kind === 'requestHelp' && active.tile && (
        <RequestHelpDialog
          game={game}
          taoistId={taoistId}
          tile={game.village.find((v) => v.id === active.tile)!}
          onClose={() => setOverlay({ kind: 'none' })}
        />
      )}

      {/* Hover hint for selection modes */}
      {(overlay.kind === 'selectMoveTarget' || overlay.kind === 'selectExorcismTarget' || overlay.kind === 'selectBuddhaTarget' || overlay.kind === 'yinYang') && (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          padding: '4px 10px',
          background: 'var(--accent)', color: '#1a1410',
          borderRadius: 4, fontSize: 11,
        }}>
          {overlay.kind === 'selectMoveTarget' && 'Click a highlighted tile to move'}
          {overlay.kind === 'selectExorcismTarget' && 'Click a highlighted ghost to exorcise'}
          {overlay.kind === 'selectBuddhaTarget' && 'Click a highlighted Buddha space'}
          {overlay.kind === 'yinYang' && 'Click a haunted tile to flip (or close)'}
          <button onClick={() => setOverlay({ kind: 'none' })} style={{ marginLeft: 8, padding: '0 6px' }}>×</button>
        </div>
      )}
    </div>
  )
}

function ConnectionStatus() {
  const role = useNetworkStore((s) => s.role)
  const roomCode = useNetworkStore((s) => s.roomCode)
  const peerByUuid = useNetworkStore((s) => s.peerByUuid)
  if (role === 'solo') return null
  const peerCount = Object.keys(peerByUuid).length
  return (
    <li>
      Net: <strong>{role}</strong>
      {roomCode && <> · room <strong>{roomCode}</strong></>}
      <> · {peerCount} peer{peerCount === 1 ? '' : 's'}</>
    </li>
  )
}

function GameOverOverlay({ game }: { game: GameState }) {
  const setUiMode = useGameStore((s) => s.setUiMode)
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2500,
    }}>
      <div style={{ background: 'var(--bg-elevated)', padding: 32, borderRadius: 8, textAlign: 'center', minWidth: 360 }}>
        <h2 style={{ margin: 0, color: game.outcome?.kind === 'win' ? '#d4a857' : '#c1392b' }}>
          {game.outcome?.kind === 'win' ? '★ Victory' : '✗ Defeat'}
        </h2>
        <p style={{ color: 'var(--ink-muted)' }}>
          {game.outcome?.kind === 'loss' && `Reason: ${game.outcome.reason}`}
          {game.outcome?.kind === 'win' && 'The last incarnation of Wu-Feng is exorcised.'}
        </p>
        <button style={{ marginTop: 16, padding: '12px 24px' }} onClick={() => setUiMode('mainMenu')}>
          Back to main menu
        </button>
      </div>
    </div>
  )
}

// Silence unused imports kept for clarity in future iterations.
void getGhostCard
