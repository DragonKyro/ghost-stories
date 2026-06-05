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
import { activeBoard, emptySpacesOnBoard, ghostInstanceAt, tileByCoord, tilesInHauntingLine } from '../helpers'
import {
  applyOnArrival,
  hauntFirstTileInFront,
  killTopVillagerOnTile,
  loseQi,
  placeGhost,
  suLingCancelsGhost,
  triggerSuLingEvent,
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
  // Black Secret: if a human Wu-Feng is in the game and the drawn card is NOT
  // an incarnation, hand off to the Wu-Feng intervention phase.
  if (!skipStep3) {
    if (!payload.arrival) throw new Error('startTurn: missing arrival payload for active board')
    if (s.blackSecret) {
      const card = getGhostCard(payload.arrival.cardId)
      if (!card.isIncarnation) {
        // Pop the card from the top of the deck so it lives in pending state.
        s = {
          ...s,
          ghostDeck: s.ghostDeck.slice(1),
          phase: 'wuFengIntervention',
          pendingArrivalCardId: payload.arrival.cardId,
        }
        return s
      }
    }
    s = resolveArrival(s, payload.arrival)
    s = checkLossConditions(s)
    if (s.phase === 'gameOver') return s
  }

  return enterYangOrAdvance(s, skipStep3)
}

/**
 * Helper called by `wuFengIntervene` (place choice). Continues the turn from
 * `wuFengIntervention` → Yang.
 */
export function completeWuFengTurn(state: GameState): GameState {
  let s = state
  s = checkLossConditions(s)
  if (s.phase === 'gameOver') return s
  const activeColor = s.turnOrder[s.turnIndex] as TaoistColor
  const activeTaoist = s.taoists[activeColor]
  const skipStep3 = activeTaoist.isNeutral || !activeTaoist.alive
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

    // White Moon: Su-Ling cancels the center-stone abilities of the ghost in
    // front of her (Haunter/Tormentor/Devourer all skip). Tormentor curse
    // rolls still need to be CONSUMED from the payload to keep the rollIdx
    // aligned with payload order — the engine just throws away the effect.
    const cancelled = suLingCancelsGhost(s, s.activeBoard, space)

    // Left-to-right ability application.
    for (const ab of card.abilities.center) {
      switch (ab.kind) {
        case 'haunter':
          if (cancelled) break
          s = advanceHaunter(s, s.activeBoard, space)
          break
        case 'tormentor': {
          const result = tormentorRolls[rollIdx++]
          if (!result) throw new Error('tormentor curse roll missing in payload')
          if (cancelled) break
          s = applyCurseDie(s, s.activeBoard, space, result, curseSpawnedGhosts, () => spawnIdx++)
          // Su-Ling: a curse die was rolled — trigger placement event.
          s = triggerSuLingEvent(s)
          break
        }
        case 'devourer':
          if (cancelled) break
          s = applyDevourer(s, s.activeBoard, space)
          break
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

/**
 * Devourer (White Moon): kills the top villager on the first of the 3 tiles in
 * front of the ghost that has any villager. If those 3 are empty, kills any
 * villager elsewhere (deterministic pick — engine grabs the first found in
 * village order). If no villagers anywhere, the active player loses 1 Qi.
 */
function applyDevourer(state: GameState, board: TaoistColor, space: GhostSpaceIdx): GameState {
  if (!state.whiteMoon) return state
  const line = tilesInHauntingLine(board, space)
  // Front-facing first.
  for (const coord of line) {
    const tile = tileByCoord(state, coord)
    if (tile.villagerStack && tile.villagerStack.length > 0) {
      return killTopVillagerOnTile(state, tile.id)
    }
  }
  // Else any villager.
  for (const t of state.village) {
    if (t.villagerStack && t.villagerStack.length > 0) {
      return killTopVillagerOnTile(state, t.id)
    }
  }
  // Else lose 1 Qi.
  return loseQi(state, state.activeBoard)
}

// keep imports live for the refactor
void triggerSuLingEvent

function advanceHaunter(state: GameState, board: TaoistColor, space: GhostSpaceIdx): GameState {
  const ghost = state.boards[board].ghostSpaces[space]
  if (!ghost) return state

  if (ghost.hauntingFigurePos === 'card') {
    let s = mutateGhost(state, board, space, { hauntingFigurePos: 'stone1' })
    // White Moon: villager on the first tile in front flees opposite direction.
    s = applyHaunterFlee(s, board, space)
    return s
  }
  if (ghost.hauntingFigurePos === 'stone1') {
    // Advance to stone2 (haunt-and-reset).
    let s = mutateGhost(state, board, space, { hauntingFigurePos: 'stone2' })
    s = hauntFirstTileInFront(s, board, space)
    // Then reset back to card.
    s = mutateGhost(s, board, space, { hauntingFigurePos: 'card' })
    // Su-Ling trigger: a tile may have been haunted.
    s = triggerSuLingEvent(s)
    return s
  }
  // Already on stone2: same haunt-and-reset effect (defensive fallthrough).
  let s = hauntFirstTileInFront(state, board, space)
  s = mutateGhost(s, board, space, { hauntingFigurePos: 'card' })
  s = triggerSuLingEvent(s)
  return s
}

/**
 * White Moon: when a Haunting figure moves from card to stone1, the villager
 * at the top of the first stack in front of the ghost flees one tile in the
 * direction *opposite* the ghost. If the destination has 3 villagers already
 * or would leave the village / land on a haunted tile, the villager dies.
 */
function applyHaunterFlee(state: GameState, board: TaoistColor, space: GhostSpaceIdx): GameState {
  if (!state.whiteMoon) return state
  const line = tilesInHauntingLine(board, space)
  if (line.length < 1) return state
  const firstCoord = line[0]
  const firstTile = tileByCoord(state, firstCoord)
  if (!firstTile.villagerStack || firstTile.villagerStack.length === 0) return state

  // The "opposite direction" is the next tile in the haunting line — moving
  // *away* from the ghost (line[1]).
  const oppCoord = line[1] ?? null
  const fleeingVillager = firstTile.villagerStack[firstTile.villagerStack.length - 1]

  // No destination — leaves village → dies.
  if (!oppCoord) {
    return killTopVillagerOnTile(state, firstTile.id)
  }
  const destTile = tileByCoord(state, oppCoord)
  // Haunted destination → dies.
  if (destTile.haunted) {
    return killTopVillagerOnTile(state, firstTile.id)
  }
  // Full destination (3 villagers) → dies.
  if ((destTile.villagerStack?.length ?? 0) >= 3) {
    return killTopVillagerOnTile(state, firstTile.id)
  }
  // Move: pop from first, push to destination.
  const firstStack = firstTile.villagerStack.slice(0, -1)
  const destStack = [...(destTile.villagerStack ?? []), fleeingVillager]
  const village = state.village.map((t) => {
    if (t.id === firstTile.id) return { ...t, villagerStack: firstStack }
    if (t.id === destTile.id) return { ...t, villagerStack: destStack }
    return t
  })
  return { ...state, village }
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
