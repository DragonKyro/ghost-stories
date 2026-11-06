import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '@/game/actions'
import type { LoggedAction } from '@/net/types'
import { ActionSync } from './actionSync'

// A toy game: the state is the list of moves applied (with the time each was
// logged at), and a move is legal only once (like two players answering the
// same prompt).
type State = { tag: string; at: number }[]
const move = (tag: string) => ({ type: 'endTurn', by: 'red', tag }) as unknown as Action
const tagOf = (a: Action) => (a as unknown as { tag: string }).tag
const tags = (s: State) => s.map((m) => m.tag)

interface Write {
  seq: number
  entry: LoggedAction
  resolve: (ok: boolean) => void
  reject: (e: unknown) => void
}

function harness() {
  let state: State = []
  const writes: Write[] = []
  const dropped: [string, string][] = []
  const legal = (s: State, a: Action) => !tags(s).includes(tagOf(a))
  const sync = new ActionSync<State>({
    apply: (e) => {
      if (legal(state, e.action)) state = [...state, { tag: tagOf(e.action), at: e.at }]
    },
    reapply: (e) => {
      if (!legal(state, e.action)) return false
      state = [...state, { tag: tagOf(e.action), at: e.at }]
      return true
    },
    snapshot: () => state,
    restore: (s) => {
      state = s
    },
    write: (seq, entry) => new Promise<boolean>((resolve, reject) => writes.push({ seq, entry, resolve, reject })),
    dropped: (a, why) => dropped.push([tagOf(a), why]),
  })
  sync.begin()
  return {
    sync,
    writes,
    dropped,
    state: () => tags(state),
    times: () => state.map((m) => m.at),
    /** This device makes a move at time `at` (applied at once, as gameStore.dispatch does). */
    act(tag: string, at = 1000) {
      const before = state
      state = [...state, { tag, at }]
      sync.local(move(tag), before, at)
    },
    /** The server log delivers entry `seq` from another device. */
    deliver(seq: number, tag: string, at = 2000) {
      sync.receive(seq, { action: move(tag), nonce: `other-${tag}`, at })
    },
    /** The server echoes our write `i` back as log entry `seq`. */
    echo(i: number) {
      const w = writes[i]!
      sync.receive(w.seq, w.entry)
    },
  }
}

const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ActionSync', () => {
  it('writes our moves one at a time to the next slot, confirming each from the log', () => {
    const h = harness()
    h.act('a')
    h.act('b')
    expect(h.state()).toEqual(['a', 'b'])
    expect(h.writes.map((w) => w.seq)).toEqual([0]) // b waits for a
    expect(h.writes[0]!.entry.nonce).toMatch(/^[0-9a-z]{8}$/)
    h.echo(0)
    expect(h.writes.map((w) => w.seq)).toEqual([0, 1])
    h.echo(1)
    expect(h.sync.confirmedCount).toBe(2)
    expect(h.sync.pendingCount).toBe(0)
    expect(h.state()).toEqual(['a', 'b'])
  })

  it("applies other devices' moves in log order, at the times they were made, holding early arrivals", () => {
    const h = harness()
    h.deliver(1, 'y', 20)
    expect(h.state()).toEqual([])
    h.deliver(0, 'x', 10)
    expect(h.state()).toEqual(['x', 'y'])
    expect(h.times()).toEqual([10, 20])
    h.deliver(0, 'x') // a repeat is ignored
    expect(h.state()).toEqual(['x', 'y'])
  })

  it('holds the log until the game has started', () => {
    const applied: string[] = []
    const late = new ActionSync<State>({
      apply: (e) => applied.push(tagOf(e.action)),
      reapply: () => true,
      snapshot: () => [],
      restore: () => {},
      write: async () => true,
      dropped: () => {},
    })
    late.receive(0, { action: move('x'), nonce: 'n', at: 0 })
    expect(applied).toEqual([])
    late.begin()
    expect(applied).toEqual(['x'])
  })

  it('ignores local moves before the start and after closing', () => {
    const writes: number[] = []
    const s = new ActionSync<State>({
      apply: () => {},
      reapply: () => true,
      snapshot: () => [],
      restore: () => {},
      write: async (seq) => {
        writes.push(seq)
        return true
      },
      dropped: () => {},
    })
    s.local(move('early'), [], 0)
    expect(s.pendingCount).toBe(0)
    s.begin()
    s.close()
    s.local(move('late'), [], 0)
    expect(s.pendingCount).toBe(0)
    expect(writes).toEqual([])
  })

  it("replays our move, keeping its time, after another device's move takes its slot", async () => {
    const h = harness()
    h.act('mine', 1500)
    expect(h.writes[0]!.seq).toBe(0)
    h.deliver(0, 'theirs', 1400)
    h.writes[0]!.resolve(false)
    await settle()
    expect(h.state()).toEqual(['theirs', 'mine'])
    expect(h.times()).toEqual([1400, 1500])
    expect(h.writes.map((w) => w.seq)).toEqual([0, 1])
    expect(h.writes[1]!.entry.at).toBe(1500)
    h.echo(1)
    expect(h.sync.pendingCount).toBe(0)
    expect(h.dropped).toEqual([])
  })

  it('drops our move when the other device made the same one first', () => {
    const h = harness()
    h.act('answer')
    h.act('after')
    h.deliver(0, 'answer')
    expect(h.state()).toEqual(['answer', 'after'])
    expect(h.dropped).toEqual([['answer', 'overtaken']])
    expect(h.writes.at(-1)!.seq).toBe(1)
    expect(h.writes.at(-1)!.entry.action).toEqual(move('after'))
  })

  it('rolls back a move the server refuses outright, keeping the ones after it', async () => {
    const h = harness()
    h.act('bad')
    h.act('good')
    h.writes[0]!.reject(new Error('PERMISSION_DENIED: Permission denied'))
    await settle()
    expect(h.dropped).toEqual([['bad', 'refused']])
    expect(h.state()).toEqual(['good'])
    expect(h.writes.at(-1)!.seq).toBe(0)
    expect(h.writes.at(-1)!.entry.action).toEqual(move('good'))
  })

  it('retries a write that failed for a network reason', async () => {
    vi.useFakeTimers()
    const h = harness()
    h.act('a')
    h.writes[0]!.reject(new Error('disconnect'))
    await vi.advanceTimersByTimeAsync(0)
    expect(h.writes).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(h.writes).toHaveLength(2)
    expect(h.writes[1]!.seq).toBe(0)
    expect(h.dropped).toEqual([])
    expect(h.state()).toEqual(['a'])
  })
})
