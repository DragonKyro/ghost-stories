import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '@/game/actions'
import type { Color, Seat } from '@/game/types'
import { fakeServer, releaseWrites, resetFakeServer } from '@/net/fakeTransport'
import type { FakeGame } from './fakeEngine'

// Online play end to end over an in-memory server (src/net/fakeTransport.ts),
// with a toy engine (src/store/fakeEngine.ts): every device is a fresh copy of
// the stores, as if on its own phone.
vi.mock('@/net/firebaseRoom', () => import('@/net/fakeTransport'))
vi.mock('@/game/engine', () => import('@/store/fakeEngine'))

async function device(uuid: string) {
  vi.resetModules()
  localStorage.setItem('ghoststories.uuid', uuid)
  const netModule = await import('@/store/networkStore')
  const { useGameStore } = await import('@/store/gameStore')
  const { useLogStore } = await import('@/store/logStore')
  return {
    uuid,
    mod: netModule,
    net: () => netModule.useNetworkStore.getState(),
    game: () => useGameStore.getState(),
    fake: () => useGameStore.getState().game as unknown as FakeGame,
    log: () => useLogStore.getState(),
  }
}
type Device = Awaited<ReturnType<typeof device>>

/** Let every write in flight (and the events it triggers) land. */
async function flush() {
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 30; i++) await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
  }
}

async function hostRoom(name = 'Hana') {
  const host = await device('host-uuid')
  await host.net().createRoom(name)
  await flush()
  return { host, code: host.net().roomCode! }
}

async function joinAs(uuid: string, name: string, code: string) {
  const d = await device(uuid)
  await d.net().joinRoom(code, name)
  await flush()
  return d
}

interface TablePlan {
  /** Guests, each sitting down in the seats listed (the host is on red). */
  guests?: [uuid: string, name: string, seats: Seat[]][]
  ai?: Seat[]
  neutral?: Color[]
  /** Host settings made before anyone sits down. */
  setup?: (host: Device) => Promise<unknown>
}

async function table(plan: TablePlan) {
  const { host, code } = await hostRoom()
  await plan.setup?.(host)
  await flush()
  const devices: Device[] = [host]
  for (const [uuid, name, seats] of plan.guests ?? []) {
    const d = await joinAs(uuid, name, code)
    for (const seat of seats) expect(await d.net().claimSeat(seat)).toBe(true)
    devices.push(d)
  }
  for (const seat of plan.ai ?? []) await host.net().hostSetSeat(seat, 'ai')
  for (const c of plan.neutral ?? []) await host.net().hostSetSeat(c, 'neutral')
  await flush()
  await host.net().hostStartGame()
  await flush()
  return { host, code, devices }
}

/** The device that plays `seat` (the host for seats nobody owns). */
function ownerOf(devices: Device[], seat: Seat): Device {
  const host = devices[0]!
  return devices.find((d) => host.net().seatUuids[seat] === d.uuid) ?? host
}

/** The active board's turn ends, on the device that plays it. */
async function playTurn(devices: Device[]) {
  const seat = devices[0]!.fake().active
  expect(ownerOf(devices, seat).game().dispatch({ type: 'endTurn', by: seat })).toBe(true)
  await flush()
}

function expectInStep(devices: Device[]) {
  const [first, ...rest] = devices
  for (const d of rest) {
    expect(d.game().game).toEqual(first!.game().game)
    // The same log, clock times included: they come from the room.
    expect(d.log().entries).toEqual(first!.log().entries)
    expect(d.game().startedAt).toBe(first!.game().startedAt)
  }
}

// Identity lives in localStorage; give each test its own (newer Node ships a
// global localStorage that shadows jsdom's and doesn't work without a file).
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

beforeEach(() => {
  resetFakeServer()
  vi.stubGlobal('localStorage', memoryStorage())
  vi.stubGlobal('sessionStorage', memoryStorage())
  window.history.replaceState(null, '', '/')
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('joining a room', () => {
  it('the host gets a room seated on red; a guest finds it by its code, typed any old way', async () => {
    const { host, code } = await hostRoom()
    expect(host.net().connection).toBe('lobby')
    expect(host.net().role).toBe('host')
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/)
    expect(window.location.search).toBe(`?room=${code}`)
    const lobby = host.net().lobby
    expect(lobby.seats.red).toEqual({ kind: 'human', uuid: 'host-uuid', name: 'Hana' })
    expect(lobby.difficulty).toBe('normal')

    const guest = await device('guest-uuid')
    const joining = guest.net().joinRoom(` ${code.toLowerCase()} `, 'Gus')
    expect(guest.net().connection).toBe('connecting')
    await joining
    await flush()
    expect(guest.net().connection).toBe('lobby')
    expect(guest.net().role).toBe('guest')
    expect(guest.net().lobby).toEqual(host.net().lobby)
    expect(host.net().onlineUuids.has('guest-uuid')).toBe(true)
    expect(host.net().people.map((p) => p.name).sort()).toEqual(['Gus', 'Hana'])
    expect(host.net().chat.map((m) => m.text)).toContain('Gus joined')
  })

  it('a code with no room is reported at once, never as an empty lobby', async () => {
    const guest = await device('guest-uuid')
    await guest.net().joinRoom('ZZZZ', 'Gus')
    expect(guest.net().connection).toBe('error')
    expect(guest.net().joinFailure).toMatchObject({ code: 'ZZZZ', reason: 'notFound' })
    expect(guest.net().errorMessage).toMatch(/no room with code ZZZZ/)
    guest.net().clearError()
    expect(guest.net().connection).toBe('disconnected')
  })

  it('an unreachable server is reported as a network problem; retrying once it is back finds the room', async () => {
    const { host, code } = await hostRoom()
    const guest = await device('guest-uuid')
    fakeServer().up = false
    await guest.net().joinRoom(code, 'Gus')
    expect(guest.net().joinFailure).toMatchObject({ code, reason: 'unreachable' })
    expect(guest.net().errorMessage).toMatch(/Couldn't reach the game server/)

    fakeServer().up = true
    guest.net().retryJoin()
    await flush()
    expect(guest.net().connection).toBe('lobby')
    expect(guest.net().joinFailure).toBeNull()
    expect(host.net().onlineUuids.has('guest-uuid')).toBe(true)
  })

  it('making a room clears rooms over a week old that nobody is in', async () => {
    const age = 8 * 24 * 60 * 60 * 1000 + 1000
    const { host: a, code: stale } = await hostRoom('Ann')
    a.net().leaveRoom()
    const { code: busy } = await hostRoom('Bea') // still connected
    const { host: c, code: fresh } = await hostRoom('Cy')
    c.net().leaveRoom()
    await flush()
    fakeServer().rooms.get(stale)!.meta.createdAt -= age
    fakeServer().rooms.get(busy)!.meta.createdAt -= age
    await hostRoom('Dee')
    expect(fakeServer().rooms.has(stale)).toBe(false)
    expect(fakeServer().rooms.has(busy)).toBe(true)
    expect(fakeServer().rooms.has(fresh)).toBe(true)
    const late = await device('late-uuid')
    await late.net().joinRoom(stale, 'Lu')
    expect(late.net().errorMessage).toMatch(/cleared a week after/)
  })

  it('cancelling a join stops it', async () => {
    const { code } = await hostRoom()
    const guest = await device('guest-uuid')
    const joining = guest.net().joinRoom(code, 'Gus')
    guest.net().leaveRoom()
    await joining
    await flush()
    expect(guest.net().connection).toBe('disconnected')
    expect(fakeServer().rooms.get(code)!.listeners.size).toBe(1) // just the host
  })

  it('resumeFromUrl rejoins the room in the URL, or opens the join form without a saved name', async () => {
    const { code } = await hostRoom()
    window.history.replaceState(null, '', `/?room=${code.toLowerCase()}`)
    localStorage.removeItem('ghoststories.name') // the host's, in this shared test storage
    const nameless = await device('nameless-uuid')
    expect(nameless.mod.resumeFromUrl()).toBe(true)
    expect(nameless.game().uiMode).toBe('online')
    expect(nameless.net().connection).toBe('disconnected')

    localStorage.setItem('ghoststories.name', 'Gus')
    const back = await device('guest-uuid')
    expect(back.mod.resumeFromUrl()).toBe(true)
    expect(back.game().uiMode).toBe('online')
    await flush()
    expect(back.net().connection).toBe('lobby')
    expect(back.net().roomCode).toBe(code)
    expect(back.net().myDisplayName).toBe('Gus')

    window.history.replaceState(null, '', '/')
    const plain = await device('plain-uuid')
    expect(plain.mod.resumeFromUrl()).toBe(false)
    expect(plain.game().uiMode).toBe('mainMenu')
  })
})

describe('the lobby', () => {
  it('guests take open seats (several if they like) and get up again; taken seats stay taken', async () => {
    const { host, code } = await hostRoom()
    const guest = await joinAs('guest-uuid', 'Gus', code)
    expect(await guest.net().claimSeat('green')).toBe(true)
    expect(await guest.net().claimSeat('blue')).toBe(true)
    await flush()
    expect(host.net().lobby.seats.green).toEqual({ kind: 'human', uuid: 'guest-uuid', name: 'Gus' })
    expect(host.net().lobby.seats.blue.uuid).toBe('guest-uuid')
    expect(await guest.net().claimSeat('red')).toBe(false)
    expect(guest.net().lobbyNotice).toMatch(/taken/)
    expect(await guest.net().releaseSeat('blue')).toBe(true)
    expect(await guest.net().releaseSeat('red')).toBe(false) // not theirs
    await flush()
    expect(host.net().lobby.seats.blue.kind).toBe('open')
    expect(host.net().lobby.seats.red.uuid).toBe('host-uuid')
    // Renaming shows on your seats.
    guest.net().setDisplayName('Gussie')
    await flush()
    expect(host.net().lobby.seats.green.name).toBe('Gussie')
    // Leaving the lobby frees them.
    guest.net().leaveRoom()
    await flush()
    expect(host.net().lobby.seats.green.kind).toBe('open')
    expect(host.net().onlineUuids.has('guest-uuid')).toBe(false)
  })

  it('two guests racing for one seat: one gets it, the other is told', async () => {
    const { host, code } = await hostRoom()
    const a = await joinAs('a-uuid', 'Ann', code)
    const b = await joinAs('b-uuid', 'Bo', code)
    const results = await Promise.all([a.net().claimSeat('green'), b.net().claimSeat('green')])
    await flush()
    expect(results.filter(Boolean)).toHaveLength(1)
    const loser = results[0] ? b : a
    expect(loser.net().lobbyNotice).toMatch(/just took that seat/)
    expect(host.net().lobby.seats.green.uuid).toBe(results[0] ? 'a-uuid' : 'b-uuid')
  })

  it('nobody plays a Taoist and Wu-Feng; the Wu-Feng seat comes and goes with Black Secret', async () => {
    const { host, code } = await hostRoom()
    const guest = await joinAs('guest-uuid', 'Gus', code)
    expect(await guest.net().claimSeat('wufeng')).toBe(false)
    expect(await host.net().hostSetBlackSecret({ enabled: true })).toBe(true)
    await flush()
    expect(await host.net().claimSeat('wufeng')).toBe(false) // the host is on red
    expect(host.net().lobbyNotice).toMatch(/nobody plays both sides/)
    expect(await guest.net().claimSeat('wufeng')).toBe(true)
    await flush()
    expect(await guest.net().claimSeat('blue')).toBe(false)
    expect(guest.net().lobbyNotice).toMatch(/You're Wu-Feng/)
    await host.net().hostSetBlackSecret({ enabled: false })
    await flush()
    expect(guest.net().lobby.wuFeng.kind).toBe('open')
  })

  it('only the host changes settings and other seats; the host can take a person off a seat', async () => {
    const { host, code } = await hostRoom()
    const guest = await joinAs('guest-uuid', 'Gus', code)
    await guest.net().claimSeat('green')
    await flush()
    expect(await guest.net().hostSetDifficulty('hell')).toBe(false)
    expect(await guest.net().hostSetSeat('blue', 'ai')).toBe(false)
    expect(await guest.net().hostSetWhiteMoon({ enabled: true })).toBe(false)
    expect(host.net().lobby.difficulty).toBe('normal')

    await host.net().hostSetDifficulty('nightmare')
    await host.net().hostSetWhiteMoon({ enabled: true, portal: 'edge' })
    await host.net().hostSetBlackSecret({ enabled: true, side: 'b' })
    await host.net().hostSetSeat('blue', 'ai')
    await host.net().hostSetSeat('yellow', 'neutral')
    await host.net().hostSetSeat('green', 'open') // kick
    await flush()
    const l = guest.net().lobby
    expect(l.difficulty).toBe('nightmare')
    expect(l.whiteMoon).toEqual({ enabled: true, portal: 'edge', randomTiles: false })
    expect(l.blackSecret).toEqual({ enabled: true, side: 'b' })
    expect([l.seats.blue.kind, l.seats.yellow.kind, l.seats.green.kind]).toEqual(['ai', 'neutral', 'open'])
  })

  it("the game doesn't start while the lobby has a problem", async () => {
    const { host, code } = await hostRoom()
    const guest = await joinAs('guest-uuid', 'Gus', code)
    await guest.net().claimSeat('blue')
    await host.net().hostSetSeat('green', 'neutral')
    await host.net().hostSetSeat('yellow', 'neutral')
    await flush()
    const { lobbyStartProblem } = await import('@/store/lobby')
    expect(lobbyStartProblem(host.net().lobby)).toMatch(/facing each other/)
    await host.net().hostStartGame()
    await flush()
    expect(host.game().game).toBeNull()
    expect(fakeServer().rooms.get(code)!.start).toBeNull()
  })
})

describe('playing online', () => {
  it('the host starts the game for everyone from the config; moves reach every device', async () => {
    const { host, code, devices } = await table({
      guests: [['guest-uuid', 'Gus', ['green']]],
      ai: ['blue'],
      neutral: ['yellow'],
      setup: (h) => h.net().hostSetDifficulty('initiation'),
    })
    const guest = devices[1]!
    expect(guest.net().connection).toBe('in-game')
    expect(guest.net().role).toBe('guest')
    expect(host.net().role).toBe('host')
    expect(guest.game().uiMode).toBe('inGame')
    expect(guest.fake().config).toEqual({
      difficulty: 'initiation',
      seats: { red: 'human', blue: 'ai', green: 'human', yellow: 'neutral' },
      seed: host.net().lobby.seed,
    })
    expect(guest.net().seatUuids).toEqual({ red: 'host-uuid', blue: null, green: 'guest-uuid', yellow: null })
    // The room holds the config, not the game.
    const room = fakeServer().rooms.get(code)!
    expect(room.start!.length).toBeLessThan(1000)
    expect(JSON.parse(room.start!)).toMatchObject({ hostUuid: 'host-uuid', check: expect.stringMatching(/^[0-9a-f]{8}$/) })
    expect(guest.net().chat.map((m) => m.text)).toContain('Game started')
    expectInStep(devices)
    for (let i = 0; i < 12; i++) {
      await playTurn(devices)
      expectInStep(devices)
    }
    expect(host.fake().moves).toHaveLength(12)
    expect(room.actions.size).toBe(12)
    expect(Math.max(...[...room.actions.values()].map((v) => v.length))).toBeLessThan(200)
  })

  it("a device can't act for someone else's seat, and nothing is written when it tries", async () => {
    const { code, devices } = await table({ guests: [['guest-uuid', 'Gus', ['green']]], ai: ['blue', 'yellow'] })
    const guest = devices[1]!
    for (const by of ['red', 'blue'] as const) {
      expect(guest.game().dispatch({ type: 'endTurn', by })).toBe(false)
    }
    expect(guest.game().error).toMatch(/host's device plays that seat/)
    guest.game().dispatch({ type: 'endTurn', by: 'red' })
    expect(guest.game().error).toMatch(/another player's seat/)
    await flush()
    expect(fakeServer().rooms.get(code)!.actions.size).toBe(0)
    expectInStep(devices)
  })

  it('the host plays the AI seats and is the only device that runs the AI', async () => {
    const { host, devices } = await table({ guests: [['guest-uuid', 'Gus', ['green']]], ai: ['blue', 'yellow'] })
    const guest = devices[1]!
    expect(host.mod.runsAi()).toBe(true)
    expect(guest.mod.runsAi()).toBe(false)
    expect(host.mod.canActFor('blue')).toBe(true)
    expect(guest.mod.canActFor('blue')).toBe(false)
    for (let i = 0; i < 8; i++) await playTurn(devices)
    expectInStep(devices)
    expect(host.fake().moves.filter((m) => m.startsWith('blue:'))).toHaveLength(2)
  })

  it('two players taking the last Buddha at once: the first into the log stands, the other is taken back', async () => {
    const { host, devices } = await table({ guests: [['guest-uuid', 'Gus', ['green']]], ai: ['blue', 'yellow'] })
    const guest = devices[1]!
    const take = (by: Color): Action => ({ type: 'help', by, params: { kind: 'buddhistTemple' } })
    fakeServer().holdWrites = true
    expect(host.game().dispatch(take('red'))).toBe(true)
    expect(guest.game().dispatch(take('green'))).toBe(true)
    // Each device shows its own move straight away…
    expect(host.fake().temple).toBe(0)
    expect(guest.fake().temple).toBe(0)
    releaseWrites()
    await flush()
    // …but only the first one into the log stands.
    expectInStep(devices)
    expect(host.fake().moves).toEqual(['red:buddha'])
    expect(guest.game().error).toMatch(/went through first/)
    expect(host.game().error).toBeNull()
    // Play goes on.
    await playTurn(devices)
    expectInStep(devices)
  })

  it('a player who drops out gets the game back on rejoining; anyone else spectates', async () => {
    const { host, code, devices } = await table({ guests: [['guest-uuid', 'Gus', ['green', 'yellow']]], ai: ['blue'] })
    expect(devices[1]!.mod.controlledSeats()).toEqual(['green', 'yellow'])
    for (let i = 0; i < 6; i++) await playTurn(devices)
    devices[1]!.net().leaveRoom()
    await flush()
    expect(host.net().onlineUuids.has('guest-uuid')).toBe(false)
    expect(host.mod.isSeatOnline('green')).toBe(false)
    expect(host.mod.isSeatOnline('blue')).toBe(true) // the AI is on the host

    // Come back a while later: the game clock still counts from the real start.
    await new Promise((r) => setTimeout(r, 20))
    const back = await joinAs('guest-uuid', 'Gus', code)
    expect(back.net().connection).toBe('in-game')
    expect(back.net().role).toBe('guest')
    expect(back.fake().moves).toHaveLength(6)
    expect(back.game().startedAt).toBeLessThan(Date.now() - 20)
    expectInStep([host, back])
    expect(host.mod.isSeatOnline('green')).toBe(true)

    const stranger = await joinAs('stranger-uuid', 'Sam', code)
    expect(stranger.net().role).toBe('spectator')
    expect(stranger.mod.controlledSeats()).toEqual([])
    expect(stranger.mod.runsAi()).toBe(false)
    expectInStep([host, stranger])
    expect(stranger.game().dispatch({ type: 'endTurn', by: stranger.fake().active })).toBe(false)
    expect(stranger.game().error).toMatch(/watching/)

    for (let i = 0; i < 6; i++) await playTurn([host, back])
    await flush()
    expectInStep([host, back, stranger])
  })

  it('the host reloading the page is the host again (and keeps playing the AI)', async () => {
    const { host, code, devices } = await table({ guests: [['guest-uuid', 'Gus', ['green']]], ai: ['blue', 'yellow'] })
    for (let i = 0; i < 3; i++) await playTurn(devices)
    host.net().leaveRoom()
    expect(host.game().game).toBeNull()
    expect(host.game().uiMode).toBe('mainMenu')
    const reloaded = await joinAs('host-uuid', 'Hana', code)
    expect(reloaded.net().role).toBe('host')
    expect(reloaded.mod.runsAi()).toBe(true)
    for (let i = 0; i < 6; i++) await playTurn([reloaded, devices[1]!])
    expectInStep([reloaded, devices[1]!])
  })

  it('a Black Secret game: the Wu-Feng player answers for Wu-Feng, nobody else does', async () => {
    const { host, devices } = await table({
      guests: [['wf-uuid', 'Wu', ['wufeng']]],
      ai: ['blue', 'green', 'yellow'],
      setup: (h) => h.net().hostSetBlackSecret({ enabled: true }),
    })
    const wf = devices[1]!
    expect(wf.fake().config.blackSecret).toEqual({ wuFeng: 'human', side: 'a' })
    expect(wf.net().seatUuids.wufeng).toBe('wf-uuid')
    expect(wf.mod.controlledSeats()).toEqual(['wufeng'])
    expect(wf.mod.seatName('wufeng')).toBe('Wu')
    expect(wf.mod.seatName('blue')).toBe('AI')
    const answer: Action = { type: 'respond', by: 'wufeng', r: { kind: 'curseReroll', reroll: false } }
    expect(host.game().dispatch(answer)).toBe(false)
    expect(wf.game().dispatch(answer)).toBe(true)
    await flush()
    expectInStep(devices)
    expect(host.fake().moves).toEqual(['wufeng:respond'])
  })

  it('chat reaches everyone in the room, and a rejoiner sees the history', async () => {
    const { host, code, devices } = await table({ guests: [['guest-uuid', 'Gus', ['green']]], ai: ['blue', 'yellow'] })
    devices[1]!.net().sendChat('  boo!  ')
    await flush()
    expect(host.net().chat.filter((m) => m.kind === 'user').map((m) => [m.senderName, m.text])).toEqual([['Gus', 'boo!']])
    const late = await joinAs('late-uuid', 'Lu', code)
    expect(late.net().chat.some((m) => m.text === 'boo!')).toBe(true)
  })
})

describe('offline', () => {
  it('everything is this device: all seats, the AI, nobody named', async () => {
    const d = await device('solo-uuid')
    expect(d.mod.runsAi()).toBe(true)
    expect(d.mod.controlledSeats()).toBe('all')
    expect(d.mod.canActFor('red')).toBe(true)
    expect(d.mod.isSeatOnline('green')).toBe(true)
    expect(d.mod.seatName('red')).toBeNull()
  })
})
