// Plays the AI seats (offline, or on the host's device online), one step at a
// time with a short pause so people can follow.

import { useEffect } from 'react'
import { chooseAction, fallbackAction } from '@/ai'
import { waitingFor } from '@/game/engine'
import { bestCommit } from '@/game/exorcism'
import { useGameStore } from '@/store/gameStore'
import { runsAi, useNetworkStore } from '@/store/networkStore'
import { isAiSeat } from './seats'

export function AIDriver() {
  const game = useGameStore((g) => g.game)
  const handoff = useGameStore((g) => g.handoff)
  const host = useNetworkStore((n) => runsAi(n))
  useEffect(() => {
    if (!game || !host || game.phase === 'gameOver' || handoff) return
    const seat = waitingFor(game)
    if (!seat || !isAiSeat(game, seat)) return
    const delay = game.prompt?.kind === 'exorcism' || game.prompt?.kind === 'herbalist' ? 1400 : game.prompt ? 800 : 650
    const id = setTimeout(() => {
      const cur = useGameStore.getState().game
      if (!cur || cur !== game) return
      const store = useGameStore.getState()
      let a = null
      try {
        a = chooseAction(cur, seat)
      } catch (e) {
        console.warn('[ai] failed to choose:', e)
      }
      if (a && store.dispatch(a)) return
      const fb = fallbackAction(cur, seat)
      if (fb && store.dispatch(fb)) return
      if (cur.prompt?.kind === 'exorcism') {
        const best = bestCommit(cur, cur.prompt.roll)
        store.dispatch({ type: 'respond', by: seat, r: { kind: 'commit', spend: best.plan.spend, crystals: best.plan.crystals, exorcise: best.exorcise, demons: best.demons as never[] } })
      }
    }, delay)
    return () => clearTimeout(id)
  }, [game, host, handoff])
  return null
}
