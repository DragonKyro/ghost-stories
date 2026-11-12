// Online play: the room this device is in, its lobby, the people in it, chat,
// and the bridge between the room's action log and gameStore.
//
// - The transport (src/net/firebaseRoom.ts, Firebase Realtime Database) is
//   loaded on first use, so the SDK only downloads when someone goes online.
// - The lobby is a JSON string edited by transaction: every device seats
//   itself; only the host's device offers the settings (src/store/lobby.ts
//   has the rules and the edits).
// - The host starts the game by writing a StartRecord (the GameConfig, seat →
//   UUID, a checksum of createGame(config)). Every device builds the start
//   with createGame(config) and replays the log (ActionSync, ./actionSync.ts).
// - gameStore's dispatch guard (registered here) lets a device act only for
//   its own seats; the host also acts for the seats nobody owns (the AI, and
//   anything asked of a neutral board), and is the only device that runs the
//   AI (`runsAi`).

import { create } from 'zustand'
import { actionSeat, createGame } from '@/game/engine'
import type { Difficulty, GameState, Seat } from '@/game/types'
import {
  type ChatMessage,
  type ConnectionState,
  type LobbyBlackSecret,
  type LobbySeatKind,
  type LobbyState,
  type LobbyWhiteMoon,
  type LocalRole,
  type Presence,
  type RoomConnection,
  type RoomEvents,
  type RoomTransport,
  type StartRecord,
  ServerUnreachableError,
  cleanDisplayName,
  generateRoomCode,
  getOrCreateUuid,
  getSavedDisplayName,
  normalizeRoomCode,
  roomCodeFromUrl,
  saveDisplayName,
  setRoomCodeInUrl,
} from '@/net'
import {
  registerBroadcastHandler,
  registerDispatchGuard,
  registerOnlinePredicate,
  useGameStore,
  type GameSnapshot,
} from './gameStore'
import { ActionSync } from './actionSync'
import {
  TAOIST_SEATS,
  claimProblem,
  claimSeatEdit,
  defaultLobby,
  hostSetSeatEdit,
  leaveLobbyEdit,
  lobbySeat,
  lobbySeatUuids,
  lobbyStartProblem,
  lobbyToConfig,
  normalizeLobby,
  releaseSeatEdit,
  renameEdit,
  setBlackSecretEdit,
  setDifficultyEdit,
  setWhiteMoonEdit,
} from './lobby'

const SYSTEM_NAME = 'System'
const MAX_CHAT_LENGTH = 500
/** Every seat, in board order then Wu-Feng. */
const ALL_SEATS: readonly Seat[] = [...TAOIST_SEATS, 'wufeng']

/** The build this page runs (rooms record the build that made them). */
export const APP_BUILD = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : 'dev'

/** Why a join gave up, for the error screen. */
export interface JoinFailure {
  code: string
  /** notFound: the server has no room with this code. unreachable: this device couldn't reach the server. */
  reason: 'notFound' | 'unreachable'
  detail?: string
}

/** FNV-1a over the state's JSON: devices compare it to know they built the same starting game. */
export function gameChecksum(state: GameState): string {
  const json = JSON.stringify(state)
  let h = 0x811c9dc5
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

const UNREACHABLE_TEXT = "Couldn't reach the game server. Check this device's internet connection, then try again."

export interface NetStore {
  connection: ConnectionState
  errorMessage: string | null
  role: LocalRole
  myUuid: string
  myDisplayName: string
  roomCode: string | null
  hostUuid: string | null
  joinFailure: JoinFailure | null
  /** This device's link to the server; false while it reconnects (moves wait, then go through). */
  serverConnected: boolean
  lobby: LobbyState
  /** Seat → UUID from the start record (empty until the game starts). null: AI / neutral. */
  seatUuids: Partial<Record<Seat, string | null>>
  /** Everyone connected to the room (this device included). */
  onlineUuids: Set<string>
  /** The same people with their names, one entry per person. */
  people: Presence[]
  chat: ChatMessage[]
  /** Why this device's last lobby request didn't go through (seat taken, …); cleared by the next one. */
  lobbyNotice: string | null

  setDisplayName: (name: string) => void
  createRoom: (name: string) => Promise<void>
  joinRoom: (code: string, name: string) => Promise<void>
  /** Join the room of the last failed join again. */
  retryJoin: () => void
  /** Leave the room (a guest in the lobby gives up their seats); leaving a game also quits it. */
  leaveRoom: () => void
  clearError: () => void

  /** Sit down in an open seat (any device). Resolves true when the lobby changed. */
  claimSeat: (seat: Seat) => Promise<boolean>
  /** Get up from one of your seats. */
  releaseSeat: (seat: Seat) => Promise<boolean>
  /** Host: open a seat (removing whoever sits there), give it to the AI, or leave a board neutral. */
  hostSetSeat: (seat: Seat, kind: Exclude<LobbySeatKind, 'human'>) => Promise<boolean>
  hostSetDifficulty: (difficulty: Difficulty) => Promise<boolean>
  hostSetWhiteMoon: (patch: Partial<LobbyWhiteMoon>) => Promise<boolean>
  hostSetBlackSecret: (patch: Partial<LobbyBlackSecret>) => Promise<boolean>
  hostStartGame: () => Promise<void>

  sendChat: (text: string) => void
}

// Loaded on first use so the Firebase SDK isn't in the main bundle.
// (Tests swap the module for src/net/fakeTransport.ts.)
type LoadedTransport = RoomTransport & { warmUp: () => void }
let transportPromise: Promise<LoadedTransport> | null = null
function loadTransport(): Promise<LoadedTransport> {
  transportPromise ??= import('@/net/firebaseRoom')
    .then((m) => m.getTransport())
    .catch((e: unknown) => {
      transportPromise = null
      throw new ServerUnreachableError(`Could not load the online code (${(e as Error).message}).`)
    })
  return transportPromise
}

/** Load the online code and sign in ahead of time (call when the online screen opens). */
export function warmUpNetwork(): void {
  loadTransport().then(
    (t) => t.warmUp(),
    () => {},
  )
}

// Internal (non-reactive) session state.
let conn: RoomConnection | null = null
let session = 0 // bumped on every create / join / leave; stale callbacks compare against it
let sync: ActionSync<GameSnapshot> | null = null
let gameStarted = false
let lastPresence: Map<string, string> | null = null // uuid → name

function emptyLobby(): LobbyState {
  return normalizeLobby({} as LobbyState)
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}

function messageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sysMessage(text: string, myUuid: string): ChatMessage {
  return { id: messageId(), senderUuid: myUuid, senderName: SYSTEM_NAME, text, timestamp: Date.now(), kind: 'system' }
}

function userMessage(text: string, uuid: string, name: string): ChatMessage {
  return { id: messageId(), senderUuid: uuid, senderName: name, text, timestamp: Date.now(), kind: 'user' }
}

/** In (or getting into) a room: the cases where this device isn't the whole table. */
function inRoom(connection: ConnectionState): boolean {
  return connection === 'connecting' || connection === 'lobby' || connection === 'in-game'
}

export const useNetworkStore = create<NetStore>((set, get) => {
  registerOnlinePredicate(() => {
    const c = get().connection
    return c === 'lobby' || c === 'in-game'
  })
  registerBroadcastHandler((action, before, at) => sync?.local(action, before, at))
  // Act only for your own seats (the host also for seats nobody owns), so
  // nothing is ever written for a seat this device doesn't play.
  registerDispatchGuard((action) => {
    const s = get()
    if (s.connection !== 'in-game') return null
    if (s.role === 'spectator') return "You're watching this game, not playing in it."
    const game = useGameStore.getState().game
    if (!game) return null
    let seat: Seat
    try {
      seat = actionSeat(game, action)
    } catch (e) {
      return (e as Error).message
    }
    const owner = s.seatUuids[seat] ?? null
    if (owner === s.myUuid) return null
    if (owner === null) return s.role === 'host' ? null : "The host's device plays that seat."
    return "That's another player's seat."
  })

  const myUuid = getOrCreateUuid()

  /** End the current session (if any) and start a new one; returns its id. */
  function beginSession(): number {
    session++
    sync?.close()
    sync = null
    conn?.leave()
    conn = null
    gameStarted = false
    lastPresence = null
    return session
  }

  function addSystem(text: string): void {
    set({ chat: [...get().chat, sysMessage(text, get().myUuid)] })
  }

  function makeSync(): ActionSync<GameSnapshot> {
    return new ActionSync<GameSnapshot>({
      apply: (entry) => {
        useGameStore.getState().applyLocal(entry.action, entry.at)
      },
      reapply: (entry) => useGameStore.getState().applyLocal(entry.action, entry.at),
      snapshot: () => {
        const snap = useGameStore.getState().takeSnapshot()
        if (!snap) throw new Error('No game to snapshot.')
        return snap
      },
      restore: (snap) => useGameStore.getState().restoreSnapshot(snap),
      write: (seq, entry) => (conn ? conn.appendAction(seq, entry) : Promise.resolve(false)),
      dropped: (_action, why) => {
        useGameStore.setState({
          error:
            why === 'overtaken'
              ? "Another player's move went through first, so yours was taken back."
              : 'The server refused that move.',
        })
      },
    })
  }

  function onLobby(raw: LobbyState): void {
    // A lobby written by another build may lack fields: fill them in first.
    const lobby = normalizeLobby(raw)
    const s = get()
    // A started lobby means the game record is on its way: stay on the
    // "joining" card rather than flash the lobby.
    const toLobby = s.connection === 'connecting' && !gameStarted && !lobby.started
    set({
      lobby,
      hostUuid: lobby.hostUuid,
      role: gameStarted ? s.role : lobby.hostUuid === s.myUuid ? 'host' : 'guest',
      connection: toLobby ? 'lobby' : s.connection,
    })
  }

  function onStart(rec: StartRecord): void {
    if (gameStarted) return // written once; ignore repeats
    gameStarted = true
    const me = get().myUuid
    const seatUuids = { ...rec.seatUuids }
    const wasInLobby = get().connection === 'lobby'
    const isPlayer = Object.values(seatUuids).includes(me)
    const role: LocalRole = rec.hostUuid === me ? 'host' : isPlayer ? 'guest' : 'spectator'
    set({
      connection: 'in-game',
      role,
      hostUuid: rec.hostUuid,
      seatUuids,
      errorMessage: null,
      joinFailure: null,
      lobbyNotice: null,
    })
    addSystem(wasInLobby ? 'Game started' : isPlayer ? 'Rejoined the game' : 'Spectating')
    // Every device builds the starting game from the same config.
    let game: GameState
    try {
      game = createGame(rec.config)
    } catch (e) {
      addSystem(`This device couldn't set up the game (${(e as Error).message}). Reload the page.`)
      return
    }
    if (gameChecksum(game) !== rec.check) {
      addSystem(
        "This device set up a different game from the host's, so moves won't line up. " +
          "Reload every device's page so they all run the same version.",
      )
    }
    useGameStore.getState().setGameState(game, rec.startedAt)
    // Replay the log from the start: every device ends up with the same game
    // and the full history.
    sync?.begin()
  }

  function onChat(msg: ChatMessage): void {
    if (get().chat.some((c) => c.id === msg.id)) return
    set({ chat: [...get().chat, msg] })
  }

  function onPresence(list: Presence[]): void {
    const me = get().myUuid
    const now = new Map<string, string>()
    for (const p of list) if (!now.has(p.uuid) || p.name) now.set(p.uuid, p.name)
    const online = new Set(now.keys())
    online.add(me)
    const lines: string[] = []
    if (lastPresence) {
      for (const [uuid, name] of now) {
        if (!lastPresence.has(uuid) && uuid !== me) lines.push(`${name || 'A player'} joined`)
      }
      for (const [uuid, name] of lastPresence) {
        if (!now.has(uuid) && uuid !== me) lines.push(`${name || 'A player'} disconnected`)
      }
    }
    lastPresence = now
    const people = [...now].map(([uuid, name]) => ({ uuid, name }))
    if (!now.has(me)) people.unshift({ uuid: me, name: get().myDisplayName })
    set({
      onlineUuids: online,
      people,
      chat: lines.length ? [...get().chat, ...lines.map((l) => sysMessage(l, me))] : get().chat,
    })
  }

  function roomEvents(my: number): RoomEvents {
    const live = () => my === session
    return {
      lobby: (lobby) => live() && onLobby(lobby),
      start: (rec) => live() && onStart(rec),
      action: (seq, entry) => live() && sync?.receive(seq, entry),
      chat: (msg) => live() && onChat(msg),
      presence: (people) => live() && onPresence(people),
      connected: (up) => live() && set({ serverConnected: up }),
    }
  }

  function editLobby(edit: (lobby: LobbyState) => LobbyState | null): Promise<LobbyState | null> {
    if (!conn) return Promise.resolve(null)
    return conn
      .updateLobby((l) => edit(normalizeLobby(l)))
      .catch((e: unknown) => {
        console.warn('[net] lobby update failed:', (e as Error).message)
        return null
      })
  }

  /** A lobby edit this device's UI asked for; `refused` explains a no-op to the player. */
  async function request(
    edit: (lobby: LobbyState) => LobbyState | null,
    refused: string | null = null,
  ): Promise<boolean> {
    if (get().connection !== 'lobby') return false
    const done = (await editLobby(edit)) !== null
    set({ lobbyNotice: done ? null : refused })
    return done
  }

  const isHost = () => get().role === 'host' && get().connection === 'lobby'

  function failJoin(code: string, reason: JoinFailure['reason'], detail?: string): void {
    beginSession()
    if (reason === 'notFound') setRoomCodeInUrl(null)
    set({
      connection: 'error',
      joinFailure: { code, reason, detail },
      errorMessage:
        reason === 'notFound'
          ? `There's no room with code ${code}. Check the code with the host (rooms are cleared a week after they're made).`
          : UNREACHABLE_TEXT,
    })
  }

  return {
    connection: 'disconnected',
    errorMessage: null,
    role: 'solo',
    myUuid,
    myDisplayName: getSavedDisplayName() || 'Player',
    roomCode: null,
    hostUuid: null,
    joinFailure: null,
    serverConnected: true,
    lobby: emptyLobby(),
    seatUuids: {},
    onlineUuids: new Set(),
    people: [],
    chat: [],
    lobbyNotice: null,

    setDisplayName: (raw) => {
      const name = cleanDisplayName(raw)
      if (!name) return
      saveDisplayName(name)
      set({ myDisplayName: name })
      if (get().connection === 'lobby') void editLobby((l) => renameEdit(l, get().myUuid, name))
    },

    createRoom: async (raw) => {
      const name = cleanDisplayName(raw) || 'Player'
      saveDisplayName(name)
      const my = beginSession()
      const me = get().myUuid
      const lobby = defaultLobby(me, name, randomSeed())
      sync = makeSync()
      set({
        connection: 'connecting',
        role: 'host',
        myDisplayName: name,
        roomCode: null,
        hostUuid: me,
        joinFailure: null,
        errorMessage: null,
        serverConnected: true,
        lobby,
        seatUuids: {},
        onlineUuids: new Set([me]),
        people: [{ uuid: me, name }],
        chat: [],
        lobbyNotice: null,
      })
      try {
        const transport = await loadTransport()
        let c: RoomConnection | null = null
        // A code still in use by a live room is refused; draw another.
        for (let attempt = 0; attempt < 6 && !c && my === session; attempt++) {
          c = await transport.createRoom(
            generateRoomCode(),
            { hostUuid: me, createdAt: Date.now(), build: APP_BUILD },
            lobby,
            { uuid: me, name },
            roomEvents(my),
          )
        }
        if (my !== session) {
          c?.leave()
          return
        }
        if (!c) throw new Error('Could not find a free room code. Try again.')
        conn = c
        setRoomCodeInUrl(c.code)
        set({ roomCode: c.code, connection: get().connection === 'connecting' ? 'lobby' : get().connection })
      } catch (e) {
        if (my !== session) return
        console.error('[net] failed to create room', e)
        beginSession()
        set({
          connection: 'error',
          joinFailure: null,
          errorMessage: e instanceof ServerUnreachableError ? UNREACHABLE_TEXT : (e as Error).message,
        })
      }
    },

    joinRoom: async (code, raw) => {
      const name = cleanDisplayName(raw) || 'Player'
      saveDisplayName(name)
      const upper = normalizeRoomCode(code)
      const my = beginSession()
      const me = get().myUuid
      sync = makeSync()
      set({
        connection: 'connecting',
        role: 'guest',
        myDisplayName: name,
        roomCode: upper,
        hostUuid: null,
        lobby: emptyLobby(),
        seatUuids: {},
        chat: [],
        errorMessage: null,
        joinFailure: null,
        serverConnected: true,
        onlineUuids: new Set([me]),
        people: [{ uuid: me, name }],
        lobbyNotice: null,
      })
      let c: RoomConnection | null
      try {
        const transport = await loadTransport()
        c = await transport.joinRoom(upper, { uuid: me, name }, roomEvents(my))
      } catch (e) {
        if (my !== session) return
        console.error('[net] failed to join room', e)
        failJoin(upper, 'unreachable', (e as Error).message)
        return
      }
      if (my !== session) {
        c?.leave()
        return
      }
      if (!c) {
        failJoin(upper, 'notFound')
        return
      }
      conn = c
      setRoomCodeInUrl(upper)
      if (c.meta.build !== APP_BUILD) {
        addSystem(
          `This room was made by another version of the game (${c.meta.build}; this device runs ${APP_BUILD}). ` +
            "If moves stop lining up, reload every device's page.",
        )
      }
      // Rejoining the lobby under a new name: the seats show it.
      await editLobby((l) => renameEdit(l, me, name))
    },

    retryJoin: () => {
      const code = get().joinFailure?.code ?? get().roomCode
      if (code) void get().joinRoom(code, get().myDisplayName)
    },

    leaveRoom: () => {
      const s = get()
      const c = conn
      conn = null
      // A guest leaving the lobby gives up their seats.
      if (c && s.connection === 'lobby' && s.role !== 'host') {
        c.updateLobby((l) => leaveLobbyEdit(normalizeLobby(l), s.myUuid))
          .catch(() => null)
          .finally(() => c.leave())
      } else {
        c?.leave()
      }
      beginSession()
      setRoomCodeInUrl(null)
      set({
        connection: 'disconnected',
        errorMessage: null,
        role: 'solo',
        roomCode: null,
        hostUuid: null,
        joinFailure: null,
        serverConnected: true,
        lobby: emptyLobby(),
        seatUuids: {},
        onlineUuids: new Set(),
        people: [],
        chat: [],
        lobbyNotice: null,
      })
      const g = useGameStore.getState()
      if (g.game || g.uiMode === 'inGame') g.quitGame()
    },

    clearError: () => {
      beginSession()
      setRoomCodeInUrl(null)
      set({ connection: 'disconnected', role: 'solo', errorMessage: null, joinFailure: null, roomCode: null })
    },

    claimSeat: (seat) => {
      const { myUuid: me, myDisplayName: name, lobby } = get()
      const why = claimProblem(lobby, seat, me)
      if (why) {
        set({ lobbyNotice: why })
        return Promise.resolve(false)
      }
      return request((l) => claimSeatEdit(l, seat, me, name), 'Someone else just took that seat.')
    },

    releaseSeat: (seat) => request((l) => releaseSeatEdit(l, seat, get().myUuid)),

    hostSetSeat: (seat, kind) => (isHost() ? request((l) => hostSetSeatEdit(l, seat, kind)) : Promise.resolve(false)),

    hostSetDifficulty: (difficulty) =>
      isHost() ? request((l) => setDifficultyEdit(l, difficulty)) : Promise.resolve(false),

    hostSetWhiteMoon: (patch) => (isHost() ? request((l) => setWhiteMoonEdit(l, patch)) : Promise.resolve(false)),

    hostSetBlackSecret: (patch) =>
      isHost() ? request((l) => setBlackSecretEdit(l, patch)) : Promise.resolve(false),

    hostStartGame: async () => {
      const c = conn
      const my = session
      if (!isHost() || !c || get().lobby.started || lobbyStartProblem(get().lobby)) return
      // Lock the seats and settings first, atomically: a guest taking a seat
      // at the same moment either makes it in or finds the lobby closed.
      const final = await editLobby((l) => (l.started || lobbyStartProblem(l) ? null : { ...l, started: true }))
      if (!final || my !== session) return
      const reopen = (why: string) => {
        addSystem(`Couldn't start the game: ${why}`)
        void editLobby((l) => (l.started ? { ...l, started: false } : null))
      }
      const config = lobbyToConfig(final)
      let check: string
      try {
        check = gameChecksum(createGame(config))
      } catch (e) {
        reopen((e as Error).message)
        return
      }
      try {
        await c.start({
          config,
          seatUuids: lobbySeatUuids(final),
          hostUuid: get().myUuid,
          startedAt: Date.now(),
          check,
        })
      } catch (e) {
        if (my === session && !gameStarted) reopen((e as Error).message)
      }
    },

    sendChat: (text) => {
      const trimmed = text.trim().slice(0, MAX_CHAT_LENGTH)
      if (!trimmed || !conn) return
      const msg = userMessage(trimmed, get().myUuid, get().myDisplayName)
      // Shown at once; the room's copy is de-duplicated by id.
      set({ chat: [...get().chat, msg] })
      conn.sendChat(msg).catch((e: unknown) => console.warn('[net] chat send failed:', (e as Error).message))
    },
  }
})

// === Helpers for the game UI ===
// Each reads the store's current state, or the state it's given, so a React
// component can call them inside a selector:
//   const mine = useNetworkStore(useShallow((s) => controlledSeats(s)))

/** Does this device run the AI? Always offline; online only the host's device. */
export function runsAi(s: NetStore = useNetworkStore.getState()): boolean {
  return !inRoom(s.connection) || s.role === 'host'
}

/**
 * The seats this device plays: 'all' offline (solo / hot-seat), else the
 * seats on its UUID (none for a spectator, or before the game starts).
 */
export function controlledSeats(s: NetStore = useNetworkStore.getState()): Seat[] | 'all' {
  if (!inRoom(s.connection)) return 'all'
  return ALL_SEATS.filter((seat) => s.seatUuids[seat] === s.myUuid)
}

/** May this device act for `seat`? (The dispatch guard's rule, for enabling controls.) */
export function canActFor(seat: Seat, s: NetStore = useNetworkStore.getState()): boolean {
  if (!inRoom(s.connection)) return true
  if (s.connection !== 'in-game' || s.role === 'spectator') return false
  const owner = s.seatUuids[seat] ?? null
  return owner === s.myUuid || (owner === null && s.role === 'host')
}

/**
 * Is whoever plays `seat` connected? Always true offline. A seat nobody owns
 * (the AI, a neutral board) is played by the host's device, so it's online
 * when the host is.
 */
export function isSeatOnline(seat: Seat, s: NetStore = useNetworkStore.getState()): boolean {
  if (!inRoom(s.connection)) return true
  const uuid = s.seatUuids[seat] ?? (s.connection === 'in-game' ? null : lobbySeat(s.lobby, seat).uuid)
  if (uuid) return s.onlineUuids.has(uuid)
  return s.hostUuid !== null && s.onlineUuids.has(s.hostUuid)
}

/** The name of the person (or 'AI') playing `seat` online; null offline and for neutral boards. */
export function seatName(seat: Seat, s: NetStore = useNetworkStore.getState()): string | null {
  if (!inRoom(s.connection)) return null
  const ls = lobbySeat(s.lobby, seat)
  if (ls.kind === 'human' || ls.kind === 'ai') return ls.name || null
  return null
}

/**
 * Call once when the app loads: a page opened (or reloaded) with ?room=CODE
 * goes to the online screen and, when this device has a saved name, rejoins
 * that room (else the join form opens with the code filled in). Returns true
 * when it went to the online screen.
 */
export function resumeFromUrl(): boolean {
  const code = roomCodeFromUrl()
  const net = useNetworkStore.getState()
  if (!code || net.connection !== 'disconnected' || useGameStore.getState().game) return false
  useGameStore.getState().setUiMode('online')
  const name = getSavedDisplayName()
  if (name) void net.joinRoom(code, name)
  return true
}
