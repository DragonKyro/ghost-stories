// Drives AI Taoist seats. When the active player is an AI:
//   1. After each action lands, wait ~700ms (or 1.2s for exorcism, which has
//      a visible dice/result the human spectators care about), then call
//      chooseAction(state, taoistId) and dispatch.
//   2. When chooseAction returns null, dispatch endYangPhase via the
//      gameStore's endTurnAndHandoff helper.
//
// Stateless across renders; reads the store via subscribe so a re-trigger
// happens on every state change.

import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useNetworkStore } from '@/store/networkStore'
import { chooseAction } from '@/ai/main'
import type { TaoistColor } from '@/game/types'

const TICK_MS = 700
const EXORCISM_DELAY_MS = 1500

export function AIDriver() {
  const game = useGameStore((s) => s.game)
  const overlay = useGameStore((s) => s.uiOverlay)
  const dispatch = useGameStore((s) => s.dispatch)
  const endTurnAndHandoff = useGameStore((s) => s.endTurnAndHandoff)
  const netRole = useNetworkStore((s) => s.role)
  // Re-entrancy guard: don't fire if a tick is already scheduled for this state.
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!game) return
    if (game.phase !== 'yang') return
    if (overlay.kind !== 'none') return // a human dialog is open
    // Online: only the host drives AI seats. Guests / spectators must not
    // dispatch AI actions — the host's broadcast applies them everywhere.
    if (netRole === 'guest' || netRole === 'spectator') return

    const activeColor = game.turnOrder[game.turnIndex] as TaoistColor
    const t = game.taoists[activeColor]
    if (!t.isAi || !t.alive) return

    // Pick the next action.
    const taoistId = `taoist-${activeColor}` as const
    const nextAction = chooseAction(game, taoistId)
    const delay = nextAction?.type === 'exorcise' ? EXORCISM_DELAY_MS : TICK_MS

    if (tickRef.current) clearTimeout(tickRef.current)
    tickRef.current = setTimeout(() => {
      tickRef.current = null
      if (!nextAction) {
        endTurnAndHandoff()
        return
      }
      try {
        dispatch(nextAction)
      } catch (err) {
        // AI tried an illegal action — log and bail to end-turn. This is a
        // bug if it ever fires (it means the heuristic produced something
        // the engine rejects); we end the turn rather than spin.
        console.error('AI dispatch failed, ending turn:', err)
        endTurnAndHandoff()
      }
    }, delay)

    return () => {
      if (tickRef.current) {
        clearTimeout(tickRef.current)
        tickRef.current = null
      }
    }
  }, [game, overlay.kind, netRole, dispatch, endTurnAndHandoff])

  return null
}
