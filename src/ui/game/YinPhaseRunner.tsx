// Watches game.phase === 'yin' and automatically dispatches a `startTurn`
// action with a generated payload. This is what makes the Yin phase "play
// itself" — players don't manually roll the curse die for every Tormentor.
//
// A brief delay between detection and dispatch gives the UI a chance to
// surface what's happening (the next phase-2 milestone will animate it).

import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { buildYinPayload } from '@/game/yinPayload'

export function YinPhaseRunner() {
  const game = useGameStore((s) => s.game)
  const dispatch = useGameStore((s) => s.dispatch)

  useEffect(() => {
    if (!game) return
    if (game.phase !== 'yin') return

    // Delay slightly so the user sees the new turn marker before the deluge.
    const timer = setTimeout(() => {
      const { payload } = buildYinPayload(game)
      dispatch({ type: 'startTurn', payload })
    }, 500)
    return () => clearTimeout(timer)
  }, [game?.phase, game?.turnIndex])

  return null
}
