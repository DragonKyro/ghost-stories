// Tao-die roll helper. Same separation as `yinPayload.ts`: random outcome
// generation lives outside the engine; the engine only ever sees the result
// in an action payload.

import type { TaoDieFace } from './types'

const FACES: TaoDieFace[] = ['red', 'green', 'blue', 'yellow', 'wild', 'black']

export function rollTaoDie(): TaoDieFace {
  return FACES[Math.floor(Math.random() * FACES.length)]
}

export function rollTaoDice(n: number): TaoDieFace[] {
  return Array.from({ length: n }, () => rollTaoDie())
}
