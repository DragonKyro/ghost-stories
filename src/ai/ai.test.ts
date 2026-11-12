import { describe, expect, it } from 'vitest'
import { allSeats, BASE_CASES, playOut } from './selfplay'

// AI self-play must reach the end of the game without an illegal action.
// (Expansions: ai.expansions.test.ts; strength: ai.strength.test.ts — separate
// files so vitest runs them in parallel.)
describe('AI self-play (fuzz)', () => {
  for (const [name, over] of BASE_CASES) {
    it(`plays to the end without illegal moves: ${name}`, () => {
      for (const seed of [1, 2, 3]) {
        const { s } = playOut({ difficulty: 'normal', seats: allSeats('ai'), seed, ...over })
        expect(s.phase).toBe('gameOver')
      }
    })
  }
})
