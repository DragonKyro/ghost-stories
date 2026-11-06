// The quick Taoist policy: one greedy step at a time, no simulation. It plays
// every Taoist inside the rollouts, generates the candidate plans the search
// compares, and is the fallback when the search is off.
//
// Option values are estimated changes of the position score (value.ts).

import type { Action, HelpParams } from '@/game/actions'
import { isSkeleton } from '@/game/catalogue'
import { adjacentTiles, facedSpaces, isAdjacent, isCorner, refKey } from '@/game/geometry'
import {
  borrowablePowers,
  cardAt,
  exorcismBlocker,
  exorcismDice,
  ghostAt,
  ghostsInPlay,
  hasPower,
  hauntedCount,
  isSolo,
  livingTaoists,
  shadowOnTile,
  taoBlocked,
  taoCount,
  type PlacedGhost,
} from '@/game/rules'
import { beforeMove, step2Problem } from '@/game/yang'
import type { Color, GameState, GhostRef, TaoColor, TileIdx } from '@/game/types'
import { CENTER_TILE, CORNER_TILE, COLORS, TAO_COLORS, type Corner } from '@/game/types'
import { neededColors, poolAt } from './eval'
import { exorcismChance, pairChances } from './prob'
import { W } from './tuning'
import { colourNeeds, crowdCost, ghostCost, hauntCost, hauntedPenalty, qiValue } from './value'

export interface Option {
  action: Action
  value: number
}

const placed = (s: GameState, r: GhostRef): PlacedGhost | null => {
  const ghost = ghostAt(s, r)
  return ghost ? { ref: r, ghost, card: cardAt(s, r)! } : null
}

/** Score gained by taking this ghost off the board (no curses or rewards). */
export function removalValue(s: GameState, r: GhostRef, h = hauntedCount(s)): number {
  const g = placed(s, r)
  if (!g) return 0
  const n = s.boards[r.board].spaces.filter(Boolean).length
  return ghostCost(s, g, h) + crowdCost(n) - crowdCost(n - 1)
}

/** Marginal value of losing one Qi for Taoist `c`. */
export function qiLoss(s: GameState, c: Color): number {
  const t = s.taoists[c]
  if (!t.alive) return 0
  if (t.qi <= 1) return W.dead + qiValue(t.qi) + taoCount(t) * W.tao + (t.yinYang ? W.yinYang : 0)
  return qiValue(t.qi) - qiValue(t.qi - 1)
}

/** Expected cost of `c` rolling the curse die (haunting the line in front of `ref`). */
export function curseCost(s: GameState, c: Color): number {
  if (hasPower(s, c, 'strengthOfMountain')) return 0
  const t = s.taoists[c]
  const h = hauntedCount(s)
  const faces = hauntCost(h) + W.arrival + taoCount(t) * W.tao + qiLoss(s, c)
  return (faces / 6) * (hasPower(s, c, 'godsFavorite') ? 0.45 : 1)
}

/** Net value of a ghost's right stone for the exorcist. */
export function rightStoneValue(s: GameState, c: Color, r: GhostRef): number {
  const card = cardAt(s, r)
  if (!card) return 0
  const t = s.taoists[c]
  let v = 0
  for (const ab of card.right) {
    switch (ab.kind) {
      case 'curse':
        v -= curseCost(s, c)
        break
      case 'loseTao':
        v -= taoCount(t) > 0 ? W.tao : 0
        break
      case 'rewardQiOrYinYang':
        v += t.yinYang ? qiValue(t.qi + 1) - qiValue(t.qi) : Math.max(W.yinYang, qiValue(t.qi + 1) - qiValue(t.qi))
        break
      case 'rewardTao1':
        v += W.tao + W.taoMatch * 0.5
        break
      case 'rewardTao2':
        v += 2 * (W.tao + W.taoMatch * 0.5)
        break
      case 'rewardCrystal':
        v += W.crystal
        break
      case 'incarnationReward':
        v += W.yinYang + 12
        break
      default:
        break
    }
  }
  return v
}

/** Expected Tao tokens a successful exorcism spends (rough). */
function expectedSpend(s: GameState, c: Color, tile: TileIdx, targets: GhostRef[], n: number): number {
  if (taoBlocked(s)) return 0
  let need = 0
  for (const r of targets) {
    const card = cardAt(s, r)
    if (!card) continue
    need += Object.values(card.resistance).reduce((a, b) => a + (b ?? 0), 0)
  }
  const { tokens } = poolAt(s, c, tile)
  const have = TAO_COLORS.reduce((a, x) => a + tokens[x], 0)
  return Math.max(0, Math.min(have, need - n / 3))
}

/** Exorcism options from `tile` (one target, or two from a corner). */
export function exorcismOptions(s: GameState, c: Color, tile: TileIdx): Option[] {
  const out: Option[] = []
  const faced = facedSpaces(tile).filter((r) => ghostAt(s, r) && !exorcismBlocker(s, r))
  if (faced.length === 0) return out
  const n = exorcismDice(s, c)
  const reroll = hasPower(s, c, 'godsFavorite')
  const h = hauntedCount(s)
  const gain = (r: GhostRef) => removalValue(s, r, h) + rightStoneValue(s, c, r)
  for (const r of faced) {
    const p = exorcismChance(s, c, tile, [r], n, reroll)
    if (p <= 0) continue
    const v = p * (gain(r) - expectedSpend(s, c, tile, [r], n) * W.tao * W.spend)
    out.push({ action: { type: 'exorcise', by: c, targets: [r] }, value: v })
  }
  if (faced.length === 2 && isCorner(tile)) {
    const [a, b] = faced as [GhostRef, GhostRef]
    const o = pairChances(s, c, tile, a, b, n, reroll)
    const ga = gain(a)
    const gb = gain(b)
    const v = o.both * (ga + gb) + o.onlyA * ga + o.onlyB * gb + o.either * Math.max(ga, gb)
    const spend = expectedSpend(s, c, tile, faced, n) * W.tao * W.spend * (o.both + o.onlyA + o.onlyB + o.either)
    if (o.both + o.onlyA + o.onlyB + o.either > 0) out.push({ action: { type: 'exorcise', by: c, targets: [a, b] }, value: v - spend })
  }
  return out
}

/** The ghost-moving / Taoist-moving parts of a Pavilion action. */
function pavilionOptions(s: GameState, c: Color): Array<{ params: HelpParams; value: number }> {
  const h = hauntedCount(s)
  const free: GhostRef[] = []
  for (const b of COLORS) for (const i of [0, 1, 2] as const) if (!s.boards[b].spaces[i]) free.push({ board: b, space: i })
  if (free.length === 0) return []
  // The second half: a normal move for another Taoist (solo: yourself).
  const movers = isSolo(s) ? [c] : livingTaoists(s).filter((x) => x.color !== c && x.tile != null && !x.underground).map((x) => x.color)
  let mover: Color | null = null
  let moverTo: TileIdx | null = null
  let moverValue = -Infinity
  for (const m of movers) {
    const from = s.taoists[m].tile!
    for (const to of adjacentTiles(from)) {
      const v = positionValue(s, m, to) - positionValue(s, m, from)
      if (v > moverValue) {
        moverValue = v
        mover = m
        moverTo = to
      }
    }
  }
  if (isSolo(s) && mover == null) return []
  const out: Array<{ params: HelpParams; value: number }> = []
  for (const g of ghostsInPlay(s)) {
    if (isSkeleton(g.ghost.card)) continue
    const from = g.ref
    const n = s.boards[from.board].spaces.filter(Boolean).length
    let best: { to: GhostRef; v: number } | null = null
    for (const to of free) {
      const buddha = s.boards[to.board].buddhas[to.space]
      let v: number
      if (g.card.incarnation) {
        if (g.card.incarnation === 'uncatchable' && buddha) v = 25
        else if (g.card.incarnation === 'howlingNightmare' && !s.boards[OPP[to.board]].spaces[to.space] && s.boards[OPP[from.board]].spaces[from.space]) v = 20
        else continue
        if (buddha && g.card.incarnation !== 'uncatchable') v -= W.buddhaOnBoard
      } else if (buddha) {
        v = removalValue(s, from, h) - W.buddhaOnBoard
      } else {
        const m = s.boards[to.board].spaces.filter(Boolean).length
        v = crowdCost(n) - crowdCost(n - 1) - (crowdCost(m + 1) - crowdCost(m)) - 1
      }
      if (!best || v > best.v) best = { to, v }
    }
    if (best && best.v > 0) {
      out.push({
        params: { kind: 'pavilion', ghost: from, to: best.to, taoist: mover, taoistTo: moverTo },
        value: best.v + (mover ? Math.max(-2, moverValue) : 0),
      })
    }
  }
  return out.sort((a, b) => b.value - a.value).slice(0, 2)
}

const OPP: Record<Color, Color> = { red: 'green', green: 'red', blue: 'yellow', yellow: 'blue' }

/** Help options from the villager on `tile`. */
export function helpOptions(s: GameState, c: Color, tile: TileIdx): Array<{ params: HelpParams; value: number }> {
  const t = s.taoists[c]
  const vt = s.village[tile]!
  if (vt.haunted || shadowOnTile(s, tile)) return []
  const kind = vt.kind
  const h = hauntedCount(s)
  switch (kind) {
    case 'circleOfPrayer': {
      const need = colourNeeds(s)
      const score = (col: TaoColor | null) => (col ? (need[col] > 0 ? W.circle * (1 + Math.min(4, need[col]) * 0.5) : W.circle * 0.5) : 0)
      const cur = vt.circleToken
      return TAO_COLORS.filter((col) => col !== cur && s.taoSupply[col] > 0)
        .map((col) => ({ params: { kind, color: col } as HelpParams, value: score(col) - score(cur) }))
        .filter((o) => o.value > 0)
    }
    case 'buddhistTemple':
      return s.templeBuddhas > 0 ? [{ params: { kind }, value: W.buddhaHeld * (t.buddhas > 0 ? 0.6 : 1) }] : []
    case 'cemetery': {
      if (isSolo(s)) return []
      const dead = COLORS.filter((x) => !s.boards[x].neutral && !s.taoists[x].alive)
      return dead.map((d) => ({ params: { kind, revive: d } as HelpParams, value: W.dead + qiValue(2) - curseCost(s, c) }))
    }
    case 'taoistAltar': {
      const haunted = s.village.filter((x) => x.haunted)
      if (haunted.length === 0) return []
      const best = haunted.sort((a, b) => (W.tileHaunted[b.kind] ?? 0) - (W.tileHaunted[a.kind] ?? 0))[0]!
      const v = hauntedPenalty(h) - hauntedPenalty(h - 1) + (W.tileHaunted[best.kind] ?? 0) - W.arrival
      return [{ params: { kind, tile: best.idx }, value: v }]
    }
    case 'herbalistShop':
      return [{ params: { kind }, value: 2 * (taoCount(t) >= W.taoCap ? W.taoExtra : W.tao + W.taoMatch * 0.4) }]
    case 'sorcerersHut': {
      let best: Option | null = null
      for (const g of ghostsInPlay(s)) {
        if (g.card.incarnation || isSkeleton(g.ghost.card)) continue
        const v = removalValue(s, g.ref, h) - qiLoss(s, c)
        if (!best || v > best.value) best = { action: { type: 'help', by: c, params: { kind, ghost: g.ref } }, value: v }
      }
      return best && best.action.type === 'help' ? [{ params: best.action.params, value: best.value }] : []
    }
    case 'nightWatchman': {
      let best: { board: Color; v: number } | null = null
      for (const b of COLORS) {
        let v = 0
        for (let i = 0; i < 3; i++) {
          const g = s.boards[b].spaces[i]
          if (g?.figure === 'stone') v += (W.haunterStone - W.haunterCard) * hauntCost(h)
        }
        if (v > 0 && (!best || v > best.v)) best = { board: b, v }
      }
      return best ? [{ params: { kind, board: best.board }, value: best.v }] : []
    }
    case 'pavilion':
      return pavilionOptions(s, c)
    case 'teaHouse': {
      const color = neededColors(s).find((x) => s.taoSupply[x] > 0)
      if (!color) return []
      return [{ params: { kind, color }, value: qiValue(t.qi + 1) - qiValue(t.qi) + W.tao - W.arrival }]
    }
    case 'kungFuSchool': {
      const out: Array<{ params: HelpParams; value: number }> = []
      for (const scope of ['ownColor', 'black'] as const) {
        const color = scope === 'ownColor' ? c : 'black'
        const targets = ghostsInPlay(s).filter((g) => g.card.color === color && !g.card.incarnation && !isSkeleton(g.ghost.card))
        if (targets.length === 0) continue
        const best = targets.sort((a, b) => removalValue(s, b.ref, h) - removalValue(s, a.ref, h)).slice(0, 2)
        const p = exorcismChance(s, c, tile, best.map((g) => g.ref), exorcismDice(s, c), hasPower(s, c, 'godsFavorite'))
        out.push({ params: { kind, scope }, value: p * best.reduce((n, g) => n + removalValue(s, g.ref, h), 0) * 0.85 })
      }
      return out
    }
    case 'calligrapher': {
      const bs = s.blackSecret
      if (!bs || bs.mantras.length === 0) return []
      const i = bs.mantras.reduce((bi, m, k, arr) => (m.level - m.qi < arr[bi]!.level - arr[bi]!.qi ? k : bi), 0)
      return [{ params: { kind, swap: null, placeQi: i }, value: 4 }]
    }
  }
}

/** Step-2 options from `tile` (where the Taoist stands, or would stand). */
export function step2Options(s: GameState, c: Color, tile: TileIdx): Option[] {
  const out: Option[] = []
  const t = s.taoists[c]
  if (t.underground) return out
  if (!step2Problem(s, 'exorcise')) out.push(...exorcismOptions(s, c, tile))
  if (!step2Problem(s, 'help')) for (const h of helpOptions(s, c, tile)) out.push({ action: { type: 'help', by: c, params: h.params }, value: h.value })
  const vt = s.village[tile]!
  if (s.whiteMoon && !step2Problem(s, 'save') && vt.portal && vt.villagers.length > 0) {
    out.push({ action: { type: 'saveVillager', by: c }, value: W.villagerSaved + 2 + s.whiteMoon.dead.length * 0.5 })
  }
  return out
}

/** How useful it is for `c` to stand on `tile` at the start of a later turn. */
export function positionValue(s: GameState, c: Color, tile: TileIdx): number {
  let v = 0
  const h = hauntedCount(s)
  for (const r of facedSpaces(tile)) {
    const g = placed(s, r)
    if (g) v += W.pos * ghostCost(s, g, h)
  }
  if (tile === CENTER_TILE) v += W.center
  const vt = s.village[tile]!
  if (!vt.haunted && (vt.kind === 'herbalistShop' || vt.kind === 'buddhistTemple')) v += 0.3
  void c
  return v
}

/** Tiles the Taoist can move to this step (including staying). */
export function reachable(s: GameState, c: Color): TileIdx[] {
  const t = s.taoists[c]
  const here = t.tile!
  if (!beforeMove(s) || t.underground) return [here]
  const fly = hasPower(s, c, 'danceOfTheSpires')
  return [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x === here || fly || isAdjacent(here, x))
}

/** The Mantra goes on the ghost we most want gone among those we could reach. */
export function mantraTarget(s: GameState, c: Color): GhostRef | null {
  const h = hauntedCount(s)
  const tiles = reachable(s, c)
  let best: { ref: GhostRef; v: number } | null = null
  for (const g of ghostsInPlay(s)) {
    if (isSkeleton(g.ghost.card)) continue
    const near = tiles.some((x) => facedSpaces(x).some((r) => refKey(r) === refKey(g.ref)))
    const v = removalValue(s, g.ref, h) * (near ? 1.6 : 1)
    if (!best || v > best.v) best = { ref: g.ref, v }
  }
  return best?.ref ?? null
}

/** Free "before your move" powers the quick policy always uses. */
export function freePower(s: GameState, c: Color): Action | null {
  const y = s.yang!
  if (!beforeMove(s) || s.taoists[c].underground) return null
  if (hasPower(s, c, 'bottomlessPockets') && !y.usedPowers.includes('bottomlessPockets')) {
    const color = neededColors(s).find((x) => s.taoSupply[x] > 0)
    if (color) return { type: 'power', by: c, use: { power: 'bottomlessPockets', color } }
  }
  if (hasPower(s, c, 'enfeeblementMantra') && !y.usedPowers.includes('enfeeblementMantra') && s.mantra === 'ready') {
    const ref = mantraTarget(s, c)
    if (ref) return { type: 'power', by: c, use: { power: 'enfeeblementMantra', ghost: ref } }
  }
  return null
}

/** Best Buddha placement for a ready Buddha (or null). */
export function buddhaPlacement(s: GameState, c: Color): Action | null {
  const t = s.taoists[c]
  const y = s.yang!
  if (t.underground || t.tile == null) return null
  const ready = t.buddhas - y.newBuddhas
  if (ready <= 0) return null
  const empty = facedSpaces(t.tile).filter((r) => !ghostAt(s, r) && !s.boards[r.board].buddhas[r.space])
  if (empty.length === 0) return null
  const score = (r: GhostRef) => {
    const n = s.boards[r.board].spaces.filter(Boolean).length
    return n + (s.boards[r.board].neutral ? -0.5 : 0)
  }
  const sorted = [...empty].sort((a, b) => score(b) - score(a))
  const spaces = sorted.slice(0, Math.min(ready, 2))
  return { type: 'placeBuddha', by: c, spaces }
}

/** Step-3 / end-of-turn actions: Buddhas, crystals, the Yin-Yang in an emergency, then end. */
export function finishTurn(s: GameState, c: Color): Action {
  const t = s.taoists[c]
  const y = s.yang!
  const b = buddhaPlacement(s, c)
  if (b) return b
  if (s.whiteMoon && !t.underground && t.crystals - y.newCrystals > 0) {
    const corner = (Object.keys(CORNER_TILE) as Corner[]).find((k) => CORNER_TILE[k] === t.tile && !s.whiteMoon!.receptacles[k])
    if (corner) return { type: 'placeCrystal', by: c, corner }
  }
  const yy = yinYangFlip(s, c)
  if (yy) return yy
  const reclaim = t.tile === CENTER_TILE && !t.underground ? s.centerPowerTokens : 0
  return { type: 'endTurn', by: c, reclaim }
}

/** Spend the Yin-Yang to restore a tile when a third haunting is near. */
export function yinYangFlip(s: GameState, c: Color): Action | null {
  const t = s.taoists[c]
  if (!t.yinYang) return null
  const haunted = s.village.filter((x) => x.haunted)
  if (haunted.length >= 2 || (haunted.length === 1 && haunted[0]!.kind === 'taoistAltar')) {
    const best = haunted.sort((a, b) => (W.tileHaunted[b.kind] ?? 0) - (W.tileHaunted[a.kind] ?? 0))[0]!
    return { type: 'yinYang', by: c, use: { kind: 'flip', tile: best.idx } }
  }
  return null
}

/** Ending the turn on `tile` lets a ready Buddha go down on a free space it faces. */
export function buddhaSpotValue(s: GameState, c: Color, tile: TileIdx): number {
  const t = s.taoists[c]
  const ready = t.buddhas - (s.yang?.newBuddhas ?? 0)
  if (ready <= 0 || t.underground) return 0
  const empty = facedSpaces(tile).filter((r) => !s.boards[r.board].spaces[r.space] && !s.boards[r.board].buddhas[r.space]).length
  return Math.min(ready, empty) * Math.max(0, W.buddhaOnBoard - W.buddhaHeld)
}

/** Value of the best (move, step-2 action) the active Taoist has this turn. */
export function bestOptionValue(s: GameState, c: Color): number {
  let best = 0
  for (const tile of reachable(s, c)) for (const o of step2Options(s, c, tile)) if (o.value > best) best = o.value
  return best
}

/** The quick policy's next action for the active Taoist `c`. */
export function quickStep(s: GameState, c: Color): Action {
  const t = s.taoists[c]
  const power = freePower(s, c)
  if (power) return power
  if (!t.underground && t.tile != null) {
    const here = t.tile
    let best: { tile: TileIdx; opt: Option | null; v: number } = { tile: here, opt: null, v: positionValue(s, c, here) + buddhaSpotValue(s, c, here) }
    for (const tile of reachable(s, c)) {
      const opts = step2Options(s, c, tile)
      let top: Option | null = null
      for (const o of opts) if (!top || o.value > top.value) top = o
      const v = Math.max(0, top?.value ?? 0) + positionValue(s, c, tile) + buddhaSpotValue(s, c, tile) - (tile === here ? 0 : 0.05)
      if (v > best.v) best = { tile, opt: top && top.value > 0 ? top : null, v }
    }
    if (best.tile !== here) return { type: 'move', by: c, to: best.tile }
    if (best.opt) return best.opt.action
  }
  return finishTurn(s, c)
}

/** Power-token plans: fly with a neutral board's Dance of the Spires. */
export function spiresToken(s: GameState, c: Color): Color | null {
  if (!beforeMove(s) || hasPower(s, c, 'danceOfTheSpires')) return null
  return borrowablePowers(s, c).find((b) => s.boards[b].power === 'danceOfTheSpires') ?? null
}
