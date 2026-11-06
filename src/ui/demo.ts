// Dev aid: ?demo=<steps>[&seed=N][&wm][&bs][&players=N] starts a game on this
// device and lets the AI play `steps` moves for every seat, then hands red to
// the person at the screen (for screenshots and quick testing).

import { chooseAction } from '@/ai'
import { createGame, waitingFor } from '@/game/engine'
import type { Color, GameConfig, SeatKind } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { useUiStore } from '@/store/uiStore'

export function startDemoFromUrl(): boolean {
  if (!import.meta.env.DEV) return false
  const q = new URLSearchParams(location.search)
  if (!q.has('demo')) return false
  const steps = Number(q.get('demo') || 0)
  const players = Number(q.get('players') || 4)
  const order: Color[] = players === 2 ? ['red', 'green'] : ['red', 'blue', 'green', 'yellow'].slice(0, players) as Color[]
  const seats = Object.fromEntries((['red', 'blue', 'green', 'yellow'] as Color[]).map((c) => [c, order.includes(c) ? 'ai' : 'neutral'])) as Record<Color, SeatKind>
  const config: GameConfig = {
    difficulty: (q.get('difficulty') as GameConfig['difficulty']) || 'initiation',
    seats,
    seed: Number(q.get('seed') || 3),
    firstPlayer: 'red',
    ...(q.has('wm') ? { whiteMoon: { portal: 'center', randomTiles: false } } : {}),
    ...(q.has('bs') ? { blackSecret: { wuFeng: 'ai', side: 'a' } } : {}),
  }
  const store = useGameStore.getState()
  store.setGameState(createGame(config), Date.now())
  for (let i = 0; i < steps; i++) {
    const s = useGameStore.getState().game!
    if (s.phase === 'gameOver') break
    const seat = waitingFor(s)
    if (!seat) break
    const a = chooseAction(s, seat)
    if (!a || !useGameStore.getState().applyLocal(a)) break
  }
  // Hand the red seat to the person at the screen (unless they asked to watch).
  const s = useGameStore.getState().game!
  if (!q.has('watch')) {
    useGameStore.setState({
      game: { ...s, taoists: { ...s.taoists, red: { ...s.taoists.red, kind: 'human' } }, config: { ...s.config, seats: { ...s.config.seats, red: 'human' } } },
    })
  }
  if (q.has('stats')) useUiStore.getState().setShowStats(true)
  return true
}
