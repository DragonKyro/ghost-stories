// Rollouts for the Taoist search.
//
// Fair play: a rollout never sees hidden information. Before simulating, the
// state is "sanitized": the engine RNG is re-seeded (so the real next rolls
// stay unknown), the unseen ghost cards are dealt into the deck at random
// (incarnation positions are public and stay put, but which incarnation it
// is stays hidden), and the hidden parts of the expansions (villagers under
// the top of a stack, Wu-Feng's face-down curses and incarnation hand, the
// catacomb tokens, the Bloody Mantra deck) are shuffled.

import type { Action } from '@/game/actions'
import { baseGhostIds, blackSecretGhostIds, incarnationIds, isSummonCard, whiteMoonGhostIds } from '@/game/catalogue'
import { ghostsInPlay } from '@/game/rules'
import type { CurseToken, GameState, Seat } from '@/game/types'
import { aiRandom } from './eval'
import { applyInPlace, clone } from './fast'
import { answerPrompt } from './prompts'
import { bestOptionValue, quickStep } from './policy'
import { SEARCH, W } from './tuning'
import { evaluate } from './value'
import { answerWuFeng } from './wufeng'

export function hash(a: number, b: number): number {
  let h = (a ^ Math.imul(b + 0x9e3779b9, 0x85ebca6b)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return (h ^ (h >>> 16)) >>> 0 || 1
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

const isIncarnationId = (id: string) => id.startsWith('wf-')

/** A copy of `s` with every hidden detail re-dealt at random. */
export function sanitize(s: GameState, seed: number): GameState {
  const x: GameState = clone(s)
  const rand = aiRandom(seed)
  x.rng = hash(seed, 0x51ed) >>> 0 || 1
  x.events = []
  redealDeck(x, rand)
  if (x.whiteMoon) {
    const tiles = x.village.filter((t) => t.villagers.length > 1)
    const hidden = tiles.flatMap((t) => t.villagers.slice(0, -1))
    shuffleInPlace(hidden, rand)
    let k = 0
    for (const t of tiles) for (let i = 0; i < t.villagers.length - 1; i++) t.villagers[i] = hidden[k++]!
  }
  if (x.blackSecret) {
    const bs = x.blackSecret
    const inc = [...bs.incarnationHand, ...bs.incarnationPile]
    shuffleInPlace(inc, rand)
    bs.incarnationHand = inc.slice(0, bs.incarnationHand.length)
    bs.incarnationPile = inc.slice(bs.incarnationHand.length)
    for (const level of [1, 2, 3, 4] as const) {
      const hidden: CurseToken[] = [...bs.curseHand.filter((t) => t.level === level && !t.revealed), ...bs.curseReserve.filter((t) => t.level === level)]
      const faces = hidden.map((t) => ({ color: t.color, effect: t.effect }))
      shuffleInPlace(faces, rand)
      hidden.forEach((t, i) => Object.assign(t, faces[i]))
    }
    const heights = bs.catacombs.map((st) => st.length)
    const tokens = bs.catacombs.flat()
    shuffleInPlace(tokens, rand)
    let k = 0
    bs.catacombs = heights.map((n) => tokens.slice(k, (k += n)))
    shuffleInPlace(bs.mantraDeck, rand)
  }
  return x
}

function redealDeck(x: GameState, rand: () => number): void {
  const seen = new Set<string>(x.discard)
  for (const g of ghostsInPlay(x)) seen.add(g.ghost.card)
  const p = x.prompt
  if (p && (p.kind === 'placeGhost' || p.kind === 'wuFengGhost')) seen.add(p.card)
  const pool = [...baseGhostIds(), ...(x.whiteMoon ? whiteMoonGhostIds() : []), ...(x.blackSecret ? blackSecretGhostIds() : [])].filter((id) => !seen.has(id))
  const incPool = x.blackSecret ? [] : incarnationIds().filter((id) => !seen.has(id))
  shuffleInPlace(pool, rand)
  shuffleInPlace(incPool, rand)
  let k = 0
  let j = 0
  x.deck = x.deck.map((id) => {
    if (isSummonCard(id)) return id
    if (isIncarnationId(id)) return incPool[j++] ?? id
    return pool[k++] ?? id
  })
}

/** Answer whatever prompt is open (Taoist or Wu-Feng) with the heuristics. */
export function answer(s: GameState): Action {
  const p = s.prompt!
  const r = p.owner === 'wufeng' ? answerWuFeng(s, p) : answerPrompt(s, p)
  return { type: 'respond', by: p.owner as Seat, r }
}

/** The quick policy's next action in a rollout (prompts included). */
export function defaultAction(s: GameState): Action | null {
  if (s.prompt) return answer(s)
  if (s.phase === 'yang') return quickStep(s, s.active)
  return null
}

/**
 * Play `plan` from the sanitized state `s0`, then the quick policy for
 * `horizon` more board turns; return the position score.
 */
export function rollout(s0: GameState, plan: Action[], horizon = SEARCH.horizon): number {
  const s = clone(s0)
  const start = s.turn
  try {
    for (const a of plan) {
      for (let guard = 0; s.prompt && s.phase !== 'gameOver' && guard < 30; guard++) applyInPlace(s, answer(s))
      if (s.phase === 'gameOver') return evaluate(s)
      applyInPlace(s, a)
    }
  } catch {
    return -Infinity
  }
  // Stop at the start of the (horizon+1)-th Yang phase after this one.
  let yangs = 0
  let seenTurn = start
  for (let step = 0; step < SEARCH.maxSteps && s.phase !== 'gameOver'; step++) {
    if (s.phase === 'yang' && !s.prompt && s.turn > seenTurn) {
      seenTurn = s.turn
      if (++yangs > horizon) break
    }
    const a = defaultAction(s)
    if (!a) break
    try {
      applyInPlace(s, a)
    } catch {
      // A heuristic slip: end the turn instead (or stop here).
      if (s.prompt || s.phase !== 'yang') break
      try {
        applyInPlace(s, { type: 'endTurn', by: s.active })
      } catch {
        break
      }
    }
  }
  return leafValue(s)
}

/** The position score, plus part of the best thing the Taoist about to act can do from here. */
function leafValue(s: GameState): number {
  let v = evaluate(s)
  if (W.leaf > 0 && s.phase === 'yang' && !s.prompt && s.yang && !s.yang.moved) {
    const c = s.active
    const t = s.taoists[c]
    if (t.alive && !t.underground && t.tile != null) v += W.leaf * Math.max(0, bestOptionValue(s, c))
  }
  return v
}
