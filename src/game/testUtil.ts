// Test helpers: build states, rig the seeded RNG, drive actions.

import type { Action, Response } from './actions'
import { applyAction, createGame } from './engine'
import { freshYang } from './flow'
import { nextInt } from './rng'
import {
  CURSE_DIE,
  DIE_FACES,
  type Color,
  type CurseFace,
  type DieFace,
  type GameConfig,
  type GameState,
  type GhostInstance,
  type GhostRef,
  type SeatKind,
  type TileKind,
} from './types'

export function config(over: Partial<GameConfig> = {}): GameConfig {
  const seats: Record<Color, SeatKind> = { red: 'human', blue: 'human', green: 'human', yellow: 'human' }
  return { difficulty: 'normal', seats, seed: 7, firstPlayer: 'red', ...over }
}

export function game(over: Partial<GameConfig> = {}): GameState {
  return createGame(config(over))
}

/** A clean board: no ghosts, active = `color`, in its Yang phase with nothing pending. */
export function yangFor(s: GameState, color: Color): GameState {
  const x = structuredCloneish(s)
  for (const c of ['red', 'blue', 'green', 'yellow'] as Color[]) x.boards[c].spaces = [null, null, null]
  x.active = color
  x.phase = 'yang'
  x.yang = freshYang()
  x.prompt = null
  x.queue = []
  x.events = []
  return x
}

export function structuredCloneish<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

let uid = 1000
export function putGhost(s: GameState, ref: GhostRef, card: string, extra: Partial<GhostInstance> = {}): GhostInstance {
  const g: GhostInstance = { uid: uid++, card, figure: null, mantra: false, ...extra }
  s.boards[ref.board].spaces[ref.space] = g
  return g
}

/** Rearrange the village so `kind` sits on tile `idx` (swapping with whatever was there). */
export function tileKindAt(s: GameState, idx: number, kind: TileKind): void {
  const j = s.village.findIndex((t) => t.kind === kind)
  if (j < 0) throw new Error(`no ${kind} in this village`)
  const a = s.village[idx]!.kind
  s.village[idx]!.kind = kind
  s.village[j]!.kind = a
}

/** Find an RNG state whose next rolls are exactly these die faces. */
export function rigDice(s: GameState, faces: DieFace[]): void {
  s.rng = findState((rng) => {
    let r = rng
    for (const f of faces) {
      let i: number
      ;[r, i] = nextInt(r, DIE_FACES.length)
      if (DIE_FACES[i] !== f) return false
    }
    return true
  })
}

/** Find an RNG state whose next rolls are these curse faces (and optional die faces after). */
export function rigCurse(s: GameState, faces: CurseFace[]): void {
  s.rng = findState((rng) => {
    let r = rng
    for (const f of faces) {
      let i: number
      ;[r, i] = nextInt(r, CURSE_DIE.length)
      if (CURSE_DIE[i] !== f) return false
    }
    return true
  })
}

function findState(ok: (rng: number) => boolean): number {
  for (let x = 1; x < 5_000_000; x++) {
    const rng = (x * 2654435761) >>> 0
    if (ok(rng)) return rng
  }
  throw new Error('could not rig the RNG')
}

export function act(s: GameState, a: Action): GameState {
  return applyAction(s, a)
}

export function respond(s: GameState, r: Response): GameState {
  if (!s.prompt) throw new Error('no prompt open')
  return applyAction(s, { type: 'respond', by: s.prompt.owner, r })
}

export const ref = (board: Color, space: 0 | 1 | 2): GhostRef => ({ board, space })
