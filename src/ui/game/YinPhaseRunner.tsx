// Watches game.phase === 'yin' and automatically dispatches a `startTurn`
// action with a generated payload. This is what makes the Yin phase "play
// itself" — players don't manually roll the curse die for every Tormentor.
//
// A brief delay between detection and dispatch gives the UI a chance to
// surface what's happening (the next phase-2 milestone will animate it).

import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useNetworkStore } from '@/store/networkStore'
import { buildDefaultDemonActions, buildYinPayload } from '@/game/yinPayload'
import { WuFengYinDialog } from './WuFengYinDialog'

export function YinPhaseRunner() {
  const game = useGameStore((s) => s.game)
  const dispatch = useGameStore((s) => s.dispatch)
  const netRole = useNetworkStore((s) => s.role)
  const [wuFengDialogShown, setWuFengDialogShown] = useState(false)
  const [wuFengDismissed, setWuFengDismissed] = useState(false)

  useEffect(() => {
    if (!game) return
    if (game.phase !== 'yin') return
    if (netRole === 'guest' || netRole === 'spectator') return

    // Black Secret: if there are demons or a Shadow, surface the Wu-Feng
    // dialog first. Wait up to 4 seconds for Wu-Feng to confirm; otherwise
    // run the default (all demons search, Shadow passes).
    const needsWuFengDialog = game.blackSecret && (game.blackSecret.catacombsDemons.length > 0 || game.blackSecret.shadowPos != null)
    if (needsWuFengDialog && !wuFengDialogShown) {
      setWuFengDialogShown(true)
      setWuFengDismissed(false)
      return
    }
    if (needsWuFengDialog && !wuFengDismissed) return

    const timer = setTimeout(() => {
      // Defaults for AI / no-dialog play.
      if (game.blackSecret && game.blackSecret.catacombsDemons.length > 0) {
        const { moves } = buildDefaultDemonActions(game)
        if (moves.length > 0) {
          dispatch({ type: 'wuFengDemonActions', moves })
        }
      }
      const { payload } = buildYinPayload(game)
      dispatch({ type: 'startTurn', payload })
      // Reset dialog state for next turn.
      setWuFengDialogShown(false)
      setWuFengDismissed(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [game?.phase, game?.turnIndex, netRole, wuFengDialogShown, wuFengDismissed])

  if (game && game.blackSecret && wuFengDialogShown && !wuFengDismissed
      && game.phase === 'yin'
      && (game.blackSecret.catacombsDemons.length > 0 || game.blackSecret.shadowPos != null)) {
    return <WuFengYinDialog game={game} onDismiss={() => setWuFengDismissed(true)} />
  }

  return null
}
