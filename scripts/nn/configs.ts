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

/** The seven solo monks: the seat's colour and its board's power (red is always the Dance of the Spires solo). */
export const MONKS: ReadonlyArray<readonly [Color, PowerId]> = [
  ['red', 'danceOfTheSpires'],
  ['blue', 'heavenlyGust'],
  ['blue', 'secondWind'],
  ['green', 'godsFavorite'],
  ['green', 'strengthOfMountain'],
  ['yellow', 'bottomlessPockets'],
  ['yellow', 'enfeeblementMantra'],
]

/** A solo game as this monk (the neutral boards' power sides from the seed). */
export function monkConfig(seed: number, seat: Color, power: PowerId, difficulty: Difficulty = 'normal'): GameConfig {
  const seats = { red: 'neutral', blue: 'neutral', green: 'neutral', yellow: 'neutral' } as Record<Color, SeatKind>
  seats[seat] = 'ai'
  return { difficulty, seats, seed, powers: { [seat]: power } }
}

/** Evaluation setups (the same as scripts/aibench): seat = seed % 4, power sides random. */
export function evalConfig(seed: number, difficulty: Difficulty): GameConfig {
  const seats = { red: 'neutral', blue: 'neutral', green: 'neutral', yellow: 'neutral' } as Record<Color, SeatKind>
  seats[COLORS[seed % 4]!] = 'ai'
  return { difficulty, seats, seed }
}

/**
 * Named evaluation setups, e.g. `norm1`, `init4`, `night3`, `norm4-wm`, `norm3-bs`, `norm4-both`:
 * difficulty (init / norm / night / hell), number of Taoists (1-4: the others are neutral boards),
 * optional expansions. Solo: the seat is seed % 4; 2: red + green or blue + yellow; 3: one neutral.
 */
export function setupConfig(name: string, seed: number): GameConfig {
  const m = /^(init|norm|night|hell)([1-4])(?:-(wm|bs|both))?$/.exec(name)
  if (!m) throw new Error(`unknown setup ${name}`)
  const difficulty = ({ init: 'initiation', norm: 'normal', night: 'nightmare', hell: 'hell' } as const)[m[1] as 'init']
  const n = Number(m[2])
  const all = (k: SeatKind) => ({ red: k, blue: k, green: k, yellow: k }) as Record<Color, SeatKind>
  let seats: Record<Color, SeatKind>
  if (n === 4) seats = all('ai')
  else if (n === 3) seats = { ...all('ai'), [COLORS[seed % 4]!]: 'neutral' }
  else if (n === 2) seats = seed % 2 === 0 ? { red: 'ai', blue: 'neutral', green: 'ai', yellow: 'neutral' } : { red: 'neutral', blue: 'ai', green: 'neutral', yellow: 'ai' }
  else seats = { ...all('neutral'), [COLORS[seed % 4]!]: 'ai' }
  const cfg: GameConfig = { difficulty, seats, seed }
  if (m[3] === 'wm' || m[3] === 'both') cfg.whiteMoon = { portal: 'center', randomTiles: false }
  if (m[3] === 'bs' || m[3] === 'both') cfg.blackSecret = { wuFeng: 'ai', side: 'a' }
  return cfg
}
