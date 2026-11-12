import { describe, expect, it } from 'vitest'
import { allSeats, EXPANSION_CASES, playOut } from './selfplay'

describe('AI self-play with the expansions (fuzz)', () => {
  for (const [name, over] of EXPANSION_CASES) {
    it(`plays to the end without illegal moves: ${name}`, () => {
      for (const seed of [1, 2, 3]) {
        const { s } = playOut({ difficulty: 'normal', seats: allSeats('ai'), seed, ...over })
        expect(s.phase).toBe('gameOver')
      }
    })
  }
})
