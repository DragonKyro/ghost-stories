// Zustand store for the WebRTC / Trystero session.
//
// Responsibilities:
//   - Own the live `Connection` (or null when offline).
//   - Track role (solo / host / guest / spectator).
//   - Mirror the host-authoritative `LobbyState` for the lobby screen.
//   - Track per-uuid online status.
//   - Hold chat history (in-memory; not part of GameState).
//   - Bridge received `action` envelopes into `gameStore.applyLocal`.
//   - Broadcast locally-dispatched actions via a registered handler.

import { create } from 'zustand'
import { useGameStore, registerBroadcaster } from './gameStore'
import {
  connect,
  getDisplayName,
  getOrCreateUuid,
  APP_VERSION,
  type ActionMsg,
  type ChatMsg,
  type Connection,
  type HelloMsg,
  type LobbyState,
  type ReqSnapMsg,
  type SnapMsg,
  type StartMsg,
} from '@/net'
import type { Action } from '@/game/actions'
import type { Difficulty, GameConfig, TaoistColor } from '@/game/types'

export type Role = 'solo' | 'host' | 'guest' | 'spectator'

const ALL_COLORS: TaoistColor[] = ['red', 'blue', 'green', 'yellow']

function setOnlineFlag(online: boolean) {
  if (typeof window !== 'undefined') {
    ;(window as { __ghostStoriesOnline?: boolean }).__ghostStoriesOnline = online
  }
}

function emptyLobby(hostUuid: string): LobbyState {
  return {
    hostUuid,
    members: { [hostUuid]: { uuid: hostUuid, name: getDisplayName(), online: true } },
    seatAssignments: {},
    seatTypes: { red: 'human', blue: 'human', green: 'human', yellow: 'human' },
    difficulty: 'initiation',
    started: false,
  }
}

type NetworkStore = {
  role: Role
  myUuid: string
  myName: string
  conn: Connection | null
  roomCode: string | null
  lobby: LobbyState | null
  /** UUID → most recent peerId seen for that uuid. */
  peerByUuid: Record<string, string>
  /** seat color → uuid (committed when game starts; survives reconnects). */
  seatUuids: Partial<Record<TaoistColor, string>>
  chat: ChatMsg[]
  /** Most recent error / status message for the UI. */
  status: string | null

  // Setup
  setMyName: (name: string) => void

  // Lifecycle
  host: (roomCode: string) => Promise<void>
  join: (roomCode: string) => Promise<void>
  leave: () => Promise<void>

  // Lobby (host-side mutators)
  claimSeat: (color: TaoistColor) => void
  releaseSeat: (color: TaoistColor) => void
  setSeatType: (color: TaoistColor, type: 'human' | 'ai' | 'neutral') => void
  setDifficulty: (d: Difficulty) => void
  setBlackSecret: (on: boolean) => void
  claimWuFeng: () => void
  releaseWuFeng: () => void
  setWhiteMoon: (on: boolean) => void
  setPortalPlacement: (p: 'center' | 'edge' | 'corner') => void
  startOnlineGame: () => void

  // Chat
  sendChat: (text: string) => void

  // Outbound game actions — gameStore calls this from `dispatch`.
  broadcastAction: (action: Action) => void
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  role: 'solo',
  myUuid: getOrCreateUuid(),
  myName: getDisplayName(),
  conn: null,
  roomCode: null,
  lobby: null,
  peerByUuid: {},
  seatUuids: {},
  chat: [],
  status: null,

  setMyName: (name) => {
    const cleaned = name.trim().slice(0, 24) || 'Player'
    set({ myName: cleaned })
    try {
      // Persist via identity helper.
      if (typeof window !== 'undefined') {
        const isFresh = new URLSearchParams(window.location.search).has('fresh')
        const s = isFresh ? window.sessionStorage : window.localStorage
        s.setItem('ghoststories.name', cleaned)
      }
    } catch { /* ignore quota */ }
    // Re-announce hello if connected.
    const conn = get().conn
    if (conn) conn.send.hello({ uuid: get().myUuid, name: cleaned, appVersion: APP_VERSION })
  },

  host: async (roomCode) => {
    await get().leave()
    const myUuid = get().myUuid
    const conn = connect(roomCode, makeHandlers(get, set, 'host'))
    const lobby = emptyLobby(myUuid)
    set({ role: 'host', conn, roomCode: conn.roomCode, lobby, chat: [], status: `Hosting ${conn.roomCode}` })
    setOnlineFlag(true)
    registerBroadcaster((action) => get().broadcastAction(action))
    conn.send.hello({ uuid: myUuid, name: get().myName, appVersion: APP_VERSION })
  },

  join: async (roomCode) => {
    await get().leave()
    const conn = connect(roomCode, makeHandlers(get, set, 'guest'))
    set({ role: 'guest', conn, roomCode: conn.roomCode, lobby: null, chat: [], status: `Joining ${conn.roomCode}…` })
    setOnlineFlag(true)
    registerBroadcaster((action) => get().broadcastAction(action))
    conn.send.hello({ uuid: get().myUuid, name: get().myName, appVersion: APP_VERSION })
    conn.send.reqSnap({ uuid: get().myUuid })
  },

  leave: async () => {
    const c = get().conn
    if (c) {
      try { await c.leave() } catch { /* trystero swallows */ }
    }
    setOnlineFlag(false)
    registerBroadcaster(null)
    set({
      conn: null, role: 'solo', roomCode: null,
      lobby: null, peerByUuid: {}, chat: [], seatUuids: {}, status: null,
    })
  },

  claimSeat: (color) => {
    const { role, conn, lobby, myUuid } = get()
    if (role !== 'host' || !lobby) return
    // Free any other seat I had.
    const next: LobbyState = JSON.parse(JSON.stringify(lobby))
    for (const c of ALL_COLORS) {
      if (next.seatAssignments[c] === myUuid) delete next.seatAssignments[c]
    }
    next.seatAssignments[color] = myUuid
    next.seatTypes[color] = 'human'
    set({ lobby: next })
    if (conn) conn.send.lobby(next)
  },

  releaseSeat: (color) => {
    const { role, conn, lobby, myUuid } = get()
    if (role !== 'host' || !lobby) return
    if (lobby.seatAssignments[color] !== myUuid) return
    const next: LobbyState = JSON.parse(JSON.stringify(lobby))
    delete next.seatAssignments[color]
    set({ lobby: next })
    if (conn) conn.send.lobby(next)
  },

  setSeatType: (color, type) => {
    const { role, conn, lobby } = get()
    if (role !== 'host' || !lobby) return
    const next: LobbyState = JSON.parse(JSON.stringify(lobby))
    next.seatTypes[color] = type
    if (type !== 'human') delete next.seatAssignments[color]
    set({ lobby: next })
    if (conn) conn.send.lobby(next)
  },

  setDifficulty: (d) => {
    const { role, conn, lobby } = get()
    if (role !== 'host' || !lobby) return
    const next: LobbyState = { ...lobby, difficulty: d }
    set({ lobby: next })
    if (conn) conn.send.lobby(next)
  },

  setBlackSecret: (on) => {
    const { role, conn, lobby } = get()
    if (role !== 'host' || !lobby) return
    const next: LobbyState = { ...lobby, blackSecret: on, wuFengUuid: on ? lobby.wuFengUuid : null }
    set({ lobby: next })
    if (conn) conn.send.lobby(next)
  },

  claimWuFeng: () => {
    const { role, conn, lobby, myUuid } = get()
    if (role !== 'host' || !lobby) return
    const next: LobbyState = { ...lobby, wuFengUuid: myUuid }
    set({ lobby: next })
    if (conn) conn.send.lobby(next)
  },

  releaseWuFeng: () => {
    const { role, conn, lobby } = get()
    if (role !== 'host' || !lobby) return
    const next: LobbyState = { ...lobby, wuFengUuid: null }
    set({ lobby: next })
    if (conn) conn.send.lobby(next)
  },

  setWhiteMoon: (on) => {
    const { role, conn, lobby } = get()
    if (role !== 'host' || !lobby) return
    const next: LobbyState = { ...lobby, whiteMoon: on }
    set({ lobby: next })
    if (conn) conn.send.lobby(next)
  },

  setPortalPlacement: (p) => {
    const { role, conn, lobby } = get()
    if (role !== 'host' || !lobby) return
    const next: LobbyState = { ...lobby, portalPlacement: p }
    set({ lobby: next })
    if (conn) conn.send.lobby(next)
  },

  startOnlineGame: () => {
    const { role, conn, lobby } = get()
    if (role !== 'host' || !conn || !lobby) return
    // Translate the lobby into a GameConfig.
    const seats: GameConfig['seats'] = {}
    const seatUuids: Partial<Record<TaoistColor, string>> = {}
    for (const c of ALL_COLORS) {
      const type = lobby.seatTypes[c]
      if (type === 'human') {
        if (lobby.seatAssignments[c]) {
          seats[c] = 'human'
          seatUuids[c] = lobby.seatAssignments[c]
        }
        // else: human slot but unclaimed → leave as neutral
      } else if (type === 'ai') {
        seats[c] = 'ai'
      }
      // 'neutral' → omitted
    }
    if (Object.keys(seats).length === 0) {
      set({ status: 'At least one seat must be filled.' })
      return
    }

    // Lock the lobby and start.
    const locked: LobbyState = { ...lobby, started: true }
    set({ lobby: locked, seatUuids })
    conn.send.lobby(locked)

    // Host runs createGame locally to obtain the deterministic state, then
    // broadcasts it.
    const expansionsList: Array<'whiteMoon' | 'blackSecret'> = []
    if (lobby.whiteMoon) expansionsList.push('whiteMoon')
    if (lobby.blackSecret) expansionsList.push('blackSecret')
    useGameStore.getState().startGame({
      difficulty: lobby.difficulty,
      seats,
      expansions: expansionsList.length > 0 ? expansionsList : undefined,
      portalPlacement: lobby.portalPlacement,
      wuFengPlayer: lobby.blackSecret && lobby.wuFengUuid
        ? { tag: lobby.members[lobby.wuFengUuid]?.name ?? 'Wu-Feng', uuid: lobby.wuFengUuid }
        : undefined,
    })
    const game = useGameStore.getState().game
    if (!game) return
    const startMsg: StartMsg = { gameState: game, seatUuids }
    conn.send.start(startMsg)
  },

  sendChat: (text) => {
    const clean = text.trim().slice(0, 500)
    if (!clean) return
    const msg: ChatMsg = {
      uuid: get().myUuid,
      name: get().myName,
      text: clean,
      at: Date.now(),
    }
    set((s) => ({ chat: [...s.chat, msg] }))
    const conn = get().conn
    if (conn) conn.send.chat(msg)
  },

  broadcastAction: (action) => {
    const conn = get().conn
    if (!conn) return
    conn.send.action({ action, byUuid: get().myUuid })
  },
}))

// ---------------------------------------------------------------------------
//   Channel handlers — these run when bytes arrive over Trystero.
// ---------------------------------------------------------------------------

function makeHandlers(
  get: () => NetworkStore,
  set: (partial: Partial<NetworkStore> | ((s: NetworkStore) => Partial<NetworkStore>)) => void,
  role: Role,
) {
  return {
    onHello(m: HelloMsg, peerId: string) {
      // Track the uuid ↔ peerId mapping and surface the user in the lobby.
      set((s) => {
        const peerByUuid = { ...s.peerByUuid, [m.uuid]: peerId }
        let lobby = s.lobby
        // Host updates the lobby's members; guests just track presence.
        if (s.role === 'host' && lobby) {
          lobby = {
            ...lobby,
            members: {
              ...lobby.members,
              [m.uuid]: { uuid: m.uuid, name: m.name, online: true },
            },
          }
          // Broadcast the updated lobby so the new peer sees the full state.
          if (s.conn) s.conn.send.lobby(lobby)
        }
        return { peerByUuid, lobby }
      })
      // If we're a guest receiving the host's hello, re-request a snapshot —
      // covers the case where reqSnap arrived before the host was listening.
      if (get().role === 'guest' && get().conn) {
        get().conn!.send.reqSnap({ uuid: get().myUuid })
      }
    },

    onLobby(m: LobbyState) {
      // Guests adopt whatever the host sends. Hosts ignore (they're the source).
      if (get().role === 'host') return
      set({ lobby: m, role: 'guest', status: m.started ? 'Game in progress…' : 'In lobby' })
    },

    onStart(m: StartMsg) {
      // Guests adopt the initial GameState and switch into the in-game UI.
      const myUuid = get().myUuid
      const isInGame = ALL_COLORS.some((c) => m.seatUuids[c] === myUuid)
      set({
        seatUuids: m.seatUuids,
        role: get().role === 'host' ? 'host' : isInGame ? 'guest' : 'spectator',
        status: isInGame ? 'In game' : 'Spectating',
      })
      // Push the state into gameStore via the dedicated entry point.
      useGameStore.getState().receiveSnapshot(m.gameState)
    },

    onAction(m: ActionMsg) {
      // Authenticate seat ownership before applying.
      const myUuid = get().myUuid
      if (m.byUuid === myUuid) return // we already applied locally
      // Cross-check seat ownership: an action with a `taoistId` must come
      // from the UUID assigned to that seat.
      const action = m.action
      // System actions (startTurn / spawnIncarnation) have no taoistId.
      if ('taoistId' in action && typeof action.taoistId === 'string') {
        const color = action.taoistId.replace('taoist-', '') as TaoistColor
        const seatUuid = get().seatUuids[color]
        if (seatUuid && seatUuid !== m.byUuid) return
      }
      // Black Secret: Wu-Feng actions are restricted to the bound Wu-Feng UUID.
      const game = useGameStore.getState().game
      const wuFengUuid = game?.config.wuFengPlayer?.uuid
      const isWuFengAction =
        action.type === 'wuFengIntervene'
        || action.type === 'wuFengDemonActions'
        || action.type === 'wuFengShadowAction'
      if (isWuFengAction && wuFengUuid && wuFengUuid !== m.byUuid) return
      useGameStore.getState().applyLocal(m.action)
    },

    onSnap(m: SnapMsg) {
      if (role === 'host') return // hosts don't accept snapshots
      const myUuid = get().myUuid
      const isInGame = ALL_COLORS.some((c) => m.seatUuids[c] === myUuid)
      set({
        seatUuids: m.seatUuids,
        chat: m.chat ?? [],
        role: isInGame ? 'guest' : 'spectator',
        status: isInGame ? 'In game' : 'Spectating',
      })
      useGameStore.getState().receiveSnapshot(m.gameState)
    },

    onReqSnap(_m: ReqSnapMsg, peerId: string) {
      // Only the host responds. Send the live state + chat history.
      if (get().role !== 'host') return
      const conn = get().conn
      const game = useGameStore.getState().game
      if (!conn || !game) return
      conn.send.snap(
        {
          gameState: game,
          seatUuids: get().seatUuids,
          chat: get().chat,
        },
        peerId,
      )
      // Also send the current lobby so the late joiner sees seat layout.
      if (get().lobby) conn.send.lobby(get().lobby!, peerId)
    },

    onChat(m: ChatMsg) {
      set((s) => ({ chat: [...s.chat, m] }))
    },

    onPeerJoin(peerId: string) {
      set({ status: `Peer joined (${peerId.slice(0, 6)}…)` })
      // Send our hello to the new peer so they know our UUID/name immediately.
      const conn = get().conn
      if (conn) conn.send.hello({ uuid: get().myUuid, name: get().myName, appVersion: APP_VERSION }, peerId)
      // Host: also push lobby + (if game is running) game state so the new
      // peer doesn't have to ask.
      if (get().role === 'host') {
        if (get().lobby) conn?.send.lobby(get().lobby!, peerId)
        const game = useGameStore.getState().game
        if (game) {
          conn?.send.snap(
            { gameState: game, seatUuids: get().seatUuids, chat: get().chat },
            peerId,
          )
        }
      }
    },

    onPeerLeave(peerId: string) {
      // Flip any uuid mapped to this peerId offline.
      set((s) => {
        const peerByUuid = { ...s.peerByUuid }
        let leavingUuid: string | null = null
        for (const [uuid, pid] of Object.entries(peerByUuid)) {
          if (pid === peerId) {
            delete peerByUuid[uuid]
            leavingUuid = uuid
          }
        }
        let lobby = s.lobby
        if (s.role === 'host' && lobby && leavingUuid && lobby.members[leavingUuid]) {
          lobby = {
            ...lobby,
            members: { ...lobby.members, [leavingUuid]: { ...lobby.members[leavingUuid], online: false } },
          }
          if (s.conn) s.conn.send.lobby(lobby)
        }
        return { peerByUuid, lobby, status: `Peer left (${peerId.slice(0, 6)}…)` }
      })
    },
  }
}
