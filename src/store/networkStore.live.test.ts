// @vitest-environment node
/// <reference types="node" />
//
// Online play against the real Firebase project (github-games-e7c7d, shared
// with other apps; everything here lives under /ghost-stories), each "device"
// with its own Firebase app and anonymous sign-in. The game is the toy engine
// (src/store/fakeEngine.ts): this checks the room, not the rules. Skipped
// unless LIVE_FIREBASE=1, and it needs the rules in database.rules.json
// deployed first (npm run deploy:rules):
//
//   LIVE_FIREBASE=1 npx vitest run src/store/networkStore.live.test.ts
//
// The rules don't let clients delete young rooms, so it prints the room codes
// it used; remove them afterwards with
// `npx firebase-tools database:remove /ghost-stories/rooms/<CODE>`. The
// clean-up test plants week-old rooms with the admin CLI, so it needs
// firebase-tools logged in. Each run also leaves a few anonymous users in
// Firebase Auth (harmless).

import { afterAll, describe, expect, it, vi } from 'vitest'
import { initializeApp } from 'firebase/app'
import { initializeAuth, inMemoryPersistence, signInAnonymously } from 'firebase/auth'
import { get, getDatabase, ref, remove, set } from 'firebase/database'
import { execSync } from 'node:child_process'
import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Action } from '@/game/actions'
import type { Seat } from '@/game/types'
import type { RoomEvents } from '@/net/transport'
import type { StartRecord } from '@/net/types'
import { defaultLobby } from './lobby'
import type { FakeGame } from './fakeEngine'

const LIVE = process.env.LIVE_FIREBASE === '1'

vi.mock('@/game/engine', () => import('@/store/fakeEngine'))
vi.mock('@/net/firebaseRoom', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/net/firebaseRoom')>()
  let transport: ReturnType<typeof real.createFirebaseTransport> | null = null
  return {
    ...real,
    getTransport: () =>
      (transport ??= real.createFirebaseTransport({
        appName: `device-${Math.random().toString(36).slice(2)}`,
        persistence: 'memory',
      })),
  }
})

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
vi.stubGlobal('localStorage', memoryStorage())

const run = Date.now().toString(36)
const rooms: string[] = []

async function device(name: string) {
  vi.resetModules()
  const uuid = `live-${run}-${name}`
  localStorage.setItem('ghoststories.uuid', uuid)
  const netModule = await import('@/store/networkStore')
  const { useGameStore } = await import('@/store/gameStore')
  const { useLogStore } = await import('@/store/logStore')
  return {
    uuid,
    name,
    net: () => netModule.useNetworkStore.getState(),
    game: () => useGameStore.getState(),
    fake: () => useGameStore.getState().game as unknown as FakeGame,
    log: () => useLogStore.getState(),
  }
}
type Device = Awaited<ReturnType<typeof device>>

const until = (f: () => void, timeout = 20000) => vi.waitFor(f, { timeout, interval: 50 })

function inStep(devices: Device[]) {
  const [first, ...rest] = devices
  for (const d of rest) {
    expect(d.game().game).toEqual(first!.game().game)
    expect(d.log().entries).toEqual(first!.log().entries)
  }
}

function ownerOf(devices: Device[], seat: Seat): Device {
  const host = devices[0]!
  return devices.find((d) => host.net().seatUuids[seat] === d.uuid) ?? host
}

async function playTurn(devices: Device[]) {
  const seat = devices[0]!.fake().active
  const before = devices[0]!.fake().moves.length
  expect(ownerOf(devices, seat).game().dispatch({ type: 'endTurn', by: seat })).toBe(true)
  await until(() => devices.forEach((d) => expect(d.fake().moves.length).toBe(before + 1)))
}

const noop: RoomEvents = {
  lobby: () => {},
  start: () => {},
  action: () => {},
  chat: () => {},
  presence: () => {},
  connected: () => {},
}

describe.skipIf(!LIVE)('online play on the real Firebase project', () => {
  const all: Device[] = []

  afterAll(() => {
    all.forEach((d) => d.net().leaveRoom())
    console.log(`[live] rooms used: ${rooms.join(', ')}`)
  })

  it('create, join, claim seats, start, play, race, rejoin, spectate', async () => {
    const host = await device('host')
    all.push(host)
    await host.net().createRoom('Hana')
    await until(() => expect(host.net().connection).toBe('lobby'))
    const code = host.net().roomCode!
    rooms.push(code)

    const guest = await device('guest')
    all.push(guest)
    await guest.net().joinRoom(code, 'Gus')
    await until(() => expect(guest.net().connection).toBe('lobby'))
    await until(() => expect(host.net().onlineUuids.has(guest.uuid)).toBe(true))
    expect(await guest.net().claimSeat('green')).toBe(true)

    // Unknown code: an immediate, definite answer.
    const lost = await device('lost')
    await lost.net().joinRoom('Q9Q9', 'Lo')
    expect(lost.net().joinFailure).toMatchObject({ reason: 'notFound' })

    await host.net().hostSetSeat('blue', 'ai')
    await host.net().hostSetSeat('yellow', 'neutral')
    await host.net().hostSetWhiteMoon({ enabled: true })
    await until(() => {
      expect(guest.net().lobby.seats.green.uuid).toBe(guest.uuid)
      expect(guest.net().lobby.seats.yellow.kind).toBe('neutral')
      expect(guest.net().lobby.whiteMoon.enabled).toBe(true)
    })

    await host.net().hostStartGame()
    await until(() => expect(guest.net().connection).toBe('in-game'))
    expect(guest.net().role).toBe('guest')
    expect(guest.fake().config.whiteMoon).toEqual({ portal: 'center', randomTiles: false })
    inStep([host, guest])

    for (let i = 0; i < 12; i++) await playTurn([host, guest])
    inStep([host, guest])

    // Both take the last Buddha at the same moment: one stands.
    const take = (by: 'red' | 'green'): Action => ({ type: 'help', by, params: { kind: 'buddhistTemple' } })
    host.game().dispatch(take('red'))
    guest.game().dispatch(take('green'))
    await until(() => {
      expect(host.fake().temple).toBe(0)
      expect(guest.fake().moves).toEqual(host.fake().moves)
      expect(host.fake().moves.filter((m) => m.endsWith(':buddha'))).toHaveLength(1)
    })
    inStep([host, guest])

    // The guest drops out and comes back: full game and history.
    guest.net().leaveRoom()
    await until(() => expect(host.net().onlineUuids.has(guest.uuid)).toBe(false))
    const back = await device('guest')
    all.push(back)
    await back.net().joinRoom(code, 'Gus')
    await until(() => expect(back.net().connection).toBe('in-game'))
    await until(() => expect(back.fake().moves.length).toBe(host.fake().moves.length))
    expect(back.net().role).toBe('guest')
    inStep([host, back])
    for (let i = 0; i < 4; i++) await playTurn([host, back])
    inStep([host, back])

    // A stranger spectates.
    const stranger = await device('stranger')
    all.push(stranger)
    await stranger.net().joinRoom(code, 'Sam')
    await until(() => expect(stranger.fake()?.moves.length).toBe(host.fake().moves.length))
    expect(stranger.net().role).toBe('spectator')
    inStep([host, stranger])
  }, 180000)

  it('the rules: write-once log slots, host-only start, no overwriting a live room', async () => {
    const { createFirebaseTransport } = await vi.importActual<typeof import('@/net/firebaseRoom')>('@/net/firebaseRoom')
    const a = createFirebaseTransport({ appName: `rules-a-${run}`, persistence: 'memory' })
    const b = createFirebaseTransport({ appName: `rules-b-${run}`, persistence: 'memory' })
    const code = `T${run.slice(-3).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}`
    rooms.push(code)
    const lobby = defaultLobby('ua', 'A', 1)
    const meta = (hostUuid: string) => ({ hostUuid, createdAt: Date.now(), build: 'live-test' })
    const ca = await a.createRoom(code, meta('ua'), lobby, { uuid: 'ua', name: 'A' }, noop)
    expect(ca).not.toBeNull()
    // Someone else can't take over the code.
    expect(await b.createRoom(code, meta('ub'), lobby, { uuid: 'ub', name: 'B' }, noop)).toBeNull()
    const cb = (await b.joinRoom(code, { uuid: 'ub', name: 'B' }, noop))!
    expect(cb).not.toBeNull()
    // Only the host starts; nobody writes moves before the start.
    const entry = { action: { type: 'endTurn', by: 'red' } as Action, nonce: 'n1', at: Date.now() }
    await expect(ca!.appendAction(0, entry)).rejects.toThrow(/permission/i)
    const start: StartRecord = {
      config: { difficulty: 'normal', seats: { red: 'human', blue: 'human', green: 'neutral', yellow: 'neutral' }, seed: 1 },
      seatUuids: { red: 'ua', blue: 'ub' },
      hostUuid: 'ua',
      startedAt: Date.now(),
      check: 'test',
    }
    await expect(cb.start(start)).rejects.toThrow(/permission/i)
    await ca!.start(start)
    // Both race for slot 0: exactly one wins; slot 1 is then free.
    const results = await Promise.all([ca!.appendAction(0, entry), cb.appendAction(0, { ...entry, nonce: 'n2' })])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await cb.appendAction(1, { ...entry, nonce: 'n3' })).toBe(true)
    expect(await ca!.appendAction(1, { ...entry, nonce: 'n4' })).toBe(false)
    // Oversized moves are refused.
    await expect(cb.appendAction(2, { ...entry, nonce: 'x'.repeat(4000) })).rejects.toThrow(/permission/i)
    // The lobby is closed once the game has started.
    await expect(cb.updateLobby((l) => ({ ...l, seed: 2 }))).rejects.toThrow(/permission/i)
    ca!.leave()
    cb.leave()
  }, 60000)

  it('week-old rooms are cleared unless someone is still in them; younger codes stay private', async () => {
    const real = await vi.importActual<typeof import('@/net/firebaseRoom')>('@/net/firebaseRoom')
    const app = initializeApp(real.FIREBASE_CONFIG, `sweep-raw-${run}`)
    const auth = initializeAuth(app, { persistence: inMemoryPersistence })
    const uid = (await signInAnonymously(auth)).user.uid
    const db = getDatabase(app)
    const at = (path: string) => ref(db, `${real.DB_ROOT}/${path}`)
    const DAY = 24 * 60 * 60 * 1000
    const tag = run.slice(-3).toUpperCase().replace(/[^A-Z0-9]/g, 'X')
    const [idle, busy] = [`O${tag}`, `P${tag}`]
    // Clients can't plant an old day (that's the point), so plant it as admin
    // with the CLI (paths relative to DB_ROOT).
    const oldDay = Math.floor(Date.now() / DAY) - 9
    const room = {
      meta: { hostUuid: 'raw', hostUid: uid, createdAt: oldDay * DAY + 3_600_000, build: 'live-test', v: real.PROTOCOL_VERSION },
      lobby: '{}',
    }
    const plant = {
      [`roomDays/${oldDay}`]: (oldDay + 1) * DAY,
      [`roomIndex/${oldDay}/${idle}`]: true,
      [`roomIndex/${oldDay}/${busy}`]: true,
      [`rooms/${idle}`]: room,
      [`rooms/${busy}`]: { ...room, presence: { raw: { uid, uuid: 'raw', name: 'Still here' } } },
    }
    const file = join(tmpdir(), `ghost-stories-plant-${run}.json`)
    writeFileSync(file, JSON.stringify(plant))
    execSync(
      `npx -y firebase-tools@latest database:update /${real.DB_ROOT} "${file}" --project ${real.FIREBASE_CONFIG.projectId} --force`,
      { stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' } },
    )
    unlinkSync(file)

    // Anyone can see which days have rooms, but not a recent day's codes, and can't delete a live room.
    expect((await get(at(`roomDays/${oldDay}`))).val()).toBe((oldDay + 1) * DAY)
    const host = real.createFirebaseTransport({ appName: `sweep-host-${run}`, persistence: 'memory' })
    const code = `S${tag}`
    rooms.push(code)
    // Making a room sweeps: the idle week-old room goes, the busy one (and its day) stay.
    const c = await host.createRoom(
      code,
      { hostUuid: 'h', createdAt: Date.now(), build: 'live-test' },
      defaultLobby('h', 'H', 1),
      { uuid: 'h', name: 'H' },
      noop,
    )
    expect(c).not.toBeNull()
    await expect(get(at(`roomIndex/${Math.floor(Date.now() / DAY)}`))).rejects.toThrow(/permission/i)
    await expect(remove(at(`rooms/${code}`))).rejects.toThrow(/permission/i)
    // Nothing outside this app's key is open to it (other apps share the database).
    await expect(get(ref(db, `notGhostStories${tag}`))).rejects.toThrow(/permission/i)
    await expect(set(ref(db, `notGhostStories${tag}`), 1)).rejects.toThrow(/permission/i)
    await vi.waitFor(async () => expect((await get(at(`rooms/${idle}/meta`))).exists()).toBe(false), { timeout: 15000 })
    expect((await get(at(`rooms/${busy}/meta`))).exists()).toBe(true)
    expect((await get(at(`roomDays/${oldDay}`))).exists()).toBe(true)

    // Once the last device leaves, the next sweep clears it and its day.
    await remove(at(`rooms/${busy}/presence/raw`))
    expect(await real.sweepStaleRooms(db)).toContain(busy)
    expect((await get(at(`rooms/${busy}/meta`))).exists()).toBe(false)
    expect((await get(at(`roomDays/${oldDay}`))).exists()).toBe(false)
    c!.leave()
  }, 90000)
})
