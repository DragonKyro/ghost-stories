// Candidate actions → features + pointers into the state's tokens.
//
// The policy head scores each legal action from (a) what kind of action it
// is and its parameters (CAND layout) and (b) the contextual embeddings of
// the tokens it involves (PTR roles: the tile, the ghost spaces, the
// Taoists, a demon / Bloody Mantra), so a new kind of action is just a new
// combination of known pieces.

import type { Action, HelpParams, Response } from '@/game/actions'
import { isAdjacent } from '@/game/geometry'
import type { Color, GameState, TaoColor } from '@/game/types'
import { CORNER_TILE } from '@/game/types'
import type { Ctx, Encoded } from './encode'
import { Ctx as EncodeCtx } from './encode'
import {
  ACTION_TYPE,
  ARTIFACT,
  CAND,
  MANTRA_EFFECT,
  N_PTR,
  POWER,
  PTR,
  RESPONSE_KIND,
  TILE_KIND,
  type Layout,
} from './schema'

export interface EncodedCandidates {
  n: number
  /** n × CAND.size */
  feat: Float32Array
  /** n × N_PTR token slots, −1 = none */
  ptr: Int16Array
}

class CandRow {
  constructor(
    private readonly feat: Float32Array,
    private readonly ptr: Int16Array,
    private readonly i: number,
    private readonly L: Layout,
  ) {}
  set(name: string, v: number, j = 0): void {
    const f = this.L.field(name)
    if (j < 0 || j >= f.n || !Number.isInteger(j)) throw new Error(`nn candidates: ${name}[${j}] out of range`)
    this.feat[this.i * this.L.size + f.off + j] = v
  }
  add(name: string, v: number, j = 0): void {
    const f = this.L.field(name)
    if (j < 0 || j >= f.n) throw new Error(`nn candidates: ${name}[${j}] out of range`)
    this.feat[this.i * this.L.size + f.off + j] += v
  }
  point(role: keyof typeof PTR, slot: number): void {
    this.ptr[this.i * N_PTR + PTR[role]] = slot
  }
}

export function encodeCandidates(s: GameState, enc: Encoded, actions: Action[], heuristic = false): EncodedCandidates {
  const n = actions.length
  const feat = new Float32Array(n * CAND.size)
  const ptr = new Int16Array(n * N_PTR).fill(-1)
  const ctx = new EncodeCtx(s, enc.seat, enc.frame)
  actions.forEach((a, i) => {
    const r = new CandRow(feat, ptr, i, CAND)
    r.set('bias', 1)
    if (heuristic) r.set('heuristic', 1)
    r.set('type', 1, ACTION_TYPE[a.type])
    writeAction(ctx, r, a)
  })
  return { n, feat, ptr }
}

function writeAction(ctx: Ctx, r: CandRow, a: Action): void {
  const { s, f } = ctx
  const t = s.taoists[a.by as Color]
  switch (a.type) {
    case 'move': {
      const from = t?.tile ?? null
      if (t?.underground) {
        r.set('underground', 1)
        r.point('tile', ctx.catacombSlot(a.to))
      } else r.point('tile', ctx.tileSlot(a.to))
      r.set('moveDist', 1, from == null || a.to === from ? 0 : isAdjacent(from, a.to) ? 1 : 2)
      if (a.carry) {
        r.set('carry', 1)
        r.point('tile2', ctx.tileSlot(a.carry.from))
      }
      return
    }
    case 'climb':
      if (t?.tile != null) {
        r.point('tile', ctx.tileSlot(t.tile))
        r.point('tile2', ctx.catacombSlot(t.tile))
      }
      if (t?.underground) r.set('underground', 1)
      return
    case 'power': {
      const u = a.use
      r.set('power', 1, POWER[u.power])
      if (u.power === 'danceOfTheTwinWinds') {
        r.point('seat1', ctx.seatSlot(u.taoist))
        const o = s.taoists[u.taoist]
        r.point('tile', o.underground ? ctx.catacombSlot(u.to) : ctx.tileSlot(u.to))
        if (u.carry) r.set('carry', 1)
        if (u.climb) r.set('climb', 1)
      } else if (u.power === 'bottomlessPockets') {
        r.set('color', 1, f.tao(u.color))
      } else {
        if (u.ghost) r.point('ghost1', ctx.spaceSlot(u.ghost))
        if (u.demon) r.point('extra', ctx.demonSlot(u.demon))
      }
      return
    }
    case 'powerToken':
      r.set('power', 1, POWER[s.boards[a.board].power])
      r.point('seat1', ctx.seatSlot(a.board))
      return
    case 'help':
      if (t?.tile != null) r.point('tile', ctx.tileSlot(t.tile))
      writeHelp(ctx, r, a.params, a.by)
      return
    case 'exorcise':
      r.set('nTargets', a.targets.length / 2)
      if (a.targets[0]) r.point('ghost1', ctx.spaceSlot(a.targets[0]))
      if (a.targets[1]) r.point('ghost2', ctx.spaceSlot(a.targets[1]))
      if (a.demons?.length) {
        r.set('nDemons', a.demons.length / 3)
        r.point('extra', ctx.demonSlot(a.demons[0]!))
        if (a.demons[1]) r.point('extra2', ctx.demonSlot(a.demons[1]))
      }
      if (t?.tile != null) r.point('tile', t.underground ? ctx.catacombSlot(t.tile) : ctx.tileSlot(t.tile))
      return
    case 'saveVillager':
      if (t?.tile != null) r.point('tile', ctx.tileSlot(t.tile))
      return
    case 'placeBuddha':
      r.set('nBuddhas', a.spaces.length / 2)
      if (a.spaces[0]) r.point('ghost1', ctx.spaceSlot(a.spaces[0]))
      if (a.spaces[1]) r.point('ghost2', ctx.spaceSlot(a.spaces[1]))
      return
    case 'placeCrystal':
      r.point('tile', ctx.tileSlot(CORNER_TILE[a.corner]))
      return
    case 'yinYang':
      r.point('tile', ctx.tileSlot(a.use.tile))
      if (a.use.kind === 'flip') r.set('yinYangFlip', 1)
      else {
        r.set('yinYangHelp', 1)
        writeHelp(ctx, r, a.use.params, a.by)
      }
      return
    case 'artifact':
      r.set('artifact', 1, ARTIFACT[a.artifact])
      if (a.tile != null) r.point('tile', ctx.tileSlot(a.tile))
      if (a.ghost) r.point('ghost1', ctx.spaceSlot(a.ghost))
      return
    case 'endTurn':
      r.set('reclaim', (a.reclaim ?? 0) / 3)
      if (t?.tile === 4 && !t.underground) r.set('atCenter', 1)
      return
    case 'respond':
      r.set('resp', 1, RESPONSE_KIND[a.r.kind])
      writeResponse(ctx, r, a.r)
      return
  }
}

function writeHelp(ctx: Ctx, r: CandRow, p: HelpParams, by: Color): void {
  const { f } = ctx
  r.set('help', 1, TILE_KIND[p.kind])
  switch (p.kind) {
    case 'circleOfPrayer':
    case 'teaHouse':
      r.set('color', 1, f.tao(p.color))
      return
    case 'cemetery':
      if ('revive' in p) {
        r.set('revive', 1)
        r.point('seat1', ctx.seatSlot(p.revive))
      } else r.set('villager', (p.villager + 1) / 12)
      return
    case 'taoistAltar':
      r.point('tile2', ctx.tileSlot(p.tile))
      return
    case 'sorcerersHut':
      r.point('ghost1', ctx.spaceSlot(p.ghost))
      return
    case 'nightWatchman':
      r.point('seat1', ctx.seatSlot(p.board))
      return
    case 'pavilion':
      r.point('ghost1', ctx.spaceSlot(p.ghost))
      r.point('ghost2', ctx.spaceSlot(p.to))
      if (p.taoist) {
        r.set('pavilionTaoist', 1)
        r.point('seat1', ctx.seatSlot(p.taoist))
        if (p.taoistTo != null) r.point('tile2', ctx.s.taoists[p.taoist].underground ? ctx.catacombSlot(p.taoistTo) : ctx.tileSlot(p.taoistTo))
      }
      if (p.carry) r.set('carry', 1)
      if (p.climb) r.set('climb', 1)
      return
    case 'kungFuSchool':
      if (p.scope === 'ownColor') r.set('scope', 1, 0)
      else if (p.scope === 'black') r.set('scope', 1, 1)
      else {
        r.set('scope', 1, 2)
        r.point('seat1', ctx.seatSlot(p.scope.neutralBoard))
      }
      return
    case 'calligrapher': {
      const bs = ctx.s.blackSecret
      if (p.swap) {
        r.set('swap', 1)
        r.point('extra', ctx.mantraSlot(p.swap.mantra))
        const m = bs?.mantraDeck.find((x) => x.id === p.swap!.replacement)
        if (m) r.set('swapEffect', 1, MANTRA_EFFECT[m.effect])
      }
      if (p.placeQi != null) {
        r.set('placeQi', 1)
        r.point('extra2', ctx.mantraSlot(p.placeQi))
      }
      return
    }
    default:
      void by
      return
  }
}

function colorCounts(ctx: Ctx, r: CandRow, field: 'colors' | 'spend', colors: readonly TaoColor[]): void {
  for (const c of colors) r.add(field, 1 / 4, ctx.f.tao(c))
  if (field === 'colors') r.set('nColors', colors.length / 4)
}

function writeResponse(ctx: Ctx, r: CandRow, x: Response): void {
  const { s, f } = ctx
  switch (x.kind) {
    case 'placeGhost':
    case 'wuFengSkeleton':
      r.point('ghost1', ctx.spaceSlot(x.ref))
      return
    case 'curseReroll':
      r.set(x.reroll ? 'yes' : 'no', 1)
      return
    case 'suLingCrystal':
      r.set(x.take ? 'yes' : 'no', 1)
      return
    case 'qiOrYinYang':
      r.set(x.choice === 'qi' ? 'yes' : 'no', 1)
      return
    case 'qiPayer':
    case 'bonecrackerPayer':
    case 'inherit':
      r.point('seat1', ctx.seatSlot(x.taoist))
      return
    case 'discardTao':
    case 'gainTao':
      colorCounts(ctx, r, 'colors', x.colors)
      return
    case 'herbalistTake':
      colorCounts(ctx, r, 'colors', x.white)
      return
    case 'incarnationReward':
      if (x.qi) r.point('seat1', ctx.seatSlot(x.qi))
      else r.set('nullA', 1)
      if (x.yinYang) r.point('seat2', ctx.seatSlot(x.yinYang))
      else r.set('nullB', 1)
      return
    case 'reroll': {
      const p = s.prompt
      const dice = p?.kind === 'exorcism' ? p.roll.dice : p?.kind === 'herbalist' ? p.dice : []
      for (const i of x.dice) {
        if (i < 4) r.set('rerollMask', 1, i)
        const d = dice[i]
        if (d) r.add('rerollFaces', 1 / 4, d === 'white' ? 5 : f.tao(d))
      }
      r.set('nReroll', x.dice.length / 4)
      return
    }
    case 'commit': {
      const p = s.prompt
      const actor = p?.kind === 'exorcism' ? p.roll.actor : null
      colorCounts(ctx, r, 'spend', x.spend.map((t) => t.color))
      r.set('spendTotal', x.spend.length / 4)
      r.set('spendOthers', x.spend.filter((t) => t.from !== actor).length / 4)
      r.set('crystals', x.crystals.length / 4)
      r.set('nTargets', x.exorcise.length / 2)
      if (x.exorcise[0]) r.point('ghost1', ctx.spaceSlot(x.exorcise[0]))
      if (x.exorcise[1]) r.point('ghost2', ctx.spaceSlot(x.exorcise[1]))
      if (x.demons.length) {
        r.set('nDemons', x.demons.length / 3)
        r.point('extra', ctx.demonSlot(x.demons[0]!))
        if (x.demons[1]) r.point('extra2', ctx.demonSlot(x.demons[1]))
      }
      if (x.exorcise.length + x.demons.length === 0) r.set('exorciseNone', 1)
      if (p?.kind === 'exorcism' && x.exorcise.length === p.roll.targets.length && x.demons.length === p.roll.demons.length) r.set('exorciseAll', 1)
      if (actor) r.point('seat1', ctx.seatSlot(actor))
      return
    }
    case 'devour':
    case 'restoreTile':
    case 'wuFengCurseTarget':
      r.point('tile', ctx.tileSlot(x.tile))
      return
    case 'suLing':
      if (x.ref) r.point('ghost1', ctx.spaceSlot(x.ref))
      else r.set('nullA', 1)
      return
    case 'barrier':
      r.set('barrier', 1, x.choice === 'save' ? 0 : x.choice === 'roll' ? 1 : 2)
      if (x.tile != null) r.point('tile', ctx.tileSlot(x.tile))
      return
    case 'shadowAttack':
      x.taoists.forEach((c, i) => {
        if (i === 0) r.point('seat1', ctx.seatSlot(c))
        if (i === 1) r.point('seat2', ctx.seatSlot(c))
      })
      r.set('nColors', x.taoists.length / 4)
      return
    case 'mantraQi':
      if (x.mantra < 6) r.point('extra', ctx.mantraSlot(x.mantra))
      return
    case 'mantraTarget':
      r.set('villager', (x.target + 1) / 12)
      return
    default:
      return
  }
}
