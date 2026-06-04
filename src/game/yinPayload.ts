// Build the `startTurn` payload for the current Yin phase.
//
// The engine demands all random outcomes (curse-die rolls, ghost draws) in the
// action payload so peers reduce identically. In a hot-seat / solo game we
// generate those rolls locally; in a multiplayer game the host generates and
// broadcasts them.
//
// This helper is *separate* from the engine because it depends on `Math.random`.
// Keeping randomness here means the engine itself can stay pure.

import { getGhostCard } from './ghostCatalogue'
import { activeBoard } from './helpers'
import type { ArrivingGhost, StartTurnPayload } from './actions'
import type { CurseFace, GameState, TaoistColor } from './types'

const CURSE_FACES: CurseFace[] = [
  // Approximation of the physical die's weighting:
  // 2 × no-effect, 1 × haunt, 1 × spawn-ghost, 1 × lose-all-tao, 1 × lose-Qi.
  'none',
  'none',
  'haunt',
  'spawnGhost',
  'loseAllTao',
  'loseQi',
]

export function rollCurseDie(): CurseFace {
  return CURSE_FACES[Math.floor(Math.random() * CURSE_FACES.length)]
}

/**
 * Build a StartTurnPayload for the current state. The caller can override
 * placement choices via `chooseArrivalSlot` (e.g., asks the human which board
 * to put the ghost on when the natural board is full).
 *
 * Returns the payload + any *pending choices* needed before dispatch (the
 * `spawnGhost` curse-die result and the Yin-step-3 ghost arrival both need
 * placement decisions on board-full).
 */
export type PendingChoice = {
  cardId: string
  // Which boards are legal targets right now (the natural board, OR any board
  // with an open space if the natural board is full).
  legalBoards: TaoistColor[]
}

export type BuildResult = {
  payload: StartTurnPayload
  /** Empty when the rolls had no choices to make. */
  pendingChoices: PendingChoice[]
}

export function buildYinPayload(state: GameState): BuildResult {
  const board = activeBoard(state)
  const tormentorCurseRolls: CurseFace[] = []
  const curseSpawnedGhosts: ArrivingGhost[] = []
  const pendingChoices: PendingChoice[] = []
  let deckCursor = 0 // for previewing future draws when curse-die triggers spawn-ghost

  // Step 1: ghost actions on the active board.
  for (const ghost of board.ghostSpaces) {
    if (!ghost) continue
    const card = getGhostCard(ghost.cardId)
    for (const ab of card.abilities.center) {
      if (ab.kind === 'tormentor') {
        const face = rollCurseDie()
        tormentorCurseRolls.push(face)
        if (face === 'spawnGhost') {
          // Need to draw the next un-drawn deck card.
          const cardId = state.ghostDeck[deckCursor]
          if (!cardId) continue
          deckCursor++
          const result = autoPlaceArrival(state, cardId, pendingChoices)
          if (result) curseSpawnedGhosts.push(result)
        }
      }
    }
  }
  // Death Army incarnation: one extra curse-die roll for the active player.
  if (board.ghostSpaces.some((g) => g && getGhostCard(g.cardId).incarnationId === 'deathArmy')) {
    const face = rollCurseDie()
    tormentorCurseRolls.push(face)
    if (face === 'spawnGhost') {
      const cardId = state.ghostDeck[deckCursor]
      if (cardId) {
        deckCursor++
        const result = autoPlaceArrival(state, cardId, pendingChoices)
        if (result) curseSpawnedGhosts.push(result)
      }
    }
  }

  // Step 3: draw a ghost — skipped if the board is overrun.
  const overrun = board.ghostSpaces.filter(Boolean).length === 3
  const skipStep3 = overrun || state.taoists[state.activeBoard].isNeutral || !state.taoists[state.activeBoard].alive

  let arrival: ArrivingGhost | undefined
  if (!skipStep3) {
    const cardId = state.ghostDeck[deckCursor]
    if (cardId) {
      arrival = autoPlaceArrival(state, cardId, pendingChoices) ?? undefined
    }
  }

  return {
    payload: { tormentorCurseRolls, curseSpawnedGhosts, arrival },
    pendingChoices,
  }
}

function autoPlaceArrival(
  state: GameState,
  cardId: string,
  pendingChoices: PendingChoice[],
): ArrivingGhost | null {
  const card = getGhostCard(cardId)
  const natural: TaoistColor = card.color === 'black' ? state.activeBoard : (card.color as TaoistColor)
  const natOccupied = state.boards[natural].ghostSpaces.filter(Boolean).length

  if (natOccupied < 3) {
    // Place on natural board, first empty slot.
    const slot = state.boards[natural].ghostSpaces.findIndex((g) => g == null) as 0 | 1 | 2
    return { cardId, targetBoard: natural, targetSpace: slot >= 0 ? slot : 0 }
  }

  // Natural is full → player chooses any board with space.
  const candidates = (['red', 'blue', 'green', 'yellow'] as TaoistColor[]).filter(
    (c) => state.boards[c].ghostSpaces.some((g) => g == null),
  )
  if (candidates.length === 0) {
    // All 12 spaces full — engine will eat 1 Qi. Use natural as the target;
    // engine bypasses placement when totalEmpty == 0.
    return { cardId, targetBoard: natural, targetSpace: 0 }
  }
  if (candidates.length === 1) {
    const target = candidates[0]
    const slot = state.boards[target].ghostSpaces.findIndex((g) => g == null) as 0 | 1 | 2
    return { cardId, targetBoard: target, targetSpace: slot }
  }
  // Two-or-more options → defer to the player. Pick the first as a default;
  // the UI swaps if they make a choice via the pendingChoices flow.
  pendingChoices.push({ cardId, legalBoards: candidates })
  const target = candidates[0]
  const slot = state.boards[target].ghostSpaces.findIndex((g) => g == null) as 0 | 1 | 2
  return { cardId, targetBoard: target, targetSpace: slot }
}
