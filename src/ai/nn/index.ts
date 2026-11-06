// The neural-network Taoist: encode the state, list every legal action,
// score them. Pure (no DOM / store / network).

import type { Action } from '@/game/actions'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { Color, GameConfig, GameState, Seat, SeatKind } from '@/game/types'
import { chooseAction } from '../index'
import { SEARCH } from '../tuning'
import { encodeCandidates, type EncodedCandidates } from './candidates'
import { encodeState, type Encoded } from './encode'
import { legalActions } from './legal'
import { softmax, type Net, type NetOutput } from './model'

export interface Decision {
  actions: Action[]
  heuristic: boolean
  enc: Encoded
  cands: EncodedCandidates
  out: NetOutput
  probs: Float32Array
}

/** Encode, enumerate and score the decision `seat` faces now (null if it has none). */
export function nnDecide(net: Net, s: GameState, seat: Seat): Decision | null {
  const { actions, heuristic } = legalActions(s, seat)
  if (actions.length === 0) return null
  const enc = encodeState(s, seat)
  const cands = encodeCandidates(s, enc, actions, heuristic)
  const out = net.evaluate(enc, cands)
  return { actions, heuristic, enc, cands, out, probs: softmax(out.logits) }
}

/** The network's most likely action (no search). */
export function nnChooseAction(net: Net, s: GameState, seat: Seat): Action | null {
  const d = nnDecide(net, s, seat)
  if (!d) return null
  let best = 0
  for (let i = 1; i < d.probs.length; i++) if (d.probs[i]! > d.probs[best]!) best = i
  return d.actions[best]!
}

// ---------------------------------------------------------------------------
// Deterministic sample positions (tests, the PyTorch parity fixture)
// ---------------------------------------------------------------------------

const all = (k: SeatKind): Record<Color, SeatKind> => ({ red: k, blue: k, green: k, yellow: k })

export const SAMPLE_CONFIGS: GameConfig[] = [
  { difficulty: 'normal', seats: { ...all('neutral'), green: 'ai' }, seed: 101 },
  { difficulty: 'normal', seats: { ...all('neutral'), yellow: 'ai' }, seed: 102 },
  { difficulty: 'nightmare', seats: all('ai'), seed: 103, whiteMoon: { portal: 'center', randomTiles: false } },
  { difficulty: 'normal', seats: { ...all('ai'), blue: 'neutral' }, seed: 104, blackSecret: { wuFeng: 'ai', side: 'a' } },
]

/** The positions the PyTorch parity fixture is made from (scripts/nn/parity.mjs, model.test.ts). */
export const PARITY_RECIPE = { every: 7, perGame: 2 }

/**
 * Positions from quick-policy self-play: every `every`-th decision of each
 * sample config, up to `perGame` per game.
 */
export function samplePositions(every = 7, perGame = 6, configs = SAMPLE_CONFIGS): Array<{ s: GameState; seat: Seat }> {
  const on = SEARCH.on
  SEARCH.on = false
  const out: Array<{ s: GameState; seat: Seat }> = []
  try {
    for (const config of configs) {
      let s = createGame(config)
      let taken = 0
      for (let i = 0; i < 3000 && s.phase !== 'gameOver' && taken < perGame; i++) {
        const seat = waitingFor(s)!
        if (i % every === 0 && seat !== 'wufeng') {
          out.push({ s, seat })
          taken++
        }
        s = applyAction(s, chooseAction(s, seat)!)
      }
    }
  } finally {
    SEARCH.on = on
  }
  return out
}
