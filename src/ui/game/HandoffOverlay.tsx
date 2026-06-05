// Hot-seat handoff screen. After a player ends their turn, the Yin phase
// begins for the next seat. This overlay covers the board until that seat
// confirms they're ready — both to give the next player time to take the
// device and to add a beat of intermission.

import { useGameStore } from '@/store/gameStore'
import { TAOIST_COLOR_HEX } from '@/ui/shared/playerColors'
import type { TaoistColor } from '@/game/types'

export function HandoffOverlay({ nextTaoist }: { nextTaoist: TaoistColor }) {
  const setOverlay = useGameStore((s) => s.setOverlay)
  const setRevealedTaoist = useGameStore((s) => s.setRevealedTaoist)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>
          Pass device to
        </div>
        <div style={{
          width: 160, height: 160, borderRadius: '50%',
          background: TAOIST_COLOR_HEX[nextTaoist],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64, color: '#f4e9d6',
          boxShadow: `0 0 60px ${TAOIST_COLOR_HEX[nextTaoist]}`,
        }}>
          ☯
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, textTransform: 'capitalize' }}>
          {nextTaoist} Taoist
        </div>
        <button
          style={{ padding: '12px 24px', fontSize: 16, marginTop: 8 }}
          onClick={() => {
            setRevealedTaoist(nextTaoist)
            setOverlay({ kind: 'none' })
          }}
        >
          I'm ready
        </button>
      </div>
    </div>
  )
}
