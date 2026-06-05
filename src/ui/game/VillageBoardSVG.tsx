// Renders the 3x3 village with Taoist figures overlaid on their tiles.

import { VillageTile } from '@/ui/svg/VillageTile'
import { Taoist } from '@/ui/svg/Taoist'
import { TAOIST_COLOR_HEX } from '@/ui/shared/playerColors'
import type { GameState, TaoistColor, VillageTileId } from '@/game/types'

const TILE_SIZE = 120
const GAP = 8

type Props = {
  game: GameState
  onTileClick?: (tileId: VillageTileId) => void
  highlightTiles?: Set<VillageTileId>
  /** Color halo for highlighted tiles (move targets, exorcism reach, etc). */
  highlightColor?: string
}

export function VillageBoardSVG({ game, onTileClick, highlightTiles, highlightColor = 'var(--accent)' }: Props) {
  const total = TILE_SIZE * 3 + GAP * 2

  // Group Taoists by tile so we can offset multiple figures on the same tile.
  const byTile: Record<string, TaoistColor[]> = {}
  for (const color of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
    const t = game.taoists[color]
    if (!t.alive || !t.tile) continue
    byTile[t.tile] = byTile[t.tile] ?? []
    byTile[t.tile].push(color)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: total,
        height: total,
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${TILE_SIZE}px)`,
        gridTemplateRows: `repeat(3, ${TILE_SIZE}px)`,
        gap: GAP,
      }}
    >
      {game.village.map((tile) => {
        const isHighlight = highlightTiles?.has(tile.id)
        return (
          <div
            key={tile.id}
            style={{
              position: 'relative',
              cursor: onTileClick ? 'pointer' : 'default',
              outline: isHighlight ? `3px solid ${highlightColor}` : undefined,
              outlineOffset: -2,
              borderRadius: 6,
              gridColumn: tile.coord.col + 1,
              gridRow: tile.coord.row + 1,
            }}
            onClick={onTileClick ? () => onTileClick(tile.id) : undefined}
          >
            <VillageTile kind={tile.kind} haunted={tile.haunted} size={TILE_SIZE} />
            {/* Circle of Prayer token */}
            {tile.kind === 'circleOfPrayer' && tile.circleToken && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 14,
                  right: 14,
                  width: 14,
                  height: 14,
                  background:
                    tile.circleToken === 'black' ? '#1a1410'
                    : tile.circleToken === 'red' ? '#c1392b'
                    : tile.circleToken === 'green' ? '#2f8f5d'
                    : tile.circleToken === 'blue' ? '#2c69b8'
                    : '#d4a857',
                  border: '1.5px solid #f4e9d6',
                  borderRadius: '50%',
                }}
              />
            )}
            {/* Portal marker (White Moon) */}
            {tile.hasPortal && (
              <div
                title="Portal"
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  fontSize: 14,
                }}
              >
                🌙
              </div>
            )}
            {/* Villager badge — top of stack with family + size */}
            {tile.villagerStack && tile.villagerStack.length > 0 && (() => {
              const top = tile.villagerStack[tile.villagerStack.length - 1]
              const remaining = tile.villagerStack.length
              return (
                <div
                  title={`Villager: ${top.family} (${remaining} on tile)`}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    padding: '1px 5px',
                    background: '#2f8f5d',
                    color: '#f4e9d6',
                    fontSize: 9,
                    borderRadius: 8,
                    border: '1px solid #f4e9d6',
                    pointerEvents: 'none',
                  }}
                >
                  👤 {top.family} ×{remaining}
                </div>
              )
            })()}
            {/* Taoist figures on this tile */}
            <div style={{ position: 'absolute', top: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: -8, pointerEvents: 'none' }}>
              {(byTile[tile.id] ?? []).map((color, i) => (
                <div key={color} style={{ marginLeft: i === 0 ? 0 : -16 }}>
                  <Taoist color={color} size={36} />
                </div>
              ))}
            </div>
            {/* Dead Taoists on Cemetery */}
            {tile.kind === 'cemetery' && (
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: -8, pointerEvents: 'none' }}>
                {(['red', 'blue', 'green', 'yellow'] as TaoistColor[])
                  .filter((c) => !game.taoists[c].alive && !game.taoists[c].isNeutral)
                  .map((c) => (
                    <div key={c} style={{ marginLeft: -10 }}>
                      <Taoist color={c} size={28} dead />
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      })}
      {/* Hidden ref to color helper for keep-warm. */}
      <div style={{ display: 'none' }}>{TAOIST_COLOR_HEX.red}</div>
    </div>
  )
}
