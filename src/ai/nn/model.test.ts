import { describe, expect, it } from 'vitest'
import { encodeCandidates } from './candidates'
import { encodeState } from './encode'
import { samplePositions } from './index'
import { legalActions } from './legal'
import { Net, type WeightsFile } from './model'
import { N_OUTCOME, SCHEMA_HASH } from './schema'
import fixtureJson from './fixtures/parity.json'

interface Fixture {
  recipe: { every: number; perGame: number }
  weights: WeightsFile
  expected: Array<{ v: number[]; logits: number[] }>
}
const fixture = fixtureJson as unknown as Fixture

describe('nn model', () => {
  it('matches PyTorch on the parity fixture (regenerate with `npm run nn:parity` after changing the encoder)', () => {
    expect(fixture.weights.schema.hash, 'the encoder changed: run `npm run nn:parity`').toBe(SCHEMA_HASH)
    const net = Net.fromJson(fixture.weights)
    const positions = samplePositions(fixture.recipe.every, fixture.recipe.perGame)
    expect(positions.length).toBe(fixture.expected.length)
    let worst = 0
    positions.forEach(({ s, seat }, i) => {
      const enc = encodeState(s, seat)
      const { actions, heuristic } = legalActions(s, seat)
      const out = net.evaluate(enc, encodeCandidates(s, enc, actions, heuristic))
      const want = fixture.expected[i]!
      expect(out.logits.length).toBe(want.logits.length)
      const diffs = [
        Math.abs(out.valueLogit - want.v[0]!),
        Math.abs(out.progress - 1 / (1 + Math.exp(-want.v[1]!))),
        ...Array.from(out.logits, (z, k) => Math.abs(z - want.logits[k]!)),
      ]
      // Outcome probabilities from PyTorch's outcome logits.
      const zs = want.v.slice(2, 2 + N_OUTCOME)
      const m = Math.max(...zs)
      const sum = zs.reduce((a, z) => a + Math.exp(z - m), 0)
      zs.forEach((z, k) => diffs.push(Math.abs(out.outcome[k]! - Math.exp(z - m) / sum)))
      worst = Math.max(worst, ...diffs)
    })
    expect(worst).toBeLessThan(1e-4)
    // The comparison means something: the outputs vary across candidates and positions.
    const all = fixture.expected.flatMap((e) => e.logits)
    expect(Math.max(...all) - Math.min(...all)).toBeGreaterThan(0.5)
    expect(new Set(fixture.expected.map((e) => e.v[0]!.toFixed(4))).size).toBe(fixture.expected.length)
  })
})
