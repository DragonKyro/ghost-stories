import { describe, expect, it } from 'vitest'
import type { Action } from '@/game/actions'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import { allCards } from '@/game/catalogue'
import { facingTile, isAdjacent } from '@/game/geometry'
import { ALL_SPACES } from '@/game/rules'
import type { Color, GameConfig, GameState, Seat, SeatKind } from '@/game/types'
import { COLORS, CORNER_TILE } from '@/game/types'
import { chooseAction } from '../index'
import { sanitize } from '../sim'
import { SEARCH } from '../tuning'
import { encodeCandidates } from './candidates'
import { encodeState } from './encode'
import { frameFor } from './frame'
import { nnDecide, samplePositions } from './index'
import { actionKey, legalActions, matchKey } from './legal'
import { Net } from './model'
import { CAND, N_TOKENS, SCHEMA_HASH, TOKEN, TOKENS, cardSlot, schemaJson } from './schema'

const all = (k: SeatKind): Record<Color, SeatKind> => ({ red: k, blue: k, green: k, yellow: k })

const CONFIGS: GameConfig[] = [
  ...COLORS.map((c, i): GameConfig => ({ difficulty: 'normal', seats: { ...all('neutral'), [c]: 'ai' }, seed: 11 + i })),
  { difficulty: 'initiation', seats: { ...all('neutral'), red: 'ai', green: 'ai' }, seed: 21 },
  { difficulty: 'hell', seats: all('ai'), seed: 22 },
  { difficulty: 'normal', seats: all('ai'), seed: 23, whiteMoon: { portal: 'center', randomTiles: false } },
  { difficulty: 'normal', seats: { ...all('neutral'), blue: 'ai' }, seed: 24, whiteMoon: { portal: 'corner', randomTiles: true } },
  { difficulty: 'normal', seats: { ...all('ai'), yellow: 'neutral' }, seed: 25, blackSecret: { wuFeng: 'ai', side: 'a' } },
  { difficulty: 'nightmare', seats: { ...all('ai'), red: 'neutral' }, seed: 26, whiteMoon: { portal: 'center', randomTiles: false }, blackSecret: { wuFeng: 'ai', side: 'b' } },
]

/** Every `every`-th decision of quick-policy self-play, with the action the heuristic AI took. */
function positions(every = 3, cap = 80): Array<{ s: GameState; seat: Seat; config: GameConfig; taken: Action }> {
  const on = SEARCH.on
  SEARCH.on = false
  const out: Array<{ s: GameState; seat: Seat; config: GameConfig; taken: Action }> = []
  try {
    for (const config of CONFIGS) {
      let s = createGame(config)
      let n = 0
      for (let i = 0; i < 4000 && s.phase !== 'gameOver' && n < cap; i++) {
        const seat = waitingFor(s)!
        const a = chooseAction(s, seat)!
        if (i % every === 0 && seat !== 'wufeng') {
          out.push({ s, seat, config, taken: a })
          n++
        }
        s = applyAction(s, a)
      }
    }
  } finally {
    SEARCH.on = on
  }
  return out
}

const POSITIONS = positions()

function fieldAt(L: (typeof TOKENS)[number]['layout'], off: number): string {
  for (const [name, f] of Object.entries(L.fields)) if (off >= f.off && off < f.off + f.n) return `${name}[${off - f.off}]`
  return String(off)
}


describe('nn schema', () => {
  it('lays out every token type and fits every ghost card', () => {
    const j = schemaJson()
    expect(j.hash).toBe(SCHEMA_HASH)
    expect(j.nTokens).toBe(N_TOKENS)
    expect(TOKENS.map((t) => t.type)).toEqual(['global', 'prompt', 'seat', 'tile', 'space', 'family', 'catacomb', 'demon', 'curse', 'mantra'])
    for (const t of TOKENS) expect(t.layout.size).toBeGreaterThan(5)
    const slots = new Set(allCards().map((c) => cardSlot(c.id)))
    expect(slots.size).toBe(allCards().length)
    expect(cardSlot('skeleton')).not.toBe(cardSlot('bones'))
    expect(cardSlot('summon-1')).toBe(cardSlot('summon-2'))
  })
})

describe('nn frame', () => {
  it('puts the deciding Taoist at seat 0 and keeps the table geometry', () => {
    for (const me of COLORS) {
      const f = frameFor(me)
      expect(f.seat(me)).toBe(0)
      // Turn order (clockwise) is kept: the next board to play is seat 1.
      expect(f.seat(COLORS[(COLORS.indexOf(me) + 1) % 4]!)).toBe(1)
      for (const c of COLORS) expect(f.colorAt(f.seat(c))).toBe(c)
      expect(f.tao('black')).toBe(4)
      expect(new Set(Array.from({ length: 9 }, (_, t) => f.tile(t))).size).toBe(9)
      for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) expect(isAdjacent(f.tile(a), f.tile(b))).toBe(isAdjacent(a, b))
      expect(f.tile(4)).toBe(4)
      const spaces = new Set(ALL_SPACES.map((r) => f.space(r)))
      expect(spaces.size).toBe(12)
      for (const ref of ALL_SPACES) {
        const slot = f.space(ref)
        expect(Math.floor(slot / 3)).toBe(f.seat(ref.board))
        // In the canonical frame, seat i's board sits where COLORS[i]'s does on the real table.
        const canonical = { board: COLORS[Math.floor(slot / 3)]!, space: (slot % 3) as 0 | 1 | 2 }
        expect(facingTile(canonical)).toBe(f.tile(facingTile(ref)))
      }
      for (const c of ['nw', 'ne', 'sw', 'se'] as const) {
        const canonical = (['nw', 'ne', 'sw', 'se'] as const)[f.corner(c)]!
        expect(CORNER_TILE[canonical]).toBe(f.tile(CORNER_TILE[c]))
      }
    }
  })
})

describe('nn encoder', () => {
  it('encodes every position: finite, bounded, the right tokens present', () => {
    expect(POSITIONS.length).toBeGreaterThan(200)
    let bad = 0
    let max = 0
    for (const { s, seat } of POSITIONS) {
      const enc = encodeState(s, seat)
      expect(enc.frame.seat(enc.seat)).toBe(0)
      for (const t of TOKENS) {
        for (const v of enc.x[t.type]) {
          if (!Number.isFinite(v) || v < -1e-6) bad++
          max = Math.max(max, v)
        }
      }
      const count = (type: keyof typeof TOKEN) => enc.present.subarray(TOKEN[type].start, TOKEN[type].start + TOKEN[type].slots).reduce((n, x) => n + x, 0)
      expect(count('global') + count('prompt') + count('seat') + count('tile') + count('space')).toBe(27)
      expect(count('family')).toBe(s.whiteMoon ? 12 : 0)
      expect(count('catacomb')).toBe(s.blackSecret ? 9 : 0)
      // Relations only between present tokens, symmetric.
      for (let a = 0; a < N_TOKENS; a++) {
        for (let b = 0; b < N_TOKENS; b++) {
          const r = enc.rel[a * N_TOKENS + b]!
          if ((r && !(enc.present[a] && enc.present[b])) || enc.rel[b * N_TOKENS + a] !== r) bad++
        }
      }
    }
    expect(bad).toBe(0)
    expect(max).toBeLessThanOrEqual(6)
  })

  it('sees only public information: re-dealing what is hidden changes nothing', () => {
    let checked = 0
    for (const { s, seat } of POSITIONS.filter((_, i) => i % 2 === 0)) {
      const base = encodeState(s, seat)
      for (const seed of [1, 2]) {
        const other = encodeState(sanitize(s, seed * 7919 + checked), seat)
        for (const t of TOKENS) {
          const i = other.x[t.type].findIndex((v, k) => v !== base.x[t.type][k])
          if (i >= 0) throw new Error(`${s.prompt?.kind ?? s.phase} ${t.type} field ${fieldAt(t.layout, i % t.layout.size)} differs after a re-deal`)
        }
        expect(other.present.every((v, k) => v === base.present[k])).toBe(true)
        expect(other.rel.every((v, k) => v === base.rel[k])).toBe(true)
      }
      checked++
    }
    expect(checked).toBeGreaterThan(100)
  })

  it('reads the state, not the frame: a ghost moved to another board changes that board only', () => {
    const { s, seat } = POSITIONS.find((p) => p.s.boards.red.spaces.some(Boolean))!
    const enc = encodeState(s, seat)
    const f = enc.frame
    const ref = ALL_SPACES.find((r) => r.board === 'red' && s.boards.red.spaces[r.space])!
    const L = TOKEN.space.layout
    const row = f.space(ref) * L.size
    expect(enc.x.space[row + L.field('g.present').off]).toBe(1)
  })
})

describe('nn legal actions', () => {
  it('lists only legal actions, and every action the heuristic AI took', () => {
    const missing: string[] = []
    let total = 0
    let decisions = 0
    for (const { s, seat, taken } of POSITIONS) {
      const { actions, heuristic } = legalActions(s, seat)
      expect(actions.length).toBeGreaterThan(0)
      decisions++
      total += actions.length
      // Legal by the real engine (applyAction copies the state and throws on anything illegal).
      for (const a of actions.slice(0, 40)) expect(() => applyAction(s, a)).not.toThrow()
      if (!heuristic) {
        const keys = new Set(actions.map(matchKey))
        if (!keys.has(matchKey(taken))) missing.push(`${s.prompt?.kind ?? 'yang'}: ${JSON.stringify(taken)}`)
      }
      expect(new Set(actions.map(actionKey)).size).toBe(actions.length)
    }
    expect(missing).toEqual([])
    expect(total / decisions).toBeGreaterThan(3)
  })

  it('opens up the whole action space (counts per decision kind)', () => {
    const by = new Map<string, number[]>()
    for (const { s, seat } of POSITIONS) {
      const k = s.prompt?.kind ?? 'yang'
      const arr = by.get(k) ?? []
      arr.push(legalActions(s, seat).actions.length)
      by.set(k, arr)
    }
    const yang = by.get('yang')!
    expect(Math.max(...yang)).toBeGreaterThan(15)
    expect(by.get('placeGhost')?.length ?? 0).toBeGreaterThan(5)
  })
})

describe('nn candidates and model', () => {
  const net = Net.random({ d: 32, heads: 4, layers: 2, ff: 64 }, 5)

  it('points candidates only at tokens that are there', () => {
    for (const { s, seat } of POSITIONS.filter((_, i) => i % 3 === 0)) {
      const enc = encodeState(s, seat)
      const { actions, heuristic } = legalActions(s, seat)
      const c = encodeCandidates(s, enc, actions, heuristic)
      expect(c.feat.length).toBe(actions.length * CAND.size)
      expect(c.feat.every((v) => Number.isFinite(v))).toBe(true)
      expect(c.ptr.every((p) => p < 0 || enc.present[p] === 1)).toBe(true)
    }
  })

  it('scores every position: a probability per legal action, a win probability', () => {
    for (const { s, seat } of POSITIONS.filter((_, i) => i % 4 === 0)) {
      const d = nnDecide(net, s, seat)!
      expect(d.probs.length).toBe(d.actions.length)
      expect(d.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4)
      expect(d.out.value).toBeGreaterThan(0)
      expect(d.out.value).toBeLessThan(1)
      expect(d.out.outcome.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4)
      // Deterministic.
      expect(nnDecide(net, s, seat)!.out.logits).toEqual(d.out.logits)
    }
  })

  it('round-trips weights through JSON', () => {
    const again = Net.fromJson(JSON.parse(JSON.stringify(net.toJson())))
    const { s, seat } = samplePositions(5, 1)[0]!
    expect(nnDecide(again, s, seat)!.out.logits).toEqual(nnDecide(net, s, seat)!.out.logits)
  })

  it('is quick: encoding, enumeration and a forward pass (solo Normal)', () => {
    const solo = POSITIONS.filter((p) => p.config.difficulty === 'normal' && !p.config.whiteMoon && !p.config.blackSecret)
    const big = Net.random({ d: 64, heads: 4, layers: 3, ff: 128 }, 9)
    const t0 = performance.now()
    for (const { s, seat } of solo) nnDecide(big, s, seat)
    const ms = (performance.now() - t0) / solo.length
    expect(ms).toBeLessThan(40)
  })
})
