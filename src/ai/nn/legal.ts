// Every legal action for a Taoist decision, with every parameter.
//
// Each Yang action and prompt answer the engine knows is generated from its
// parameter domains, then checked by applying it to a copy of the state (the
// engine throws on anything illegal), so the list is exactly what the rules
// allow. Two reductions only:
//   - exorcism commits pay the fewest Tao items that cover the targets
//     (paying more is never better), but every distinct way to pay that —
//     which Taoist's tokens, which colours, tokens or crystals — is offered;
//   - Wu-Feng's prompts aren't the network's, and get the heuristic's answer.

import type { Action, CrystalSpend, HelpParams, Response, TaoSpend } from '@/game/actions'
import { cheapestSpend, covers, requirementsFor, spendersFor } from '@/game/exorcism'
import { adjacentTiles, facedSpaces } from '@/game/geometry'
import { ghostAt, livingTaoists, taoBlocked, whiteIsWild } from '@/game/rules'
import type { Color, DemonId, ExorcismRoll, GameState, GhostRef, Prompt, Seat, TaoColor, TileIdx } from '@/game/types'
import { COLORS, TAO_COLORS } from '@/game/types'
import { ALL_SPACES } from '@/game/rules'
import { applyInPlace, clone } from '../fast'
import { answer } from '../sim'

export interface LegalSet {
  actions: Action[]
  /** True when the list is just the heuristic's answer (a prompt the network doesn't open up). */
  heuristic: boolean
}

/** Legal actions for `seat` now (empty when it isn't this seat's decision). */
export function legalActions(s: GameState, seat: Seat): LegalSet {
  if (s.phase === 'gameOver') return { actions: [], heuristic: false }
  if (s.prompt) {
    if (s.prompt.owner !== seat) return { actions: [], heuristic: false }
    if (seat === 'wufeng') return { actions: [answer(s)], heuristic: true }
    const rs = responses(s, s.prompt, seat)
    const actions = dedupe(rs.map((r): Action => ({ type: 'respond', by: seat, r })).filter((a) => isLegal(s, a)))
    if (actions.length === 0) return { actions: [answer(s)], heuristic: true }
    return { actions, heuristic: false }
  }
  if (s.phase !== 'yang' || !s.yang || seat !== s.active) return { actions: [], heuristic: false }
  return { actions: dedupe(yangActions(s, seat).filter((a) => isLegal(s, a))), heuristic: false }
}

export function isLegal(s: GameState, a: Action): boolean {
  try {
    applyInPlace(clone(s), a)
    return true
  } catch {
    return false
  }
}

/** A canonical key (arrays of spends / colours sorted), for de-duplication and matching. */
export function actionKey(a: Action): string {
  return JSON.stringify(a, (_k, v: unknown) => {
    if (Array.isArray(v) && v.length > 1 && v.every((x) => typeof x === 'string')) return [...(v as string[])].sort()
    if (Array.isArray(v) && v.length > 1 && v.every((x) => x && typeof x === 'object' && ('from' in x || 'board' in x))) {
      return [...v].map((x) => JSON.stringify(x)).sort()
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, unknown>
      return Object.fromEntries(Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => [k, o[k]]))
    }
    return v
  })
}

/** Like actionKey, ignoring choices that change nothing (a moon crystal's colour, `false` flags): for matching another AI's action. */
export function matchKey(a: Action): string {
  return actionKey(JSON.parse(JSON.stringify(a, (k, v: unknown) => (k === 'as' ? undefined : (k === 'carry' || k === 'climb') && v === false ? undefined : v))) as Action)
}

/** Index of `a` in `actions` (by matchKey), or −1. */
export function indexOfAction(actions: Action[], a: Action): number {
  const k = matchKey(a)
  return actions.findIndex((x) => matchKey(x) === k)
}

function dedupe(as: Action[]): Action[] {
  const seen = new Set<string>()
  const out: Action[] = []
  for (const a of as) {
    const k = actionKey(a)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(a)
  }
  return out
}

// ---------------------------------------------------------------------------
// Yang phase
// ---------------------------------------------------------------------------

const TILES: TileIdx[] = [0, 1, 2, 3, 4, 5, 6, 7, 8]

function yangActions(s: GameState, c: Color): Action[] {
  const t = s.taoists[c]
  const out: Action[] = []
  const wm = !!s.whiteMoon
  const bs = !!s.blackSecret
  // Step 1: move (White Moon: bringing a villager along; Black Secret: underground too).
  for (const to of TILES) {
    out.push({ type: 'move', by: c, to })
    if (wm) for (const from of TILES) out.push({ type: 'move', by: c, to, carry: { from } })
  }
  if (bs) out.push({ type: 'climb', by: c })
  // Powers used before the move.
  for (const o of COLORS) {
    if (o === c) continue
    for (const to of TILES) {
      const base = { power: 'danceOfTheTwinWinds' as const, taoist: o, to }
      out.push({ type: 'power', by: c, use: base })
      if (wm) out.push({ type: 'power', by: c, use: { ...base, carry: true } })
      if (bs) out.push({ type: 'power', by: c, use: { ...base, climb: true } })
      if (wm && bs) out.push({ type: 'power', by: c, use: { ...base, carry: true, climb: true } })
    }
  }
  for (const color of TAO_COLORS) out.push({ type: 'power', by: c, use: { power: 'bottomlessPockets', color } })
  for (const ref of ALL_SPACES) if (ghostAt(s, ref)) out.push({ type: 'power', by: c, use: { power: 'enfeeblementMantra', ghost: ref } })
  if (bs) for (const d of s.blackSecret!.demons) out.push({ type: 'power', by: c, use: { power: 'enfeeblementMantra', demon: d.id } })
  for (const board of COLORS) out.push({ type: 'powerToken', by: c, board })
  // Step 2.
  if (t.tile != null && !t.underground) for (const params of helpParams(s, c, t.tile)) out.push({ type: 'help', by: c, params })
  out.push(...exorciseActions(s, c))
  if (wm) out.push({ type: 'saveVillager', by: c })
  // Step 3.
  if (t.tile != null && !t.underground && t.buddhas > 0) {
    const faced = facedSpaces(t.tile)
    for (const set of subsets(faced, 1, 2)) out.push({ type: 'placeBuddha', by: c, spaces: set })
  }
  if (wm) for (const corner of ['nw', 'ne', 'sw', 'se'] as const) out.push({ type: 'placeCrystal', by: c, corner })
  // Yin-Yang: restore any haunted tile, or any villager's help from anywhere.
  if (t.yinYang) {
    for (const tile of TILES) {
      if (s.village[tile]!.haunted) out.push({ type: 'yinYang', by: c, use: { kind: 'flip', tile } })
      else for (const params of helpParams(s, c, tile)) out.push({ type: 'yinYang', by: c, use: { kind: 'help', tile, params } })
    }
  }
  // White Moon artifacts.
  for (const artifact of new Set(t.artifacts)) {
    out.push({ type: 'artifact', by: c, artifact })
    for (const tile of TILES) out.push({ type: 'artifact', by: c, artifact, tile })
    for (const ghost of ALL_SPACES) if (ghostAt(s, ghost)) out.push({ type: 'artifact', by: c, artifact, ghost })
  }
  // End the turn (on the centre: how many power tokens to pick back up).
  for (let reclaim = 0; reclaim <= s.centerPowerTokens; reclaim++) out.push({ type: 'endTurn', by: c, reclaim })
  return out
}

function exorciseActions(s: GameState, c: Color): Action[] {
  const t = s.taoists[c]
  const out: Action[] = []
  const faced = t.tile != null && !t.underground ? facedSpaces(t.tile).filter((r) => ghostAt(s, r)) : []
  const demons: DemonId[] = s.blackSecret ? s.blackSecret.demons.filter((d) => d.space != null).map((d) => d.id) : []
  for (const targets of subsets(faced, 0, 2)) {
    for (const ds of subsets(demons, 0, 3)) {
      if (targets.length + ds.length === 0) continue
      out.push(ds.length ? { type: 'exorcise', by: c, targets, demons: ds } : { type: 'exorcise', by: c, targets })
    }
  }
  return out
}

/** Every parameter set of the villager's action on `tile` (legality is checked afterwards). */
export function helpParams(s: GameState, c: Color, tile: TileIdx): HelpParams[] {
  const kind = s.village[tile]!.kind
  const ghosts = ALL_SPACES.filter((r) => ghostAt(s, r))
  switch (kind) {
    case 'circleOfPrayer':
      return TAO_COLORS.map((color) => ({ kind, color }))
    case 'teaHouse':
      return TAO_COLORS.map((color) => ({ kind, color }))
    case 'buddhistTemple':
    case 'herbalistShop':
      return [{ kind }]
    case 'cemetery': {
      const out: HelpParams[] = COLORS.map((revive) => ({ kind, revive }))
      for (let villager = 0; villager < (s.whiteMoon?.dead.length ?? 0); villager++) out.push({ kind, villager })
      return out
    }
    case 'taoistAltar':
      return TILES.map((t) => ({ kind, tile: t }))
    case 'sorcerersHut':
      return ghosts.map((ghost) => ({ kind, ghost }))
    case 'nightWatchman':
      return COLORS.map((board) => ({ kind, board }))
    case 'pavilion':
      return pavilionParams(s, c, ghosts)
    case 'kungFuSchool':
      return [{ kind, scope: 'ownColor' }, { kind, scope: 'black' }, ...COLORS.map((b) => ({ kind, scope: { neutralBoard: b } }))]
    case 'calligrapher': {
      const bs = s.blackSecret
      if (!bs) return []
      const out: HelpParams[] = []
      const places: Array<number | null> = [null, ...bs.mantras.map((_, i) => i)]
      const swaps: Array<{ mantra: number; replacement: string } | null> = [null]
      bs.mantras.forEach((m, i) => {
        const seen = new Set<string>()
        for (const r of bs.mantraDeck) {
          // Replacements with the same effect and level play the same: one of each.
          const k = `${r.level}:${r.effect}`
          if (r.level !== m.level || seen.has(k)) continue
          seen.add(k)
          swaps.push({ mantra: i, replacement: r.id })
        }
      })
      for (const swap of swaps) for (const placeQi of places) out.push({ kind, swap, placeQi })
      return out
    }
  }
}

function pavilionParams(s: GameState, c: Color, ghosts: GhostRef[]): HelpParams[] {
  const free = ALL_SPACES.filter((r) => !ghostAt(s, r))
  const solo = COLORS.filter((x) => !s.boards[x].neutral).length === 1
  const movers = livingTaoists(s).filter((o) => (solo ? o.color === c : o.color !== c) && o.tile != null)
  const moves: Array<{ taoist: Color | null; taoistTo: TileIdx | null }> = []
  for (const o of movers) {
    const tos = o.underground ? TILES.filter((x) => x !== o.tile) : adjacentTiles(o.tile!)
    for (const to of tos) moves.push({ taoist: o.color, taoistTo: to })
  }
  if (moves.length === 0) moves.push({ taoist: null, taoistTo: null })
  const out: HelpParams[] = []
  for (const ghost of ghosts) {
    for (const to of free) {
      for (const m of moves) {
        const base = { kind: 'pavilion' as const, ghost, to, ...m }
        out.push(base)
        if (m.taoist && s.whiteMoon) out.push({ ...base, carry: true })
        if (m.taoist && s.blackSecret) out.push({ ...base, climb: true })
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function responses(s: GameState, p: Prompt, seat: Color): Response[] {
  switch (p.kind) {
    case 'placeGhost':
      return p.options.map((ref) => ({ kind: 'placeGhost', ref }))
    case 'curseReroll':
      return [{ kind: 'curseReroll', reroll: true }, { kind: 'curseReroll', reroll: false }]
    case 'qiPayer':
      return p.options.map((taoist) => ({ kind: 'qiPayer', taoist }))
    case 'bonecrackerPayer':
      return p.options.map((taoist) => ({ kind: 'bonecrackerPayer', taoist }))
    case 'discardTao': {
      const t = s.taoists[p.taoist]
      const held = TAO_COLORS.filter((x) => t.tao[x] > 0)
      const n = Math.min(p.count, TAO_COLORS.reduce((k, x) => k + t.tao[x], 0))
      return multisets(held, n, (x) => t.tao[x]).map((colors) => ({ kind: 'discardTao', colors }))
    }
    case 'gainTao':
      return [...multisets([...TAO_COLORS], p.count, (x) => s.taoSupply[x]), ...(p.count > 1 ? multisets([...TAO_COLORS], p.count - 1, (x) => s.taoSupply[x]) : [[]])].map((colors) => ({ kind: 'gainTao', colors }))
    case 'qiOrYinYang':
      return [{ kind: 'qiOrYinYang', choice: 'qi' }, { kind: 'qiOrYinYang', choice: 'yinYang' }]
    case 'incarnationReward': {
      const who: Array<Color | null> = [null, ...livingTaoists(s).map((t) => t.color)]
      const out: Response[] = []
      for (const qi of who) for (const yinYang of who) out.push({ kind: 'incarnationReward', qi, yinYang })
      return out
    }
    case 'exorcism':
      return exorcismResponses(s, p.roll)
    case 'herbalist': {
      const out: Response[] = []
      if (p.canReroll) for (const dice of subsets(p.dice.map((_, i) => i), 1, p.dice.length)) out.push({ kind: 'reroll', dice })
      const whites = p.dice.filter((d) => d === 'white').length
      for (let n = s.whiteMoon ? 0 : whites; n <= whites; n++) for (const white of multisets([...TAO_COLORS], n, () => n)) out.push({ kind: 'herbalistTake', white })
      return out
    }
    case 'devour':
      return p.options.map((tile) => ({ kind: 'devour', tile }))
    case 'suLing':
      return [{ kind: 'suLing', ref: null }, ...p.options.map((ref) => ({ kind: 'suLing' as const, ref }))]
    case 'suLingCrystal':
      return [{ kind: 'suLingCrystal', take: true }, { kind: 'suLingCrystal', take: false }]
    case 'inherit':
      return p.options.map((taoist) => ({ kind: 'inherit', taoist }))
    case 'barrier':
      return [{ kind: 'barrier', choice: 'save' }, ...TILES.map((tile) => ({ kind: 'barrier' as const, choice: 'save' as const, tile })), { kind: 'barrier', choice: 'roll' }, { kind: 'barrier', choice: 'pass' }]
    case 'restoreTile':
      return p.options.map((tile) => ({ kind: 'restoreTile', tile }))
    case 'shadowAttack':
      return multisets(p.options, p.hits, () => p.hits).map((taoists) => ({ kind: 'shadowAttack', taoists: taoists as Color[] }))
    case 'mantraQi':
      return p.options.map((mantra) => ({ kind: 'mantraQi', mantra }))
    case 'mantraTarget':
      return p.options.map((target) => ({ kind: 'mantraTarget', target }))
    default:
      void seat
      return []
  }
}

/** Gods' Favorite rerolls of any dice, and every commit: each target set, each cheapest way to pay. */
function exorcismResponses(s: GameState, roll: ExorcismRoll): Response[] {
  const out: Response[] = []
  if (roll.canReroll) for (const dice of subsets(roll.dice.map((_, i) => i), 1, roll.dice.length)) out.push({ kind: 'reroll', dice })
  for (const exorcise of subsets(roll.targets, 0, roll.targets.length)) {
    for (const demons of subsets(roll.demons, 0, roll.demons.length)) {
      if (exorcise.length + demons.length === 0) {
        out.push({ kind: 'commit', spend: [], crystals: [], exorcise: [], demons: [] })
        continue
      }
      for (const plan of minimalSpends(s, roll, exorcise, demons)) out.push({ kind: 'commit', ...plan, exorcise, demons })
    }
  }
  return out
}

const MAX_SPENDS = 48

/** Every distinct way to pay the fewest Tao tokens / moon crystals that cover these targets. */
export function minimalSpends(s: GameState, roll: ExorcismRoll, refs: GhostRef[], demons: DemonId[]): Array<{ spend: TaoSpend[]; crystals: CrystalSpend[] }> {
  const cheapest = cheapestSpend(s, roll, refs, demons)
  if (!cheapest) return []
  const min = cheapest.spend.length + cheapest.crystals.length
  if (min === 0) return [{ spend: [], crystals: [] }]
  const reqs = requirementsFor(s, roll, refs, demons)
  const wild = whiteIsWild(s)
  const spenders = spendersFor(s, roll)
  const ordered = [roll.actor, ...spenders.filter((c) => c !== roll.actor)].filter((c) => spenders.includes(c))
  const blocked = taoBlocked(s) || roll.mode === 'barrier'
  const needed = TAO_COLORS.filter((col) => reqs.some((r) => (r.base[col] ?? 0) > 0))
  const tokenDims: Array<{ from: Color; color: TaoColor; max: number }> = []
  if (!blocked) for (const from of ordered) for (const color of needed) if (s.taoists[from].tao[color] > 0) tokenDims.push({ from, color, max: s.taoists[from].tao[color] })
  const crystalDims: Array<{ from: Color | 'barrier'; max: number }> = []
  if (s.whiteMoon) {
    if (roll.mode === 'barrier') crystalDims.push({ from: 'barrier', max: s.whiteMoon.barrier?.crystals ?? 0 })
    else for (const from of ordered) if (s.taoists[from].crystals > 0) crystalDims.push({ from, max: s.taoists[from].crystals })
  }
  const as = needed[0] ?? 'red'
  const counts = new Array<number>(tokenDims.length + crystalDims.length).fill(0)
  const out: Array<{ spend: TaoSpend[]; crystals: CrystalSpend[] }> = []
  const vec: Record<TaoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
  const rec = (i: number, left: number): void => {
    if (out.length >= MAX_SPENDS) return
    if (i === counts.length) {
      if (left !== 0) return
      for (const col of TAO_COLORS) vec[col] = 0
      let crystals = 0
      tokenDims.forEach((d, j) => (vec[d.color] += counts[j]!))
      crystalDims.forEach((_, j) => (crystals += counts[tokenDims.length + j]!))
      if (!covers(reqs, roll.dice, wild, vec, crystals)) return
      const spend: TaoSpend[] = []
      tokenDims.forEach((d, j) => {
        for (let k = 0; k < counts[j]!; k++) spend.push({ from: d.from, color: d.color })
      })
      const cs: CrystalSpend[] = []
      crystalDims.forEach((d, j) => {
        for (let k = 0; k < counts[tokenDims.length + j]!; k++) cs.push({ from: d.from, as })
      })
      out.push({ spend, crystals: cs })
      return
    }
    const max = i < tokenDims.length ? tokenDims[i]!.max : crystalDims[i - tokenDims.length]!.max
    for (let x = Math.min(left, max); x >= 0; x--) {
      counts[i] = x
      rec(i + 1, left - x)
    }
    counts[i] = 0
  }
  rec(0, min)
  return out
}

// ---------------------------------------------------------------------------
// Combinatorics
// ---------------------------------------------------------------------------

/** Subsets of `xs` with between `min` and `max` elements (order kept). */
export function subsets<T>(xs: readonly T[], min: number, max: number): T[][] {
  const out: T[][] = []
  const n = xs.length
  for (let mask = 0; mask < 1 << n; mask++) {
    const pick: T[] = []
    for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push(xs[i]!)
    if (pick.length >= min && pick.length <= max) out.push(pick)
  }
  return out
}

/** Multisets of size n over `kinds`, each kind used at most `cap(kind)` times. */
export function multisets<T>(kinds: readonly T[], n: number, cap: (k: T) => number): T[][] {
  const out: T[][] = []
  const pick: T[] = []
  const rec = (i: number, left: number) => {
    if (left === 0) {
      out.push(pick.slice())
      return
    }
    if (i === kinds.length) return
    const k = kinds[i]!
    const most = Math.min(left, cap(k))
    for (let x = most; x >= 0; x--) {
      for (let j = 0; j < x; j++) pick.push(k)
      rec(i + 1, left - x)
      for (let j = 0; j < x; j++) pick.pop()
    }
  }
  rec(0, n)
  return out
}
