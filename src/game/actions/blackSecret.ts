// Black Secret expansion handlers.
//
// The asymmetric Wu-Feng player intervenes at Yin step 3. Instead of the
// drawn ghost auto-placing on its color board, Wu-Feng picks one of three
// options:
//   - 'place'  — place the ghost normally (the engine then runs on-arrival).
//   - 'summon' — discard the ghost; summon a demon of cost ≤ ghost resistance.
//   - 'curse'  — discard the ghost; throw a curse of matching color (black ghosts
//                are wild) + chosen level. Level must be reachable per the
//                pyramid (level 2 needs ≥2 lvl-1 curses, etc.).
//
// The handler is invoked while phase === 'wuFengIntervention'.

import { getGhostCard } from '../ghostCatalogue'
import { completeWuFengTurn } from './yin'
import { placeGhost } from './hauntingAndQi'
import type {
  CurseLevel,
  DemonId,
  DemonState,
  GameState,
  TaoColor,
} from '../types'
import type { Action } from '../actions'

type Choice = Extract<Action, { type: 'wuFengIntervene' }>['choice']

export function applyWuFengIntervene(state: GameState, choice: Choice): GameState {
  if (state.phase !== 'wuFengIntervention') throw new Error('wuFengIntervene: wrong phase')
  if (!state.blackSecret) throw new Error('wuFengIntervene: Black Secret not active')
  if (!state.pendingArrivalCardId) throw new Error('wuFengIntervene: no pending arrival')

  const cardId = state.pendingArrivalCardId
  const card = getGhostCard(cardId)
  const bsBase = state.blackSecret // narrowed by `if (!state.blackSecret)` above
  // Clear pending arrival; specific branches restore it via placement if needed.
  let s: GameState = { ...state, pendingArrivalCardId: undefined, blackSecret: bsBase }

  switch (choice.kind) {
    case 'place': {
      // Re-push card onto deck so placeGhost's invariants (deck is the source
      // of truth for arrivals) still hold? placeGhost takes a cardId and
      // doesn't touch the deck — that's fine. We just verify the target slot
      // is open and place.
      // Color placement rule: respect like base engine.
      const naturalBoard =
        card.color === 'black' ? s.activeBoard : (card.color as typeof s.activeBoard)
      const occupiedOnNatural = s.boards[naturalBoard].ghostSpaces.filter(Boolean).length
      if (occupiedOnNatural < 3 && choice.targetBoard !== naturalBoard) {
        throw new Error(`color placement violation: must place on ${naturalBoard}`)
      }
      if (s.boards[choice.targetBoard].ghostSpaces[choice.targetSpace] != null) {
        throw new Error('target ghost space already occupied')
      }
      s = placeGhost(s, cardId, { board: choice.targetBoard, space: choice.targetSpace })
      break
    }

    case 'summon': {
      const cost = costOf(choice.demonId)
      const resSum = Object.values(card.resistance).reduce((a, b) => a + b, 0)
      if (resSum < cost) {
        throw new Error(`summon: card resistance ${resSum} < cost ${cost}`)
      }
      if (!bsBase.reserveDemons.includes(choice.demonId)) {
        throw new Error('summon: demon already on the board')
      }
      const reserveDemons = bsBase.reserveDemons.filter((d) => d !== choice.demonId)
      const newDemon: DemonState = {
        id: choice.demonId,
        resistance: cost as 1 | 2 | 3,
        color: card.color,
        squareIdx: choice.entranceSquare,
      }
      const catacombsDemons = [...bsBase.catacombsDemons, newDemon]
      s = {
        ...s,
        blackSecret: { ...bsBase, reserveDemons, catacombsDemons },
        discardPile: [...s.discardPile, cardId],
      }
      break
    }

    case 'curse': {
      // Color match rule: ghost color must equal the curse color, OR the ghost
      // is black (joker).
      if (card.color !== 'black' && card.color !== choice.color) {
        throw new Error(`curse: color mismatch (ghost is ${card.color})`)
      }
      // Level pyramid: lvl L needs ≥ 2 curses of lvl L-1 already thrown.
      if (choice.level > 1) {
        const prior = bsBase.curses[(choice.level - 1) as CurseLevel]
        if (prior < 2) {
          throw new Error(`curse: need 2 prior lvl ${choice.level - 1} curses (have ${prior})`)
        }
      }
      // Simplified effect: apply the active player Qi loss for level (rulebook
      // says different curses have different effects; we condense to a Qi tax
      // scaled by level). Real effects are deferred.
      const curses = { ...bsBase.curses, [choice.level]: bsBase.curses[choice.level] + 1 }
      s = {
        ...s,
        blackSecret: { ...bsBase, curses },
        discardPile: [...s.discardPile, cardId],
      }
      // Effect: lose 1 Qi for lvl 1-2, 2 Qi for lvl 3, 3 Qi for lvl 4.
      const qiLoss = choice.level <= 2 ? 1 : choice.level === 3 ? 2 : 3
      for (let i = 0; i < qiLoss; i++) {
        s = loseQiSafe(s)
      }
      break
    }
  }

  // Return to Yin → Yang completion.
  return completeWuFengTurn(s)
}

function costOf(id: DemonId): 2 | 3 | 4 {
  return id === 'cost2' ? 2 : id === 'cost3' ? 3 : 4
}

// Local helper avoiding the import cycle of `loseQi` (which lives in
// hauntingAndQi.ts and is fine to import normally — keep this for clarity).
function loseQiSafe(state: GameState): GameState {
  const active = state.activeBoard
  const t = state.taoists[active]
  if (!t.alive) return state
  const newQi = Math.max(0, t.qi - 1)
  return {
    ...state,
    taoists: { ...state.taoists, [active]: { ...t, qi: newQi, alive: newQi > 0 } },
  }
}

// Stable reference for callers that want to surface available demon costs.
export function availableDemonOptions(state: GameState): Array<{ id: DemonId; cost: 2 | 3 | 4 }> {
  if (!state.blackSecret) return []
  return state.blackSecret.reserveDemons.map((id) => ({ id, cost: costOf(id) }))
}

/**
 * Public: count of Tao colors usable as a curse color, given the pending
 * ghost card. Black ghosts are jokers (any color).
 */
export function legalCurseColors(state: GameState): TaoColor[] {
  if (!state.pendingArrivalCardId) return []
  const card = getGhostCard(state.pendingArrivalCardId)
  if (card.color === 'black') return ['red', 'green', 'blue', 'yellow', 'black']
  return [card.color as TaoColor]
}

/**
 * Public: highest legal curse level given the pyramid state.
 * Level L requires ≥ 2 prior throws at level L-1.
 */
export function maxLegalCurseLevel(state: GameState): CurseLevel {
  if (!state.blackSecret) return 1
  const c = state.blackSecret.curses
  if (c[3] >= 2) return 4
  if (c[2] >= 2) return 3
  if (c[1] >= 2) return 2
  return 1
}
