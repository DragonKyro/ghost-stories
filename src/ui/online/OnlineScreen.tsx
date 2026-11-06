// The online screen (uiMode 'online'): name entry, create a room or join one
// by code, the connecting / error states, and the lobby (the four boards
// around the village, the host's settings, lobby chat, Start). When the
// host starts, networkStore loads the game and the app switches to the game
// screen.

import { useEffect, useState, type ReactNode } from 'react'
import type { Difficulty, Seat } from '@/game/types'
import {
  MAX_NAME_LENGTH,
  getSavedDisplayName,
  normalizeRoomCode,
  roomCodeFromUrl,
  roomLink,
  setRoomCodeInUrl,
  type LobbySeatKind,
  type LobbyState,
  type PortalPlacement,
} from '@/net'
import { useGameStore } from '@/store/gameStore'
import { useNetworkStore, warmUpNetwork } from '@/store/networkStore'
import {
  DIFFICULTIES,
  PORTAL_PLACEMENTS,
  TAOIST_SEATS,
  claimProblem,
  lobbySeat,
  lobbyStartProblem,
  seatsHeldBy,
} from '@/store/lobby'
import { ChatPanel } from './ChatPanel'
import { SEAT_LABEL, seatStyle } from './seatColors'
import { RECONNECT_GRACE_MS, useAfter } from './useAfter'
import { Logo } from '@/ui/art'
import './online.css'

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  initiation: 'Initiation',
  normal: 'Normal',
  nightmare: 'Nightmare',
  hell: 'Hell',
}

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  initiation: '4 Qi each, a Tao token of every colour to start, 1 incarnation.',
  normal: '3 Qi each, 1 incarnation.',
  nightmare: 'Normal, with 4 incarnations (3 with 1–2 players).',
  hell: 'Nightmare, without the starting Yin-Yang.',
}

const PORTAL_LABEL: Record<PortalPlacement, string> = {
  center: 'Centre tile (standard)',
  edge: 'Edge tile (harder)',
  corner: 'Corner tile (hardest)',
}

const COMPASS: Record<Seat, string> = { red: 'North', blue: 'East', green: 'South', yellow: 'West', wufeng: '' }

export function OnlineScreen() {
  const connection = useNetworkStore((s) => s.connection)
  // Load the online code and sign in while the player types.
  useEffect(() => warmUpNetwork(), [])
  switch (connection) {
    case 'disconnected':
      return <OnlineMenu />
    case 'connecting':
      return <JoiningCard />
    case 'error':
      return <ErrorCard />
    case 'lobby':
      return <Lobby />
    case 'in-game':
      return <InGameCard />
  }
}

function OnlineMenu() {
  const createRoom = useNetworkStore((s) => s.createRoom)
  const joinRoom = useNetworkStore((s) => s.joinRoom)
  const setUiMode = useGameStore((s) => s.setUiMode)
  // Opened from an invite link (?room=ABCD): straight to joining that room.
  const [linkCode] = useState(roomCodeFromUrl)
  const [name, setName] = useState(getSavedDisplayName)
  const [code, setCode] = useState(linkCode ?? '')
  const [view, setView] = useState<'choose' | 'join'>(linkCode ? 'join' : 'choose')

  const nameOk = name.trim().length > 0
  const codeOk = normalizeRoomCode(code).length >= 4
  const join = () => {
    if (nameOk && codeOk) void joinRoom(code, name)
  }
  const back = () => {
    setRoomCodeInUrl(null)
    setUiMode('mainMenu')
  }

  return (
    <div className="ol-wrap" style={{ flexDirection: 'column', alignItems: 'center' }}>
      <Logo width={300} />
      <div className="ol-card">
        <header className="ol-header">
          <button type="button" className="ol-btn-ghost" onClick={back}>
            ← Back
          </button>
          <h2 className="ol-title">Play online</h2>
          <span style={{ width: 60 }} />
        </header>

        <label className="ol-field">
          <span>Your name</span>
          <input
            className="ol-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && view === 'join' && join()}
            placeholder="Your name"
            maxLength={MAX_NAME_LENGTH}
            autoFocus
          />
        </label>

        {view === 'choose' ? (
          <div className="ol-buttons">
            <button
              type="button"
              className="ol-btn-primary ol-full"
              disabled={!nameOk}
              onClick={() => void createRoom(name)}
            >
              Create a room
            </button>
            <div className="ol-divider">or</div>
            <button type="button" className="ol-full" disabled={!nameOk} onClick={() => setView('join')}>
              Join with a code
            </button>
          </div>
        ) : (
          <>
            <label className="ol-field">
              <span>Room code</span>
              <input
                className="ol-input ol-code-input"
                type="text"
                value={code}
                onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && join()}
                placeholder="ABCD"
                maxLength={6}
                // Phone keyboards must not "correct" a room code into a word.
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
              />
            </label>
            <div className="ol-buttons">
              <button type="button" className="ol-btn-primary ol-full" disabled={!nameOk || !codeOk} onClick={join}>
                Join room
              </button>
              <button type="button" className="ol-btn-ghost ol-full" onClick={() => setView('choose')}>
                Cancel
              </button>
            </div>
          </>
        )}

        <p className="ol-muted">
          Rooms are kept for a week. Testing with two windows on one computer? Add <code>?fresh</code> to each
          window's address so they count as different players.
        </p>
      </div>
    </div>
  )
}

/** Creating a room, or looking one up. Never shown as an (empty) lobby. */
function JoiningCard() {
  const roomCode = useNetworkStore((s) => s.roomCode)
  const role = useNetworkStore((s) => s.role)
  const leaveRoom = useNetworkStore((s) => s.leaveRoom)
  const creating = role === 'host'
  return (
    <div className="ol-wrap">
      <div className="ol-card">
        <header className="ol-header">
          <button type="button" className="ol-btn-ghost" onClick={leaveRoom}>
            ← Cancel
          </button>
          <h2 className="ol-title">{creating ? 'Creating a room' : `Joining ${roomCode ?? 'the room'}`}</h2>
          <span style={{ width: 60 }} />
        </header>
        <p className="ol-status">Connecting to the game server…</p>
      </div>
    </div>
  )
}

function ErrorCard() {
  const errorMessage = useNetworkStore((s) => s.errorMessage)
  const joinFailure = useNetworkStore((s) => s.joinFailure)
  const clearError = useNetworkStore((s) => s.clearError)
  const retryJoin = useNetworkStore((s) => s.retryJoin)
  const unreachable = joinFailure?.reason === 'unreachable'
  return (
    <div className="ol-wrap">
      <div className="ol-card">
        <header className="ol-header">
          <button type="button" className="ol-btn-ghost" onClick={clearError}>
            ← Back
          </button>
          <span />
        </header>
        <h3 className="ol-error-title">
          {joinFailure
            ? unreachable
              ? "Can't reach the game server"
              : `Room ${joinFailure.code} not found`
            : "Couldn't open the room"}
        </h3>
        <p className="ol-status">{errorMessage ?? 'Connection error.'}</p>
        {joinFailure?.detail && <p className="ol-muted">{joinFailure.detail}</p>}
        <button type="button" className="ol-btn-primary ol-full" onClick={unreachable ? retryJoin : clearError}>
          {unreachable ? 'Try again' : 'Back to the online menu'}
        </button>
      </div>
    </div>
  )
}

/** Shown only if the online screen is opened while this device is in a game. */
function InGameCard() {
  const roomCode = useNetworkStore((s) => s.roomCode)
  const leaveRoom = useNetworkStore((s) => s.leaveRoom)
  const setUiMode = useGameStore((s) => s.setUiMode)
  const hasGame = useGameStore((s) => s.game !== null)
  return (
    <div className="ol-wrap">
      <div className="ol-card">
        <h2 className="ol-title">Room {roomCode}</h2>
        <p className="ol-status">{hasGame ? 'The game is under way.' : 'Loading the game…'}</p>
        <div className="ol-buttons">
          <button type="button" className="ol-btn-primary ol-full" disabled={!hasGame} onClick={() => setUiMode('inGame')}>
            Back to the game
          </button>
          <button type="button" className="ol-btn-ghost ol-full" onClick={leaveRoom}>
            Leave the room
          </button>
        </div>
      </div>
    </div>
  )
}

function useCopied(): [string | null, (what: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (what: string, text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(what)
        setTimeout(() => setCopied((c) => (c === what ? null : c)), 1500)
      })
      .catch(() => {})
  }
  return [copied, copy]
}

function RoomInfo({ code }: { code: string }) {
  const [copied, copy] = useCopied()
  const link = roomLink(code)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const share = () => {
    navigator.share({ title: 'Ghost Stories', text: `Join my Ghost Stories room ${code}`, url: link }).catch(() => {})
  }
  return (
    <>
      <div className="ol-roomcode">
        <span className="ol-roomcode-label">Room</span>
        <button type="button" className="ol-roomcode-value" onClick={() => copy('code', code)} title="Copy the code">
          {code}
        </button>
        <span className="ol-roomcode-hint">{copied === 'code' ? 'copied' : 'click to copy'}</span>
      </div>
      <div className="ol-invite">
        <input
          className="ol-input"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Invite link"
        />
        <button type="button" onClick={() => copy('link', link)}>
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </button>
        {canShare && (
          <button type="button" onClick={share}>
            Share
          </button>
        )}
      </div>
    </>
  )
}

function SeatCard({ seat }: { seat: Seat }) {
  const lobby = useNetworkStore((s) => s.lobby)
  const myUuid = useNetworkStore((s) => s.myUuid)
  const role = useNetworkStore((s) => s.role)
  const onlineUuids = useNetworkStore((s) => s.onlineUuids)
  const claimSeat = useNetworkStore((s) => s.claimSeat)
  const releaseSeat = useNetworkStore((s) => s.releaseSeat)
  const hostSetSeat = useNetworkStore((s) => s.hostSetSeat)

  const s = lobbySeat(lobby, seat)
  const isHost = role === 'host'
  const mine = s.kind === 'human' && s.uuid === myUuid
  const problem = s.kind === 'open' ? claimProblem(lobby, seat, myUuid) : null
  const online = s.kind === 'human' && s.uuid !== null && onlineUuids.has(s.uuid)
  const locked = lobby.started === true

  let who: ReactNode
  if (s.kind === 'human') {
    who = (
      <>
        <span className={`ol-dot ${online ? 'ol-dot-online' : ''}`} title={online ? 'Connected' : 'Not connected'} />
        <span>{s.name || 'A player'}</span>
        {mine && <span className="ol-tag">you</span>}
        {s.uuid === lobby.hostUuid && <span className="ol-tag">host</span>}
      </>
    )
  } else if (s.kind === 'ai') {
    who = (
      <>
        <span className="ol-tag">AI</span>
        <span>{seat === 'wufeng' ? 'plays Wu-Feng' : 'plays this board'}</span>
      </>
    )
  } else if (s.kind === 'neutral') {
    who = <span className="ol-seat-empty">Neutral board (no Taoist)</span>
  } else {
    who = <span className="ol-seat-empty">Open</span>
  }

  return (
    <div className={`ol-seat ${mine ? 'ol-seat-mine' : ''}`} style={seatStyle(seat)}>
      <div className="ol-seat-head">
        <span>
          {SEAT_LABEL[seat]}
          {COMPASS[seat] && <span className="ol-muted"> · {COMPASS[seat]}</span>}
        </span>
      </div>
      <div className="ol-seat-who">{who}</div>
      {!locked && (
        <div className="ol-seat-actions">
          {s.kind === 'open' && (
            <button
              type="button"
              className="ol-btn-sm"
              disabled={problem !== null}
              title={problem ?? 'Play this seat'}
              onClick={() => void claimSeat(seat)}
            >
              Sit here
            </button>
          )}
          {mine && (
            <button type="button" className="ol-btn-sm" onClick={() => void releaseSeat(seat)}>
              Leave seat
            </button>
          )}
          {isHost && (
            <select
              className="ol-select"
              value={s.kind}
              aria-label={`${SEAT_LABEL[seat]} seat`}
              onChange={(e) => void hostSetSeat(seat, e.target.value as Exclude<LobbySeatKind, 'human'>)}
            >
              {s.kind === 'human' && (
                <option value="human" disabled>
                  {mine ? 'You' : 'Player'}
                </option>
              )}
              <option value="open">{s.kind === 'human' && !mine ? 'Open (remove player)' : 'Open'}</option>
              <option value="ai">AI</option>
              {seat !== 'wufeng' && <option value="neutral">Neutral</option>}
            </select>
          )}
        </div>
      )}
    </div>
  )
}

function Table() {
  return (
    <div className="ol-table">
      {TAOIST_SEATS.map((c) => (
        <div key={c} className={`ol-area-${c}`}>
          <SeatCard seat={c} />
        </div>
      ))}
      <div className="ol-village" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={`ol-village-tile ${i === 4 ? 'ol-village-tile-center' : ''}`} />
        ))}
      </div>
    </div>
  )
}

function summary(lobby: LobbyState): string {
  const parts = [DIFFICULTY_LABEL[lobby.difficulty]]
  if (lobby.whiteMoon.enabled) {
    parts.push(`White Moon (Portal: ${lobby.whiteMoon.portal}${lobby.whiteMoon.randomTiles ? ', random tiles' : ''})`)
  }
  if (lobby.blackSecret.enabled) parts.push(`Black Secret (side ${lobby.blackSecret.side.toUpperCase()})`)
  return parts.join(' · ')
}

function Settings({ lobby, isHost }: { lobby: LobbyState; isHost: boolean }) {
  const hostSetDifficulty = useNetworkStore((s) => s.hostSetDifficulty)
  const hostSetWhiteMoon = useNetworkStore((s) => s.hostSetWhiteMoon)
  const hostSetBlackSecret = useNetworkStore((s) => s.hostSetBlackSecret)
  const wm = lobby.whiteMoon
  const bs = lobby.blackSecret

  if (!isHost || lobby.started) {
    return (
      <div className="ol-settings">
        <h3>Game</h3>
        <p className="ol-status">{summary(lobby)}</p>
        <p className="ol-muted">{DIFFICULTY_HINT[lobby.difficulty]}</p>
      </div>
    )
  }

  return (
    <div className="ol-settings">
      <h3>Game</h3>
      <label className="ol-setting">
        <span>Difficulty</span>
        <select
          className="ol-select"
          value={lobby.difficulty}
          onChange={(e) => void hostSetDifficulty(e.target.value as Difficulty)}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </select>
      </label>
      <p className="ol-muted">{DIFFICULTY_HINT[lobby.difficulty]}</p>

      <label className="ol-check">
        <input type="checkbox" checked={wm.enabled} onChange={(e) => void hostSetWhiteMoon({ enabled: e.target.checked })} />
        <span>White Moon expansion (villagers, the Portal, moon crystals)</span>
      </label>
      {wm.enabled && (
        <>
          <label className="ol-setting ol-setting-sub">
            <span>Portal</span>
            <select
              className="ol-select"
              value={wm.portal}
              onChange={(e) => void hostSetWhiteMoon({ portal: e.target.value as PortalPlacement })}
            >
              {PORTAL_PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {PORTAL_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="ol-check ol-setting-sub">
            <input
              type="checkbox"
              checked={wm.randomTiles}
              onChange={(e) => void hostSetWhiteMoon({ randomTiles: e.target.checked })}
            />
            <span>Draw the 9 village tiles at random from all 10</span>
          </label>
        </>
      )}

      <label className="ol-check">
        <input
          type="checkbox"
          checked={bs.enabled}
          onChange={(e) => void hostSetBlackSecret({ enabled: e.target.checked })}
        />
        <span>Black Secret expansion (one player is Wu-Feng)</span>
      </label>
      {bs.enabled && (
        <label className="ol-setting ol-setting-sub">
          <span>Catacomb board</span>
          <select
            className="ol-select"
            value={bs.side}
            onChange={(e) => void hostSetBlackSecret({ side: e.target.value === 'b' ? 'b' : 'a' })}
          >
            <option value="a">Side A</option>
            <option value="b">Side B</option>
          </select>
        </label>
      )}
    </div>
  )
}

function Lobby() {
  const roomCode = useNetworkStore((s) => s.roomCode)
  const lobby = useNetworkStore((s) => s.lobby)
  const role = useNetworkStore((s) => s.role)
  const people = useNetworkStore((s) => s.people)
  const lobbyNotice = useNetworkStore((s) => s.lobbyNotice)
  const serverConnected = useNetworkStore((s) => s.serverConnected)
  const leaveRoom = useNetworkStore((s) => s.leaveRoom)
  const hostStartGame = useNetworkStore((s) => s.hostStartGame)
  const reconnecting = useAfter(!serverConnected, RECONNECT_GRACE_MS)

  const isHost = role === 'host'
  const problem = lobbyStartProblem(lobby)
  const watching = people.filter((p) => seatsHeldBy(lobby, p.uuid).length === 0)

  return (
    <div className="ol-wrap">
      <div className="ol-card ol-card-wide">
        <header className="ol-header">
          <button type="button" className="ol-btn-ghost" onClick={leaveRoom}>
            ← Leave
          </button>
          <span className="ol-muted">{isHost ? 'You are the host' : 'Waiting room'}</span>
        </header>
        {roomCode && <RoomInfo code={roomCode} />}

        <Table />
        {lobby.blackSecret.enabled && (
          <div style={{ width: '100%', maxWidth: 280, margin: '0 auto' }}>
            <SeatCard seat="wufeng" />
          </div>
        )}
        {watching.length > 0 && (
          <p className="ol-muted">Not seated: {watching.map((p) => p.name || 'A player').join(', ')}</p>
        )}
        {lobbyNotice && <p className="ol-notice">{lobbyNotice}</p>}

        <Settings lobby={lobby} isHost={isHost} />

        {lobby.started ? (
          <p className="ol-status">Starting…</p>
        ) : (
          problem && <p className="ol-problem">{problem}</p>
        )}
        {isHost ? (
          <button
            type="button"
            className="ol-btn-primary ol-full"
            disabled={problem !== null || lobby.started === true}
            onClick={() => void hostStartGame()}
          >
            Start game
          </button>
        ) : (
          !lobby.started && <p className="ol-muted">Waiting for the host to start the game…</p>
        )}
        {reconnecting && <p className="ol-notice">Reconnecting to the game server…</p>}
      </div>

      <div className="ol-side">
        <ChatPanel title="Lobby chat" height={320} />
      </div>
    </div>
  )
}
