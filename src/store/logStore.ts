// Event log. Populated as a side-effect of every successful dispatch via
// `recordAction(prev, action, next)`. Stays out of GameState so the engine
// remains deterministic.

import { create } from 'zustand'
import type { Action } from '@/game/actions'
import type { GameState } from '@/game/types'

export type LogEntry = {
  at: number
  kind: string
  text: string
  // Color stripe in the UI — usually the acting Taoist's color.
  color?: 'red' | 'blue' | 'green' | 'yellow'
}

type LogStore = {
  entries: LogEntry[]
  append: (entry: Omit<LogEntry, 'at'>) => void
  recordAction: (prev: GameState, action: Action, next: GameState) => void
  clear: () => void
}

export const useLogStore = create<LogStore>((set) => ({
  entries: [],
  append: (entry) =>
    set((s) => ({ entries: [...s.entries, { ...entry, at: Date.now() }] })),
  clear: () => set({ entries: [] }),

  recordAction: (prev, action, next) => {
    const entries: Array<Omit<LogEntry, 'at'>> = []
    const actorColor =
      'taoistId' in action && typeof action.taoistId === 'string'
        ? (action.taoistId.replace('taoist-', '') as 'red' | 'blue' | 'green' | 'yellow')
        : (prev.activeBoard as 'red' | 'blue' | 'green' | 'yellow')

    switch (action.type) {
      case 'startTurn': {
        const arrival = action.payload.arrival
        entries.push({
          kind: 'turnStart',
          color: prev.activeBoard as 'red' | 'blue' | 'green' | 'yellow',
          text: `── ${prev.activeBoard} turn ──`,
        })
        if (arrival) {
          entries.push({
            kind: 'ghostArrived',
            color: arrival.targetBoard as 'red' | 'blue' | 'green' | 'yellow',
            text: `Ghost arrived: ${arrival.cardId} → ${arrival.targetBoard}/${arrival.targetSpace}`,
          })
        }
        if (action.payload.tormentorCurseRolls.length > 0) {
          entries.push({
            kind: 'curseDie',
            color: prev.activeBoard as 'red' | 'blue' | 'green' | 'yellow',
            text: `Curse die: ${action.payload.tormentorCurseRolls.join(', ')}`,
          })
        }
        if (next.hauntedCount > prev.hauntedCount) {
          entries.push({
            kind: 'haunted',
            text: `Tile haunted (${next.hauntedCount}/3)`,
          })
        }
        break
      }
      case 'moveTaoist':
        entries.push({ kind: 'move', color: actorColor, text: `${actorColor} moved` })
        break
      case 'requestHelp':
        entries.push({ kind: 'help', color: actorColor, text: `${actorColor} used ${action.params.kind}` })
        break
      case 'exorcise': {
        const ghostsDiscarded = prev.discardPile.length < next.discardPile.length
        const verdict = ghostsDiscarded ? '✓ exorcised' : '✗ failed'
        entries.push({
          kind: 'exorcise',
          color: actorColor,
          text: `${actorColor} ${verdict}: [${action.diceRoll.join(', ')}]${action.spentTao.length ? ` +tao(${action.spentTao.map((s) => s.color).join(',')})` : ''}`,
        })
        break
      }
      case 'placeBuddha':
        entries.push({ kind: 'buddha', color: actorColor, text: `${actorColor} placed Buddha` })
        break
      case 'useYinYang':
        entries.push({ kind: 'yinYang', color: actorColor, text: `${actorColor} spent Yin-Yang` })
        break
      case 'usePower':
        entries.push({ kind: 'power', color: actorColor, text: `${actorColor} used power` })
        break
      case 'endYangPhase':
        entries.push({ kind: 'endTurn', color: actorColor, text: `${actorColor} ended turn` })
        break
      default:
        break
    }

    // Detect a death between prev → next.
    for (const c of ['red', 'blue', 'green', 'yellow'] as const) {
      if (prev.taoists[c].alive && !next.taoists[c].alive) {
        entries.push({ kind: 'death', color: c, text: `${c} died` })
      }
    }
    // Outcome.
    if (prev.phase !== 'gameOver' && next.phase === 'gameOver') {
      if (next.outcome?.kind === 'win') {
        entries.push({ kind: 'win', text: '★ Taoists won!' })
      } else if (next.outcome?.kind === 'loss') {
        entries.push({ kind: 'loss', text: `✗ Lost: ${next.outcome.reason}` })
      }
    }

    if (entries.length === 0) return
    set((s) => ({ entries: [...s.entries, ...entries.map((e) => ({ ...e, at: Date.now() }))] }))
  },
}))
