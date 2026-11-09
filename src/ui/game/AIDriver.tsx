// Plays the AI seats (offline, or on the host's device online), one step at a
// time with a short pause so people can follow. In solo games of the base game
// the Taoist is the neural network (src/ai/nn: it samples its moves from its
// policy, see networkPlays); every other AI seat, and Wu-Feng, is played by the
// rules-based AI (src/ai), which is also the fallback if the network can't load.

import { useEffect } from 'react'
import { chooseAction, fallbackAction } from '@/ai'
import { networkPlays, nnSampleAction } from '@/ai/nn'
import type { Action } from '@/game/actions'
import { waitingFor } from '@/game/engine'
import { bestCommit } from '@/game/exorcism'
import { useGameStore } from '@/store/gameStore'
import { runsAi, useNetworkStore } from '@/store/networkStore'
import { loadAiNet } from './aiNet'
import { isAiSeat } from './seats'

export function AIDriver() {
  const game = useGameStore((g) => g.game)
  const handoff = useGameStore((g) => g.handoff)
  const host = useNetworkStore((n) => runsAi(n))
  const useNet = !!game && (['red', 'blue', 'green', 'yellow'] as const).some((c) => game.taoists[c].kind === 'ai') && networkPlays(game)
  // Start the weights download as soon as a game the network plays begins.
  useEffect(() => {
    if (useNet && host) loadAiNet().catch((e) => console.warn('[ai] could not load the network:', e))
  }, [useNet, host])
  useEffect(() => {
    if (!game || !host || game.phase === 'gameOver' || handoff) return
    const seat = waitingFor(game)
    if (!seat || !isAiSeat(game, seat)) return
    const delay = game.prompt?.kind === 'exorcism' || game.prompt?.kind === 'herbalist' ? 1400 : game.prompt ? 800 : 650
    const id = setTimeout(async () => {
      const cur = useGameStore.getState().game
      if (!cur || cur !== game) return
      let a: Action | null = null
      try {
        if (seat !== 'wufeng' && networkPlays(cur)) {
          try {
            a = nnSampleAction(await loadAiNet(), cur, seat, Math.random)
          } catch (e) {
            console.warn('[ai] the network failed, using the rules-based AI:', e)
          }
        }
        a ??= chooseAction(cur, seat)
      } catch (e) {
        console.warn('[ai] failed to choose:', e)
      }
      const store = useGameStore.getState()
      if (store.game !== cur) return // the game moved on while the network loaded
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
