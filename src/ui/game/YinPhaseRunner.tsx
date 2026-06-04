// Watches game.phase === 'yin' and automatically dispatches a `startTurn`
// action with a generated payload. This is what makes the Yin phase "play
// itself" — players don't manually roll the curse die for every Tormentor.
//
// A brief delay between detection and dispatch gives the UI a chance to
// surface what's happening (the next phase-2 milestone will animate it).

import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useNetworkStore } from '@/store/networkStore'
import { buildYinPayload } from '@/game/yinPayload'

export function YinPhaseRunner() {
  const game = useGameStore((s) => s.game)
  const dispatch = useGameStore((s) => s.dispatch)
  const netRole = useNetworkStore((s) => s.role)

  useEffect(() => {
    if (!game) return
    if (game.phase !== 'yin') return
    // Only the host (or solo) generates the Yin payload — random outcomes
    // (curse dice, ghost arrivals) flow from there and broadcast to peers.
    if (netRole === 'guest' || netRole === 'spectator') return

    const timer = setTimeout(() => {
      const { payload } = buildYinPayload(game)
      dispatch({ type: 'startTurn', payload })
    }, 500)
    return () => clearTimeout(timer)
  }, [game?.phase, game?.turnIndex, netRole])

  return null
}
