// Yin phase resolution.
//
// Rule order per rulebook:
//   1. Ghost actions
//      a. Haunters — advance Haunting figure on each ghost (card → stone1 →
//         stone2 + haunt-and-reset)
//      b. Tormentors — roll the curse die for each, apply result
//   2. Board overrun check (3 occupied ghost spaces) → lose 1 Qi, skip step 3
//   3. Arrival of a ghost — draw the top card, apply color-placement rules
//
// All randomness arrives in the payload. The phase advances to Yang
// automatically at the end (or to gameOver on loss conditions).

import type {
  CurseFace,
  GameState,
  GhostSpaceIdx,
  TaoistColor,
} from '../types'
import type { ArrivingGhost, StartTurnPayload } from '../actions'
import { getGhostCard } from '../ghostCatalogue'
import { activeBoard, emptySpacesOnBoard, ghostInstanceAt } from '../helpers'
import {
  applyOnArrival,
  hauntFirstTileInFront,
  loseQi,
  placeGhost,
} from './hauntingAndQi'
import { checkLossConditions } from './winLose'

export function applyStartTurn(state: GameState, payload: StartTurnPayload): GameState {
  if (state.phase !== 'yin') {
    throw new Error(`startTurn: phase must be 'yin', got '${state.phase}'`)
  }

  // If the active seat is dead (possessed board), or neutral: still run Yin
  // steps 1+2; skip step 3.
  const activeColor = state.turnOrder[state.turnIndex] as TaoistColor
  const activeTaoist = state.taoists[activeColor]
  const skipStep3 = activeTaoist.isNeutral || !activeTaoist.alive

  // --- Step 1a + 1b: ghost actions on the active board ---
  let s = resolveGhostActions(state, payload.tormentorCurseRolls, payload.curseSpawnedGhosts)
  s = checkLossConditions(s)
  if (s.phase === 'gameOver') return s

  // --- Step 2: board overrun ---
  const board = activeBoard(s)
  const occupied = board.ghostSpaces.filter(Boolean).length
  if (occupied === 3) {
    s = loseQi(s, activeColor)
    s = checkLossConditions(s)
    if (s.phase === 'gameOver') return s
    return enterYangOrAdvance(s, skipStep3)
  }

  // --- Step 3: arrival of a ghost (skip if active board is neutral/possessed) ---
  if (!skipStep3 && payload.arrival) {
    s = resolveArrival(s, payload.arrival)
    s = checkLossConditions(s)
    if (s.phase === 'gameOver') return s
  } else if (!skipStep3 && !payload.arrival) {
    throw new Error('startTurn: missing arrival payload for active board')
  }

  return enterYangOrAdvance(s, skipStep3)
}

function resolveGhostActions(
  state: GameState,
  tormentorRolls: CurseFace[],
  curseSpawnedGhosts: ArrivingGhost[],
): GameState {
  let s = state
  const board = activeBoard(s)
  let rollIdx = 0
  let spawnIdx = 0

  for (const space of [0, 1, 2] as GhostSpaceIdx[]) {
    const ghost = board.ghostSpaces[space]
    if (!ghost) continue
    const card = getGhostCard(ghost.cardId)

    // Left-to-right ability application.
    for (const ab of card.abilities.center) {
      switch (ab.kind) {
        case 'haunter':
          s = advanceHaunter(s, s.activeBoard, space)
          break
        case 'tormentor': {
          const result = tormentorRolls[rollIdx++]
          if (!result) throw new Error('tormentor curse roll missing in payload')
          s = applyCurseDie(s, s.activeBoard, space, result, curseSpawnedGhosts, () => spawnIdx++)
          break
        }
        // Passive abilities (powerBlocker / taoBlocker / dieCaptor /
        // diceImmune / groupEffect) don't fire actively in the Yin phase —
        // they're queried by validation paths.
        default:
          break
      }
      if (s.phase === 'gameOver') return s
    }
  }
  // Death Army incarnation: active player rolls curse die each Yin (separate
  // from any Tormentor on the board). The roll, if any, is appended to the
  // tormentorRolls payload by the caller; we treat any extra roll as the
  // Death Army roll.
  const hasDeathArmy = boardHasIncarnation(s, s.activeBoard, 'deathArmy')
  if (hasDeathArmy && rollIdx < tormentorRolls.length) {
    const result = tormentorRolls[rollIdx++]
    s = applyCurseDie(s, s.activeBoard, 0, result, curseSpawnedGhosts, () => spawnIdx++)
  }
  return s
}

function advanceHaunter(state: GameState, board: TaoistColor, space: GhostSpaceIdx): GameState {
  const ghost = state.boards[board].ghostSpaces[space]
  if (!ghost) return state

  if (ghost.hauntingFigurePos === 'card') {
    return mutateGhost(state, board, space, { hauntingFigurePos: 'stone1' })
  }
  if (ghost.hauntingFigurePos === 'stone1') {
    // Advance to stone2 (haunt-and-reset).
    let s = mutateGhost(state, board, space, { hauntingFigurePos: 'stone2' })
    s = hauntFirstTileInFront(s, board, space)
    // Then reset back to card.
    s = mutateGhost(s, board, space, { hauntingFigurePos: 'card' })
    return s
  }
  // Already on stone2: same haunt-and-reset effect (defensive fallthrough).
  let s = hauntFirstTileInFront(state, board, space)
  s = mutateGhost(s, board, space, { hauntingFigurePos: 'card' })
  return s
}

function applyCurseDie(
  state: GameState,
  board: TaoistColor,
  space: GhostSpaceIdx,
  face: CurseFace,
  spawned: ArrivingGhost[],
  consumeSpawn: () => number,
): GameState {
  let s = state
  switch (face) {
    case 'none':
      return s
    case 'haunt':
      return hauntFirstTileInFront(s, board, space)
    case 'spawnGhost': {
      const idx = consumeSpawn()
      const arr = spawned[idx]
      if (!arr) throw new Error('spawn-ghost curse-die result with no arrival payload')
      return resolveArrival(s, arr)
    }
    case 'loseAllTao': {
      const t = state.taoists[state.activeBoard]
      if (t.isNeutral || !t.alive) return s
      return {
        ...s,
        taoists: {
          ...s.taoists,
          [state.activeBoard]: {
            ...t,
            tao: { red: 0, green: 0, blue: 0, yellow: 0, black: 0 },
          },
        },
      }
    }
    case 'loseQi':
      return loseQi(s, state.activeBoard)
  }
}

/**
 * Draws the top of the deck and places it. Handles:
 *   - color placement (board match, override if full, all-12-occupied → loseQi)
 *   - chained arrivals (arriveAddGhost)
 *   - incarnations (Wu-Feng cards become incarnations on the board; they're
 *     drawn the same way as ghosts but their downstream behavior differs)
 *
 * `arrival.targetBoard / targetSpace` were chosen by the active player
 * (validated against the rules below).
 */
export function resolveArrival(state: GameState, arrival: ArrivingGhost): GameState {
  // Pop the top of the deck (verify it matches the payload).
  if (state.ghostDeck.length === 0) {
    // Deck exhausted while an incarnation lingers → loss handled in win-loss
    // checker. For setup-time arrival this branch is unreachable.
    return state
  }
  const top = state.ghostDeck[0]
  if (top !== arrival.cardId) {
    throw new Error(`arrival mismatch: top of deck=${top}, payload=${arrival.cardId}`)
  }

  const card = getGhostCard(top)
  // Color placement validation.
  const naturalBoard: TaoistColor =
    card.color === 'black' ? state.activeBoard : (card.color as TaoistColor)

  const targetBoard = arrival.targetBoard
  const targetSpace = arrival.targetSpace
  const occupiedOnNatural = state.boards[naturalBoard].ghostSpaces.filter(Boolean).length
  if (occupiedOnNatural < 3) {
    // Player MUST place on the natural board.
    if (targetBoard !== naturalBoard) {
      throw new Error(`color placement violation: must place on ${naturalBoard}`)
    }
  }
  // If all 12 spaces are full, lose 1 Qi instead.
  const totalEmpty = (['red', 'blue', 'green', 'yellow'] as TaoistColor[]).reduce(
    (n, c) => n + emptySpacesOnBoard(state.boards[c]).length,
    0,
  )
  if (totalEmpty === 0) {
    let s = loseQi(state, state.activeBoard)
    // Card stays in the deck? Rule says "instead of adding the ghost, you
    // lose 1 Qi" — we discard it conventionally (matches rulebook intent;
    // the card is effectively "drawn" and gone).
    s = { ...s, ghostDeck: s.ghostDeck.slice(1), discardPile: [...s.discardPile, top] }
    return s
  }

  // Validate target slot is open.
  if (state.boards[targetBoard].ghostSpaces[targetSpace] != null) {
    throw new Error('target ghost space already occupied')
  }

  // Pop deck and place.
  let s: GameState = { ...state, ghostDeck: state.ghostDeck.slice(1) }
  s = placeGhost(s, top, { board: targetBoard, space: targetSpace })

  // Apply chained arrival (arriveAddGhost) after the parent's on-arrival.
  const newlyPlaced = ghostInstanceAt(s, { board: targetBoard, space: targetSpace })
  if (newlyPlaced) {
    const placedCard = getGhostCard(newlyPlaced.cardId)
    if (placedCard.abilities.left.some((a) => a.kind === 'arriveAddGhost') && arrival.chainedArrival) {
      s = resolveArrival(s, arrival.chainedArrival)
    }
  }
  return s
}

function mutateGhost(
  state: GameState,
  board: TaoistColor,
  space: GhostSpaceIdx,
  patch: Partial<NonNullable<GameState['boards'][TaoistColor]['ghostSpaces'][0]>>,
): GameState {
  const existing = state.boards[board].ghostSpaces[space]
  if (!existing) return state
  const newSpaces = [...state.boards[board].ghostSpaces] as GameState['boards'][TaoistColor]['ghostSpaces']
  newSpaces[space] = { ...existing, ...patch }
  return {
    ...state,
    boards: { ...state.boards, [board]: { ...state.boards[board], ghostSpaces: newSpaces } },
  }
}

function boardHasIncarnation(state: GameState, board: TaoistColor, id: string): boolean {
  return state.boards[board].ghostSpaces.some((g) => {
    if (!g) return false
    const card = getGhostCard(g.cardId)
    return card.isIncarnation && card.incarnationId === id
  })
}

function enterYangOrAdvance(state: GameState, skipYang: boolean): GameState {
  if (skipYang) {
    // Neutral / possessed board: skip Yang and immediately advance turn.
    return advanceTurn(state)
  }
  return { ...state, phase: 'yang' }
}

/** Advance turn order, switch active board, set phase back to 'yin'. */
export function advanceTurn(state: GameState): GameState {
  const nextIdx = (state.turnIndex + 1) % state.turnOrder.length
  const nextColor = state.turnOrder[nextIdx] as TaoistColor
  return {
    ...state,
    turnIndex: nextIdx,
    activeBoard: nextColor,
    phase: 'yin',
  }
}

// Re-export for the dispatcher.
import { applyOnArrival as _applyOnArrival } from './hauntingAndQi'
void _applyOnArrival
export { applyOnArrival }
