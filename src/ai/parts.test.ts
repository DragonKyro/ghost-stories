import { describe, expect, it } from 'vitest'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import { bestCommit, cheapestSpend, covers, requirementsFor, spendersFor } from '@/game/exorcism'
import { ghostsInPlay, taoBlocked, whiteIsWild } from '@/game/rules'
import type { Color, DieFace, ExorcismRoll, GameConfig, GameState, GhostRef, SeatKind, TaoColor } from '@/game/types'
import { DIE_FACES, TAO_COLORS } from '@/game/types'
import { applyInPlace, clone } from './fast'
import { aiRandom, poolAt } from './eval'
import { chooseAction } from './index'
import { exorcismChance } from './prob'
import { sanitize } from './sim'
import { SEARCH } from './tuning'

const all = (k: SeatKind): Record<Color, SeatKind> => ({ red: k, blue: k, green: k, yellow: k })

/** Positions from quick-policy self-play, for testing the helpers on realistic states. */
function positions(config: GameConfig, every = 3): GameState[] {
  const on = SEARCH.on
  SEARCH.on = false
  const out: GameState[] = []
  try {
    let s = createGame(config)
    for (let i = 0; i < 400 && s.phase !== 'gameOver'; i++) {
      if (i % every === 0) out.push(s)
      s = applyAction(s, chooseAction(s, waitingFor(s)!)!)
    }
  } finally {
    SEARCH.on = on
  }
  return out
}

/**
 * Reference: the fewest tokens + crystals that exorcise `refs`, trying every
 * multiset of individual tokens (slow; fine for the small hands of self-play).
 */
function bruteCost(s: GameState, roll: ExorcismRoll, refs: GhostRef[]): number | null {
  const reqs = requirementsFor(s, roll, refs, [])
  const wild = whiteIsWild(s)
  const spenders = spendersFor(s, roll)
  const have = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
  let crystals = 0
  for (const c of spenders) {
    if (!taoBlocked(s)) for (const col of TAO_COLORS) have[col] += s.taoists[c].tao[col]
    crystals += s.whiteMoon ? s.taoists[c].crystals : 0
  }
  let best: number | null = null
  const v = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
  const rec = (i: number, used: number): void => {
    if (i === TAO_COLORS.length) {
      for (let j = 0; j <= crystals; j++) {
        if (best !== null && used + j >= best) return
        if (covers(reqs, roll.dice, wild, v, j)) {
          best = used + j
          return
        }
      }
      return
    }
    const col: TaoColor = TAO_COLORS[i]!
    for (let x = 0; x <= have[col]; x++) {
      v[col] = x
      rec(i + 1, used + x)
    }
    v[col] = 0
  }
  rec(0, 0)
  return best
}

describe('AI helpers', () => {
  it("the engine's cheapest spend matches a brute-force search over individual tokens", () => {
    const rand = aiRandom(7)
    let checked = 0
    for (const seed of [11, 12, 13]) {
      for (const s of positions({ difficulty: 'initiation', seats: all('ai'), seed })) {
        const ghosts = ghostsInPlay(s)
        if (ghosts.length < 2) continue
        const actor = (['red', 'blue', 'green', 'yellow'] as Color[]).find((c) => s.taoists[c].alive)
        if (!actor) continue
        const a = ghosts[Math.floor(rand() * ghosts.length)]!.ref
        const b = ghosts[Math.floor(rand() * ghosts.length)]!.ref
        const targets: GhostRef[] = a.board === b.board && a.space === b.space ? [a] : [a, b]
        const dice: DieFace[] = Array.from({ length: 3 }, () => DIE_FACES[Math.floor(rand() * 6)]!)
        const roll: ExorcismRoll = { mode: 'exorcism', actor, targets, demons: [], dice, canReroll: false }
        for (const refs of [targets, ...(targets.length === 2 ? [[targets[0]!], [targets[1]!]] : [])]) {
          const plan = cheapestSpend(s, roll, refs)
          const brute = bruteCost(s, roll, refs)
          expect(plan ? plan.spend.length + plan.crystals.length : null).toBe(brute)
          if (plan) {
            const v = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
            for (const x of plan.spend) v[x.color]++
            expect(covers(requirementsFor(s, roll, refs, []), dice, whiteIsWild(s), v, plan.crystals.length)).toBe(true)
          }
        }
        const best = bestCommit(s, roll)
        expect(best.exorcise.length).toBe(targets.some((r) => bruteCost(s, roll, [r]) !== null) ? (bruteCost(s, roll, targets) !== null ? targets.length : 1) : 0)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  it('a commit is found at once when the Taoists hoard Tao', () => {
    const s = positions({ difficulty: 'initiation', seats: all('ai'), seed: 11 }).find((x) => ghostsInPlay(x).length >= 2)!
    const actor = (['red', 'blue', 'green', 'yellow'] as Color[]).find((c) => s.taoists[c].alive)!
    for (const c of ['red', 'blue', 'green', 'yellow'] as Color[]) s.taoists[c].tao = { red: 9, blue: 9, green: 9, yellow: 9, black: 9 }
    const targets = ghostsInPlay(s).slice(0, 2).map((g) => g.ref)
    const roll: ExorcismRoll = { mode: 'exorcism', actor, targets, demons: [], dice: ['white'], canReroll: false }
    const t0 = performance.now()
    const best = bestCommit(s, roll)
    expect(performance.now() - t0).toBeLessThan(200)
    expect(best.exorcise.length).toBe(2)
  })

  it('exact exorcism odds match a Monte Carlo estimate', () => {
    const rand = aiRandom(3)
    const s = positions({ difficulty: 'initiation', seats: all('ai'), seed: 21 }, 7).find((x) => ghostsInPlay(x).length >= 2)!
    const actor = (['red', 'blue', 'green', 'yellow'] as Color[]).find((c) => s.taoists[c].alive)!
    for (const g of ghostsInPlay(s).slice(0, 3)) {
      const p = exorcismChance(s, actor, s.taoists[actor].tile!, [g.ref], 3, false)
      const roll: ExorcismRoll = { mode: 'exorcism', actor, targets: [g.ref], demons: [], dice: [], canReroll: false }
      const reqs = requirementsFor(s, roll, [g.ref], [])
      const { tokens, crystals } = poolAt(s, actor, s.taoists[actor].tile!)
      let ok = 0
      const N = 4000
      for (let i = 0; i < N; i++) {
        const dice = Array.from({ length: 3 }, () => DIE_FACES[Math.floor(rand() * 6)]!)
        if (covers(reqs, dice, whiteIsWild(s), tokens, crystals)) ok++
      }
      expect(Math.abs(p - ok / N)).toBeLessThan(0.03)
    }
  })

  it('sanitize keeps public information and re-deals only hidden cards', () => {
    for (const config of [
      { difficulty: 'normal', seats: all('ai'), seed: 5 },
      { difficulty: 'nightmare', seats: { ...all('ai'), blue: 'neutral' }, seed: 6 },
      { difficulty: 'normal', seats: all('ai'), seed: 7, blackSecret: { wuFeng: 'ai', side: 'a' } },
    ] as GameConfig[]) {
      const s = positions(config, 9)[3]!
      const x = sanitize(s, 99)
      expect(x.deck.length).toBe(s.deck.length)
      // Incarnation / summon positions are public and stay put.
      s.deck.forEach((id, i) => expect(id.startsWith('wf-') || id.startsWith('summon-')).toBe(x.deck[i]!.startsWith('wf-') || x.deck[i]!.startsWith('summon-')))
      // Nothing seen (discarded or in play) comes back into the deck.
      const seen = new Set([...s.discard, ...ghostsInPlay(s).map((g) => g.ghost.card)])
      for (const id of x.deck) expect(seen.has(id)).toBe(false)
      expect(new Set(x.deck).size).toBe(x.deck.length)
      expect(x.boards).toEqual(s.boards)
      expect(x.taoists).toEqual(s.taoists)
      expect(x.village).toEqual(s.village)
      expect(x.rng).not.toBe(s.rng)
    }
  })

  it('applyInPlace matches applyAction', () => {
    for (const config of [
      { difficulty: 'initiation', seats: all('ai'), seed: 31 },
      { difficulty: 'normal', seats: { ...all('neutral'), green: 'ai' }, seed: 32 },
      { difficulty: 'normal', seats: all('ai'), seed: 33, whiteMoon: { portal: 'center', randomTiles: false } },
      { difficulty: 'normal', seats: all('ai'), seed: 34, blackSecret: { wuFeng: 'ai', side: 'a' } },
    ] as GameConfig[]) {
      const on = SEARCH.on
      SEARCH.on = false
      try {
        let s = createGame(config)
        const mine = clone(s)
        for (let i = 0; i < 300 && s.phase !== 'gameOver'; i++) {
          const a = chooseAction(s, waitingFor(s)!)!
          s = applyAction(s, a)
          applyInPlace(mine, a)
          expect(JSON.stringify(mine)).toBe(JSON.stringify(s))
        }
      } finally {
        SEARCH.on = on
      }
    }
  })
})
