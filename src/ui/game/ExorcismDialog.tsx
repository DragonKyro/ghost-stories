// Exorcism dialog. Player has already selected the target ghost(s); this dialog:
//   1. Rolls N dice (3 minus captured)
//   2. Shows the result + lets the green Taoist re-roll (Gods' Favorite)
//   3. Lets the player allocate Tao tokens to cover shortfall
//   4. Commits via `exorcise` action OR cancels (no penalty — non-action)
//
// The engine validates; this dialog only sets up the payload.

import { useMemo, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TaoDie } from '@/ui/svg/TaoDie'
import { rollTaoDice } from '@/game/dice'
import { capturedDiceCount, isPowerBlocked, isTaoSpendingBlocked, taoistById, validateExorcism } from '@/game/helpers'
import type { GameState, GhostRef, TaoColor, TaoDieFace, TaoistId } from '@/game/types'
import { getGhostCard } from '@/game/ghostCatalogue'

type Props = {
  game: GameState
  taoistId: TaoistId
  targets: GhostRef[]
  onClose: () => void
}

const TAO_HEX: Record<TaoColor, string> = {
  red: '#c1392b', green: '#2f8f5d', blue: '#2c69b8', yellow: '#d4a857', black: '#1a1410',
}

export function ExorcismDialog({ game, taoistId, targets, onClose }: Props) {
  const dispatch = useGameStore((s) => s.dispatch)
  const me = taoistById(game, taoistId)

  // Dice count.
  const extraDice = game.boards[me.color].activePowerId === 'strengthOfMountain' && !isPowerBlocked(game, me.color) ? 1 : 0
  const baseDice = Math.max(0, 3 - capturedDiceCount(game)) + extraDice
  const [dice, setDice] = useState<TaoDieFace[]>(() => rollTaoDice(baseDice))
  const [spent, setSpent] = useState<Array<{ from: TaoistId; color: TaoColor }>>([])
  const [rerollUsed, setRerollUsed] = useState(false)

  // Per-Taoist Tao tokens — only same-tile Taoists can spend.
  const sameTileTaoists = useMemo(() => {
    if (!me.tile) return []
    return (['red', 'blue', 'green', 'yellow'] as const)
      .map((c) => game.taoists[c])
      .filter((t) => t.alive && t.tile === me.tile)
  }, [game, me.tile])

  const verdict = validateExorcism(game, targets, dice, spent, { whiteIsWild: true })

  // Tally remaining Tao for each color across same-tile Taoists.
  const tokenSupply: Record<string, Record<TaoColor, number>> = {}
  for (const t of sameTileTaoists) {
    tokenSupply[t.id] = { ...t.tao }
    for (const s of spent) if (s.from === t.id) tokenSupply[t.id][s.color]--
  }

  const targetCards = targets.map((r) => {
    const g = game.boards[r.board].ghostSpaces[r.space]
    return g ? getGhostCard(g.cardId) : null
  })

  const handleReroll = () => {
    // Re-roll all dice (Gods' Favorite). One-shot per attempt for simplicity.
    setDice(rollTaoDice(dice.length))
    setRerollUsed(true)
  }

  const handleCommit = () => {
    dispatch({ type: 'exorcise', taoistId, ghosts: targets, diceRoll: dice, spentTao: spent })
    onClose()
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: 0 }}>Exorcism</h3>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          Targeting {targets.length} ghost{targets.length > 1 ? 's' : ''} from {me.color}'s tile.
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
          {dice.map((d, i) => <TaoDie key={i} face={d} size={48} />)}
        </div>

        <div style={{ marginTop: 12 }}>
          {targetCards.map((card, i) => card && (
            <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
              <strong>{card.name}</strong>
              {' — resistance: '}
              {(['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]).map((c) => (
                card.resistance[c] > 0 ? <span key={c} style={{ color: TAO_HEX[c], marginRight: 8 }}>{c} ×{card.resistance[c]}</span> : null
              ))}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 12,
          padding: 8,
          background: verdict.ok ? '#1f5d3c33' : '#7d282022',
          border: `1px solid ${verdict.ok ? '#2f8f5d' : '#c1392b'}`,
          borderRadius: 4,
          fontSize: 13,
        }}>
          {verdict.ok ? '✓ Roll is sufficient.' : `Short: ${verdict.reason}`}
        </div>

        {/* Tao spending UI */}
        {!isTaoSpendingBlocked(game) && sameTileTaoists.some((t) => Object.values(t.tao).some((v) => v > 0)) && (
          <div style={{ marginTop: 12, padding: 8, background: 'var(--bg)', borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 6 }}>Spend Tao tokens (same tile):</div>
            {sameTileTaoists.map((t) => (
              <div key={t.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, textTransform: 'capitalize', width: 60 }}>{t.color}</span>
                {(['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]).map((c) => {
                  const remaining = tokenSupply[t.id]?.[c] ?? 0
                  return (
                    <button
                      key={c}
                      disabled={remaining <= 0}
                      onClick={() => setSpent((s) => [...s, { from: t.id, color: c }])}
                      style={{
                        padding: '2px 8px',
                        background: TAO_HEX[c],
                        color: c === 'yellow' ? '#1a1410' : '#f4e9d6',
                        border: '1px solid #f4e9d6',
                        opacity: remaining <= 0 ? 0.3 : 1,
                      }}
                    >
                      {c.slice(0, 1).toUpperCase()} {remaining}
                    </button>
                  )
                })}
              </div>
            ))}
            {spent.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11 }}>
                Spending: {spent.map((s, i) => <span key={i} style={{ color: TAO_HEX[s.color], marginRight: 6 }}>{s.color}</span>)}
                <button onClick={() => setSpent([])} style={{ marginLeft: 8, padding: '0 6px', fontSize: 11 }}>clear</button>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {game.boards[me.color].activePowerId === 'godsFavorite' && !rerollUsed && !isPowerBlocked(game, me.color) && (
            <button onClick={handleReroll}>↻ Re-roll (Gods' Favorite)</button>
          )}
          <button onClick={onClose}>Cancel</button>
          <button
            disabled={!verdict.ok}
            onClick={handleCommit}
            style={{ background: verdict.ok ? 'var(--accent)' : undefined, color: verdict.ok ? '#1a1410' : undefined }}
          >
            Exorcise
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--rule)',
  borderRadius: 8, padding: 20, minWidth: 420, maxWidth: 540,
}
