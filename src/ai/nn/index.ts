// The neural-network Taoist: encode the state, list every legal action,
// score them. Pure (no DOM / store / network).

import type { Action } from '@/game/actions'
import { playerCount } from '@/game/rules'
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

/**
 * Where the network is the AI: solo games of the base game on Initiation or
 * Normal, the setups it was trained on. Measured on the same 300 seeds
 * (network sampling at SAMPLE_TEMPERATURE vs the rules-based search AI, win
 * rates): solo Initiation 34.7% vs 19.3%, solo Normal 28% vs 15% (1,200 games);
 * but solo Nightmare 3.7% vs 5.0%, 2 players 4-5% vs 4-12%, 3 players 0.7% vs
 * 2.7%, 4 players 0-1% vs 2-8%, and with the expansions solo White Moon 2% vs
 * 5%, solo Black Secret 1% vs 19%. Everywhere else the rules-based AI plays
 * (src/ai/index.ts), and it always plays Wu-Feng. Widen this as the network is
 * trained on more setups.
 */
export function networkPlays(s: GameState): boolean {
  return playerCount(s) === 1 && !s.whiteMoon && !s.blackSecret && (s.config.difficulty === 'initiation' || s.config.difficulty === 'normal')
}

/**
 * How sharply the game AI samples the network's policy. The network plays
 * clearly better sampling its moves than always taking the single most likely
 * one (many legal actions are near-equivalent variants of one plan, so the
 * top-scored action is often a worse choice than the plan it belongs to);
 * 0.5-1 all do about the same.
 */
export const SAMPLE_TEMPERATURE = 0.75

/** Index drawn from `probs` sharpened by `temperature` (1 = as is), using `rand()` in [0, 1). */
export function sampleIndex(probs: ArrayLike<number>, rand: () => number, temperature = SAMPLE_TEMPERATURE): number {
  const n = probs.length
  const p = new Array<number>(n)
  let total = 0
  for (let i = 0; i < n; i++) total += p[i] = temperature === 1 ? probs[i]! : Math.pow(probs[i]!, 1 / temperature)
  let u = rand() * total
  for (let i = 0; i < n; i++) {
    u -= p[i]!
    if (u <= 0) return i
  }
  return n - 1
}

/** The network's action for `seat`, sampled from its policy (the way it plays the game). */
export function nnSampleAction(net: Net, s: GameState, seat: Seat, rand: () => number, temperature = SAMPLE_TEMPERATURE): Action | null {
  const d = nnDecide(net, s, seat)
  if (!d) return null
  return d.actions[d.actions.length === 1 ? 0 : sampleIndex(d.probs, rand, temperature)]!
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
