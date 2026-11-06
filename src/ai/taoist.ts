// Heuristic Taoist AI: one action at a time, stateless between calls.
//
// Each call looks at the current state and returns the next step of the
// turn: powers used before the move, the move toward the best spot, the
// step-2 action (exorcise or ask for help), Buddha / crystal placement, then
// end the turn. Prompts are answered in prompts.ts.

import type { Action, HelpParams } from '@/game/actions'
import { applyAction } from '@/game/engine'
import { adjacentTiles, facedSpaces, isAdjacent, isCorner, refKey } from '@/game/geometry'
import { isSkeleton } from '@/game/catalogue'
import {
  borrowablePowers,
  cardAt,
  exorcismBlocker,
  exorcismDice,
  ghostAt,
  hasPower,
  hauntedCount,
  isSolo,
  livingTaoists,
  shadowOnTile,
  taoCount,
} from '@/game/rules'
import { beforeMove, step2Problem } from '@/game/yang'
import { barrierTargets } from '@/game/whiteMoon'
import type { Color, GameState, GhostRef, TileIdx } from '@/game/types'
import { CENTER_TILE, CORNER_TILE, TAO_COLORS, type Corner } from '@/game/types'
import { aiRandom, allThreats, neededColors, successChance, threat } from './eval'
import { bestPlan } from './lookahead'

export function legal(s: GameState, a: Action): boolean {
  try {
    applyAction(s, a)
    return true
  } catch {
    return false
  }
}

interface Option {
  action: Action
  value: number
}

/** Step-2 options from the tile the Taoist stands on (or would stand on). */
function step2Options(s: GameState, c: Color, tile: TileIdx, rand: () => number): Option[] {
  const out: Option[] = []
  const t = s.taoists[c]
  if (t.underground) return out
  const exoOk = !step2Problem(s, 'exorcise')
  const helpOk = !step2Problem(s, 'help')
  if (exoOk) {
    const faced = facedSpaces(tile).filter((r) => ghostAt(s, r) && !exorcismBlocker(s, r))
    const sets: GhostRef[][] = faced.map((r) => [r])
    if (faced.length === 2 && isCorner(tile)) sets.push(faced)
    const n = exorcismDice(s, c)
    const reroll = hasPower(s, c, 'godsFavorite')
    for (const set of sets) {
      const p = successChance(s, c, tile, set, n, reroll, rand)
      let v = set.reduce((sum, r) => sum + threat(s, { ref: r, ghost: ghostAt(s, r)!, card: cardAt(s, r)! }), 0)
      // Clearing a crowded board saves Qi lost to overruns.
      for (const r of set) {
        const crowd = s.boards[r.board].spaces.filter(Boolean).length
        v += 1 + (crowd >= 3 ? 4 : crowd === 2 ? 1.5 : 0.3)
      }
      out.push({ action: { type: 'exorcise', by: c, targets: set }, value: p * v })
    }
  }
  const vt = s.village[tile]!
  if (helpOk && !vt.haunted && !shadowOnTile(s, tile)) {
    for (const h of helpOptions(s, c, tile, rand)) out.push({ action: { type: 'help', by: c, params: h.params }, value: h.value })
  }
  if (s.whiteMoon && !step2Problem(s, 'save') && vt.portal && vt.villagers.length > 0) {
    out.push({ action: { type: 'saveVillager', by: c }, value: 2.2 + s.whiteMoon.dead.length * 0.15 })
  }
  return out
}

function helpOptions(s: GameState, c: Color, tile: TileIdx, rand: () => number): Array<{ params: HelpParams; value: number }> {
  const t = s.taoists[c]
  const kind = s.village[tile]!.kind
  const threats = allThreats(s)
  const haunted = hauntedCount(s)
  switch (kind) {
    case 'circleOfPrayer': {
      const cur = s.village[tile]!.circleToken
      const byColor = (col: string) => threats.filter((g) => g.card.color === col).reduce((n, g) => n + g.threat, 0)
      return TAO_COLORS.filter((col) => col !== cur && s.taoSupply[col] > 0).map((col) => ({
        params: { kind, color: col },
        value: 0.35 * byColor(col) - (cur ? 0.35 * byColor(cur) : 0),
      }))
    }
    case 'buddhistTemple':
      if (s.templeBuddhas <= 0) return []
      // A placed Buddha destroys the next ghost to arrive on its space: about one free exorcism.
      return [{ params: { kind }, value: t.buddhas > 0 ? 0.3 : 2.4 + threats.length * 0.05 }]
    case 'cemetery': {
      if (isSolo(s)) return []
      const dead = (['red', 'blue', 'green', 'yellow'] as Color[]).find((x) => !s.boards[x].neutral && !s.taoists[x].alive)
      return dead ? [{ params: { kind, revive: dead }, value: 7 }] : []
    }
    case 'taoistAltar': {
      const h = s.village.find((x) => x.haunted)
      // It brings a ghost in: only worth it when a third haunting is near.
      return h ? [{ params: { kind, tile: h.idx }, value: haunted >= 2 ? 6 : 0.6 }] : []
    }
    case 'herbalistShop':
      return [{ params: { kind }, value: Math.max(0.3, 1.7 - 0.3 * taoCount(t)) }]
    case 'sorcerersHut': {
      const g = threats.find((x) => !x.card.incarnation && !isSkeleton(x.ghost.card))
      if (!g) return []
      // Qi is the scarcest resource: only banish something truly dangerous.
      return [{ params: { kind, ghost: g.ref }, value: g.threat - (t.qi <= 2 ? 50 : 4) }]
    }
    case 'nightWatchman': {
      let best: { board: Color; v: number } | null = null
      for (const b of ['red', 'blue', 'green', 'yellow'] as Color[]) {
        const n = s.boards[b].spaces.filter((g) => g?.figure === 'stone').length
        const v = n * [3, 5.5, 12][Math.min(2, haunted)]!
        if (!best || v > best.v) best = { board: b, v }
      }
      return best && best.v > 0 ? [{ params: { kind, board: best.board }, value: best.v }] : []
    }
    case 'pavilion': {
      const buddhaSpaces: GhostRef[] = []
      for (const b of ['red', 'blue', 'green', 'yellow'] as Color[]) {
        s.boards[b].buddhas.forEach((on, i) => on && !s.boards[b].spaces[i] && buddhaSpaces.push({ board: b, space: i as 0 | 1 | 2 }))
      }
      const g = threats.find((x) => !x.card.incarnation && !isSkeleton(x.ghost.card))
      if (!g || buddhaSpaces.length === 0) return []
      const others = isSolo(s) ? [c] : livingTaoists(s).filter((x) => x.color !== c && x.tile != null).map((x) => x.color)
      const mover = others[0] ?? null
      const from = mover ? s.taoists[mover].tile! : null
      const to = mover && from != null ? (s.taoists[mover].underground ? adjacentTiles(from)[0]! : adjacentTiles(from)[0]!) : null
      return [{ params: { kind, ghost: g.ref, to: buddhaSpaces[0]!, taoist: mover, taoistTo: to }, value: g.threat }]
    }
    case 'teaHouse': {
      const color = neededColors(s).find((x) => s.taoSupply[x] > 0)
      if (!color) return []
      return [{ params: { kind, color }, value: (t.qi <= 1 ? 3.2 : t.qi === 2 ? 1.7 : 0.7) - 0.6 }]
    }
    case 'kungFuSchool': {
      const out: Array<{ params: HelpParams; value: number }> = []
      for (const scope of ['ownColor', 'black'] as const) {
        const color = scope === 'ownColor' ? c : 'black'
        const targets = threats.filter((g) => g.card.color === color && !g.card.incarnation && !isSkeleton(g.ghost.card))
        if (targets.length === 0) continue
        const best = targets.slice(0, 2)
        const p = successChance(s, c, tile, best.map((g) => g.ref), exorcismDice(s, c), hasPower(s, c, 'godsFavorite'), rand, 80)
        out.push({ params: { kind, scope }, value: p * best.reduce((n, g) => n + g.threat, 0) * 0.85 })
      }
      return out
    }
    case 'calligrapher': {
      const bs = s.blackSecret
      if (!bs || bs.mantras.length === 0) return []
      const i = bs.mantras.reduce((bi, m, k, arr) => (m.level - m.qi < arr[bi]!.level - arr[bi]!.qi ? k : bi), 0)
      return [{ params: { kind, swap: null, placeQi: i }, value: 0.8 }]
    }
  }
}

export function taoistYang(s: GameState, c: Color): Action {
  const y = s.yang!
  const t = s.taoists[c]
  const rand = aiRandom(s.rng ^ (s.turn * 7919) ^ (y.helps * 31 + y.exorcisms * 17))

  // --- Before the move: free powers. ---
  if (beforeMove(s)) {
    if (hasPower(s, c, 'bottomlessPockets') && !y.usedPowers.includes('bottomlessPockets')) {
      const color = neededColors(s).find((x) => s.taoSupply[x] > 0)
      if (color) return { type: 'power', by: c, use: { power: 'bottomlessPockets', color } }
    }
    if (hasPower(s, c, 'enfeeblementMantra') && !y.usedPowers.includes('enfeeblementMantra') && s.mantra === 'ready') {
      const g = allThreats(s).find((x) => !isSkeleton(x.ghost.card))
      if (g) return { type: 'power', by: c, use: { power: 'enfeeblementMantra', ghost: g.ref } }
    }
  }

  // --- Steps 1–2 by lookahead: simulate the candidate move + action plans. ---
  if (LOOKAHEAD.on && !t.underground) {
    const planned = lookaheadStep(s, c, rand)
    if (planned !== undefined) {
      if (planned) return planned
    }
  }

  // --- Step 1: move to the best spot. ---
  if (!LOOKAHEAD.on && beforeMove(s) && !t.underground) {
    const fly = hasPower(s, c, 'danceOfTheSpires')
    const spiresToken = !fly ? borrowablePowers(s, c).find((b) => s.boards[b].power === 'danceOfTheSpires') : undefined
    const here = t.tile!
    const tiles = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x === here || isAdjacent(here, x) || fly || spiresToken !== undefined)
    let best = { tile: here, value: -Infinity }
    for (const tile of tiles) {
      const opts = step2Options(s, c, tile, rand)
      let v = opts.reduce((m, o) => Math.max(m, o.value), 0)
      // Combine with a second action for the blue powers.
      if (hasPower(s, c, 'heavenlyGust') || hasPower(s, c, 'secondWind')) {
        const sorted = opts.map((o) => o.value).sort((a, b) => b - a)
        v += Math.max(0, sorted[1] ?? 0) * 0.6
      }
      if (!isAdjacent(here, tile) && tile !== here && !fly) v -= 0.8 // spending a power token
      // Stand in front of trouble (for next turn too), and spread out from the other Taoists.
      for (const g of allThreats(s)) if (facedSpaces(tile).some((r) => refKey(r) === refKey(g.ref))) v += 0.12 * g.threat
      if (facedSpaces(tile).some((r) => r.board === c)) v += 0.2
      if (livingTaoists(s).some((o) => o.color !== c && o.tile === tile && !o.underground)) v -= 0.15
      if (tile === CENTER_TILE && s.centerPowerTokens > 0 && t.powerTokens === 0) v += 0.3
      if (v > best.value) best = { tile, value: v }
    }
    if (best.tile !== here) {
      if (!fly && !isAdjacent(here, best.tile) && spiresToken) return { type: 'powerToken', by: c, board: spiresToken }
      return { type: 'move', by: c, to: best.tile }
    }
  }

  // --- Step 2: exorcise or ask for help. ---
  if (!LOOKAHEAD.on || t.underground) {
    const opts = step2Options(s, c, t.tile!, rand)
      .filter((o) => o.value > 0.25)
      .sort((a, b) => b.value - a.value)
    for (const o of opts) if (legal(s, o.action)) return o.action
  }

  // --- Yin-Yang: save the village from a third haunting, or a dead friend. ---
  if (t.yinYang) {
    const hauntedTiles = s.village.filter((x) => x.haunted)
    if (hauntedTiles.length >= 2) {
      const a: Action = { type: 'yinYang', by: c, use: { kind: 'flip', tile: hauntedTiles[0]!.idx } }
      if (legal(s, a)) return a
    }
  }

  // --- Step 3: Buddhas and moon crystals. ---
  if (!t.underground && t.buddhas - y.newBuddhas > 0) {
    const empty = facedSpaces(t.tile!).filter((r) => !ghostAt(s, r) && !s.boards[r.board].buddhas[r.space])
    if (empty.length) {
      const a: Action = { type: 'placeBuddha', by: c, spaces: [empty[0]!] }
      if (legal(s, a)) return a
    }
  }
  if (s.whiteMoon && !t.underground && t.crystals - y.newCrystals > 0) {
    const corner = (Object.keys(CORNER_TILE) as Corner[]).find((k) => CORNER_TILE[k] === t.tile && !s.whiteMoon!.receptacles[k])
    if (corner) return { type: 'placeCrystal', by: c, corner }
  }

  const reclaim = t.tile === CENTER_TILE && !t.underground ? s.centerPowerTokens : 0
  return { type: 'endTurn', by: c, reclaim }
}

/** Switch for comparing the lookahead against the plain heuristic (tests, tuning). */
export const LOOKAHEAD = { on: true, samples: 4, maxPlans: 14 }

/**
 * The next step-1/2 action by lookahead, `null` to move on to step 3, or
 * `undefined` when there's nothing to decide (fall through).
 */
function lookaheadStep(s: GameState, c: Color, rand: () => number): Action | null | undefined {
  const t = s.taoists[c]
  const here = t.tile!
  const canMove = beforeMove(s)
  const canAct = !step2Problem(s, 'exorcise') || !step2Problem(s, 'help') || !step2Problem(s, 'save')
  if (!canMove && !canAct) return undefined
  const fly = hasPower(s, c, 'danceOfTheSpires')
  const tiles = canMove ? [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x === here || isAdjacent(here, x) || fly) : [here]
  const scored: Array<{ plan: Action[]; h: number }> = []
  for (const tile of tiles) {
    const move: Action[] = tile === here ? [] : [{ type: 'move', by: c, to: tile }]
    scored.push({ plan: move, h: 0 })
    for (const o of step2Options(s, c, tile, rand)) scored.push({ plan: [...move, o.action], h: o.value })
  }
  // Keep the most promising handful (always keep "stay and pass").
  scored.sort((a, b) => b.h - a.h)
  const plans = [[] as Action[], ...scored.filter((x) => x.plan.length > 0).slice(0, LOOKAHEAD.maxPlans).map((x) => x.plan)]
  const best = bestPlan(s, c, plans, LOOKAHEAD.samples)
  if (!best || best.actions.length === 0) return null
  return best.actions[0]!
}

export { barrierTargets }
