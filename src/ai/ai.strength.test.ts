import { describe, expect, it } from 'vitest'
import { allSeats, playOut } from './selfplay'

// The original heuristic AI won ~0.5% of 4-AI Initiation games and lasted
// 28.7 turns on average; this AI wins ~12% and lasts ~38 turns
// (scripts/aibench/bench.mjs over hundreds of seeds). A small, fixed sample:
describe('AI strength', () => {
  it('holds out on Initiation (4 AI seats)', () => {
    let wins = 0
    let turns = 0
    const N = 12
    for (let seed = 1; seed <= N; seed++) {
      const { s } = playOut({ difficulty: 'initiation', seats: allSeats('ai'), seed })
      if (s.outcome?.result === 'win') wins++
      turns += s.turn
    }
    console.log(`AI on Initiation: ${wins}/${N} wins, ${(turns / N).toFixed(1)} turns on average`)
    // Too few games to assert on wins; the original AI averaged 28.7 turns here.
    expect(turns / N).toBeGreaterThan(33)
  })
})
