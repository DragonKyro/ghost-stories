// The heuristic AI. Pure: no React, no stores.
//
//   chooseAction(state, seat) → the next Action for `seat`, or null when the
//   game isn't waiting on that seat.
//
// One call returns one step; the driver calls again after applying it.

import type { Action } from '@/game/actions'
import { waitingFor } from '@/game/engine'
import type { GameState, Seat } from '@/game/types'
import { answerPrompt } from './prompts'
import { answerWuFeng } from './wufeng'
import { taoistYang } from './taoist'

export function chooseAction(s: GameState, seat: Seat): Action | null {
  if (waitingFor(s) !== seat) return null
  if (s.prompt) {
    const r = seat === 'wufeng' ? answerWuFeng(s, s.prompt) : answerPrompt(s, s.prompt)
    return { type: 'respond', by: seat, r }
  }
  if (seat === 'wufeng') return null
  return taoistYang(s, seat)
}

/** A safe fallback when an AI choice turns out to be illegal: the simplest legal answer. */
export function fallbackAction(s: GameState, seat: Seat): Action | null {
  const p = s.prompt
  if (!p) return s.phase === 'yang' && seat !== 'wufeng' ? { type: 'endTurn', by: seat } : null
  switch (p.kind) {
    case 'placeGhost':
      return { type: 'respond', by: seat, r: { kind: 'placeGhost', ref: p.options[0]! } }
    case 'exorcism':
      return p.roll.mode === 'exorcism' || p.roll.mode === 'demon'
        ? null
        : { type: 'respond', by: seat, r: { kind: 'commit', spend: [], crystals: [], exorcise: [], demons: [] } }
    case 'suLing':
      return { type: 'respond', by: seat, r: { kind: 'suLing', ref: null } }
    case 'barrier':
      return { type: 'respond', by: seat, r: { kind: 'barrier', choice: 'pass' } }
    case 'wuFengDemon':
      return { type: 'respond', by: seat, r: { kind: 'wuFengDemon', choice: { kind: 'pass' } } }
    case 'wuFengShadow':
      return { type: 'respond', by: seat, r: { kind: 'wuFengShadow', choice: { kind: 'pass' } } }
    case 'wuFengFreeCurse':
      return { type: 'respond', by: seat, r: { kind: 'wuFengFreeCurse', token: null, slot: 0 } }
    default:
      return null
  }
}
