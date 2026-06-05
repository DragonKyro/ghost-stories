// A single player board: 3 ghost-card slots, 3 Buddha spots, 3 haunting-figure
// tracks (each: card → stone1 → stone2), the power stone, and Qi count.
//
// Boards sit on one side of the village. The component orients its layout so
// the "ghost row" always faces the village (i.e., the side touching the 3x3
// grid). The parent passes `side` so we know which way to point.

import { GhostCard } from '@/ui/svg/GhostCard'
import { TAOIST_COLOR_HEX } from '@/ui/shared/playerColors'
import { getGhostCard } from '@/game/ghostCatalogue'
import type { BoardSide, GameState, GhostRef, PlayerBoard as PlayerBoardState, TaoistColor } from '@/game/types'

type Props = {
  game: GameState
  color: TaoistColor
  side: BoardSide
  onGhostClick?: (ref: GhostRef) => void
  onBuddhaSpaceClick?: (ref: GhostRef) => void
  highlightGhosts?: Set<string> // `${board}/${space}` strings
  highlightBuddhaSpaces?: Set<string>
  /** True when this is the actively-acting Taoist. */
  active?: boolean
}

const GHOST_SLOT_W = 70
const GHOST_SLOT_H = 105
const SLOT_GAP = 10

export function PlayerBoard({ game, color, side, onGhostClick, onBuddhaSpaceClick, highlightGhosts, highlightBuddhaSpaces, active }: Props) {
  const board = game.boards[color]
  const taoist = game.taoists[color]

  // Layout is the same shape in board-local coordinates; the parent rotates
  // it visually via `side`. We just produce a horizontal strip of 3 slots.
  const rotation =
    side === 'north' ? 0 :
    side === 'east' ? 90 :
    side === 'south' ? 180 :
    270

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-elevated)',
        border: `2px solid ${active ? TAOIST_COLOR_HEX[color] : 'var(--rule)'}`,
        borderRadius: 8,
        padding: 8,
        // Apply rotation only to the visual content; the wrapper keeps a stable size.
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        boxShadow: active ? `0 0 18px ${TAOIST_COLOR_HEX[color]}55` : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Power stone + Qi pill on the LEFT (board-local). */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <PowerStone color={color} powerActive={board.powerActive && !board.possessed} possessed={board.possessed} />
          <QiPill qi={taoist.isNeutral || board.possessed ? board.qi : taoist.qi} dead={!taoist.isNeutral && !taoist.alive} />
        </div>

        {/* 3 ghost slots */}
        <div style={{ display: 'flex', gap: SLOT_GAP }}>
          {([0, 1, 2] as const).map((space) => (
            <GhostSlot
              key={space}
              board={board}
              boardColor={color}
              space={space}
              onGhostClick={onGhostClick}
              onBuddhaSpaceClick={onBuddhaSpaceClick}
              ghostHighlighted={!!highlightGhosts?.has(`${color}/${space}`)}
              buddhaHighlighted={!!highlightBuddhaSpaces?.has(`${color}/${space}`)}
            />
          ))}
        </div>
      </div>

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          top: -10,
          left: 8,
          padding: '0 6px',
          background: 'var(--bg)',
          color: TAOIST_COLOR_HEX[color],
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
          // Counter-rotate the label so it's always upright.
          transform: `rotate(${-rotation}deg)`,
        }}
      >
        {color}{board.possessed ? ' · possessed' : ''}{taoist.isNeutral ? ' · neutral' : ''}
      </div>
    </div>
  )
}

function GhostSlot({
  board,
  boardColor,
  space,
  onGhostClick,
  onBuddhaSpaceClick,
  ghostHighlighted,
  buddhaHighlighted,
}: {
  board: PlayerBoardState
  boardColor: TaoistColor
  space: 0 | 1 | 2
  onGhostClick?: (ref: GhostRef) => void
  onBuddhaSpaceClick?: (ref: GhostRef) => void
  ghostHighlighted: boolean
  buddhaHighlighted: boolean
}) {
  const instance = board.ghostSpaces[space]
  const card = instance ? getGhostCard(instance.cardId) : null
  const hasBuddha = board.buddhaSpaces[space]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* Ghost card OR Buddha space placeholder */}
      <div
        style={{
          width: GHOST_SLOT_W,
          height: GHOST_SLOT_H,
          border: '1px dashed var(--rule)',
          borderRadius: 4,
          position: 'relative',
          cursor: instance && onGhostClick ? 'pointer' : 'default',
          outline: ghostHighlighted ? '3px solid var(--accent)' : undefined,
          outlineOffset: -2,
        }}
        onClick={instance && onGhostClick ? () => onGhostClick({ board: boardColor, space }) : undefined}
      >
        {card && (
          <GhostCard
            color={card.color}
            resistance={card.resistance}
            width={GHOST_SLOT_W}
            leftLabel={card.abilities.left.length ? '↩' : ''}
            centerLabel={card.abilities.center.length ? '◐' : ''}
            rightLabel={card.abilities.right.length ? '↪' : ''}
          />
        )}
        {instance?.hasMantra && (
          <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 10, padding: '0 2px', background: '#d4a857', color: '#1a1410' }}>M</div>
        )}
        {instance?.capturedDie && (
          <div style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 10, padding: '0 2px', background: '#1a1410', color: '#f4e9d6', border: '1px solid #f4e9d6' }}>D</div>
        )}
      </div>

      {/* Buddha space underneath the ghost slot */}
      <div
        style={{
          width: GHOST_SLOT_W,
          height: 22,
          borderRadius: 4,
          background: hasBuddha ? '#d4a857' : 'transparent',
          border: '1px dashed var(--rule)',
          color: hasBuddha ? '#1a1410' : 'var(--ink-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          cursor: onBuddhaSpaceClick ? 'pointer' : 'default',
          outline: buddhaHighlighted ? '3px solid var(--accent)' : undefined,
          outlineOffset: -2,
        }}
        onClick={onBuddhaSpaceClick ? () => onBuddhaSpaceClick({ board: boardColor, space }) : undefined}
      >
        {hasBuddha ? 'BUDDHA' : 'buddha'}
      </div>

      {/* Haunting figure track */}
      <HauntingTrack pos={instance?.hauntingFigurePos ?? null} />
    </div>
  )
}

function HauntingTrack({ pos }: { pos: 'card' | 'stone1' | 'stone2' | null }) {
  if (!pos) return <div style={{ height: 14 }} />
  const dotAt = (active: boolean) => (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: active ? '#c1392b' : '#3a2e25',
      border: '1px solid #f4e9d6',
    }} />
  )
  return (
    <div style={{ display: 'flex', gap: 4, height: 14, alignItems: 'center' }}>
      {dotAt(pos === 'stone1')}
      {dotAt(pos === 'stone2')}
    </div>
  )
}

function PowerStone({ color, powerActive, possessed }: { color: TaoistColor; powerActive: boolean; possessed: boolean }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: powerActive ? TAOIST_COLOR_HEX[color] : '#3a2e25',
      border: '2px solid #f4e9d6',
      position: 'relative',
      opacity: possessed ? 0.4 : 1,
    }}>
      {!powerActive && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c1392b', fontWeight: 700 }}>×</div>
      )}
    </div>
  )
}

function QiPill({ qi, dead }: { qi: number; dead: boolean }) {
  return (
    <div style={{
      padding: '2px 6px',
      borderRadius: 10,
      background: dead ? '#3a2e25' : '#c1392b',
      color: '#f4e9d6',
      fontSize: 11,
      fontWeight: 600,
      minWidth: 32,
      textAlign: 'center',
    }}>
      {dead ? '✗' : `♥ ${qi}`}
    </div>
  )
}
