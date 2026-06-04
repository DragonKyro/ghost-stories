// Engine entry point.
//
// Contract:
//   createGame(config) => GameState        — initial state from config
//   applyAction(state, action) => GameState — pure, deterministic reduction
//
// Every random outcome arrives in the action payload as data, so all peers
// reduce identically. The setup-time RNG (deck shuffle, layout) is seeded from
// `config.rngSeed` and lives on `GameState.rngState`.

import type { GameState } from './types'
import type { Action } from './actions'
import { applyStartTurn } from './actions/yin'
import { applyYangAction } from './actions/yang'
import { createGame } from './setup'
import { resolveArrival } from './actions/yin'
import { checkLossConditions, checkWin } from './actions/winLose'

export { createGame } from './setup'
export type { Action } from './actions'

export function applyAction(state: GameState, action: Action): GameState {
  if (state.phase === 'gameOver') return state

  switch (action.type) {
    case 'startTurn':
      return applyStartTurn(state, action.payload)

    case 'spawnIncarnation': {
      // Manual incarnation placement (tests / scripted setups). The card must
      // be at the top of the deck for the engine to honour it; in production
      // the deck is the source of truth.
      const arr = {
        cardId: state.ghostDeck[0],
        targetBoard: action.targetBoard,
        targetSpace: action.targetSpace,
      }
      let s = resolveArrival(state, arr)
      s = checkLossConditions(checkWin(s))
      return s
    }

    case 'moveTaoist':
    case 'requestHelp':
    case 'exorcise':
    case 'placeBuddha':
    case 'useYinYang':
    case 'usePower':
    case 'spendPowerToken':
    case 'endYangPhase':
      return applyYangAction(state, action)
  }
}

// Silence unused-export linter; createGame is the canonical entry point but
// useGame/uiStore may import the type directly.
void createGame
