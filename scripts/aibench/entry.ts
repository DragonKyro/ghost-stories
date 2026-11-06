// Self-play benchmark entry (bundled by scripts/aibench/bench.mjs).
import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { GameConfig, GameState, SeatKind, Color } from '@/game/types'
import { chooseAction } from '@/ai/index'
import { W as WEIGHTS, SEARCH as LOOKAHEAD_CFG } from '@/ai/tuning'

export type SetupName = 'init4' | 'norm4' | 'init1' | 'norm1' | 'init2' | 'norm2' | 'init3' | 'norm3' | 'night4'

const all = (k: SeatKind): Record<Color, SeatKind> => ({ red: k, blue: k, green: k, yellow: k })
const SOLO_SEATS: Color[] = ['red', 'blue', 'green', 'yellow']

export function configFor(setup: SetupName, seed: number): GameConfig {
  const diff = setup.startsWith('init') ? 'initiation' : setup.startsWith('night') ? 'nightmare' : 'normal'
  const n = Number(setup.slice(-1))
  let seats: Record<Color, SeatKind>
  if (n === 4) seats = all('ai')
  else if (n === 3) seats = { ...all('ai'), [SOLO_SEATS[seed % 4]!]: 'neutral' }
  else if (n === 2) seats = seed % 2 === 0 ? { red: 'ai', blue: 'neutral', green: 'ai', yellow: 'neutral' } : { red: 'neutral', blue: 'ai', green: 'neutral', yellow: 'ai' }
  else seats = { ...all('neutral'), [SOLO_SEATS[seed % 4]!]: 'ai' }
  return { difficulty: diff, seats, seed }
}

export interface Result {
  setup: string
  seed: number
  win: boolean
  reason: string
  turns: number
  drawn: number
  deck0: number
  decisions: number
  totalMs: number
  maxMs: number
  slow: number
}

export function playGame(setup: SetupName, seed: number, overrides?: Record<string, unknown>): Result {
  if (overrides) applyOverrides(overrides)
  let s: GameState = createGame(configFor(setup, seed))
  const deck0 = s.deck.length
  let n = 0
  let totalMs = 0
  let maxMs = 0
  let slow = 0
  while (s.phase !== 'gameOver' && n < 6000) {
    const seat = waitingFor(s)
    if (!seat) throw new Error('stuck')
    const t0 = performance.now()
    const a = chooseAction(s, seat)
    const dt = performance.now() - t0
    totalMs += dt
    if (dt > maxMs) maxMs = dt
    if (dt > 500) slow++
    if (!a) throw new Error('no action')
    s = applyAction(s, a)
    n++
  }
  return {
    setup,
    seed,
    win: s.outcome?.result === 'win',
    reason: s.outcome?.result === 'loss' ? s.outcome.reason : s.outcome?.result ?? 'none',
    turns: s.turn,
    drawn: deck0 - s.deck.length,
    deck0,
    decisions: n,
    totalMs,
    maxMs,
    slow,
  }
}

function applyOverrides(o: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('W.')) (WEIGHTS as Record<string, unknown>)[k.slice(2)] = v
    else if (k.startsWith('S.')) (LOOKAHEAD_CFG as Record<string, unknown>)[k.slice(2)] = v
  }
}

/** Tallies of what happened over a game (for diagnosing the AI). */
export function diagnose(setup: SetupName, seed: number, overrides?: Record<string, unknown>): Record<string, number> {
  if (overrides) applyOverrides(overrides)
  let s: GameState = createGame(configFor(setup, seed))
  const tally: Record<string, number> = {}
  const add = (k: string, n = 1) => (tally[k] = (tally[k] ?? 0) + n)
  let n = 0
  while (s.phase !== 'gameOver' && n < 6000) {
    const seat = waitingFor(s)!
    const a = chooseAction(s, seat)!
    if (a.type === 'help') add(`help:${a.params.kind}`)
    else if (a.type === 'exorcise') add(`exo:${a.targets.length}`)
    else if (a.type !== 'respond') add(`act:${a.type}${a.type === 'yinYang' ? ':' + a.use.kind : ''}`)
    s = applyAction(s, a)
    for (const e of s.events) {
      if (e.kind === 'qi' && e.text.includes('loses')) add(`qi:${e.text.match(/\(([^)]*)\)/)?.[1] ?? '?'}`)
      if (e.kind === 'haunt') add(`haunt:${e.text.split('— ')[1] ?? '?'}`.replace(/^haunt:.*'s haunting$/, 'haunt:haunter'))
      if (e.kind === 'exorcised') add('exorcised')
      if (e.kind === 'fail') add('exoFail')
      if (e.kind === 'arrive') add('arrive')
      if (e.kind === 'death') add('death')
      if (e.kind === 'unhaunt') add('unhaunt')
      if (e.kind === 'incarnation' && e.card) { tally.__inc = 1; (tally as any)['__incId:' + e.card] = 1 }
    }
    n++
  }
  const endName = s.outcome?.result === 'win' ? 'win' : s.outcome?.result === 'loss' ? s.outcome.reason : '?'
  add(`end:${endName}`)
  for (const k of Object.keys(tally)) if (k.startsWith('__incId:')) { add(`inc:${k.slice(8)}:${endName}`); delete tally[k] }
  if (tally.__inc) { add(`reachedInc:${endName}`); delete tally.__inc }
  add('turns', s.turn)
  add('deckLeft', s.deck.length)
  return tally
}

export { WEIGHTS as WEIGHTS_, LOOKAHEAD_CFG as SEARCH_ }
