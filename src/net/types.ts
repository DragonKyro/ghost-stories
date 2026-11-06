// Lobby, chat and room record types for online play. Plain JSON: every one of
// these goes through the database as a JSON string.

import type { Action } from '@/game/actions'
import type { Color, Difficulty, GameConfig, Seat } from '@/game/types'

export type ConnectionState = 'disconnected' | 'connecting' | 'lobby' | 'in-game' | 'error'
export type LocalRole = 'solo' | 'host' | 'guest' | 'spectator'

/**
 * A seat in the lobby. `open`: waiting for someone to sit down. `human`: a
 * person (`uuid`) sits here. `ai`: the host's device plays it. `neutral`: no
 * player (Taoist boards only; 1–3 player games).
 */
export type LobbySeatKind = 'open' | 'human' | 'ai' | 'neutral'

export interface LobbySeat {
  kind: LobbySeatKind
  /** The player's UUID; null unless `kind` is 'human'. */
  uuid: string | null
  name: string
}

export type PortalPlacement = 'center' | 'edge' | 'corner'

export interface LobbyWhiteMoon {
  enabled: boolean
  portal: PortalPlacement
  randomTiles: boolean
}

export interface LobbyBlackSecret {
  enabled: boolean
  side: 'a' | 'b'
}

export interface LobbyState {
  hostUuid: string
  /** The four Taoist boards (red north, blue east, green south, yellow west). */
  seats: Record<Color, LobbySeat>
  /** Black Secret's Wu-Feng player: 'open', 'human' or 'ai' (never 'neutral'). */
  wuFeng: LobbySeat
  difficulty: Difficulty
  whiteMoon: LobbyWhiteMoon
  blackSecret: LobbyBlackSecret
  /** createGame's seed, drawn by the host when the room is made. */
  seed: number
  /** Set by the host, atomically with the final seats, as the game starts. */
  started?: boolean
}

export interface ChatMessage {
  id: string
  senderUuid: string
  senderName: string
  text: string
  timestamp: number
  kind: 'user' | 'system'
}

// === What a room stores ===

/** Written once, by the host, when the room is made. */
export interface RoomMeta {
  hostUuid: string
  createdAt: number
  /** The app build that made the room (devices on other builds may not stay in step). */
  build: string
}

/**
 * How the game began. It carries createGame's input rather than the starting
 * GameState: createGame is deterministic, so every device builds the same
 * game from it, then applies the action log.
 */
export interface StartRecord {
  config: GameConfig
  /** Seat → the UUID playing it (null: AI or neutral). Devices whose UUID isn't here spectate. */
  seatUuids: Partial<Record<Seat, string | null>>
  hostUuid: string
  /** When the host started the game (ms since epoch); the game clock counts from here. */
  startedAt: number
  /** Checksum of the starting GameState, so a device that built a different one (another app version) can tell. */
  check: string
}

/** One move in the room's action log. */
export interface LoggedAction {
  action: Action
  /** Short random id, so the author recognises its own move in the log. */
  nonce: string
  /** When the move was made (ms since epoch, the author's clock): the game clock. */
  at: number
}

/** A device currently connected to the room. */
export interface Presence {
  uuid: string
  name: string
}
