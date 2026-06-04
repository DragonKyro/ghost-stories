// Shared mutators for haunting tiles, losing Qi, and applying ghost arrival
// abilities. These are used by both Yin-phase resolution and Yang-phase
// (request-help / curse-die) flows.

import { getGhostCard } from '../ghostCatalogue'
import { tilesInHauntingLine, tileByCoord, ghostSpaceFacingTile } from '../helpers'
import type {
  BoardColor,
  GameState,
  GhostRef,
  GhostSpaceIdx,
  TaoistColor,
  TaoistState,
  VillageTileId,
} from '../types'

/**
 * Haunts the first active village tile in front of the given ghost space. If
 * the first tile is already haunted, walks down the haunting line until an
 * active tile is found. Updates `state.hauntedCount`.
 *
 * White Moon: villagers on the target tile are killed instead of haunting it
 * (the tile remains active). All villagers on the targeted tile die per
 * rulebook ("upon the death of a Sheng family member" rule applies — the
 * mass-death effect handles via repeated `killTopVillager` calls).
 *
 * Returns the new state. If no tile in the line is active, the state is
 * unchanged (the rulebook treats this as nothing happens).
 */
export function hauntFirstTileInFront(state: GameState, board: BoardColor, space: GhostSpaceIdx): GameState {
  const line = tilesInHauntingLine(board, space)
  for (const coord of line) {
    const tile = tileByCoord(state, coord)
    if (!tile.haunted) {
      // White Moon: villagers on this tile die instead of haunting it.
      if (state.whiteMoon && tile.villagerStack && tile.villagerStack.length > 0) {
        return killAllVillagersOnTile(state, tile.id)
      }
      const next = state.village.map((t) =>
        t.id === tile.id ? { ...t, haunted: true } : t,
      )
      return {
        ...state,
        village: next,
        hauntedCount: state.hauntedCount + 1,
      }
    }
  }
  return state
}

// ----- White Moon villager helpers ---------------------------------------

import { FAMILY_DEFS } from '../whiteMoonFamilies'
import type { VillagerToken } from '../types'

/**
 * Kill all villagers currently on a tile (top stack from top to bottom).
 * Each death triggers the family death-curse. Order matters per rulebook:
 * top of stack first, then down.
 */
export function killAllVillagersOnTile(state: GameState, tileId: VillageTileId): GameState {
  if (!state.whiteMoon) return state
  const tile = state.village.find((t) => t.id === tileId)
  if (!tile || !tile.villagerStack || tile.villagerStack.length === 0) return state
  // Walk top to bottom, applying death effects in order.
  let s = state
  // Each iteration peels the current top off and applies its curse.
  for (let i = 0; i < (tile.villagerStack?.length ?? 0); i++) {
    s = killTopVillagerOnTile(s, tileId)
    if (s.phase === 'gameOver') return s
  }
  return s
}

/**
 * Kill just the top villager of a tile (Devourer ability, single-villager
 * fleeing death, sheng-family-haunt fallout). Reveals the next villager in
 * the stack. Triggers Su-Ling event + family death-curse.
 */
export function killTopVillagerOnTile(state: GameState, tileId: VillageTileId): GameState {
  if (!state.whiteMoon) return state
  const tile = state.village.find((t) => t.id === tileId)
  if (!tile || !tile.villagerStack || tile.villagerStack.length === 0) return state
  const stack = tile.villagerStack
  // Top of stack is the LAST element (visible villager).
  const dying = stack[stack.length - 1]
  const newStack = stack.slice(0, -1)
  const village = state.village.map((t) =>
    t.id === tileId ? { ...t, villagerStack: newStack } : t,
  )
  const whiteMoon = {
    ...state.whiteMoon,
    dead: [...state.whiteMoon.dead, dying],
  }
  let s: GameState = { ...state, village, whiteMoon }
  // Family death curse (no-op for 1-person families).
  s = applyFamilyDeathCurse(s, dying)
  // Su-Ling event: a villager died — Su-Ling can be placed/moved.
  s = triggerSuLingEvent(s)
  return s
}

/**
 * Kill a villager that is the top of any tile's stack — used for the
 * Devourer fallback "kill any villager elsewhere" path.
 */
export function killAnyVillager(state: GameState): GameState {
  if (!state.whiteMoon) return state
  for (const tile of state.village) {
    if ((tile.villagerStack?.length ?? 0) > 0) {
      return killTopVillagerOnTile(state, tile.id)
    }
  }
  return state
}

// ----- Family death curses -----------------------------------------------

function applyFamilyDeathCurse(state: GameState, dying: VillagerToken): GameState {
  if (!state.whiteMoon) return state
  const def = FAMILY_DEFS[dying.family]
  if (!def) return state
  const actor = state.activeBoard
  const t = state.taoists[actor]
  if (t.isNeutral || !t.alive) return state

  switch (def.death.kind) {
    case 'noEffect':
      return state
    case 'loseQi':
      return loseQi(state, actor)
    case 'discardTao': {
      // Discard 1 Tao token: engine picks the first available color (UI can
      // surface a choice via a future sub-action).
      for (const c of ['black', 'yellow', 'green', 'blue', 'red'] as const) {
        if (t.tao[c] > 0) {
          return {
            ...state,
            taoists: { ...state.taoists, [actor]: { ...t, tao: { ...t.tao, [c]: t.tao[c] - 1 } } },
          }
        }
      }
      return state
    }
    case 'returnTaoToSupply': {
      for (const c of ['black', 'yellow', 'green', 'blue', 'red'] as const) {
        if (t.tao[c] > 0) {
          return {
            ...state,
            taoists: { ...state.taoists, [actor]: { ...t, tao: { ...t.tao, [c]: t.tao[c] - 1 } } },
            taoSupply: { ...state.taoSupply, [c]: state.taoSupply[c] + 1 },
          }
        }
      }
      return state
    }
    case 'hauntTile': {
      // Haunt the first active tile (in column-major order). Walks the village
      // grid until it finds one.
      for (const tile of state.village) {
        if (!tile.haunted) {
          // No villager-buffer check here — the curse explicitly haunts.
          const village = state.village.map((vt) =>
            vt.id === tile.id ? { ...vt, haunted: true } : vt,
          )
          return { ...state, village, hauntedCount: state.hauntedCount + 1 }
        }
      }
      return state
    }
    default:
      return state
  }
}

// ----- Su-Ling triggers --------------------------------------------------

/**
 * Su-Ling is placed/moved on any of three events: a villager dies, a curse
 * die is rolled, or a tile is haunted. The engine here only handles the
 * "place Su-Ling on the most-threatening empty haunting icon" decision (the
 * rulebook lets the active player choose; UI exposes the placement separately).
 *
 * For now: places Su-Ling on the first Haunting icon facing the current
 * active board if Su-Ling isn't already placed. Once placed she sits there
 * until manually moved. This is a simplification of the rulebook (which lets
 * the player place her each time on any haunting icon).
 */
export function triggerSuLingEvent(state: GameState): GameState {
  if (!state.whiteMoon) return state
  // Already on the board → nothing automatic happens (player can move via UI).
  if (state.whiteMoon.suLingPos) return state
  // Find the highest-pressure board: most haunting figures on stones.
  let best: { board: BoardColor; space: 0 | 1 | 2 } | null = null
  let bestScore = -1
  for (const c of ['red', 'blue', 'green', 'yellow'] as BoardColor[]) {
    for (const i of [0, 1, 2] as const) {
      const g = state.boards[c].ghostSpaces[i]
      if (!g) continue
      const score = g.hauntingFigurePos === 'stone2' ? 3 : g.hauntingFigurePos === 'stone1' ? 2 : 1
      if (score > bestScore) {
        bestScore = score
        best = { board: c, space: i }
      }
    }
  }
  if (!best) return state
  return {
    ...state,
    whiteMoon: { ...state.whiteMoon, suLingPos: { board: best.board, ghostSpaceIdx: best.space } },
  }
}

/**
 * Su-Ling cancels the center-stone abilities of the ghost in front of her.
 * Returns true if a given ghost should be skipped for its center-stone
 * effects (Haunter/Tormentor/Devourer).
 */
export function suLingCancelsGhost(state: GameState, board: BoardColor, space: 0 | 1 | 2): boolean {
  if (!state.whiteMoon) return false
  const p = state.whiteMoon.suLingPos
  if (!p) return false
  return p.board === board && p.ghostSpaceIdx === space
}

/** Unhaunts a tile (Taoist Altar / Yin-Yang flip). */
export function unhauntTile(state: GameState, tileId: string): GameState {
  const next = state.village.map((t) => (t.id === tileId && t.haunted ? { ...t, haunted: false } : t))
  // Only decrement if we actually flipped a haunted tile.
  const wasHaunted = state.village.some((t) => t.id === tileId && t.haunted)
  return {
    ...state,
    village: next,
    hauntedCount: wasHaunted ? Math.max(0, state.hauntedCount - 1) : state.hauntedCount,
  }
}

/**
 * Removes 1 Qi from a Taoist (or the board's Qi pool when neutral / possessed).
 * If the Taoist hits 0 Qi, marks them dead and possesses the board (board.qi
 * and board.possessed flip appropriately). Caller is responsible for
 * downstream cleanup (move figure to Cemetery, drop tokens, etc.).
 */
export function loseQi(state: GameState, target: TaoistColor): GameState {
  const t = state.taoists[target]
  const board = state.boards[target]

  let next: GameState
  if (board.possessed || t.isNeutral) {
    // Hit the board's own Qi pool.
    if (board.qi <= 0) {
      // Neutral / possessed with 0 Qi: the active player absorbs the loss.
      const active = state.taoists[state.activeBoard]
      if (active.isNeutral) return state // active is neutral too — nothing to debit
      return loseQi(state, active.color)
    }
    const nextBoard = { ...board, qi: board.qi - 1 }
    next = { ...state, boards: { ...state.boards, [target]: nextBoard } }
  } else {
    if (!t.alive) return state // already dead
    const newQi = t.qi - 1
    if (newQi <= 0) {
      next = killTaoist(state, target)
    } else {
      next = { ...state, taoists: { ...state.taoists, [target]: { ...t, qi: newQi } } }
    }
  }
  // Black Secret: the lost Qi lands on a Bloody Mantra.
  if (next.blackSecret && qiSideEffect) {
    next = qiSideEffect(next)
  }
  return next
}

// Registered by `blackSecret.ts` at import time to route Qi losses through
// `placeQiOnMantra`. Decoupling avoids a circular import.
let qiSideEffect: ((s: GameState) => GameState) | null = null
export function registerQiLossSideEffect(fn: (s: GameState) => GameState): void {
  qiSideEffect = fn
}

/**
 * Mark a Taoist as dead: clear their possessions, drop their figure to the
 * Cemetery, possess their board (board.qi = 0, powerActive = false).
 *
 * Power tokens land on the central village tile (we store them as "supply" on
 * the central tile only conceptually — the engine just clears them from the
 * Taoist; the Cemetery action and a future "reclaim power tokens" action will
 * recover them).
 */
export function killTaoist(state: GameState, color: TaoistColor): GameState {
  const t = state.taoists[color]
  if (!t.alive) return state

  const cleared: TaoistState = {
    ...t,
    alive: false,
    qi: 0,
    tao: { red: 0, green: 0, blue: 0, yellow: 0, black: 0 },
    yinYang: false,
    buddhasInHand: 0,
    powerTokens: 0,
    tile: null,
  }

  const board = state.boards[color]
  // Ghosts remain in play. Board becomes possessed with Qi 0; powers off.
  return {
    ...state,
    taoists: { ...state.taoists, [color]: cleared },
    boards: {
      ...state.boards,
      [color]: { ...board, possessed: true, powerActive: false, qi: 0 },
    },
  }
}

/**
 * Apply on-arrival (left-stone) abilities of a ghost that just landed at `ref`.
 * Returns a new state. Chained ghost arrivals (arriveAddGhost) are NOT applied
 * here — the caller threads the chain explicitly so each new card is drawn
 * from the deck deterministically and the trail is auditable in the log.
 *
 * `chained` is set to true when this call is itself the result of a chained
 * arrival; some abilities behave differently for chained vs initial draws
 * (the catalogue currently keeps them identical).
 */
export function applyOnArrival(state: GameState, ref: GhostRef): GameState {
  const ghost = state.boards[ref.board].ghostSpaces[ref.space]
  if (!ghost) return state
  const card = getGhostCard(ghost.cardId)

  let s = state
  for (const ab of card.abilities.left) {
    switch (ab.kind) {
      case 'arriveHauntTile':
        s = hauntFirstTileInFront(s, ref.board, ref.space)
        break
      case 'arriveLoseQi': {
        const amount = (ab.params as { amount?: number } | undefined)?.amount ?? 1
        for (let i = 0; i < amount; i++) s = loseQi(s, s.activeBoard)
        break
      }
      case 'arriveHaunterSetup':
      case 'arriveDirectHaunt':
        // Already handled at instance-creation time via makeGhostInstance().
        break
      case 'arriveAddGhost':
        // Handled by the caller (deck draw + chained arrival).
        break
      default:
        break
    }
  }

  // Bonecracker incarnation: every player discards 1 Tao token on arrival.
  if (card.isIncarnation && card.incarnationId === 'bonecracker') {
    s = bonecrackerOnArrival(s)
  }
  // Nameless: discard the Tao token on Circle of Prayer.
  if (card.isIncarnation && card.incarnationId === 'nameless') {
    const next = s.village.map((t) => (t.kind === 'circleOfPrayer' ? { ...t, circleToken: null } : t))
    s = { ...s, village: next }
  }

  return s
}

function bonecrackerOnArrival(state: GameState): GameState {
  const ts = { ...state.taoists }
  for (const c of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
    const t = ts[c]
    if (t.isNeutral || !t.alive) continue
    // Drop the first non-empty Tao color we find (player choice in real life;
    // engine picks deterministically — UI can offer a choice via a more
    // granular action if needed).
    for (const color of ['black', 'yellow', 'green', 'blue', 'red'] as const) {
      if (t.tao[color] > 0) {
        ts[c] = { ...t, tao: { ...t.tao, [color]: t.tao[color] - 1 } }
        break
      }
    }
  }
  return { ...state, taoists: ts }
}

/**
 * Place a ghost card (by id) at the given board/space. Returns the new state
 * and applies on-arrival abilities. Handles the "target board full → choose
 * any open board" override implicitly by accepting whatever the caller passes
 * — the dispatcher pre-validates.
 *
 * If the resulting board now has 0 empty spaces, future Yin step 3 on this
 * board will fire the "overrun" rule on the next turn — but only on that
 * board's own Yin phase.
 */
export function placeGhost(state: GameState, cardId: string, ref: GhostRef): GameState {
  const board = state.boards[ref.board]
  if (board.ghostSpaces[ref.space] != null) {
    throw new Error(`cannot place ghost: ${ref.board}/${ref.space} occupied`)
  }
  // If the Buddha space already has a Buddha, the ghost is immediately
  // discarded — UNLESS it's an incarnation (rulebook: incarnations not affected
  // by Buddhas, except Uncatchable which is the inverse).
  const card = getGhostCard(cardId)
  const buddhaPresent = board.buddhaSpaces[ref.space]
  if (buddhaPresent && !card.isIncarnation) {
    // Discard ghost, Buddha returns to Temple.
    const nextBoards = {
      ...state.boards,
      [ref.board]: {
        ...board,
        buddhaSpaces: board.buddhaSpaces.map((b, i) => (i === ref.space ? false : b)) as PlayerBoardBuddhas,
      },
    }
    return {
      ...state,
      boards: nextBoards,
      discardPile: [...state.discardPile, cardId],
      buddhaSupply: state.buddhaSupply + 1,
    }
  }
  if (buddhaPresent && card.isIncarnation) {
    // Buddha goes back to Temple but incarnation stays.
    const nextBoards = {
      ...state.boards,
      [ref.board]: {
        ...board,
        buddhaSpaces: board.buddhaSpaces.map((b, i) => (i === ref.space ? false : b)) as PlayerBoardBuddhas,
      },
    }
    state = { ...state, boards: nextBoards, buddhaSupply: state.buddhaSupply + 1 }
    // Special case: Uncatchable on a Buddha — keep the Buddha so it can be
    // exorcised there. The rulebook is explicit; treat it as a re-place.
    if (card.incarnationId === 'uncatchable') {
      // Restore the Buddha (the rulebook keeps it there).
      const restored = {
        ...state.boards,
        [ref.board]: {
          ...state.boards[ref.board],
          buddhaSpaces: state.boards[ref.board].buddhaSpaces.map((b, i) => (i === ref.space ? true : b)) as PlayerBoardBuddhas,
        },
      }
      state = { ...state, boards: restored, buddhaSupply: state.buddhaSupply - 1 }
    }
  }

  const instance = makeGhostInstanceFor(cardId)
  const refreshedBoard = state.boards[ref.board]
  const newSpaces = [...refreshedBoard.ghostSpaces] as PlayerBoardSpaces
  newSpaces[ref.space] = instance

  let next: GameState = {
    ...state,
    boards: {
      ...state.boards,
      [ref.board]: { ...refreshedBoard, ghostSpaces: newSpaces },
    },
  }
  next = applyOnArrival(next, ref)
  return next
}

// Re-import via direct names so this file can be type-checked standalone.
import { makeGhostInstance as makeGhostInstanceFor } from '../helpers'
import { ghostSpaceFacingTile as _ghostSpaceFacingTile } from '../helpers'
type PlayerBoardSpaces = GameState['boards'][BoardColor]['ghostSpaces']
type PlayerBoardBuddhas = GameState['boards'][BoardColor]['buddhaSpaces']
// Quiet linter on unused imports kept for future expansion (Buddha-by-tile lookups).
void _ghostSpaceFacingTile
void ghostSpaceFacingTile
