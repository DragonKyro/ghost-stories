import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetFakeServer } from '@/net/fakeTransport'
import { useNetworkStore } from '@/store/networkStore'
import { ChatPanel } from './ChatPanel'
import { ConnectionBadge } from './ConnectionBadge'
import { OnlineScreen } from './OnlineScreen'

// Smoke tests: the screens render in each state and the main buttons reach
// the store (over the in-memory server and the toy engine).
vi.mock('@/net/firebaseRoom', () => import('@/net/fakeTransport'))
vi.mock('@/game/engine', () => import('@/store/fakeEngine'))

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

async function flush() {
  for (let round = 0; round < 3; round++) {
    await act(async () => {
      for (let i = 0; i < 30; i++) await Promise.resolve()
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}

beforeEach(() => {
  resetFakeServer()
  vi.stubGlobal('localStorage', memoryStorage())
  vi.stubGlobal('sessionStorage', memoryStorage())
})
afterEach(() => {
  cleanup()
  useNetworkStore.getState().leaveRoom()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('OnlineScreen', () => {
  it('creates a room from the menu and shows the lobby with the four boards', async () => {
    render(<OnlineScreen />)
    const create = screen.getByRole('button', { name: 'Create a room' }) as HTMLButtonElement
    expect(create.disabled).toBe(true)
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Hana' } })
    fireEvent.click(create)
    await flush()
    expect(useNetworkStore.getState().connection).toBe('lobby')
    for (const board of ['Red · North', 'Blue · East', 'Green · South', 'Yellow · West']) {
      expect(document.body.textContent).toContain(board)
    }
    expect(screen.getByText('Hana')).toBeTruthy()
    expect(screen.getByText(/Blue, Green and Yellow are still open/)).toBeTruthy()
    const start = screen.getByRole('button', { name: 'Start game' }) as HTMLButtonElement
    expect(start.disabled).toBe(true)

    // The host makes it a solo game and starts it.
    for (const seat of ['Blue', 'Green', 'Yellow']) {
      fireEvent.change(screen.getByLabelText(`${seat} seat`), { target: { value: 'neutral' } })
      await flush()
    }
    expect(start.disabled).toBe(false)
    fireEvent.click(start)
    await flush()
    expect(useNetworkStore.getState().connection).toBe('in-game')
  })

  it('opens the join form from an invite link and reports an unknown room', async () => {
    window.history.replaceState(null, '', '/?room=ZZZZ')
    render(<OnlineScreen />)
    expect((screen.getByLabelText('Room code', { selector: 'input' }) as HTMLInputElement).value).toBe('ZZZZ')
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Gus' } })
    fireEvent.click(screen.getByRole('button', { name: 'Join room' }))
    await flush()
    expect(screen.getByText('Room ZZZZ not found')).toBeTruthy()
  })

  it('chat and the connection badge show up in a room only', async () => {
    const { container } = render(
      <>
        <ConnectionBadge />
        <ChatPanel />
      </>,
    )
    expect(container.textContent).toBe('')
    await act(() => useNetworkStore.getState().createRoom('Hana'))
    await flush()
    const code = useNetworkStore.getState().roomCode!
    expect(screen.getByText(`Room ${code}`)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Chat message'), { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await flush()
    expect(screen.getByText('hello')).toBeTruthy()
  })
})
