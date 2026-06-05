// Wu-Feng's per-Yin prelude UI. Surfaces when:
//   - phase === 'yin' AND
//   - there is at least one catacombs demon OR the Shadow is in play AND
//   - Black Secret is active
//
// Lets Wu-Feng choose move/search per demon and the Shadow's action. When
// confirmed, dispatches a `wuFengDemonActions` + (optionally) a
// `wuFengShadowAction` before YinPhaseRunner's default fires.

import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { rollCurseDie } from '@/game/yinPayload'
import { rollTaoDice } from '@/game/dice'
import { TaoDie } from '@/ui/svg/TaoDie'
import type { CurseFace, GameState, TaoColor, TaoistColor, VillageTileId } from '@/game/types'

const TAO_HEX: Record<TaoColor, string> = {
  red: '#c1392b', green: '#2f8f5d', blue: '#2c69b8', yellow: '#d4a857', black: '#1a1410',
}

const COLORS: TaoistColor[] = ['red', 'blue', 'green', 'yellow']

export function WuFengYinDialog({ game, onDismiss }: { game: GameState; onDismiss: () => void }) {
  if (!game.blackSecret) return null
  if (game.phase !== 'yin') return null

  const hasDemons = game.blackSecret.catacombsDemons.length > 0
  const shadow = game.blackSecret.shadowPos
  if (!hasDemons && !shadow) return null

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: 0 }}>🩸 Wu-Feng — Yin prelude</h3>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          Pick demon actions and (if applicable) the Shadow's action. Closing this dialog
          uses the engine's default (all demons search, Shadow passes).
        </div>

        {hasDemons && <DemonsSection game={game} onDispatched={() => {}} />}
        {shadow && <ShadowSection game={game} onDispatched={() => {}} />}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onDismiss}>Done</button>
        </div>
      </div>
    </div>
  )
}

function DemonsSection({ game }: { game: GameState; onDispatched: () => void }) {
  const dispatch = useGameStore((s) => s.dispatch)
  const demons = game.blackSecret!.catacombsDemons
  type Move = { demonIdx: number; kind: 'move'; toSquare: number } | { demonIdx: number; kind: 'search' }
  const [moves, setMoves] = useState<Move[]>(demons.map((_d, i) => ({ demonIdx: i, kind: 'search' as const })))

  const setKind = (idx: number, kind: 'move' | 'search', toSquare?: number) => {
    setMoves((m) => m.map((x, i) => {
      if (i !== idx) return x
      if (kind === 'search') return { demonIdx: idx, kind: 'search' as const }
      return { demonIdx: idx, kind: 'move' as const, toSquare: toSquare ?? 0 }
    }))
  }

  const submit = () => {
    dispatch({ type: 'wuFengDemonActions', moves })
  }

  return (
    <Section title={`Demons (${demons.length})`}>
      {demons.map((d, i) => (
        <div key={i} style={{ marginTop: 6, fontSize: 12, padding: 6, background: 'var(--bg)', borderRadius: 4 }}>
          <div>cost {d.resistance} ({d.color}) at square {d.squareIdx ?? '?'}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button
              onClick={() => setKind(i, 'search')}
              style={{ border: moves[i]?.kind === 'search' ? '2px solid var(--accent)' : '1px solid var(--rule)' }}
            >Search</button>
            <button
              onClick={() => setKind(i, 'move', ((d.squareIdx ?? 0) + 1) % 9)}
              style={{ border: moves[i]?.kind === 'move' ? '2px solid var(--accent)' : '1px solid var(--rule)' }}
            >Move (next square)</button>
          </div>
        </div>
      ))}
      <button style={{ ...primary, marginTop: 8 }} onClick={submit}>Submit demon actions</button>
    </Section>
  )
}

function ShadowSection({ game }: { game: GameState; onDispatched: () => void }) {
  const dispatch = useGameStore((s) => s.dispatch)
  const shadow = game.blackSecret!.shadowPos!
  const [kind, setKind] = useState<'move' | 'attackTaoists' | 'attackTile' | 'pass'>('pass')

  const tileTargets: VillageTileId[] = game.village.map((v) => v.id)
  const [toTile, setToTile] = useState<VillageTileId | null>(null)

  const ghostSlotTargets: Array<{ board: TaoistColor; space: 0 | 1 | 2 }> = []
  for (const c of COLORS) {
    for (const i of [0, 1, 2] as const) {
      if (game.boards[c].ghostSpaces[i] == null) ghostSlotTargets.push({ board: c, space: i })
    }
  }

  const submit = () => {
    if (kind === 'pass') {
      dispatch({ type: 'wuFengShadowAction', action: { kind: 'pass' } })
    } else if (kind === 'move') {
      if (toTile) {
        dispatch({ type: 'wuFengShadowAction', action: { kind: 'move', toTile } })
      } else {
        const g = ghostSlotTargets[0]
        if (g) dispatch({ type: 'wuFengShadowAction', action: { kind: 'move', toBoard: g.board, toGhostSpaceIdx: g.space } })
      }
    } else if (kind === 'attackTaoists') {
      const dice = rollTaoDice(3)
      // For simplicity: target every alive Taoist on the Shadow's tile.
      const present: TaoistColor[] = []
      if (shadow.kind === 'villageTile') {
        for (const c of COLORS) {
          if (game.taoists[c].alive && game.taoists[c].tile === shadow.tileId) present.push(c)
        }
      }
      dispatch({ type: 'wuFengShadowAction', action: { kind: 'attackTaoists', diceRoll: dice, targetTaoists: present } })
    } else if (kind === 'attackTile') {
      const curseRoll: CurseFace = rollCurseDie()
      dispatch({ type: 'wuFengShadowAction', action: { kind: 'attackTile', curseRoll } })
    }
  }

  return (
    <Section title="Shadow of Wu-Feng">
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        Currently at: {shadow.kind === 'villageTile' ? `village tile ${shadow.tileId}` : `${shadow.board}/${shadow.ghostSpaceIdx}`}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['pass', 'move', 'attackTaoists', 'attackTile'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            style={{ border: kind === k ? '2px solid var(--accent)' : '1px solid var(--rule)' }}
          >
            {k}
          </button>
        ))}
      </div>
      {kind === 'move' && (
        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Move to tile:</span>
          {tileTargets.map((tid) => (
            <button
              key={tid}
              onClick={() => setToTile(tid)}
              style={{ border: toTile === tid ? '2px solid var(--accent)' : '1px solid var(--rule)', fontSize: 11 }}
            >
              {tid.replace('tile-', '')}
            </button>
          ))}
        </div>
      )}
      <button style={{ ...primary, marginTop: 8 }} onClick={submit}>Submit Shadow action</button>
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

// Unused TaoDie kept for future per-die display
void TaoDie
void rollTaoDice
void TAO_HEX
