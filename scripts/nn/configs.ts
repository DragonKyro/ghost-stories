// Game setups shared by the data generator, the evaluator and the diagnostics.
// (Kept apart from the entry scripts: importing an entry script runs it.)

import type { Color, Difficulty, GameConfig, PowerId, SeatKind } from '@/game/types'
import { COLORS, POWERS_BY_COLOR } from '@/game/types'

/** Training setups: seat = seed % 4, power side = seed / 4 % 2 (red is always the Dance of the Spires solo). */
export function soloConfig(seed: number, difficulty: Difficulty): GameConfig {
  const seat = COLORS[seed % 4]!
  const seats = { red: 'neutral', blue: 'neutral', green: 'neutral', yellow: 'neutral' } as Record<Color, SeatKind>
  seats[seat] = 'ai'
  const powers: Partial<Record<Color, PowerId>> = { [seat]: POWERS_BY_COLOR[seat][Math.floor(seed / 4) % 2] }
  return { difficulty, seats, seed, powers }
}

/** Evaluation setups (the same as scripts/aibench): seat = seed % 4, power sides random. */
export function evalConfig(seed: number, difficulty: Difficulty): GameConfig {
  const seats = { red: 'neutral', blue: 'neutral', green: 'neutral', yellow: 'neutral' } as Record<Color, SeatKind>
  seats[COLORS[seed % 4]!] = 'ai'
  return { difficulty, seats, seed }
}
