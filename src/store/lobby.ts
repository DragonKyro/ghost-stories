// The online lobby's rules, as pure functions over LobbyState: the default
// lobby, the seat edits every device may make (claim / release) and the
// host's edits, what blocks the start, and the GameConfig a lobby starts.
//
// Every edit returns the new lobby, or null for "nothing to change" (which is
// also what the room transaction expects: null leaves the lobby as it is).
// They run inside the transaction, so they must decide from the lobby they
// are given, never from what this device last saw.

import type { Color, Difficulty, GameConfig, Seat, SeatKind } from '@/game/types'
import type {
  LobbyBlackSecret,
  LobbySeat,
  LobbySeatKind,
  LobbyState,
  LobbyWhiteMoon,
  PortalPlacement,
} from '@/net/types'

/** The four boards, clockwise from red (north). */
export const TAOIST_SEATS: readonly Color[] = ['red', 'blue', 'green', 'yellow']

/** The board across the village. */
export const OPPOSITE: Record<Color, Color> = { red: 'green', green: 'red', blue: 'yellow', yellow: 'blue' }

export const DIFFICULTIES: readonly Difficulty[] = ['initiation', 'normal', 'nightmare', 'hell']
export const PORTAL_PLACEMENTS: readonly PortalPlacement[] = ['center', 'edge', 'corner']

export const AI_NAME = 'AI'

const OPEN: LobbySeat = { kind: 'open', uuid: null, name: '' }

export function openSeat(): LobbySeat {
  return { ...OPEN }
}

export function defaultLobby(hostUuid: string, hostName: string, seed: number): LobbyState {
  return {
    hostUuid,
    seats: {
      red: { kind: 'human', uuid: hostUuid, name: hostName },
      blue: openSeat(),
      green: openSeat(),
      yellow: openSeat(),
    },
    wuFeng: openSeat(),
    difficulty: 'normal',
    whiteMoon: { enabled: false, portal: 'center', randomTiles: false },
    blackSecret: { enabled: false, side: 'a' },
    seed,
  }
}

function normalizeSeat(raw: Partial<LobbySeat> | undefined, allowNeutral: boolean): LobbySeat {
  const kind = raw?.kind
  if (kind === 'human' && typeof raw?.uuid === 'string' && raw.uuid) {
    return { kind, uuid: raw.uuid, name: typeof raw.name === 'string' ? raw.name : '' }
  }
  if (kind === 'ai') return { kind, uuid: null, name: AI_NAME }
  if (kind === 'neutral' && allowNeutral) return { kind, uuid: null, name: '' }
  return openSeat()
}

/**
 * A lobby as this build reads it: whatever another build wrote (missing or
 * unknown fields, a broken seat) becomes something the screen and the edits
 * can rely on.
 */
export function normalizeLobby(raw: LobbyState): LobbyState {
  const r = raw as Partial<LobbyState>
  const seats = (r.seats ?? {}) as Partial<Record<Color, LobbySeat>>
  const wm = (r.whiteMoon ?? {}) as Partial<LobbyWhiteMoon>
  const bs = (r.blackSecret ?? {}) as Partial<LobbyBlackSecret>
  const lobby: LobbyState = {
    hostUuid: typeof r.hostUuid === 'string' ? r.hostUuid : '',
    seats: {
      red: normalizeSeat(seats.red, true),
      blue: normalizeSeat(seats.blue, true),
      green: normalizeSeat(seats.green, true),
      yellow: normalizeSeat(seats.yellow, true),
    },
    wuFeng: normalizeSeat(r.wuFeng, false),
    difficulty: DIFFICULTIES.includes(r.difficulty as Difficulty) ? (r.difficulty as Difficulty) : 'normal',
    whiteMoon: {
      enabled: wm.enabled === true,
      portal: PORTAL_PLACEMENTS.includes(wm.portal as PortalPlacement) ? (wm.portal as PortalPlacement) : 'center',
      randomTiles: wm.randomTiles === true,
    },
    blackSecret: { enabled: bs.enabled === true, side: bs.side === 'b' ? 'b' : 'a' },
    seed: typeof r.seed === 'number' && Number.isFinite(r.seed) ? r.seed : 0,
  }
  if (r.started === true) lobby.started = true
  return lobby
}

export function lobbySeat(lobby: LobbyState, seat: Seat): LobbySeat {
  return seat === 'wufeng' ? lobby.wuFeng : lobby.seats[seat]
}

function withSeat(lobby: LobbyState, seat: Seat, next: LobbySeat): LobbyState {
  return seat === 'wufeng'
    ? { ...lobby, wuFeng: next }
    : { ...lobby, seats: { ...lobby.seats, [seat]: next } }
}

/** The seats `uuid` sits in (Taoist boards first, then Wu-Feng). */
export function seatsHeldBy(lobby: LobbyState, uuid: string): Seat[] {
  const held: Seat[] = TAOIST_SEATS.filter((c) => lobby.seats[c].kind === 'human' && lobby.seats[c].uuid === uuid)
  if (lobby.wuFeng.kind === 'human' && lobby.wuFeng.uuid === uuid) held.push('wufeng')
  return held
}

/** Boards with a Taoist on them (a person or the AI). */
export function playerSeats(lobby: LobbyState): Color[] {
  return TAOIST_SEATS.filter((c) => lobby.seats[c].kind === 'human' || lobby.seats[c].kind === 'ai')
}

/**
 * Why `uuid` can't sit in `seat` right now, or null when they can. A person
 * may play several boards, but never a board and Wu-Feng.
 */
export function claimProblem(lobby: LobbyState, seat: Seat, uuid: string): string | null {
  if (lobby.started) return 'The game has started.'
  const s = lobbySeat(lobby, seat)
  if (s.kind === 'human' && s.uuid === uuid) return null
  if (s.kind !== 'open') return 'That seat is taken.'
  const held = seatsHeldBy(lobby, uuid)
  if (seat === 'wufeng') {
    if (!lobby.blackSecret.enabled) return 'Wu-Feng plays only in Black Secret games.'
    if (held.length > 0) return 'Leave your Taoist board first: nobody plays both sides.'
  } else if (held.includes('wufeng')) {
    return "You're Wu-Feng: leave that seat first to play a Taoist."
  }
  return null
}

/** Sit `uuid` in an open seat (or rename them in one they hold). */
export function claimSeatEdit(lobby: LobbyState, seat: Seat, uuid: string, name: string): LobbyState | null {
  if (claimProblem(lobby, seat, uuid)) return null
  const s = lobbySeat(lobby, seat)
  if (s.kind === 'human' && s.uuid === uuid && s.name === name) return null
  return withSeat(lobby, seat, { kind: 'human', uuid, name })
}

/** `uuid` gets up from their seat. */
export function releaseSeatEdit(lobby: LobbyState, seat: Seat, uuid: string): LobbyState | null {
  if (lobby.started) return null
  const s = lobbySeat(lobby, seat)
  if (s.kind !== 'human' || s.uuid !== uuid) return null
  return withSeat(lobby, seat, openSeat())
}

/** `uuid` leaves the room: every seat they hold opens. */
export function leaveLobbyEdit(lobby: LobbyState, uuid: string): LobbyState | null {
  if (lobby.started) return null
  const held = seatsHeldBy(lobby, uuid)
  if (held.length === 0) return null
  return held.reduce((l, seat) => withSeat(l, seat, openSeat()), lobby)
}

/** `uuid`'s seats show their new name. */
export function renameEdit(lobby: LobbyState, uuid: string, name: string): LobbyState | null {
  if (lobby.started) return null
  const held = seatsHeldBy(lobby, uuid).filter((seat) => lobbySeat(lobby, seat).name !== name)
  if (held.length === 0) return null
  return held.reduce((l, seat) => withSeat(l, seat, { kind: 'human', uuid, name }), lobby)
}

/**
 * Host: make a seat open (taking a person off it), the AI, or neutral
 * (Taoist boards only).
 */
export function hostSetSeatEdit(
  lobby: LobbyState,
  seat: Seat,
  kind: Exclude<LobbySeatKind, 'human'>,
): LobbyState | null {
  if (lobby.started) return null
  if (seat === 'wufeng' && (kind === 'neutral' || !lobby.blackSecret.enabled)) return null
  if (lobbySeat(lobby, seat).kind === kind) return null
  const next: LobbySeat =
    kind === 'ai' ? { kind, uuid: null, name: AI_NAME } : kind === 'neutral' ? { kind, uuid: null, name: '' } : openSeat()
  return withSeat(lobby, seat, next)
}

export function setDifficultyEdit(lobby: LobbyState, difficulty: Difficulty): LobbyState | null {
  if (lobby.started || lobby.difficulty === difficulty || !DIFFICULTIES.includes(difficulty)) return null
  return { ...lobby, difficulty }
}

export function setWhiteMoonEdit(lobby: LobbyState, patch: Partial<LobbyWhiteMoon>): LobbyState | null {
  if (lobby.started) return null
  const whiteMoon = { ...lobby.whiteMoon, ...patch }
  if (JSON.stringify(whiteMoon) === JSON.stringify(lobby.whiteMoon)) return null
  return { ...lobby, whiteMoon }
}

/** Turning Black Secret off (or on) also empties the Wu-Feng seat. */
export function setBlackSecretEdit(lobby: LobbyState, patch: Partial<LobbyBlackSecret>): LobbyState | null {
  if (lobby.started) return null
  const blackSecret = { ...lobby.blackSecret, ...patch }
  if (JSON.stringify(blackSecret) === JSON.stringify(lobby.blackSecret)) return null
  const toggled = blackSecret.enabled !== lobby.blackSecret.enabled
  return { ...lobby, blackSecret, wuFeng: toggled ? openSeat() : lobby.wuFeng }
}

const COLOR_LABEL: Record<Color, string> = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' }

function listColors(colors: Color[]): string {
  const names = colors.map((c) => COLOR_LABEL[c])
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** What stops this lobby from starting (shown under the Start button), or null when it can start. */
export function lobbyStartProblem(lobby: LobbyState): string | null {
  const open = TAOIST_SEATS.filter((c) => lobby.seats[c].kind === 'open')
  if (open.length > 0) {
    const verb = open.length === 1 ? 'is' : 'are'
    return `${listColors(open)} ${verb} still open: seat a player or the AI there, or make ${
      open.length === 1 ? 'it' : 'them'
    } neutral.`
  }
  const players = playerSeats(lobby)
  if (players.length === 0) return 'At least one board needs a Taoist (a player or the AI).'
  if (players.length === 2 && OPPOSITE[players[0]!] !== players[1]) {
    return 'In a 2-player game the Taoists sit facing each other: red and green, or blue and yellow.'
  }
  if (lobby.blackSecret.enabled) {
    if (lobby.wuFeng.kind === 'open') return 'Wu-Feng needs a player or the AI.'
    const wf = lobby.wuFeng
    if (wf.kind === 'human' && wf.uuid && seatsHeldBy(lobby, wf.uuid).some((s) => s !== 'wufeng')) {
      return "The Wu-Feng player can't also play a Taoist."
    }
  }
  return null
}

function seatKind(seat: LobbySeat): SeatKind {
  // 'open' can't reach a started game (lobbyStartProblem); read it as neutral.
  return seat.kind === 'human' ? 'human' : seat.kind === 'ai' ? 'ai' : 'neutral'
}

/** The game a (startable) lobby plays. Board sides and the first player come from the seed. */
export function lobbyToConfig(lobby: LobbyState): GameConfig {
  const config: GameConfig = {
    difficulty: lobby.difficulty,
    seats: {
      red: seatKind(lobby.seats.red),
      blue: seatKind(lobby.seats.blue),
      green: seatKind(lobby.seats.green),
      yellow: seatKind(lobby.seats.yellow),
    },
    seed: lobby.seed,
  }
  if (lobby.whiteMoon.enabled) {
    config.whiteMoon = { portal: lobby.whiteMoon.portal, randomTiles: lobby.whiteMoon.randomTiles }
  }
  if (lobby.blackSecret.enabled) {
    config.blackSecret = { wuFeng: lobby.wuFeng.kind === 'ai' ? 'ai' : 'human', side: lobby.blackSecret.side }
  }
  return config
}

/** Seat → the UUID playing it (null for the AI and neutral boards); Wu-Feng only with Black Secret. */
export function lobbySeatUuids(lobby: LobbyState): Partial<Record<Seat, string | null>> {
  const out: Partial<Record<Seat, string | null>> = {}
  for (const c of TAOIST_SEATS) out[c] = lobby.seats[c].kind === 'human' ? lobby.seats[c].uuid : null
  if (lobby.blackSecret.enabled) out.wufeng = lobby.wuFeng.kind === 'human' ? lobby.wuFeng.uuid : null
  return out
}
