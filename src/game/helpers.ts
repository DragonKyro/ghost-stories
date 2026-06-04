// Pure helpers shared by handlers. No state mutations; all functions take state
// as input and return derived values or new state copies via structural
// updates.

import { getGhostCard } from './ghostCatalogue'
import { BOARD_SIDE } from './setup'
import type {
  BoardColor,
  GameState,
  GhostInstance,
  GhostRef,
  PlayerBoard,
  TaoColor,
  TaoDieFace,
  TaoistColor,
  TaoistId,
  TaoistState,
  VillageCoord,
  VillageTile,
  VillageTileId,
} from './types'

// ---------- Geometry ---------------------------------------------------

export function getTile(state: GameState, id: VillageTileId): VillageTile {
  const t = state.village.find((v) => v.id === id)
  if (!t) throw new Error(`tile not found: ${id}`)
  return t
}

export function tileByCoord(state: GameState, coord: VillageCoord): VillageTile {
  const t = state.village.find((v) => v.coord.col === coord.col && v.coord.row === coord.row)
  if (!t) throw new Error(`no tile at ${coord.col},${coord.row}`)
  return t
}

/** Chebyshev-distance-1 (king's move) neighbours within the 3x3 grid. */
export function adjacentTiles(state: GameState, fromId: VillageTileId): VillageTile[] {
  const from = getTile(state, fromId)
  const out: VillageTile[] = []
  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (dc === 0 && dr === 0) continue
      const c = from.coord.col + dc
      const r = from.coord.row + dr
      if (c < 0 || c > 2 || r < 0 || r > 2) continue
      out.push(tileByCoord(state, { col: c as 0 | 1 | 2, row: r as 0 | 1 | 2 }))
    }
  }
  return out
}

export function isCornerTile(tile: VillageTile): boolean {
  const c = tile.coord
  return (c.col === 0 || c.col === 2) && (c.row === 0 || c.row === 2)
}

/**
 * Returns the village tile that sits at the "front" of each ghost space on a
 * board. The 4 boards line up along the 4 edges of the 3x3 village. A ghost
 * space's "haunting line" runs perpendicular into the village starting at the
 * tile directly in front of it.
 *
 * For example, the red (north) board has 3 ghost spaces left/center/right; the
 * left ghost space faces the (col=0, row=0) tile, center faces (1,0), right
 * faces (2,0). The line then runs to row=1 then row=2.
 */
export function tilesInHauntingLine(boardColor: BoardColor, ghostSpaceIdx: 0 | 1 | 2): VillageCoord[] {
  const side = BOARD_SIDE[boardColor]
  switch (side) {
    case 'north':
      // Columns 0/1/2 from top down.
      return [
        { col: ghostSpaceIdx, row: 0 },
        { col: ghostSpaceIdx, row: 1 },
        { col: ghostSpaceIdx, row: 2 },
      ] as VillageCoord[]
    case 'south':
      // Columns 0/1/2 from bottom up.
      return [
        { col: ghostSpaceIdx, row: 2 },
        { col: ghostSpaceIdx, row: 1 },
        { col: ghostSpaceIdx, row: 0 },
      ] as VillageCoord[]
    case 'west':
      // Rows 0/1/2 from left to right.
      return [
        { col: 0, row: ghostSpaceIdx },
        { col: 1, row: ghostSpaceIdx },
        { col: 2, row: ghostSpaceIdx },
      ] as VillageCoord[]
    case 'east':
      // Rows 0/1/2 from right to left.
      return [
        { col: 2, row: ghostSpaceIdx },
        { col: 1, row: ghostSpaceIdx },
        { col: 0, row: ghostSpaceIdx },
      ] as VillageCoord[]
  }
}

/**
 * Returns the village tiles that are "adjacent" to a given ghost space — those
 * a Taoist must stand on to exorcise or place a Buddha facing that space.
 *
 * Each ghost space is "adjacent" to exactly one village tile: the first tile
 * in its haunting line. Corner tiles are adjacent to two ghost spaces (the
 * adjacent edges' nearest ghost spaces).
 */
export function ghostSpaceFacingTile(state: GameState, ref: GhostRef): VillageTile {
  const [first] = tilesInHauntingLine(ref.board, ref.space)
  return tileByCoord(state, first)
}

/** For a Taoist's tile, which ghost spaces can they reach? */
export function reachableGhostSpaces(state: GameState, fromTile: VillageTileId): GhostRef[] {
  const tile = getTile(state, fromTile)
  const out: GhostRef[] = []
  // For each board, check if any of its 3 ghost spaces' facing tile == this tile.
  const colors: BoardColor[] = ['red', 'blue', 'green', 'yellow']
  for (const board of colors) {
    for (const space of [0, 1, 2] as const) {
      const facing = ghostSpaceFacingTile(state, { board, space })
      if (facing.id === tile.id) {
        out.push({ board, space })
      }
    }
  }
  return out
}

// ---------- Taoist + state utilities -----------------------------------

export function taoistByColor(state: GameState, color: TaoistColor): TaoistState {
  return state.taoists[color]
}

export function taoistById(state: GameState, id: TaoistId): TaoistState {
  const color = id.replace('taoist-', '') as TaoistColor
  return state.taoists[color]
}

export function activeTaoist(state: GameState): TaoistState {
  const color = state.turnOrder[state.turnIndex]
  return state.taoists[color]
}

export function activeBoard(state: GameState): PlayerBoard {
  return state.boards[state.activeBoard]
}

/** Move to next clockwise seat (wraps). */
export function advanceTurnIndex(state: GameState): { turnIndex: number; activeBoard: BoardColor } {
  const next = (state.turnIndex + 1) % state.turnOrder.length
  return { turnIndex: next, activeBoard: state.turnOrder[next] }
}

// ---------- Ghost-instance utilities -----------------------------------

export function makeGhostInstance(cardId: string): GhostInstance {
  // Some ghosts come with their haunting figure already on the board (direct-haunt).
  const card = getGhostCard(cardId)
  const direct = card.abilities.left.some((a) => a.kind === 'arriveDirectHaunt')
  return {
    cardId,
    hauntingFigurePos: direct ? 'stone1' : 'card',
    hasMantra: false,
    capturedDie: undefined,
  }
}

export function ghostInstanceAt(state: GameState, ref: GhostRef): GhostInstance | null {
  return state.boards[ref.board].ghostSpaces[ref.space]
}

export function emptySpacesOnBoard(board: PlayerBoard): Array<0 | 1 | 2> {
  const out: Array<0 | 1 | 2> = []
  for (const i of [0, 1, 2] as const) if (!board.ghostSpaces[i]) out.push(i)
  return out
}

export function anyEmptyGhostSpace(state: GameState): boolean {
  const colors: BoardColor[] = ['red', 'blue', 'green', 'yellow']
  return colors.some((c) => emptySpacesOnBoard(state.boards[c]).length > 0)
}

// ---------- Status flags driven by ghost abilities ---------------------

export function isTaoSpendingBlocked(state: GameState): boolean {
  if (state.inactiveTaoMarker) return true
  // Any ghost with a taoBlocker center ability blocks spending globally.
  for (const c of ['red', 'blue', 'green', 'yellow'] as BoardColor[]) {
    for (const g of state.boards[c].ghostSpaces) {
      if (!g) continue
      const card = getGhostCard(g.cardId)
      if (card.abilities.center.some((a) => a.kind === 'taoBlocker')) return true
    }
  }
  return false
}

export function isPowerBlocked(state: GameState, board: BoardColor): boolean {
  if (!state.boards[board].powerActive) return true
  // forgottenOnes (incarnation with powerBlocker center) disables ALL powers.
  for (const c of ['red', 'blue', 'green', 'yellow'] as BoardColor[]) {
    for (const g of state.boards[c].ghostSpaces) {
      if (!g) continue
      const card = getGhostCard(g.cardId)
      if (card.isIncarnation && card.incarnationId === 'forgottenOnes') return true
    }
  }
  return false
}

/** Count Tao dice captured across all live ghosts. Exorcisms roll 3 - captured. */
export function capturedDiceCount(state: GameState): number {
  let n = 0
  for (const c of ['red', 'blue', 'green', 'yellow'] as BoardColor[]) {
    for (const g of state.boards[c].ghostSpaces) {
      if (!g) continue
      const card = getGhostCard(g.cardId)
      for (const a of card.abilities.center) {
        if (a.kind === 'dieCaptor') {
          const count = (a.params as { count?: number } | undefined)?.count ?? 1
          n += count
        }
      }
    }
  }
  return n
}

// ---------- Exorcism math ----------------------------------------------

/**
 * Validates an exorcism attempt. Sums the required resistance (across all
 * targeted ghosts for corner-tile dual exorcism, minus Circle-of-Prayer
 * discount and Enfeeblement Mantra discount), checks dice produce enough
 * matching faces, and that spent Tao tokens cover any shortfall.
 *
 * Black faces never count toward exorcism. White (wild) faces count for any
 * color (unless Nameless is in play, but that's checked at the call site).
 * Tao tokens of a color always provide one match of that color.
 *
 * Returns { ok: true } on success, { ok: false, reason } otherwise.
 */
export function validateExorcism(
  state: GameState,
  refs: GhostRef[],
  dice: TaoDieFace[],
  spent: Array<{ from: TaoistId; color: TaoColor }>,
  opts: { whiteIsWild: boolean; mantraDiscountPerGhost?: number } = { whiteIsWild: true },
): { ok: true } | { ok: false; reason: string } {
  // Aggregate resistance.
  const req: Record<TaoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0, black: 0 }
  for (const ref of refs) {
    const ghost = ghostInstanceAt(state, ref)
    if (!ghost) return { ok: false, reason: `no ghost at ${ref.board}/${ref.space}` }
    const card = getGhostCard(ghost.cardId)
    if (card.abilities.center.some((a) => a.kind === 'diceImmune')) {
      // Dice-immune ghosts cannot be exorcised by dice. Engine validates that
      // alternative paths (Sorcerer / Buddha) are taken instead.
      return { ok: false, reason: 'ghost is dice-immune' }
    }
    for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) {
      req[c] += card.resistance[c]
    }
    // Circle of Prayer discount.
    const circle = state.village.find((v) => v.kind === 'circleOfPrayer')
    if (circle?.circleToken && card.color === circle.circleToken) {
      // Cumulative across stacked ghosts when their colors match the token.
      req[card.color] = Math.max(0, req[card.color] - 1)
    }
    // Mantra discount: -1 to any single color (yellow Taoist's power), applied
    // by removing 1 from the highest non-zero color in this ghost's resistance.
    if (ghost.hasMantra) {
      for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) {
        if (req[c] > 0) {
          req[c] -= 1
          break
        }
      }
    }
  }

  // Tally dice contributions (greedy: assign wilds last).
  const supply: Record<TaoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0, black: 0 }
  let wilds = 0
  for (const d of dice) {
    if (d === 'black') continue // never useful for exorcism
    if (d === 'wild') {
      if (opts.whiteIsWild) wilds++
      // else: nameless rule — white is useless
      continue
    }
    supply[d as TaoColor]++
  }
  // Tao token spend adds to the supply by color.
  for (const s of spent) supply[s.color]++

  // First satisfy explicit colors.
  for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) {
    const need = req[c]
    if (supply[c] >= need) {
      supply[c] -= need
      req[c] = 0
    } else {
      req[c] -= supply[c]
      supply[c] = 0
    }
  }
  // Then use wilds to cover remaining shortfall (but wilds can't pay for black).
  let totalShort = 0
  for (const c of ['red', 'green', 'blue', 'yellow'] as TaoColor[]) totalShort += req[c]
  if (req.black > 0) return { ok: false, reason: `short ${req.black} black resistance` }
  if (totalShort > wilds) return { ok: false, reason: `short ${totalShort - wilds} colored resistance` }

  return { ok: true }
}

/**
 * Apply the spent-tao deduction across taoists. Mutates passed-in (or
 * structural-copy) records — caller usually builds the next-state taoist record
 * with this.
 */
export function deductSpentTao(
  taoists: Record<TaoistColor, TaoistState>,
  spent: Array<{ from: TaoistId; color: TaoColor }>,
): Record<TaoistColor, TaoistState> {
  const out = { ...taoists }
  for (const s of spent) {
    const color = s.from.replace('taoist-', '') as TaoistColor
    const t = out[color]
    if (t.tao[s.color] <= 0) throw new Error(`taoist ${color} cannot spend ${s.color}: none`)
    out[color] = { ...t, tao: { ...t.tao, [s.color]: t.tao[s.color] - 1 } }
  }
  return out
}
