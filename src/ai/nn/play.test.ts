// The shipped network (src/ai/nn/weights) sampling its policy: where the game
// uses it (networkPlays), and that it stays legal in every other setup too (it
// is generic over player counts, difficulties and the expansions, just not
// trained for them; Wu-Feng is always the rules-based AI). Every action it
// picks must be legal, and games must finish.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { chooseAction } from '../index'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { Color, GameConfig, SeatKind } from '@/game/types'
import { COLORS, POWERS_BY_COLOR } from '@/game/types'
import { networkPlays, nnDecide, nnSampleAction, sampleIndex } from './index'
import { Net, type WeightsFile } from './model'
import { SCHEMA_HASH } from './schema'

const weights = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/ai/nn/weights/ghost-net-v1.json'), 'utf8')) as WeightsFile
const net = Net.fromJson(weights)

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

const all = (k: SeatKind): Record<Color, SeatKind> => ({ red: k, blue: k, green: k, yellow: k })

/** Plays a whole game with the AI; returns the final state and how many decisions each side made. */
function play(config: GameConfig, seed: number, maxSteps = 4000) {
  const rand = rng(seed)
  let s = createGame(config)
  let nn = 0
  let wf = 0
  for (let i = 0; i < maxSteps && s.phase !== 'gameOver'; i++) {
    const seat = waitingFor(s)!
    const a = seat === 'wufeng' ? chooseAction(s, seat) : nnSampleAction(net, s, seat, rand)
    expect(a, `no action for ${seat} (${s.prompt?.kind ?? s.phase})`).not.toBeNull()
    seat === 'wufeng' ? wf++ : nn++
    s = applyAction(s, a!) // throws if the action is illegal
  }
  return { s, nn, wf }
}

describe('where the network plays', () => {
  const solo = (difficulty: GameConfig['difficulty'], extra: Partial<GameConfig> = {}): GameConfig => ({ difficulty, seats: { ...all('neutral'), red: 'ai' }, seed: 1, ...extra })
  it('is solo, base game, Initiation or Normal; everything else is the rules-based AI', () => {
    expect(networkPlays(createGame(solo('initiation')))).toBe(true)
    expect(networkPlays(createGame(solo('normal')))).toBe(true)
    expect(networkPlays(createGame(solo('nightmare')))).toBe(false)
    expect(networkPlays(createGame(solo('hell')))).toBe(false)
    expect(networkPlays(createGame(solo('normal', { whiteMoon: { portal: 'center', randomTiles: false } })))).toBe(false)
    expect(networkPlays(createGame(solo('normal', { blackSecret: { wuFeng: 'ai', side: 'a' } })))).toBe(false)
    expect(networkPlays(createGame({ difficulty: 'normal', seats: { ...all('neutral'), red: 'ai', green: 'ai' }, seed: 1 }))).toBe(false)
    expect(networkPlays(createGame({ difficulty: 'normal', seats: all('ai'), seed: 1 }))).toBe(false)
  })
})

describe('the shipped network', () => {
  it('was trained on this encoder', () => {
    expect(weights.schema.hash, 'the encoder changed: the weights need retraining').toBe(SCHEMA_HASH)
    expect(weights.config).toEqual({ d: 64, heads: 4, layers: 3, ff: 128 })
  })

  it('plays whole solo games legally, as every monk', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const seat = COLORS[seed % 4]!
      const config: GameConfig = { difficulty: 'normal', seats: { ...all('neutral'), [seat]: 'ai' }, seed }
      const { s, nn } = play(config, seed)
      expect(s.phase).toBe('gameOver')
      expect(nn).toBeGreaterThan(20)
    }
  }, 60_000)

  it('plays other difficulties and player counts legally', () => {
    const configs: GameConfig[] = [
      { difficulty: 'initiation', seats: { ...all('neutral'), blue: 'ai' }, seed: 11 },
      { difficulty: 'hell', seats: { ...all('neutral'), yellow: 'ai' }, seed: 12 },
      { difficulty: 'normal', seats: { red: 'ai', blue: 'neutral', green: 'ai', yellow: 'neutral' }, seed: 13 },
      { difficulty: 'nightmare', seats: { ...all('ai'), green: 'neutral' }, seed: 14 },
      { difficulty: 'initiation', seats: all('ai'), seed: 15 },
    ]
    for (const [i, config] of configs.entries()) expect(play(config, i + 1).s.phase).toBe('gameOver')
  }, 120_000)

  it('plays White Moon and Black Secret legally (Wu-Feng on the rules-based AI)', () => {
    const wm = play({ difficulty: 'normal', seats: { ...all('neutral'), red: 'ai' }, seed: 21, whiteMoon: { portal: 'center', randomTiles: false } }, 1)
    expect(wm.s.phase).toBe('gameOver')
    const bs = play({ difficulty: 'normal', seats: { ...all('ai'), yellow: 'neutral' }, seed: 22, blackSecret: { wuFeng: 'ai', side: 'a' } }, 2)
    expect(bs.s.phase).toBe('gameOver')
    expect(bs.wf).toBeGreaterThan(0)
    const both = play({ difficulty: 'normal', seats: { ...all('neutral'), blue: 'ai' }, seed: 23, whiteMoon: { portal: 'corner', randomTiles: true }, blackSecret: { wuFeng: 'ai', side: 'b' } }, 3)
    expect(both.s.phase).toBe('gameOver')
  }, 240_000)

  it('keeps to the rules when asked in any order: the options it scores are all legal', () => {
    const config: GameConfig = { difficulty: 'normal', seats: { ...all('neutral'), green: 'ai' }, seed: 31 }
    const rand = rng(5)
    let s = createGame(config)
    for (let i = 0; i < 80 && s.phase !== 'gameOver'; i++) {
      const seat = waitingFor(s)!
      const d = nnDecide(net, s, seat)!
      expect(d.probs.length).toBe(d.actions.length)
      expect(d.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4)
      s = applyAction(s, d.actions[sampleIndex(d.probs, rand)]!)
    }
  })
})

// Every weights file the game can load: the shared network and any monk specialists
// (src/ai/nn/weights/<seat>-<power>.json, from training/specialists.py).
const WEIGHTS_DIR = path.resolve(process.cwd(), 'src/ai/nn/weights')
const files = fs.readdirSync(WEIGHTS_DIR).filter((f) => f.endsWith('.json'))

describe('weights files', () => {
  it('include the shared network', () => {
    expect(files).toContain('ghost-net-v1.json')
  })
  for (const f of files.filter((x) => x !== 'ghost-net-v1.json')) {
    it(`${f}: a specialist for a real monk, on this encoder, playing a legal game as that monk`, () => {
      const m = /^(red|blue|green|yellow)-([A-Za-z]+)\.json$/.exec(f)
      expect(m, 'specialists are named <seat>-<power>.json').not.toBeNull()
      const [seat, power] = [m![1] as Color, m![2]!]
      expect(POWERS_BY_COLOR[seat] as readonly string[]).toContain(power)
      const w = JSON.parse(fs.readFileSync(path.join(WEIGHTS_DIR, f), 'utf8')) as WeightsFile
      expect(w.schema.hash, `${f} was trained on another encoder`).toBe(SCHEMA_HASH)
      const spec = Net.fromJson(w)
      const config: GameConfig = { difficulty: 'normal', seats: { ...all('neutral'), [seat]: 'ai' }, seed: 41, powers: { [seat]: power as never } }
      const rand = rng(41)
      let s = createGame(config)
      for (let i = 0; i < 4000 && s.phase !== 'gameOver'; i++) s = applyAction(s, nnSampleAction(spec, s, waitingFor(s)!, rand)!)
      expect(s.phase).toBe('gameOver')
    }, 60_000)
  }
})

describe('sampleIndex', () => {
  it('draws in proportion to the probabilities, sharper at low temperature', () => {
    const probs = [0.6, 0.3, 0.1]
    const rand = rng(9)
    const count = (t: number) => {
      const c = [0, 0, 0]
      for (let i = 0; i < 20000; i++) c[sampleIndex(probs, rand, t)]!++
      return c.map((x) => x / 20000)
    }
    const plain = count(1)
    expect(plain[0]).toBeCloseTo(0.6, 1)
    expect(plain[2]).toBeCloseTo(0.1, 1)
    const sharp = count(0.5)
    expect(sharp[0]).toBeGreaterThan(plain[0]!)
    expect(sharp[2]).toBeLessThan(plain[2]!)
  })

  it('is deterministic for a given random source, and never out of range', () => {
    const probs = [0.25, 0.25, 0.25, 0.25]
    expect(sampleIndex(probs, () => 0)).toBe(0)
    expect(sampleIndex(probs, () => 0.999999)).toBe(3)
    expect(sampleIndex([1], () => 0.5)).toBe(0)
  })
})
