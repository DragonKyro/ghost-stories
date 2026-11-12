import { describe, expect, it } from 'vitest'
import { cheapestSpend, minSpend } from '@/game/exorcism'
import { facedSpaces, facingTile, isCorner } from '@/game/geometry'
import { ALL_SPACES, exorcismBlocker, exorcismDice, ghostAt, hasPower, taoistsWith, whiteIsWild } from '@/game/rules'
import type { Color, DieFace, ExorcismRoll, GameState, GhostRef } from '@/game/types'
import { COLORS, DIE_FACES } from '@/game/types'
import { exorcismChance, pairChances } from '../prob'
import { encodeCandidates } from './candidates'
import { exorcismOdds, poolOf, requirements, rerollOdds, rollOdds, spaceOdds, tileOdds } from './calc'
import { encodeState } from './encode'
import { samplePositions } from './index'
import { legalActions } from './legal'
import { CAND, TOKEN } from './schema'

const POSITIONS = samplePositions(5, 10)

/** Living Taoists and the ghosts in play, position by position. */
function* cases(): Generator<{ s: GameState; c: Color; ref: GhostRef }> {
  for (const { s } of POSITIONS) {
    for (const c of COLORS) {
      const t = s.taoists[c]
      if (!t.alive || t.tile == null || t.underground) continue
      for (const ref of ALL_SPACES) if (ghostAt(s, ref) && !exorcismBlocker(s, ref)) yield { s, c, ref }
    }
  }
}

/** Every ordered roll of n dice. */
function rolls(n: number): DieFace[][] {
  let out: DieFace[][] = [[]]
  for (let i = 0; i < n; i++) out = out.flatMap((d) => DIE_FACES.map((f) => [...d, f]))
  return out
}

describe('nn dice maths', () => {
  it('has positions with ghosts to check', () => {
    expect([...cases()].length).toBeGreaterThan(50)
  })

  it('agrees with the exorcism odds the rules-based AI uses (prob.ts), one ghost and corner pairs', () => {
    let pairs = 0
    for (const { s, c, ref } of cases()) {
      const tile = facingTile(ref)
      const o = spaceOdds(s, c, ref)
      expect(o.all).toBeCloseTo(exorcismChance(s, c, tile, [ref], exorcismDice(s, c), hasPower(s, c, 'godsFavorite')), 9)
      expect(o.any).toBeCloseTo(o.all, 12)
      expect(o.dice).toBeLessThanOrEqual(o.all + 1e-12)
      if (o.all === 0) expect(o.spend).toBe(0)
      const faced = facedSpaces(tile).filter((r) => ghostAt(s, r) && !exorcismBlocker(s, r))
      if (isCorner(tile) && faced.length === 2 && ref.board === faced[0]!.board && ref.space === faced[0]!.space) {
        const [a, b] = faced as [GhostRef, GhostRef]
        const pc = pairChances(s, c, tile, a, b, exorcismDice(s, c), hasPower(s, c, 'godsFavorite'))
        const po = tileOdds(s, c, tile).pair
        expect(po.all).toBeCloseTo(pc.both, 9)
        expect(po.any).toBeCloseTo(pc.both + pc.onlyA + pc.onlyB + pc.either, 9)
        pairs++
      }
    }
    expect(pairs).toBeGreaterThan(0)
  })

  it("matches the engine's cheapest spend roll by roll (chance and expected Tao spent)", () => {
    let checked = 0
    for (const { s, c, ref } of cases()) {
      if (hasPower(s, c, 'godsFavorite') || s.taoists[c].tile !== facingTile(ref) || checked > 60) continue
      const n = exorcismDice(s, c)
      let win = 0
      let spent = 0
      const all = rolls(n)
      for (const dice of all) {
        const roll: ExorcismRoll = { mode: 'exorcism', actor: c, targets: [ref], demons: [], dice, canReroll: false }
        const plan = cheapestSpend(s, roll, [ref])
        if (!plan) continue
        win++
        spent += plan.spend.length + plan.crystals.length
      }
      const o = exorcismOdds(s, c, s.taoists[c].tile!, [ref], { pool: poolOf(s, taoistsWith(s, c)) })
      expect(o.all).toBeCloseTo(win / all.length, 9)
      expect(o.spend).toBeCloseTo(win ? spent / win : 0, 9)
      checked++
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('minSpend: whites before Tao, dice-immune needs paid in full, null when short', () => {
    const tokens = { red: 2, blue: 0, green: 0, yellow: 0, black: 0 }
    const req = (red: number, immune = false) => ({ key: 'x', base: { red }, discounts: 0, immune })
    expect(minSpend([req(3)], ['red', 'white', 'blue'], true, tokens, 0)).toBe(1)
    expect(minSpend([req(3)], ['red', 'red', 'red'], true, tokens, 0)).toBe(0)
    expect(minSpend([req(3)], ['blue', 'blue', 'blue'], true, tokens, 0)).toBeNull()
    expect(minSpend([req(3)], ['blue', 'blue', 'blue'], true, tokens, 1)).toBe(3)
    expect(minSpend([req(2, true)], ['red', 'red', 'red'], true, tokens, 0)).toBe(2)
    expect(minSpend([req(3)], ['red', 'white', 'blue'], false, tokens, 0)).toBe(2)
  })

  it('rerolls: nothing rerolled is the roll as it stands; everything rerolled is a fresh roll', () => {
    let checked = 0
    for (const { s, c, ref } of cases()) {
      if (checked > 40) break
      const reqs = requirements(s, c, [ref])
      const pool = poolOf(s, taoistsWith(s, c))
      const dice: DieFace[] = ['red', 'black', 'white'].slice(0, Math.max(1, exorcismDice(s, c))) as DieFace[]
      const roll: ExorcismRoll = { mode: 'exorcism', actor: c, targets: [ref], demons: [], dice, canReroll: true }
      const now = rerollOdds(s, roll, []).all
      expect(now).toBe(cheapestSpend(s, roll, [ref]) ? 1 : 0)
      const fresh = rollOdds(reqs, [], dice.length, whiteIsWild(s), pool, false)
      expect(rerollOdds(s, roll, dice.map((_, i) => i)).all).toBeCloseTo(fresh.all, 12)
      checked++
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('goes into the tokens and the candidates', () => {
    let spaces = 0
    let cands = 0
    for (const { s, seat } of POSITIONS) {
      const enc = encodeState(s, seat)
      const me = enc.seat
      for (const ref of ALL_SPACES) {
        const L = TOKEN.space.layout
        const v = enc.x.space[enc.frame.space(ref) * L.size + L.field('oddsFace').off]!
        expect(v).toBeCloseTo(spaceOdds(s, me, ref).all, 6)
        if (v > 0) spaces++
      }
      const T = TOKEN.tile.layout
      for (let t = 0; t < 9; t++) {
        const v = enc.x.tile[enc.frame.tile(t) * T.size + T.field('oddsBest').off]!
        expect(v).toBeCloseTo(tileOdds(s, me, t).best.all, 6)
      }
      const { actions, heuristic } = legalActions(s, seat)
      const ec = encodeCandidates(s, enc, actions, heuristic)
      actions.forEach((a, i) => {
        const at = (name: string) => ec.feat[i * CAND.size + CAND.field(name).off]!
        if (a.type === 'exorcise' && a.targets.length === 1 && s.taoists[a.by].tile === facingTile(a.targets[0]!)) {
          expect(at('calc')).toBe(1)
          expect(at('cOdds')).toBeCloseTo(exorcismOdds(s, a.by, s.taoists[a.by].tile!, a.targets, { pool: poolOf(s, taoistsWith(s, a.by)) }).all, 6)
          cands++
        }
        if (a.type === 'move' && !s.taoists[a.by].underground) {
          expect(at('calc')).toBe(1)
          expect(at('cOdds')).toBeCloseTo(tileOdds(s, a.by, a.to).best.all, 6)
        }
      })
    }
    expect(spaces).toBeGreaterThan(10)
    expect(cands).toBeGreaterThan(0)
  })
})
