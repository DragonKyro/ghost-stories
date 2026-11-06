import { describe, expect, it } from 'vitest'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { GameConfig, GameState, SeatKind, Color } from '@/game/types'
import { chooseAction } from './index'

function playOut(config: GameConfig, maxActions = 4000): { s: GameState; actions: number } {
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

const all = (k: SeatKind): Record<Color, SeatKind> => ({ red: k, blue: k, green: k, yellow: k })

describe('AI self-play (fuzz)', () => {
  const cases: Array<[string, Partial<GameConfig>]> = [
    ['4p normal', {}],
    ['4p initiation', { difficulty: 'initiation' }],
    ['3p nightmare', { difficulty: 'nightmare', seats: { ...all('ai'), yellow: 'neutral' } }],
    ['2p hell', { difficulty: 'hell', seats: { red: 'ai', blue: 'neutral', green: 'ai', yellow: 'neutral' } }],
    ['solo', { seats: { red: 'neutral', blue: 'neutral', green: 'ai', yellow: 'neutral' } }],
    ['white moon', { whiteMoon: { portal: 'center', randomTiles: false } }],
    ['white moon solo corner portal', { whiteMoon: { portal: 'corner', randomTiles: true }, seats: { red: 'ai', blue: 'neutral', green: 'neutral', yellow: 'neutral' } }],
    ['black secret', { blackSecret: { wuFeng: 'ai', side: 'a' } }],
    ['both expansions 3p', { whiteMoon: { portal: 'edge', randomTiles: true }, blackSecret: { wuFeng: 'ai', side: 'b' }, seats: { ...all('ai'), blue: 'neutral' } }],
  ]
  for (const [name, over] of cases) {
    it(`plays to the end without illegal moves: ${name}`, () => {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const { s } = playOut({ difficulty: 'normal', seats: all('ai'), seed, ...over })
        expect(s.phase).toBe('gameOver')
      }
    })
  }

  it('holds out on Initiation', () => {
    let wins = 0
    let turns = 0
    for (let seed = 1; seed <= 20; seed++) {
      const { s } = playOut({ difficulty: 'initiation', seats: all('ai'), seed })
      if (s.outcome?.result === 'win') wins++
      turns += s.turn
    }
    console.log(`AI on Initiation: ${wins}/20 wins, ${(turns / 20).toFixed(1)} turns on average`)
    expect(turns / 20).toBeGreaterThan(25)
  })
})
