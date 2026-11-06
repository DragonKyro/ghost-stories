// In-place action application for rollouts.
//
// The engine's applyAction deep-copies the state on every call (so a throw
// leaves the caller's state untouched); in a rollout the AI owns its copy, so
// it can apply actions in place: the same reducer steps, without the copy.
// parts.test.ts checks this stays equivalent to applyAction.

import type { Action } from '@/game/actions'
import { run } from '@/game/flow'
import { applyResponse } from '@/game/respond'
import type { GameState } from '@/game/types'
import { applyYang } from '@/game/yang'

/** Apply `a` to `s` in place (like applyAction, minus the copy). May leave `s` half-changed if it throws. */
export function applyInPlace(s: GameState, a: Action): void {
  if (s.phase === 'gameOver') throw new Error('The game is over.')
  s.events = []
  if (a.type === 'respond') applyResponse(s, a.by, a.r)
  else applyYang(s, a)
  run(s)
}

/** Deep copy of plain JSON-like data (the game state); faster than a JSON round trip. */
export function clone<T>(x: T): T {
  return copy(x) as T
}

function copy(x: unknown): unknown {
  if (x === null || typeof x !== 'object') return x
  if (Array.isArray(x)) {
    const n = x.length
    const out = new Array(n)
    for (let i = 0; i < n; i++) {
      const v = x[i]
      out[i] = v === null || typeof v !== 'object' ? v : copy(v)
    }
    return out
  }
  const out: Record<string, unknown> = {}
  for (const k in x as Record<string, unknown>) {
    const v = (x as Record<string, unknown>)[k]
    if (v === undefined) continue
    out[k] = v === null || typeof v !== 'object' ? v : copy(v)
  }
  return out
}
