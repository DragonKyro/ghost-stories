// Win / lose detection. Called after every state mutation that could change
// the conditions.

import { getGhostCard } from '../ghostCatalogue'
import type { GameState, TaoistColor } from '../types'

export function checkLossConditions(state: GameState): GameState {
  if (state.phase === 'gameOver') return state

  // 1) All Taoists are dead.
  const livingCount = (['red', 'blue', 'green', 'yellow'] as TaoistColor[])
    .filter((c) => !state.taoists[c].isNeutral && state.taoists[c].alive).length
  const hadAnyAlive = (['red', 'blue', 'green', 'yellow'] as TaoistColor[])
    .some((c) => !state.taoists[c].isNeutral)
  if (hadAnyAlive && livingCount === 0) {
    return { ...state, phase: 'gameOver', outcome: { kind: 'loss', reason: 'allDead' } }
  }

  // 2) Third tile haunted.
  if (state.hauntedCount >= 3) {
    return { ...state, phase: 'gameOver', outcome: { kind: 'loss', reason: 'thirdHaunting' } }
  }

  // 3) Deck exhausted while an incarnation is still in play or in the deck.
  const incarnationInPlay = (['red', 'blue', 'green', 'yellow'] as TaoistColor[]).some((c) =>
    state.boards[c].ghostSpaces.some((g) => g && getGhostCard(g.cardId).isIncarnation),
  )
  const incarnationInDeck = state.ghostDeck.some((id) => getGhostCard(id).isIncarnation)
  if (state.ghostDeck.length === 0 && (incarnationInPlay || incarnationInDeck)) {
    return { ...state, phase: 'gameOver', outcome: { kind: 'loss', reason: 'deckExhausted' } }
  }

  return state
}

export function checkWin(state: GameState): GameState {
  if (state.phase === 'gameOver') return state
  // Win = all incarnations exorcised (none in play and none left in deck).
  const incarnationInPlay = (['red', 'blue', 'green', 'yellow'] as TaoistColor[]).some((c) =>
    state.boards[c].ghostSpaces.some((g) => g && getGhostCard(g.cardId).isIncarnation),
  )
  const incarnationInDeck = state.ghostDeck.some((id) => getGhostCard(id).isIncarnation)
  if (!incarnationInPlay && !incarnationInDeck) {
    // Need at least one to have been in the deck originally — otherwise we'd
    // win at setup. Check discard for an incarnation as proof.
    const incarnationExorcised = state.discardPile.some((id) => getGhostCard(id).isIncarnation)
    if (incarnationExorcised) {
      return { ...state, phase: 'gameOver', outcome: { kind: 'win' } }
    }
  }
  return state
}
