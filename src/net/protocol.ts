// Wire protocol — the typed messages that flow across Trystero channels.
//
// Channel names are kept short (Trystero caps namespaces at 12 chars).

import type { Action } from '@/game/actions'
import type { Difficulty, GameState, TaoistColor } from '@/game/types'

// `hello` — every peer announces itself on join.
export type HelloMsg = {
  uuid: string
  name: string
  appVersion: string
}

// `lobby` — host broadcasts the current lobby state on every change. Guests
// never send on this channel.
export type LobbyMsg = LobbyState

export type LobbyState = {
  // Host's UUID (authoritative for lobby state changes).
  hostUuid: string
  // UUID → human-readable name, populated from hello broadcasts.
  members: Record<string, { uuid: string; name: string; online: boolean }>
  // UUID → seat color. Seats are explicit picks by users in the lobby.
  seatAssignments: Partial<Record<TaoistColor, string>> // color → uuid
  // Seat types per color: 'human' (claimed by a uuid), 'ai', or 'neutral'.
  seatTypes: Record<TaoistColor, 'human' | 'ai' | 'neutral'>
  difficulty: Difficulty
  /** Set to true when Black Secret is on. */
  blackSecret?: boolean
  /** UUID of the Wu-Feng player (Black Secret only). */
  wuFengUuid?: string | null
  /** White Moon toggle. */
  whiteMoon?: boolean
  /** Portal placement variant (White Moon). */
  portalPlacement?: 'center' | 'edge' | 'corner'
  // Set to true when the host clicks Start. Lobby freezes once true.
  started: boolean
}

// `start` — host broadcasts the initial GameState + seatUuids when starting.
export type StartMsg = {
  gameState: GameState
  /** Map seat color → uuid at game start. */
  seatUuids: Partial<Record<TaoistColor, string>>
}

// `action` — every dispatched action travels here, paired with the sender's
// UUID so receivers can authenticate seat ownership.
export type ActionMsg = {
  action: Action
  byUuid: string
}

// `snap` — host responds to late joiners with the full live state.
export type SnapMsg = {
  gameState: GameState
  seatUuids: Partial<Record<TaoistColor, string>>
  chat: ChatMsg[]
}

// `chat` — in-game chat. Persistent in `networkStore.chat`.
export type ChatMsg = {
  uuid: string
  name: string
  text: string
  at: number
}

// `req` — guests request a snapshot from the host (for rejoin/spectator).
export type ReqSnapMsg = {
  uuid: string
}

export const CHANNELS = {
  hello: 'hello',
  lobby: 'lobby',
  start: 'start',
  action: 'action',
  snap: 'snap',
  reqSnap: 'reqSnap',
  chat: 'chat',
} as const

export type ChannelName = (typeof CHANNELS)[keyof typeof CHANNELS]

export const APP_VERSION = '0.1.0'
