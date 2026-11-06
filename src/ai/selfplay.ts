// Self-play helpers for the AI tests (no test code here, so test files can share it).

import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { Color, GameConfig, GameState, SeatKind } from '@/game/types'
import { chooseAction } from './index'

export const allSeats = (k: SeatKind): Record<Color, SeatKind> => ({ red: k, blue: k, green: k, yellow: k })

/** Play a whole game with the AI on every seat; throws on an illegal or missing action. */
export function playOut(config: GameConfig, maxActions = 6000): { s: GameState; actions: number } {
  let s = createGame(config)
  let n = 0
  while (s.phase !== 'gameOver' && n < maxActions) {
    const seat = waitingFor(s)
    if (!seat) throw new Error(`stuck: phase=${s.phase} queue=${s.queue.length}`)
    const a = chooseAction(s, seat)
    if (!a) throw new Error(`AI returned nothing for ${seat} (${s.prompt?.kind ?? s.phase})`)
    try {
      s = applyAction(s, a)
    } catch (e) {
      throw new Error(`illegal AI action ${JSON.stringify(a)} at turn ${s.turn}: ${(e as Error).message}\nprompt=${JSON.stringify(s.prompt)}`)
    }
    n++
  }
  return { s, actions: n }
}

export type FuzzCase = [string, Partial<GameConfig>]

export const BASE_CASES: FuzzCase[] = [
  ['4p normal', {}],
  ['4p initiation', { difficulty: 'initiation' }],
  ['3p nightmare', { difficulty: 'nightmare', seats: { ...allSeats('ai'), yellow: 'neutral' } }],
  ['2p hell', { difficulty: 'hell', seats: { red: 'ai', blue: 'neutral', green: 'ai', yellow: 'neutral' } }],
  ['solo', { seats: { red: 'neutral', blue: 'neutral', green: 'ai', yellow: 'neutral' } }],
]

export const EXPANSION_CASES: FuzzCase[] = [
  ['white moon', { whiteMoon: { portal: 'center', randomTiles: false } }],
  ['white moon solo corner portal', { whiteMoon: { portal: 'corner', randomTiles: true }, seats: { red: 'ai', blue: 'neutral', green: 'neutral', yellow: 'neutral' } }],
  ['black secret', { blackSecret: { wuFeng: 'ai', side: 'a' } }],
  ['both expansions 3p', { whiteMoon: { portal: 'edge', randomTiles: true }, blackSecret: { wuFeng: 'ai', side: 'b' }, seats: { ...allSeats('ai'), blue: 'neutral' } }],
]
