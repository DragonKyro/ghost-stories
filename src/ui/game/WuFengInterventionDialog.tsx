// Surfaces when phase === 'wuFengIntervention'. Lets the Wu-Feng player pick
// place / summon / curse for the drawn ghost.

import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { getGhostCard } from '@/game/ghostCatalogue'
import { availableDemonOptions, legalCurseColors, maxLegalCurseLevel } from '@/game/actions/blackSecret'
import type { CurseLevel, GameState, TaoColor, TaoistColor } from '@/game/types'

const TAO_HEX: Record<TaoColor, string> = {
  red: '#c1392b', green: '#2f8f5d', blue: '#2c69b8', yellow: '#d4a857', black: '#1a1410',
}

const COLORS: TaoistColor[] = ['red', 'blue', 'green', 'yellow']

export function WuFengInterventionDialog({ game }: { game: GameState }) {
  const dispatch = useGameStore((s) => s.dispatch)

  if (game.phase !== 'wuFengIntervention') return null
  if (!game.pendingArrivalCardId) return null

  const card = getGhostCard(game.pendingArrivalCardId)
  const resSum = Object.values(card.resistance).reduce((a, b) => a + b, 0)
  const naturalBoard: TaoistColor = card.color === 'black' ? game.activeBoard : (card.color as TaoistColor)

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: 0 }}>🩸 Wu-Feng: choose intervention</h3>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6 }}>
          {game.blackSecret?.wuFengTag} acts.
        </div>

        <div style={{
          marginTop: 12,
          padding: 10,
          background: 'var(--bg)',
          border: `2px solid ${TAO_HEX[card.color]}`,
          borderRadius: 6,
        }}>
          <strong>{card.name}</strong> — color: <span style={{ color: TAO_HEX[card.color] }}>{card.color}</span>
          <div style={{ fontSize: 12 }}>
            Resistance: {(['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]).map((c) =>
              card.resistance[c] > 0 ? (
                <span key={c} style={{ color: TAO_HEX[c], marginRight: 8 }}>{c} ×{card.resistance[c]}</span>
              ) : null,
            )} (sum {resSum})
          </div>
          {card.color === 'black' && (
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
              Black ghost — joker for curse colors. Natural placement is on the active board ({game.activeBoard}).
            </div>
          )}
        </div>

        <PlaceSection game={game} cardColor={card.color} naturalBoard={naturalBoard} />
        <SummonSection game={game} resSum={resSum} />
        <CurseSection game={game} />

        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--ink-muted)' }}>
          You must choose one. The ghost card is the cost — summon/curse discards it.
        </div>
      </div>
      <DispatchInfo />
    </div>
  )

  // Inner: ensures dispatch is captured at the outer closure.
  function DispatchInfo() {
    return <div style={{ display: 'none' }}>{dispatch ? '' : ''}</div>
  }
}

function PlaceSection({ game, cardColor, naturalBoard }: { game: GameState; cardColor: TaoColor; naturalBoard: TaoistColor }) {
  const dispatch = useGameStore((s) => s.dispatch)
  const occupiedOnNatural = game.boards[naturalBoard].ghostSpaces.filter(Boolean).length
  const mustUseNatural = occupiedOnNatural < 3

  const [board, setBoard] = useState<TaoistColor>(naturalBoard)
  const emptySpaces = ([0, 1, 2] as const).filter((sp) => game.boards[board].ghostSpaces[sp] == null)
  const [space, setSpace] = useState<0 | 1 | 2>(emptySpaces[0] ?? 0)

  const legalBoards = mustUseNatural
    ? [naturalBoard]
    : COLORS.filter((c) => game.boards[c].ghostSpaces.some((g) => g == null))

  const canPlace = emptySpaces.length > 0 && legalBoards.includes(board)

  return (
    <Section title="① Place ghost normally">
      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>
        {mustUseNatural
          ? `Must place on the ${naturalBoard} board (natural color${cardColor === 'black' ? ' = active board' : ''}).`
          : `${naturalBoard} board is full; choose any open board.`}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {legalBoards.map((c) => (
          <button
            key={c}
            disabled={mustUseNatural && c !== naturalBoard}
            onClick={() => setBoard(c)}
            style={{ border: board === c ? '2px solid var(--accent)' : '1px solid var(--rule)' }}
          >
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {emptySpaces.map((sp) => (
          <button
            key={sp}
            onClick={() => setSpace(sp)}
            style={{ border: space === sp ? '2px solid var(--accent)' : '1px solid var(--rule)' }}
          >
            slot {sp}
          </button>
        ))}
      </div>
      <button
        style={{ ...primary, marginTop: 8 }}
        disabled={!canPlace}
        onClick={() => dispatch({ type: 'wuFengIntervene', choice: { kind: 'place', targetBoard: board, targetSpace: space } })}
      >
        Place
      </button>
    </Section>
  )
}

function SummonSection({ game, resSum }: { game: GameState; resSum: number }) {
  const dispatch = useGameStore((s) => s.dispatch)
  const demons = availableDemonOptions(game).filter((d) => d.cost <= resSum)
  const [demonId, setDemonId] = useState(demons[0]?.id ?? null)
  const [entrance, setEntrance] = useState<0 | 8>(0)

  if (demons.length === 0) {
    return (
      <Section title="② Summon a demon">
        <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
          {availableDemonOptions(game).length === 0
            ? 'All demons are already on the catacombs board.'
            : `No demon costs ≤ ${resSum} are available in reserve.`}
        </div>
      </Section>
    )
  }
  return (
    <Section title="② Summon a demon into the catacombs">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {demons.map((d) => (
          <button
            key={d.id}
            onClick={() => setDemonId(d.id)}
            style={{ border: demonId === d.id ? '2px solid var(--accent)' : '1px solid var(--rule)' }}
          >
            cost {d.cost}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-muted)' }}>Entrance:</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 8].map((sq) => (
          <button
            key={sq}
            onClick={() => setEntrance(sq as 0 | 8)}
            style={{ border: entrance === sq ? '2px solid var(--accent)' : '1px solid var(--rule)' }}
          >
            {sq === 0 ? 'NW corner' : 'SE corner'}
          </button>
        ))}
      </div>
      <button
        style={{ ...primary, marginTop: 8 }}
        disabled={!demonId}
        onClick={() => demonId && dispatch({ type: 'wuFengIntervene', choice: { kind: 'summon', demonId, entranceSquare: entrance } })}
      >
        Summon
      </button>
    </Section>
  )
}

function CurseSection({ game }: { game: GameState }) {
  const dispatch = useGameStore((s) => s.dispatch)
  const colors = legalCurseColors(game)
  const maxLevel = maxLegalCurseLevel(game)
  const [color, setColor] = useState<TaoColor>(colors[0])
  const [level, setLevel] = useState<CurseLevel>(1)
  const qiCost = level <= 2 ? 1 : level === 3 ? 2 : 3
  return (
    <Section title="③ Throw a curse">
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              background: TAO_HEX[c],
              color: c === 'yellow' ? '#1a1410' : '#f4e9d6',
              border: color === c ? '2px solid var(--accent)' : '1px solid #f4e9d6',
              padding: '2px 10px',
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((lvl) => (
          <button
            key={lvl}
            disabled={lvl > maxLevel}
            onClick={() => setLevel(lvl as CurseLevel)}
            style={{ border: level === lvl ? '2px solid var(--accent)' : '1px solid var(--rule)' }}
          >
            lvl {lvl}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
        Active player loses {qiCost} Qi (simplified curse effect — see rulebook for what's deferred).
      </div>
      <button
        style={{ ...primary, marginTop: 8 }}
        disabled={colors.length === 0}
        onClick={() => dispatch({ type: 'wuFengIntervene', choice: { kind: 'curse', level, color } })}
      >
        Curse
      </button>
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
  background: 'var(--bg-elevated)', border: '2px solid #c1392b',
  borderRadius: 8, padding: 20, minWidth: 480, maxWidth: 620,
  maxHeight: '90vh', overflowY: 'auto',
}
const primary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'var(--accent)',
  color: '#1a1410',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
}
