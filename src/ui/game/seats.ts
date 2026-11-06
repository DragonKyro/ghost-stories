// Who this device plays. Offline (solo / hot-seat) it plays every human seat;
// online, the seats on its UUID. AI seats are played by the AI driver.

import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { GameState, Seat } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { canActFor, controlledSeats, useNetworkStore } from '@/store/networkStore'

export function isAiSeat(s: GameState, seat: Seat): boolean {
  if (seat === 'wufeng') return s.config.blackSecret?.wuFeng === 'ai'
  return s.taoists[seat].kind === 'ai'
}

/** Can a person on this device act for `seat` (AI seats excluded)? */
export function useCanAct(): (seat: Seat) => boolean {
  const game = useGameStore((g) => g.game)
  const mine = useNetworkStore(useShallow((n) => controlledSeats(n)))
  const net = useNetworkStore((n) => n)
  return useCallback(
    (seat: Seat) => {
      if (!game) return false
      if (isAiSeat(game, seat)) return false
      if (mine === 'all') return true
      return canActFor(seat, net)
    },
    [game, mine, net],
  )
}

/** Hot-seat: more than one person shares this device. */
export function sharedDevice(s: GameState): boolean {
  const humans = (['red', 'blue', 'green', 'yellow'] as const).filter((c) => s.taoists[c].kind === 'human').length
  return humans + (s.config.blackSecret?.wuFeng === 'human' ? 1 : 0) > 1
}
