// Bottom action bar — what the active Taoist can do during the Yang phase.
//
// The buttons drive `uiOverlay` state in the gameStore; specific dialogs /
// selection modes are surfaced by the overlay component.

import { useGameStore } from '@/store/gameStore'
import type { GameState } from '@/game/types'
import { isPowerBlocked } from '@/game/helpers'

export function ActionBar({ game }: { game: GameState }) {
  const setOverlay = useGameStore((s) => s.setOverlay)
  const endTurnAndHandoff = useGameStore((s) => s.endTurnAndHandoff)
  const dispatch = useGameStore((s) => s.dispatch)

  const activeColor = game.turnOrder[game.turnIndex]
  const active = game.taoists[activeColor]
  if (active.isNeutral || !active.alive || game.phase !== 'yang') {
    return null
  }
  const taoistId = `taoist-${activeColor}` as const

  const powerCanInvoke =
    !isPowerBlocked(game, activeColor) &&
    ['danceOfTheSpires', 'bottomlessPockets', 'enfeeblementMantra', 'danceOfTheTwinWinds'].includes(
      game.boards[activeColor].activePowerId,
    )

  // White Moon: save-villager available when standing on the portal with villagers there.
  const onPortal = (() => {
    if (!game.whiteMoon) return false
    const tile = game.village.find((v) => v.id === active.tile)
    return !!tile?.hasPortal && !!tile.villagerStack && tile.villagerStack.length > 0 && !tile.haunted
  })()

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: 8,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 1, marginRight: 8 }}>
        Yang phase · {activeColor}
      </span>

      <button onClick={() => setOverlay({ kind: 'selectMoveTarget' })}>
        Move
      </button>

      <button onClick={() => {
        // Open the request-help dialog for whatever tile the active Taoist stands on.
        const t = game.taoists[activeColor]
        const tile = game.village.find((v) => v.id === t.tile)
        if (!tile) return
        if (tile.haunted) return
        setOverlay({ kind: 'requestHelp', tileKind: tile.kind })
      }}>
        Request help
      </button>

      <button onClick={() => setOverlay({ kind: 'selectExorcismTarget' })}>
        Exorcise
      </button>

      <button
        disabled={active.buddhasInHand === 0}
        onClick={() => setOverlay({ kind: 'selectBuddhaTarget' })}
      >
        Place Buddha {active.buddhasInHand > 0 ? `(×${active.buddhasInHand})` : ''}
      </button>

      <button disabled={!active.yinYang} onClick={() => setOverlay({ kind: 'yinYang' })}>
        Yin-Yang
      </button>

      {onPortal && (
        <button
          onClick={() => dispatch({ type: 'saveVillager', taoistId })}
          style={{ background: '#2f8f5d', color: '#f4e9d6' }}
        >
          🌙 Save Villager
        </button>
      )}

      {powerCanInvoke && (
        <button onClick={() => {
          // Quick-fire Bottomless Pockets / Spires — passive markers fire elsewhere.
          // For simplicity dispatch immediately for Bottomless Pockets (yellow → ask color).
          // Spires becomes a move-style overlay.
          const power = game.boards[activeColor].activePowerId
          if (power === 'bottomlessPockets') {
            const color = prompt('Take 1 Tao token of which color?', 'red')
            if (!color) return
            dispatch({ type: 'usePower', taoistId, powerId: 'bottomlessPockets', params: { kind: 'bottomlessPockets', color: color as any } })
          } else if (power === 'danceOfTheSpires') {
            setOverlay({ kind: 'selectMoveTarget' })
          }
        }}>
          Power: {game.boards[activeColor].activePowerId}
        </button>
      )}

      <div style={{ flex: 1 }} />

      <button onClick={endTurnAndHandoff} style={{ background: 'var(--accent)', color: '#1a1410' }}>
        End turn →
      </button>
    </div>
  )
}
