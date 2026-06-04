// Heuristic AI for empty / AI Taoist seats.
//
// Contract:
//   chooseAction(state, taoistId) => Action | null
//     null means "I'm done — end Yang phase"
//
// Stateless across turns. Drives one Yang sub-action at a time so the AIDriver
// component can stagger them with visible delays.

import { getGhostCard } from '@/game/ghostCatalogue'
import {
  adjacentTiles,
  capturedDiceCount,
  emptySpacesOnBoard,
  ghostInstanceAt,
  ghostSpaceFacingTile,
  isCornerTile,
  isPowerBlocked,
  reachableGhostSpaces,
  taoistById,
} from '@/game/helpers'
import type {
  Action,
  HelpParams,
} from '@/game/actions'
import type {
  BoardColor,
  GameState,
  GhostRef,
  TaoColor,
  TaoistColor,
  TaoistId,
  VillageTileId,
} from '@/game/types'
import { rollCurseDie } from '@/game/yinPayload'
import { rollTaoDice } from '@/game/dice'
import {
  boardPressure,
  exorcismSuccessProbability,
  ghostThreat,
  planTaoSpend,
} from './value'

// Per-turn intent flags carried via closure. Since the AI is stateless, we
// recompute every call — duplicate-action prevention relies on the engine's
// idempotency (e.g., we won't re-pick up a Buddha if the Buddhist Temple
// supply is empty or our hand is full of better options).
//
// For end-of-turn detection: if the AI keeps reaching "nothing useful", we
// return null and the driver dispatches endYangPhase.
export function chooseAction(state: GameState, taoistId: TaoistId): Action | null {
  if (state.phase !== 'yang') return null
  const me = taoistById(state, taoistId)
  if (!me.alive || me.isNeutral) return null
  const activeColor = state.turnOrder[state.turnIndex]
  if (me.color !== activeColor) return null

  // ----- 1) Critical-now exorcism --------------------------------------
  // If a ghost on our active board has a haunting figure on stone1 AND
  // we're at hauntedCount === 2 (one more haunt = loss), try to kill it.
  if (state.hauntedCount >= 2) {
    const crit = pickBestExorcismTarget(state, me.color, { thresholdProb: 0.2 })
    if (crit) return crit
  }

  // ----- 2) Lethal-prevention exorcism --------------------------------
  // If we're at 1 Qi and our active board has a Tormentor or about-to-haunt
  // (could kill us via curse-die), try to defuse.
  if (me.qi <= 1 && hasImmediateLethalThreat(state, me.color)) {
    const def = pickBestExorcismTarget(state, me.color, { thresholdProb: 0.25 })
    if (def) return def
  }

  // ----- 3) High-success exorcism -------------------------------------
  const exor = pickBestExorcismTarget(state, me.color, { thresholdProb: 0.55 })
  if (exor) return exor

  // ----- 4) Place Buddha ---------------------------------------------
  // If we have a Buddha in hand and a high-pressure board has an empty
  // ghost space we can reach, place it.
  if (me.buddhasInHand > 0) {
    const buddha = pickBuddhaTarget(state, me.color)
    if (buddha) return buddha
  }

  // ----- 5) Critical tile actions -------------------------------------
  // Cemetery (someone is dead), Taoist Altar (a tile is haunted), Night
  // Watchman (a stone2 haunter looms), Sorcerer (a dice-immune ghost is
  // in play and we can spare 1 Qi).
  const critTile = pickCriticalTileAction(state, me)
  if (critTile) return critTile

  // ----- 6) Tao accumulation / Buddha pickup --------------------------
  // Move toward a useful tile (Herbalist / Tea House / Buddhist Temple /
  // Circle of Prayer) if we'd benefit, then request help next turn.
  const accumulate = pickAccumulateAction(state, me)
  if (accumulate) return accumulate

  // ----- 7) Reposition toward the highest-threat ghost ---------------
  const reposition = pickRepositionAction(state, me)
  if (reposition) return reposition

  // ----- 8) Nothing useful — end turn ---------------------------------
  return null
}

// =====================================================================
//   Exorcism target selection
// =====================================================================

function pickBestExorcismTarget(
  state: GameState,
  actor: TaoistColor,
  opts: { thresholdProb: number },
): Action | null {
  const me = state.taoists[actor]
  if (!me.tile) return null
  const reach = reachableGhostSpaces(state, me.tile)
  const candidates: Array<{ ref: GhostRef; prob: number; threat: number }> = []
  for (const ref of reach) {
    const ghost = ghostInstanceAt(state, ref)
    if (!ghost) continue
    const plan = planTaoSpend(state, actor, [ref])
    const prob = exorcismSuccessProbability(state, actor, [ref], plan.budget)
    const threat = ghostThreat(state, ref)
    if (prob < opts.thresholdProb) continue
    candidates.push({ ref, prob, threat })
  }
  if (candidates.length === 0) return null
  // Score = threat × prob, prefer highest.
  candidates.sort((a, b) => (b.threat * b.prob) - (a.threat * a.prob))
  const top = candidates[0]
  const plan = planTaoSpend(state, actor, [top.ref])
  const nDice = Math.max(0, 3 - capturedDiceCount(state)) + (state.boards[actor].activePowerId === 'strengthOfMountain' && !isPowerBlocked(state, actor) ? 1 : 0)
  return {
    type: 'exorcise',
    taoistId: `taoist-${actor}`,
    ghosts: [top.ref],
    diceRoll: rollTaoDice(nDice),
    spentTao: plan.assignments,
  }
}

function hasImmediateLethalThreat(state: GameState, color: TaoistColor): boolean {
  const board = state.boards[color]
  return board.ghostSpaces.some((g) => {
    if (!g) return false
    const card = getGhostCard(g.cardId)
    return card.abilities.center.some((a) => a.kind === 'tormentor' || a.kind === 'haunter')
  })
}

// =====================================================================
//   Buddha placement
// =====================================================================

function pickBuddhaTarget(state: GameState, actor: TaoistColor): Action | null {
  const me = state.taoists[actor]
  if (!me.tile) return null
  if (me.buddhasInHand <= 0) return null
  const reach = reachableGhostSpaces(state, me.tile)
  // Sort empty Buddha spaces by board pressure (highest first).
  const candidates: Array<{ ref: GhostRef; pressure: number }> = []
  for (const ref of reach) {
    if (ghostInstanceAt(state, ref) != null) continue
    if (state.boards[ref.board].buddhaSpaces[ref.space]) continue
    candidates.push({ ref, pressure: boardPressure(state, ref.board) })
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.pressure - a.pressure)
  return { type: 'placeBuddha', taoistId: `taoist-${actor}`, spaces: [candidates[0].ref] }
}

// =====================================================================
//   Critical tile actions
// =====================================================================

function pickCriticalTileAction(state: GameState, me: GameState['taoists'][TaoistColor]): Action | null {
  if (!me.tile) return null
  const standing = state.village.find((v) => v.id === me.tile)
  if (!standing || standing.haunted) return null

  switch (standing.kind) {
    case 'cemetery': {
      const dead = (['red', 'blue', 'green', 'yellow'] as TaoistColor[]).filter(
        (c) => !state.taoists[c].alive && !state.taoists[c].isNeutral,
      )
      if (dead.length > 0) {
        return makeRequestHelp(me.color, { kind: 'cemetery', reviveTaoist: dead[0] }, { curseRoll: rollCurseDie() })
      }
      return null
    }
    case 'taoistAltar': {
      const haunted = state.village.filter((v) => v.haunted)
      if (haunted.length > 0) {
        return makeRequestHelp(me.color, { kind: 'taoistAltar', flipTile: haunted[0].id })
      }
      return null
    }
    case 'nightWatchmanBeat': {
      // Find a board with stone2 haunters — most urgent rollback.
      const target = pickMostHauntedBoard(state)
      if (target) return makeRequestHelp(me.color, { kind: 'nightWatchmanBeat', targetBoard: target })
      return null
    }
    case 'sorcerersHut': {
      // Discard a dice-immune ghost (we can't kill those by dice).
      if (me.qi <= 1) return null // don't sacrifice the last Qi
      const ref = findDiceImmuneGhost(state)
      if (ref) return makeRequestHelp(me.color, { kind: 'sorcerersHut', targetGhost: ref })
      // Or discard an incarnation (gigantic value).
      const inc = findIncarnationGhost(state)
      if (inc) return makeRequestHelp(me.color, { kind: 'sorcerersHut', targetGhost: inc })
      return null
    }
    default:
      return null
  }
}

function pickMostHauntedBoard(state: GameState): TaoistColor | null {
  let best: { c: TaoistColor; score: number } | null = null
  for (const c of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
    let score = 0
    for (const g of state.boards[c].ghostSpaces) {
      if (!g) continue
      if (g.hauntingFigurePos === 'stone1') score += 1
      if (g.hauntingFigurePos === 'stone2') score += 2
    }
    if (score > 0 && (!best || score > best.score)) best = { c, score }
  }
  return best?.c ?? null
}

function findDiceImmuneGhost(state: GameState): GhostRef | null {
  for (const c of ['red', 'blue', 'green', 'yellow'] as BoardColor[]) {
    for (let i = 0 as 0 | 1 | 2; i <= 2; i = (i + 1) as 0 | 1 | 2) {
      const g = state.boards[c].ghostSpaces[i]
      if (!g) {
        if (i === 2) break
        continue
      }
      const card = getGhostCard(g.cardId)
      if (card.abilities.center.some((a) => a.kind === 'diceImmune') && !card.isIncarnation) {
        return { board: c, space: i }
      }
      if (i === 2) break
    }
  }
  return null
}

function findIncarnationGhost(state: GameState): GhostRef | null {
  for (const c of ['red', 'blue', 'green', 'yellow'] as BoardColor[]) {
    for (let i = 0 as 0 | 1 | 2; i <= 2; i = (i + 1) as 0 | 1 | 2) {
      const g = state.boards[c].ghostSpaces[i]
      if (!g) { if (i === 2) break; continue }
      const card = getGhostCard(g.cardId)
      // Sorcerer can't discard incarnations per the rules — keep the helper
      // around for future asymmetric tile-actions that *can*.
      if (card.isIncarnation) return null
      if (i === 2) break
    }
  }
  return null
}

// =====================================================================
//   Tao accumulation
// =====================================================================

function pickAccumulateAction(state: GameState, me: GameState['taoists'][TaoistColor]): Action | null {
  if (!me.tile) return null
  const standing = state.village.find((v) => v.id === me.tile)
  if (!standing || standing.haunted) return null

  // Useful in-place actions.
  switch (standing.kind) {
    case 'herbalistShop':
      // Always good if we have < 4 total Tao.
      if (totalTao(me.tao) < 4) {
        return makeRequestHelp(me.color, { kind: 'herbalistShop' }, { diceRoll: rollTaoDice(2) })
      }
      return null
    case 'teaHouse': {
      const maxQi = state.config.difficulty === 'initiation' ? 4 : 3
      if (me.qi < maxQi || totalTao(me.tao) < 4) {
        return makeRequestHelp(me.color, { kind: 'teaHouse' })
      }
      return null
    }
    case 'buddhistTemple':
      if (me.buddhasInHand < 1 && state.buddhaSupply > 0) {
        return makeRequestHelp(me.color, { kind: 'buddhistTemple' })
      }
      return null
    case 'circleOfPrayer': {
      // Place a token matching the most-common ghost color in play.
      const mostNeeded = pickMostUsefulCircleColor(state)
      if (mostNeeded && state.taoSupply[mostNeeded] > 0 && standing.circleToken !== mostNeeded) {
        return makeRequestHelp(me.color, { kind: 'circleOfPrayer', placeColor: mostNeeded })
      }
      return null
    }
    default:
      return null
  }
}

function totalTao(tao: GameState['taoists'][TaoistColor]['tao']): number {
  return Object.values(tao).reduce((a, b) => a + b, 0)
}

function pickMostUsefulCircleColor(state: GameState): TaoColor | null {
  const counts: Record<TaoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0, black: 0 }
  for (const c of ['red', 'blue', 'green', 'yellow'] as BoardColor[]) {
    for (const g of state.boards[c].ghostSpaces) {
      if (!g) continue
      const card = getGhostCard(g.cardId)
      counts[card.color]++
    }
  }
  let best: TaoColor | null = null
  let bestN = 0
  for (const c of ['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]) {
    if (counts[c] > bestN) { best = c; bestN = counts[c] }
  }
  return best
}

// =====================================================================
//   Repositioning
// =====================================================================

function pickRepositionAction(state: GameState, me: GameState['taoists'][TaoistColor]): Action | null {
  if (!me.tile) return null
  // Find the most-threatening ghost and head toward the tile that faces it.
  let bestTarget: { ref: GhostRef; threat: number } | null = null
  for (const c of ['red', 'blue', 'green', 'yellow'] as BoardColor[]) {
    for (let i = 0 as 0 | 1 | 2; i <= 2; i = (i + 1) as 0 | 1 | 2) {
      const g = state.boards[c].ghostSpaces[i]
      if (!g) { if (i === 2) break; continue }
      const t = ghostThreat(state, { board: c, space: i })
      if (!bestTarget || t > bestTarget.threat) bestTarget = { ref: { board: c, space: i }, threat: t }
      if (i === 2) break
    }
  }
  if (!bestTarget) return null

  const targetTile = ghostSpaceFacingTile(state, bestTarget.ref)
  // Already there?
  if (targetTile.id === me.tile) return null

  // Pick the adjacent tile that gets us closest (1-step move).
  // Use Chebyshev distance to compare.
  const here = state.village.find((v) => v.id === me.tile)!
  const dist = (a: { col: number; row: number }, b: { col: number; row: number }) =>
    Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))
  const curD = dist(here.coord, targetTile.coord)

  let best: VillageTileId | null = null
  let bestD = curD
  for (const n of adjacentTiles(state, me.tile)) {
    if (n.haunted) continue // we can step onto haunted tiles, but they prevent help — avoid unless adjacent to target
    const d = dist(n.coord, targetTile.coord)
    if (d < bestD || (best === null && d <= curD)) {
      best = n.id
      bestD = d
    }
  }
  if (!best) return null
  return { type: 'moveTaoist', taoistId: `taoist-${me.color}`, toTile: best }
}

// =====================================================================
//   Helpers
// =====================================================================

function makeRequestHelp(
  color: TaoistColor,
  params: HelpParams,
  extras: { diceRoll?: ReturnType<typeof rollTaoDice>; curseRoll?: ReturnType<typeof rollCurseDie> } = {},
): Action {
  return {
    type: 'requestHelp',
    taoistId: `taoist-${color}`,
    params,
    diceRoll: extras.diceRoll,
    curseRoll: extras.curseRoll,
  }
}

// Keep `emptySpacesOnBoard` and `isCornerTile` reachable for future targeted
// strategies (corner-tile dual exorcism + multi-board threat correlation).
void emptySpacesOnBoard
void isCornerTile
