// White Moon: Mystic Barrier per-board choice dialog. Surfaces when phase is
// 'mysticBarrier'. Active "decider" is the human Taoist of the current board
// (`whiteMoon.mysticBarrierBoard`); the actor on the UI is the device-bound
// human. Falls back to the active turn-order seat if the current board is AI
// or neutral.

import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { TaoDie } from '@/ui/svg/TaoDie'
import { rollTaoDice } from '@/game/dice'
import { getGhostCard } from '@/game/ghostCatalogue'
import type { GameState, GhostRef, TaoColor, TaoDieFace, TaoistColor } from '@/game/types'

const TAO_HEX: Record<TaoColor, string> = {
  red: '#c1392b', green: '#2f8f5d', blue: '#2c69b8', yellow: '#d4a857', black: '#1a1410',
}

export function MysticBarrierDialog({ game }: { game: GameState }) {
  const dispatch = useGameStore((s) => s.dispatch)
  if (game.phase !== 'mysticBarrier') return null
  const wm = game.whiteMoon
  if (!wm || !wm.mysticBarrierBoard) return null

  const board = wm.mysticBarrierBoard
  const t = game.taoists[board]
  // Actor for the dispatch: the current board's Taoist if alive; otherwise the
  // active player (so neutral/dead boards don't block the phase).
  const actorColor: TaoistColor = (!t.alive || t.isNeutral) ? game.activeBoard : board
  const taoistId = `taoist-${actorColor}` as const

  const crystals = wm.mysticBarrierCrystals ?? 0

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: 0 }}>🌙 Mystic Barrier — {board} chooses</h3>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
          {crystals} crystal{crystals === 1 ? '' : 's'} left in the Barrier pool.
        </div>

        <SaveSection game={game} crystals={crystals} board={board} taoistId={taoistId} />
        <ExorciseSection game={game} crystals={crystals} board={board} taoistId={taoistId} />

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => dispatch({ type: 'mysticBarrierChoice', taoistId, choice: { kind: 'skip' } })}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveSection({ game, crystals, board, taoistId }: {
  game: GameState
  crystals: number
  board: TaoistColor
  taoistId: `taoist-${TaoistColor}`
}) {
  const dispatch = useGameStore((s) => s.dispatch)
  const portal = game.village.find((v) => v.hasPortal)
  const anyVillager = game.village.some((v) => (v.villagerStack?.length ?? 0) > 0)
  return (
    <Section title="Save a villager (cost: 1 crystal)">
      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
        {portal && portal.villagerStack && portal.villagerStack.length > 0
          ? `Top of Portal stack: ${portal.villagerStack[portal.villagerStack.length - 1].family}.`
          : anyVillager
            ? 'Portal empty — saves the first visible villager.'
            : 'No villagers left to save (but crystal is still spent).'}
      </div>
      <button
        style={{ ...primary, marginTop: 8 }}
        disabled={crystals < 1}
        onClick={() => dispatch({ type: 'mysticBarrierChoice', taoistId, choice: { kind: 'saveVillager' } })}
      >
        Save villager
      </button>
      <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 4 }}>
        Acting on behalf of {board}.
      </div>
    </Section>
  )
}

function ExorciseSection({ game, crystals, board, taoistId }: {
  game: GameState
  crystals: number
  board: TaoistColor
  taoistId: `taoist-${TaoistColor}`
}) {
  const dispatch = useGameStore((s) => s.dispatch)
  // Ghosts on the current board (non-incarnation).
  const targets: GhostRef[] = []
  for (const i of [0, 1, 2] as const) {
    const g = game.boards[board].ghostSpaces[i]
    if (!g) continue
    const card = getGhostCard(g.cardId)
    if (card.isIncarnation) continue
    targets.push({ board, space: i })
  }
  const [pick, setPick] = useState<GhostRef | null>(targets[0] ?? null)
  const [dice, setDice] = useState<TaoDieFace[] | null>(null)
  const [crystalsAsColor, setCrystalsAsColor] = useState<TaoColor[]>([])

  if (targets.length === 0) {
    return (
      <Section title="Roll 4 dice + crystals to exorcise">
        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>No non-incarnation ghosts on this board.</div>
      </Section>
    )
  }

  const roll = () => {
    setDice(rollTaoDice(4))
    setCrystalsAsColor([])
  }
  const addCrystal = (c: TaoColor) => {
    if (crystalsAsColor.length >= crystals) return
    setCrystalsAsColor([...crystalsAsColor, c])
  }

  return (
    <Section title="Roll 4 dice + crystals to exorcise">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {targets.map((t, i) => {
          const card = getGhostCard(game.boards[t.board].ghostSpaces[t.space]!.cardId)
          return (
            <button
              key={i}
              onClick={() => setPick(t)}
              style={{
                border: pick?.space === t.space ? '2px solid var(--accent)' : '1px solid var(--rule)',
                fontSize: 11,
              }}
            >
              {board}/{t.space} ({card.name}, res {Object.values(card.resistance).reduce((a, b) => a + b, 0)})
            </button>
          )
        })}
      </div>
      {!dice ? (
        <button style={{ ...primary, marginTop: 8 }} disabled={!pick} onClick={roll}>
          Roll 4 dice
        </button>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {dice.map((d, i) => <TaoDie key={i} face={d} size={36} />)}
          </div>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            Spend crystals as: {crystalsAsColor.map((c, i) => (
              <span key={i} style={{ color: TAO_HEX[c], marginRight: 6 }}>{c}</span>
            ))}
            <button onClick={() => setCrystalsAsColor([])} style={{ marginLeft: 8, padding: '0 6px', fontSize: 11 }}>clear</button>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {(['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]).map((c) => (
              <button
                key={c}
                disabled={crystalsAsColor.length >= crystals}
                onClick={() => addCrystal(c)}
                style={{
                  background: TAO_HEX[c],
                  color: c === 'yellow' ? '#1a1410' : '#f4e9d6',
                  border: '1px solid #f4e9d6',
                  padding: '2px 10px',
                }}
              >
                +{c}
              </button>
            ))}
          </div>
          <button
            style={{ ...primary, marginTop: 8 }}
            disabled={!pick}
            onClick={() =>
              pick && dispatch({
                type: 'mysticBarrierChoice',
                taoistId,
                choice: { kind: 'exorcise', targetGhost: pick, diceRoll: dice, crystalsAsColor },
              })
            }
          >
            Commit exorcism
          </button>
        </>
      )}
    </Section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14, padding: 10, background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: 6 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500,
}
const modalStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '2px solid #f4e9d6',
  borderRadius: 8, padding: 20, minWidth: 480, maxWidth: 620,
}
const primary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--accent)',
  color: '#1a1410',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
}
