// Watches game.phase === 'yin' and automatically dispatches a `startTurn`
// action with a generated payload. This is what makes the Yin phase "play
// itself" — players don't manually roll the curse die for every Tormentor.
//
// A brief delay between detection and dispatch gives the UI a chance to
// surface what's happening (the next phase-2 milestone will animate it).

import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useNetworkStore } from '@/store/networkStore'
import { buildDefaultDemonActions, buildYinPayload } from '@/game/yinPayload'

export function YinPhaseRunner() {
  const game = useGameStore((s) => s.game)
  const dispatch = useGameStore((s) => s.dispatch)
  const netRole = useNetworkStore((s) => s.role)

  useEffect(() => {
    if (!game) return
    if (game.phase !== 'yin') return
    if (netRole === 'guest' || netRole === 'spectator') return

    const timer = setTimeout(() => {
      // Black Secret: before the Yin payload runs, every catacombs demon
      // takes 1 action (defaults to search; a real Wu-Feng UI will swap
      // these for hand-picked moves later).
      if (game.blackSecret && game.blackSecret.catacombsDemons.length > 0) {
        const { moves } = buildDefaultDemonActions(game)
        if (moves.length > 0) {
          dispatch({ type: 'wuFengDemonActions', moves })
        }
      }
      const { payload } = buildYinPayload(game)
      dispatch({ type: 'startTurn', payload })
    }, 500)
    return () => clearTimeout(timer)
  }, [game?.phase, game?.turnIndex, netRole])

  return null
}
