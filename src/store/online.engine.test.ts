import { describe, expect, it, vi } from 'vitest'
import type { Seat } from '@/game/types'

// Online play with the REAL engine over the in-memory server: three devices
// (host on red, guests on green and blue, yellow played by the host's AI)
// play a stretch of the game; every device must end in the same state.
vi.mock('@/net/firebaseRoom', () => import('@/net/fakeTransport'))

function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (k) => items.get(k) ?? null,
    key: (i) => [...items.keys()][i] ?? null,
    removeItem: (k) => void items.delete(k),
    setItem: (k, v) => void items.set(k, String(v)),
  }
}

async function device(uuid: string) {
  vi.resetModules()
  localStorage.setItem('ghoststories.uuid', uuid)
  const net = await import('@/store/networkStore')
  const { useGameStore } = await import('@/store/gameStore')
  const engine = await import('@/game/engine')
  const ai = await import('@/ai')
  return { uuid, net, game: () => useGameStore.getState(), engine, ai }
}

async function flush() {
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < 40; i++) await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
  }
}

describe('online play with the real engine', () => {
  it('three devices stay in step through many turns', async () => {
    const { resetFakeServer } = await import('@/net/fakeTransport')
    resetFakeServer()
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('sessionStorage', memoryStorage())
    const host = await device('host-uuid')
    await host.net.useNetworkStore.getState().createRoom('Hana')
    await flush()
    const code = host.net.useNetworkStore.getState().roomCode!
    const g1 = await device('guest-1')
    await g1.net.useNetworkStore.getState().joinRoom(code, 'Gil')
    await flush()
    expect(await g1.net.useNetworkStore.getState().claimSeat('green')).toBe(true)
    const g2 = await device('guest-2')
    await g2.net.useNetworkStore.getState().joinRoom(code, 'Bo')
    await flush()
    expect(await g2.net.useNetworkStore.getState().claimSeat('blue')).toBe(true)
    await host.net.useNetworkStore.getState().hostSetSeat('yellow', 'ai')
    await host.net.useNetworkStore.getState().hostSetDifficulty('initiation')
    await flush()
    await host.net.useNetworkStore.getState().hostStartGame()
    await flush()

    const devices = [host, g1, g2]
    for (const d of devices) expect(d.game().game).not.toBeNull()
    const owner = (seat: Seat) => (seat === 'green' ? g1 : seat === 'blue' ? g2 : host)

    for (let step = 0; step < 150; step++) {
      const s = host.game().game!
      if (s.phase === 'gameOver') break
      const seat = host.engine.waitingFor(s)
      if (!seat) break
      const d = owner(seat)
      const a = d.ai.chooseAction(d.game().game!, seat)
      expect(a).not.toBeNull()
      expect(d.game().dispatch(a!)).toBe(true)
      await flush()
    }
    const states = devices.map((d) => JSON.stringify(d.game().game))
    expect(states[1]).toBe(states[0])
    expect(states[2]).toBe(states[0])
    // A guest can't act for someone else's seat.
    const s = g1.game().game!
    const seat = g1.engine.waitingFor(s)
    if (seat && seat !== 'green' && s.phase !== 'gameOver') {
      const a = g1.ai.chooseAction(s, seat)!
      expect(g1.game().dispatch(a)).toBe(false)
    }
  }, 60000)
})
