// Pure heuristics — no React, no store, no engine mutation. Functions take a
// snapshot and return numbers / booleans / picks.
//
// Stateless across turns; any per-turn memory lives on `GameState`.

import { getGhostCard } from '@/game/ghostCatalogue'
import {
  capturedDiceCount,
  ghostInstanceAt,
  isPowerBlocked,
  isTaoSpendingBlocked,
  validateExorcism,
} from '@/game/helpers'
import type {
  BoardColor,
  GameState,
  GhostInstance,
  GhostRef,
  TaoColor,
  TaoDieFace,
  TaoistColor,
} from '@/game/types'
import { getGhostCard as _g } from '@/game/ghostCatalogue'
void _g

// -------- Exorcism math --------------------------------------------------

/**
 * Expected colored faces from N Tao dice. Each die has 6 faces:
 * red / green / blue / yellow / wild / black. The colored + wild faces are
 * useful for exorcism; black isn't.
 *
 * `colorBreakdown[c]` = expected count of dice showing color c (excluding wild).
 * `expectedWilds` = expected dice showing wild.
 */
export function expectedDice(nDice: number): {
  expectedByColor: Record<TaoColor, number>
  expectedWilds: number
} {
  // Die distribution: 1/6 per side. Black faces are useless.
  return {
    expectedByColor: {
      red: nDice * (1 / 6),
      green: nDice * (1 / 6),
      blue: nDice * (1 / 6),
      yellow: nDice * (1 / 6),
      black: 0, // we don't account for black-as-color for exorcism (only useful when ghost needs black resistance, where a black die *would* match — kept at 0 for the planner; rare in practice)
    },
    expectedWilds: nDice * (1 / 6),
  }
}

/**
 * Estimate the probability that N dice + optional Tao spend reach a target
 * resistance. We approximate by:
 *   1. Computing the *deficit* per color after Tao tokens fill it
 *   2. Comparing that deficit to expected dice yield
 *
 * Returns a value in [0, 1]. Heuristic — close enough to drive priorities.
 */
export function exorcismSuccessProbability(
  state: GameState,
  actor: TaoistColor,
  targets: GhostRef[],
  taoBudget: Partial<Record<TaoColor, number>> = {},
): number {
  if (targets.length === 0) return 0
  const cards = targets.map((r) => {
    const g = ghostInstanceAt(state, r)
    return g ? { ghost: g, card: getGhostCard(g.cardId), ref: r } : null
  }).filter((x): x is { ghost: GhostInstance; card: ReturnType<typeof getGhostCard>; ref: GhostRef } => !!x)
  if (cards.length === 0) return 0
  // Dice-immune ghost? Probability 0 via dice. (Sorcerer/Buddha is the answer.)
  if (cards.some((c) => c.card.abilities.center.some((a) => a.kind === 'diceImmune'))) return 0

  // Aggregate effective resistance (with Circle-of-Prayer / Mantra discounts).
  const circle = state.village.find((v) => v.kind === 'circleOfPrayer')
  const circleColor = circle?.circleToken
  const req: Record<TaoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0, black: 0 }
  for (const { card, ghost } of cards) {
    for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) req[c] += card.resistance[c]
    if (circleColor && card.color === circleColor) {
      req[card.color] = Math.max(0, req[card.color] - 1)
    }
    if (ghost.hasMantra) {
      for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) {
        if (req[c] > 0) { req[c] -= 1; break }
      }
    }
  }

  // Subtract Tao budget the AI plans to spend.
  for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) {
    const spend = Math.min(req[c], taoBudget[c] ?? 0)
    req[c] -= spend
  }

  // Dice count gating.
  const nDice = Math.max(0, 3 - capturedDiceCount(state)) + extraDiceFromPowers(state, actor)
  if (nDice === 0) return 0

  // Compute expected colored shortfall (after wilds patch up flexibly).
  const totalShortColored = (req.red + req.green + req.blue + req.yellow) // wild can cover these
  const blackShort = req.black
  if (blackShort > 0) {
    // Wilds don't cover black resistance; only black dice or black Tao do. We
    // currently don't model black die contribution (rare). If the AI hasn't
    // budgeted enough black Tao, treat as failure.
    return 0
  }

  // Expected total useful (colored + wild) faces.
  const expected = nDice * (4 / 6) + nDice * (1 / 6) // colored + wild
  // Rough success probability via Chebyshev-like comparison.
  if (expected >= totalShortColored + 1.5) return 0.9
  if (expected >= totalShortColored + 0.5) return 0.65
  if (expected >= totalShortColored) return 0.45
  if (expected >= totalShortColored - 0.5) return 0.25
  return 0.1
}

function extraDiceFromPowers(state: GameState, color: TaoistColor): number {
  const board = state.boards[color]
  if (board.activePowerId !== 'strengthOfMountain') return 0
  if (isPowerBlocked(state, color)) return 0
  return 1
}

/**
 * Pick a minimal Tao token budget (across the actor + same-tile Taoists) that
 * makes the exorcism viable. Returns:
 *   - `budget` — total tokens by color the AI plans to spend
 *   - `assignments` — concrete `(from, color)` list to put in the action payload
 *   - `verdict` — whether the plan is enough, given an *average* roll
 *
 * Note: we don't roll the dice here. The AI commits to a plan, the engine
 * actually rolls (via `rollTaoDice`), and the engine validates against the
 * realized roll. If the roll undershoots, the spent Tao might not cover and
 * the engine rejects — which is fine: the AI just tried and "failed".
 *
 * To make the AI useful we plan against the *worst-likely* roll: ~floor of
 * expected colored faces. That means the AI tends to spend Tao to bridge the
 * deficit when it has any to spend.
 */
export function planTaoSpend(
  state: GameState,
  actor: TaoistColor,
  targets: GhostRef[],
): {
  budget: Record<TaoColor, number>
  assignments: Array<{ from: `taoist-${TaoistColor}`; color: TaoColor }>
} {
  const empty: Record<TaoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0, black: 0 }
  const me = state.taoists[actor]
  if (!me.tile) return { budget: empty, assignments: [] }
  if (isTaoSpendingBlocked(state)) return { budget: empty, assignments: [] }

  // Effective resistance.
  const circle = state.village.find((v) => v.kind === 'circleOfPrayer')
  const circleColor = circle?.circleToken
  const req: Record<TaoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0, black: 0 }
  for (const ref of targets) {
    const ghost = ghostInstanceAt(state, ref)
    if (!ghost) continue
    const card = getGhostCard(ghost.cardId)
    for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) req[c] += card.resistance[c]
    if (circleColor && card.color === circleColor) req[card.color] = Math.max(0, req[card.color] - 1)
    if (ghost.hasMantra) {
      for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) {
        if (req[c] > 0) { req[c] -= 1; break }
      }
    }
  }

  // Pool of available tokens across same-tile Taoists.
  const pool: Record<TaoColor, Array<`taoist-${TaoistColor}`>> = { red: [], green: [], blue: [], yellow: [], black: [] }
  for (const c of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
    const t = state.taoists[c]
    if (!t.alive || t.tile !== me.tile) continue
    for (const color of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) {
      for (let i = 0; i < t.tao[color]; i++) pool[color].push(t.id)
    }
  }

  // Expected die yield per color (excluding wilds, distributed evenly).
  const nDice = Math.max(0, 3 - capturedDiceCount(state)) + extraDiceFromPowers(state, actor)
  const expectedColored = Math.floor(nDice * (1 / 6)) // ~floor per color in a single die roll — pessimistic
  const expectedWilds = Math.floor(nDice * (1 / 6))

  // Greedy: spend Tao to bridge each color's deficit beyond the expected colored yield.
  // Black needs exact spending — no wild substitution.
  const budget: Record<TaoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0, black: 0 }
  const assignments: Array<{ from: `taoist-${TaoistColor}`; color: TaoColor }> = []

  // Step 1: black first (no wild help available).
  if (req.black > 0) {
    const need = req.black
    const have = pool.black.length
    const spend = Math.min(need, have)
    for (let i = 0; i < spend; i++) {
      const from = pool.black.pop()!
      budget.black++
      assignments.push({ from, color: 'black' })
    }
    if (spend < need) {
      // Can't satisfy black resistance — abandon the plan.
      return { budget: empty, assignments: [] }
    }
  }

  // Step 2: each color, spend tokens beyond the pessimistic-expected colored yield.
  // We rely on wilds to top off a small remaining shortfall.
  let remainingWilds = expectedWilds
  for (const c of ['red', 'green', 'blue', 'yellow'] as TaoColor[]) {
    const need = Math.max(0, req[c] - expectedColored)
    // Spend tokens of this color first.
    let still = need
    while (still > 0 && pool[c].length > 0) {
      const from = pool[c].pop()!
      budget[c]++
      assignments.push({ from, color: c })
      still--
    }
    // Whatever's left, hope wilds cover.
    if (still > remainingWilds) {
      // Not enough wilds expected. Plan is shaky; still return what we have —
      // success probability will reflect this and the priority tree will skip
      // if it's not worth it.
      remainingWilds = 0
    } else {
      remainingWilds -= still
    }
  }

  return { budget, assignments }
}

// -------- Ghost threat scoring -----------------------------------------

/**
 * Per-ghost threat score: higher means "more urgent to deal with".
 * Factors:
 *   - Haunting figure position (stone1 = 2pts, stone2 = 4pts about to haunt)
 *   - Tormentor presence (1.5)
 *   - On the active board (1.0 — it acts THIS turn)
 *   - Dice immune (2.0 — must Sorcerer/Buddha, time-critical)
 *   - Power blocker / Tao blocker (1.5 — disables critical actions)
 *   - Incarnation (3.0 — winning the game requires killing it)
 */
export function ghostThreat(state: GameState, ref: GhostRef): number {
  const ghost = ghostInstanceAt(state, ref)
  if (!ghost) return 0
  const card = getGhostCard(ghost.cardId)
  let s = 1

  if (ghost.hauntingFigurePos === 'stone1') s += 2
  if (ghost.hauntingFigurePos === 'stone2') s += 4

  for (const ab of card.abilities.center) {
    if (ab.kind === 'tormentor') s += 1.5
    if (ab.kind === 'haunter') s += 1
    if (ab.kind === 'diceImmune') s += 2
    if (ab.kind === 'powerBlocker') s += 1.5
    if (ab.kind === 'taoBlocker') s += 1.5
    if (ab.kind === 'dieCaptor') s += 1.5
  }
  if (card.isIncarnation) s += 3

  // Multiply by inverse resistance — easier kills are higher priority for the
  // same-turn-impact reasoning (we don't want to leave easy ones on the board).
  const totalRes = Object.values(card.resistance).reduce((a, b) => a + b, 0)
  s += Math.max(0, 4 - totalRes) * 0.4

  // Ghost on the active board acts THIS turn.
  if (ref.board === state.activeBoard) s += 1.5

  return s
}

/** Hand value — soft score for "this Taoist needs Tao". */
export function taoistHandValue(state: GameState, color: TaoistColor): number {
  const t = state.taoists[color]
  if (!t.alive || t.isNeutral) return 0
  let v = t.qi * 2
  for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) v += t.tao[c]
  if (t.yinYang) v += 3
  v += t.buddhasInHand * 2
  v += t.powerTokens
  return v
}

// -------- Pressure --------------------------------------------------------

/** "Pressure" = a board needs help. Higher = more dangerous. */
export function boardPressure(state: GameState, color: BoardColor): number {
  const b = state.boards[color]
  let p = 0
  for (const g of b.ghostSpaces) {
    if (!g) continue
    const card = getGhostCard(g.cardId)
    p += 1
    if (g.hauntingFigurePos === 'stone1') p += 1
    if (g.hauntingFigurePos === 'stone2') p += 2
    if (card.isIncarnation) p += 2
    if (card.abilities.center.some((a) => a.kind === 'tormentor')) p += 0.7
  }
  if (b.possessed) p += 2
  return p
}

// Provide an alias used by the priority tree — keeping the validateExorcism
// import live in the module graph.
export const _ = validateExorcism
export type _NoiseDieFace = TaoDieFace
