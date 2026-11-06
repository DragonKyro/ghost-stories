// Test-only: a tiny stand-in for '@/game/engine', so the online stores can be
// tested without the real rules
// (vi.mock('@/game/engine', () => import('@/store/fakeEngine'))).
//
// The "game": boards take turns (`endTurn` by the active board, skipping
// neutral ones); anyone may take the single Buddha from the temple once
// (`help` with buddhistTemple: two devices racing for it is the rollback
// case); `respond` is always legal (records who answered). Each turn "rolls"
// the RNG, so the start, the moves and the RNG all take part in the state.
// Not imported by production code.

import type { Action } from '@/game/actions'
import type { Color, GameConfig, GameState, Seat } from '@/game/types'

export interface FakeGame {
  config: GameConfig
  rng: number
  phase: 'yang' | 'gameOver'
  turn: number
  active: Color
  temple: number
  moves: string[]
  events: { kind: string; text: string }[]
}

const ORDER: readonly Color[] = ['red', 'blue', 'green', 'yellow']

function players(config: GameConfig): Color[] {
  return ORDER.filter((c) => config.seats[c] !== 'neutral')
}

const asState = (g: FakeGame) => g as unknown as GameState
const asFake = (s: GameState) => s as unknown as FakeGame

export function createGame(config: GameConfig): GameState {
  const ps = players(config)
  if (ps.length === 0) throw new Error('Nobody to play.')
  const active = config.firstPlayer ?? ps[Math.abs(config.seed) % ps.length]!
  return asState({
    config,
    rng: config.seed >>> 0,
    phase: 'yang',
    turn: 1,
    active,
    temple: 1,
    moves: [],
    events: [{ kind: 'start', text: `${active} goes first` }],
  })
}

export function actionSeat(_state: GameState, action: Action): Seat {
  return action.by
}

export function applyAction(state: GameState, action: Action): GameState {
  const g = asFake(state)
  if (g.phase === 'gameOver') throw new Error('The game is over.')
  const did = (move: string, extra: Partial<FakeGame> = {}) =>
    asState({ ...g, ...extra, moves: [...g.moves, `${action.by}:${move}`], events: [{ kind: move, text: move }] })
  switch (action.type) {
    case 'endTurn': {
      if (action.by !== g.active) throw new Error(`It's ${g.active}'s turn.`)
      const ps = players(g.config)
      const active = ps[(ps.indexOf(g.active) + 1) % ps.length]!
      return did('endTurn', { active, turn: g.turn + 1, rng: (Math.imul(g.rng, 1664525) + 1013904223) >>> 0 })
    }
    case 'help':
      if (action.params.kind !== 'buddhistTemple') throw new Error('Only the temple is open.')
      if (g.temple === 0) throw new Error('The temple has no Buddha left.')
      return did('buddha', { temple: g.temple - 1 })
    case 'respond':
      return did('respond')
    default:
      throw new Error(`The fake engine can't do ${action.type}.`)
  }
}
