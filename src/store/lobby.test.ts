import { describe, expect, it } from 'vitest'
import type { Color } from '@/game/types'
import type { LobbyState } from '@/net/types'
import {
  claimProblem,
  claimSeatEdit,
  defaultLobby,
  hostSetSeatEdit,
  leaveLobbyEdit,
  lobbySeatUuids,
  lobbyStartProblem,
  lobbyToConfig,
  normalizeLobby,
  releaseSeatEdit,
  renameEdit,
  seatsHeldBy,
  setBlackSecretEdit,
  setDifficultyEdit,
  setWhiteMoonEdit,
} from './lobby'

const HOST = 'host-uuid'
const GUEST = 'guest-uuid'

/** Apply edits in turn, failing the test when one declines. */
function edit(lobby: LobbyState, ...edits: ((l: LobbyState) => LobbyState | null)[]): LobbyState {
  return edits.reduce((l, e) => {
    const next = e(l)
    if (!next) throw new Error('edit declined')
    return next
  }, lobby)
}

const base = () => defaultLobby(HOST, 'Hana', 42)

/** The host opens a board (if needed) and someone sits there. */
const sitAt = (seat: Color, uuid: string, name: string) => [
  (l: LobbyState) => (l.seats[seat].kind === 'open' ? l : hostSetSeatEdit(l, seat, 'open')),
  (l: LobbyState) => claimSeatEdit(l, seat, uuid, name),
]

describe('the default lobby', () => {
  it('seats the host on red, leaves the rest open, normal difficulty, no expansions', () => {
    const l = base()
    expect(l.seats.red).toEqual({ kind: 'human', uuid: HOST, name: 'Hana' })
    expect([l.seats.blue.kind, l.seats.green.kind, l.seats.yellow.kind]).toEqual(['open', 'open', 'open'])
    expect(l.wuFeng.kind).toBe('open')
    expect(l.difficulty).toBe('normal')
    expect(l.whiteMoon.enabled).toBe(false)
    expect(l.blackSecret.enabled).toBe(false)
    expect(l.seed).toBe(42)
  })

  it('a lobby from another build reads with defaults, bad seats open', () => {
    const odd = {
      hostUuid: HOST,
      seats: { red: { kind: 'human', uuid: null, name: 'x' }, blue: { kind: 'ai' } },
      wuFeng: { kind: 'neutral' },
      difficulty: 'impossible',
      seed: 7,
    } as unknown as LobbyState
    const l = normalizeLobby(odd)
    expect(l.seats.red.kind).toBe('open')
    expect(l.seats.blue).toEqual({ kind: 'ai', uuid: null, name: 'AI' })
    expect(l.seats.green.kind).toBe('open')
    expect(l.wuFeng.kind).toBe('open')
    expect(l.difficulty).toBe('normal')
    expect(l.whiteMoon).toEqual({ enabled: false, portal: 'center', randomTiles: false })
    expect(l.blackSecret).toEqual({ enabled: false, side: 'a' })
    expect(l.started).toBeUndefined()
    expect(normalizeLobby(base())).toEqual(base())
  })
})

describe('seat edits', () => {
  it('anyone takes an open seat, several boards if they like, and gets up again', () => {
    let l = edit(base(), (x) => claimSeatEdit(x, 'green', GUEST, 'Gus'))
    expect(l.seats.green).toEqual({ kind: 'human', uuid: GUEST, name: 'Gus' })
    expect(claimSeatEdit(l, 'red', GUEST, 'Gus')).toBeNull() // the host's
    expect(claimProblem(l, 'red', GUEST)).toMatch(/taken/)
    l = edit(l, (x) => claimSeatEdit(x, 'blue', GUEST, 'Gus'))
    expect(seatsHeldBy(l, GUEST)).toEqual(['blue', 'green'])
    expect(claimSeatEdit(l, 'blue', GUEST, 'Gus')).toBeNull() // already theirs
    expect(releaseSeatEdit(l, 'red', GUEST)).toBeNull() // not theirs
    l = edit(l, (x) => releaseSeatEdit(x, 'blue', GUEST))
    expect(l.seats.blue.kind).toBe('open')
    l = edit(l, (x) => renameEdit(x, GUEST, 'Gussie'))
    expect(l.seats.green.name).toBe('Gussie')
    l = edit(l, (x) => leaveLobbyEdit(x, GUEST))
    expect(seatsHeldBy(l, GUEST)).toEqual([])
    expect(leaveLobbyEdit(l, GUEST)).toBeNull()
  })

  it('nobody plays a Taoist and Wu-Feng; Wu-Feng exists only with Black Secret', () => {
    let l = base()
    expect(claimSeatEdit(l, 'wufeng', GUEST, 'Gus')).toBeNull()
    l = edit(l, (x) => setBlackSecretEdit(x, { enabled: true }))
    expect(claimSeatEdit(l, 'wufeng', HOST, 'Hana')).toBeNull() // holds red
    l = edit(l, (x) => claimSeatEdit(x, 'wufeng', GUEST, 'Gus'))
    expect(l.wuFeng).toEqual({ kind: 'human', uuid: GUEST, name: 'Gus' })
    expect(claimProblem(l, 'blue', GUEST)).toMatch(/Wu-Feng/)
    // Turning Black Secret off empties the seat.
    l = edit(l, (x) => setBlackSecretEdit(x, { enabled: false }))
    expect(l.wuFeng.kind).toBe('open')
    expect(setBlackSecretEdit(l, { enabled: false })).toBeNull()
  })

  it('the host opens, kicks, seats the AI or leaves a board neutral', () => {
    let l = edit(base(), (x) => claimSeatEdit(x, 'green', GUEST, 'Gus'))
    l = edit(
      l,
      (x) => hostSetSeatEdit(x, 'green', 'open'), // kick
      (x) => hostSetSeatEdit(x, 'blue', 'ai'),
      (x) => hostSetSeatEdit(x, 'yellow', 'neutral'),
    )
    expect(l.seats.green.kind).toBe('open')
    expect(l.seats.blue).toEqual({ kind: 'ai', uuid: null, name: 'AI' })
    expect(l.seats.yellow.kind).toBe('neutral')
    expect(hostSetSeatEdit(l, 'blue', 'ai')).toBeNull()
    expect(hostSetSeatEdit(l, 'wufeng', 'ai')).toBeNull() // no Black Secret
    l = edit(l, (x) => setBlackSecretEdit(x, { enabled: true, side: 'b' }))
    expect(hostSetSeatEdit(l, 'wufeng', 'neutral')).toBeNull()
    l = edit(l, (x) => hostSetSeatEdit(x, 'wufeng', 'ai'))
    expect(l.wuFeng.kind).toBe('ai')
    expect(l.blackSecret.side).toBe('b')
  })

  it('settings change only when they differ, and nothing changes once started', () => {
    let l = edit(
      base(),
      (x) => setDifficultyEdit(x, 'hell'),
      (x) => setWhiteMoonEdit(x, { enabled: true, portal: 'corner' }),
    )
    expect(l.difficulty).toBe('hell')
    expect(l.whiteMoon).toEqual({ enabled: true, portal: 'corner', randomTiles: false })
    expect(setDifficultyEdit(l, 'hell')).toBeNull()
    expect(setWhiteMoonEdit(l, { portal: 'corner' })).toBeNull()
    l = { ...l, started: true }
    expect(setDifficultyEdit(l, 'normal')).toBeNull()
    expect(claimSeatEdit(l, 'blue', GUEST, 'Gus')).toBeNull()
    expect(hostSetSeatEdit(l, 'blue', 'ai')).toBeNull()
    expect(releaseSeatEdit(l, 'red', HOST)).toBeNull()
  })
})

describe('lobbyStartProblem', () => {
  const seated = (...edits: ((l: LobbyState) => LobbyState | null)[]) => edit(base(), ...edits)

  it('wants every board decided', () => {
    expect(lobbyStartProblem(base())).toBe(
      'Blue, Green and Yellow are still open: seat a player or the AI there, or make them neutral.',
    )
    const l = seated((x) => hostSetSeatEdit(x, 'blue', 'neutral'), (x) => hostSetSeatEdit(x, 'yellow', 'neutral'))
    expect(lobbyStartProblem(l)).toMatch(/^Green is still open: .* make it neutral\.$/)
  })

  it('wants at least one Taoist', () => {
    const l = seated(
      (x) => hostSetSeatEdit(x, 'red', 'neutral'),
      (x) => hostSetSeatEdit(x, 'blue', 'neutral'),
      (x) => hostSetSeatEdit(x, 'green', 'neutral'),
      (x) => hostSetSeatEdit(x, 'yellow', 'neutral'),
    )
    expect(lobbyStartProblem(l)).toMatch(/at least one board/i)
  })

  it('solo, 3 and 4 players start; 2 players must face each other', () => {
    const solo = seated(
      (x) => hostSetSeatEdit(x, 'blue', 'neutral'),
      (x) => hostSetSeatEdit(x, 'green', 'neutral'),
      (x) => hostSetSeatEdit(x, 'yellow', 'neutral'),
    )
    expect(lobbyStartProblem(solo)).toBeNull()
    const sideBySide = edit(solo, ...sitAt('blue', GUEST, 'Gus'))
    expect(lobbyStartProblem(sideBySide)).toMatch(/facing each other/)
    const facing = edit(solo, ...sitAt('green', GUEST, 'Gus'))
    expect(lobbyStartProblem(facing)).toBeNull()
    const blueYellow = edit(
      solo,
      (x) => hostSetSeatEdit(x, 'red', 'neutral'),
      (x) => hostSetSeatEdit(x, 'blue', 'ai'),
      ...sitAt('yellow', HOST, 'Hana'),
    )
    expect(lobbyStartProblem(blueYellow)).toBeNull()
    const three = edit(facing, (x) => hostSetSeatEdit(x, 'blue', 'ai'))
    expect(lobbyStartProblem(three)).toBeNull()
    const four = edit(three, ...sitAt('yellow', GUEST, 'Gus'))
    expect(lobbyStartProblem(four)).toBeNull()
  })

  it('Black Secret wants Wu-Feng played', () => {
    const l = seated(
      (x) => hostSetSeatEdit(x, 'blue', 'ai'),
      (x) => hostSetSeatEdit(x, 'green', 'ai'),
      (x) => hostSetSeatEdit(x, 'yellow', 'ai'),
      (x) => setBlackSecretEdit(x, { enabled: true }),
    )
    expect(lobbyStartProblem(l)).toBe('Wu-Feng needs a player or the AI.')
    expect(lobbyStartProblem(edit(l, (x) => claimSeatEdit(x, 'wufeng', GUEST, 'Gus')))).toBeNull()
    expect(lobbyStartProblem(edit(l, (x) => hostSetSeatEdit(x, 'wufeng', 'ai')))).toBeNull()
    // Hand-made lobby with one person on both sides.
    const both: LobbyState = { ...l, wuFeng: { kind: 'human', uuid: HOST, name: 'Hana' } }
    expect(lobbyStartProblem(both)).toMatch(/can't also play a Taoist/)
  })
})

describe('lobbyToConfig', () => {
  it('a 2-player base game: humans, neutral boards, the lobby seed', () => {
    const l = edit(
      base(),
      (x) => claimSeatEdit(x, 'green', GUEST, 'Gus'),
      (x) => hostSetSeatEdit(x, 'blue', 'neutral'),
      (x) => hostSetSeatEdit(x, 'yellow', 'neutral'),
      (x) => setDifficultyEdit(x, 'nightmare'),
    )
    expect(lobbyToConfig(l)).toEqual({
      difficulty: 'nightmare',
      seats: { red: 'human', blue: 'neutral', green: 'human', yellow: 'neutral' },
      seed: 42,
    })
    expect(lobbySeatUuids(l)).toEqual({ red: HOST, blue: null, green: GUEST, yellow: null })
  })

  it('both expansions, AI seats and a human Wu-Feng', () => {
    const l = edit(
      base(),
      (x) => hostSetSeatEdit(x, 'blue', 'ai'),
      (x) => hostSetSeatEdit(x, 'green', 'ai'),
      (x) => hostSetSeatEdit(x, 'yellow', 'ai'),
      (x) => setWhiteMoonEdit(x, { enabled: true, portal: 'edge', randomTiles: true }),
      (x) => setBlackSecretEdit(x, { enabled: true, side: 'b' }),
      (x) => claimSeatEdit(x, 'wufeng', GUEST, 'Gus'),
    )
    const config = lobbyToConfig(l)
    expect(config).toEqual({
      difficulty: 'normal',
      seats: { red: 'human', blue: 'ai', green: 'ai', yellow: 'ai' },
      seed: 42,
      whiteMoon: { portal: 'edge', randomTiles: true },
      blackSecret: { wuFeng: 'human', side: 'b' },
    })
    // Plain JSON all the way (it goes through the database).
    expect(JSON.parse(JSON.stringify(config))).toEqual(config)
    expect(lobbySeatUuids(l)).toEqual({ red: HOST, blue: null, green: null, yellow: null, wufeng: GUEST })
    const aiWuFeng = edit(l, (x) => hostSetSeatEdit(x, 'wufeng', 'ai'))
    expect(lobbyToConfig(aiWuFeng).blackSecret).toEqual({ wuFeng: 'ai', side: 'b' })
  })
})
