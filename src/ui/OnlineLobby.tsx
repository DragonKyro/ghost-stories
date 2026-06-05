import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useNetworkStore } from '@/store/networkStore'
import { TAOIST_COLORS, TAOIST_COLOR_HEX } from './shared/playerColors'
import type { Difficulty } from '@/game/types'

const DIFFICULTIES: Difficulty[] = ['initiation', 'normal', 'nightmare', 'hell']

export function OnlineLobby() {
  const setUiMode = useGameStore((s) => s.setUiMode)
  const role = useNetworkStore((s) => s.role)
  const lobby = useNetworkStore((s) => s.lobby)
  const myUuid = useNetworkStore((s) => s.myUuid)
  const myName = useNetworkStore((s) => s.myName)
  const roomCode = useNetworkStore((s) => s.roomCode)
  const claimSeat = useNetworkStore((s) => s.claimSeat)
  const releaseSeat = useNetworkStore((s) => s.releaseSeat)
  const setSeatType = useNetworkStore((s) => s.setSeatType)
  const setDifficulty = useNetworkStore((s) => s.setDifficulty)
  const setBlackSecret = useNetworkStore((s) => s.setBlackSecret)
  const claimWuFeng = useNetworkStore((s) => s.claimWuFeng)
  const releaseWuFeng = useNetworkStore((s) => s.releaseWuFeng)
  const setWhiteMoon = useNetworkStore((s) => s.setWhiteMoon)
  const setPortalPlacement = useNetworkStore((s) => s.setPortalPlacement)
  const startOnlineGame = useNetworkStore((s) => s.startOnlineGame)
  const leave = useNetworkStore((s) => s.leave)
  const game = useGameStore((s) => s.game)

  // Once the game has started, drop straight to the in-game screen.
  useEffect(() => {
    if (game) setUiMode('inGame')
  }, [game, setUiMode])

  const isHost = role === 'host'

  if (!lobby) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: 32 }}>
        <h2>Connecting…</h2>
        <p style={{ color: 'var(--ink-muted)' }}>Waiting for the host's lobby state.</p>
        <button onClick={async () => { await leave(); setUiMode('mainMenu') }}>Cancel</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Lobby · {roomCode}</h2>
          <p style={{ color: 'var(--ink-muted)', margin: '4px 0 0', fontSize: 12 }}>
            {isHost ? 'You are the host.' : 'Waiting for the host to start.'}
          </p>
        </div>
        <button onClick={async () => { await leave(); setUiMode('mainMenu') }}>← Leave</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, marginTop: 24 }}>
        {/* Left column: seats + difficulty */}
        <div>
          <h3 style={{ marginTop: 0 }}>Seats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TAOIST_COLORS.map((c) => {
              const assignedUuid = lobby.seatAssignments[c]
              const member = assignedUuid ? lobby.members[assignedUuid] : null
              const type = lobby.seatTypes[c]
              return (
                <div key={c} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  border: '1px solid var(--rule)',
                  borderRadius: 6,
                }}>
                  <span style={{ width: 14, height: 14, background: TAOIST_COLOR_HEX[c], borderRadius: '50%' }} />
                  <span style={{ textTransform: 'capitalize', minWidth: 80 }}>{c}</span>

                  {/* Seat type selector — host only */}
                  {isHost ? (
                    <select
                      value={type}
                      onChange={(e) => setSeatType(c, e.target.value as 'human' | 'ai' | 'neutral')}
                      style={{ width: 110 }}
                    >
                      <option value="human">Human</option>
                      <option value="ai">AI</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  ) : (
                    <span style={{ color: 'var(--ink-muted)', fontSize: 12, width: 110 }}>{type}</span>
                  )}

                  {type === 'human' && (
                    <span style={{ flex: 1, fontSize: 13 }}>
                      {member ? (
                        <>
                          <strong>{member.name}</strong>
                          {!member.online && <span style={{ color: 'var(--ink-muted)' }}> · offline</span>}
                        </>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)' }}>open</span>
                      )}
                    </span>
                  )}

                  {/* Claim / release controls — host only (for now) */}
                  {isHost && type === 'human' && assignedUuid !== myUuid && (
                    <button onClick={() => claimSeat(c)}>Claim</button>
                  )}
                  {isHost && type === 'human' && assignedUuid === myUuid && (
                    <button onClick={() => releaseSeat(c)}>Release</button>
                  )}
                </div>
              )
            })}
          </div>

          <h3 style={{ marginTop: 24 }}>Difficulty</h3>
          {isHost ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  style={{
                    padding: '6px 12px',
                    background: lobby.difficulty === d ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: lobby.difficulty === d ? '#1a1410' : 'var(--ink)',
                    textTransform: 'capitalize',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--ink-muted)' }}>{lobby.difficulty}</p>
          )}

          <h3 style={{ marginTop: 24 }}>Expansions</h3>
          {isHost ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={!!lobby.whiteMoon} onChange={(e) => setWhiteMoon(e.target.checked)} />
                🌙 White Moon
              </label>
              {lobby.whiteMoon && (
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginLeft: 24 }}>
                  Portal:
                  <select
                    value={lobby.portalPlacement ?? 'center'}
                    onChange={(e) => setPortalPlacement(e.target.value as 'center' | 'edge' | 'corner')}
                  >
                    <option value="center">center</option>
                    <option value="edge">edge</option>
                    <option value="corner">corner</option>
                  </select>
                </label>
              )}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={!!lobby.blackSecret} onChange={(e) => setBlackSecret(e.target.checked)} />
                🩸 Black Secret
              </label>
              {lobby.blackSecret && (
                <div style={{ marginLeft: 24, fontSize: 12 }}>
                  Wu-Feng: {lobby.wuFengUuid ? (
                    <>
                      <strong>{lobby.members[lobby.wuFengUuid]?.name ?? '?'}</strong>
                      {lobby.wuFengUuid === myUuid && <button onClick={releaseWuFeng} style={{ marginLeft: 8 }}>release</button>}
                    </>
                  ) : (
                    <button onClick={claimWuFeng}>Claim Wu-Feng</button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              {lobby.whiteMoon && '🌙 White Moon'}{lobby.whiteMoon && lobby.blackSecret && ' · '}
              {lobby.blackSecret && '🩸 Black Secret'}{lobby.blackSecret && lobby.wuFengUuid && ` (Wu-Feng: ${lobby.members[lobby.wuFengUuid]?.name ?? '?'})`}
              {!lobby.whiteMoon && !lobby.blackSecret && 'none'}
            </div>
          )}

          {isHost && (
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '12px 24px', background: 'var(--accent)', color: '#1a1410', fontSize: 16 }}
                onClick={startOnlineGame}
              >
                Start game
              </button>
            </div>
          )}
        </div>

        {/* Right column: lobby chat */}
        <div>
          <h3 style={{ marginTop: 0 }}>Lobby chat</h3>
          <LobbyChat />
          <h3 style={{ marginTop: 24 }}>Present</h3>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12 }}>
            {Object.values(lobby.members).map((m) => (
              <li key={m.uuid} style={{ color: m.online ? 'var(--ink)' : 'var(--ink-muted)' }}>
                {m.name}{m.uuid === lobby.hostUuid ? ' (host)' : ''}{m.uuid === myUuid ? ' · you' : ''}
                {!m.online && ' · offline'}
              </li>
            ))}
          </ul>
          <p style={{ color: 'var(--ink-muted)', fontSize: 11, marginTop: 8 }}>
            Share <strong>{roomCode}</strong> with friends. You are <strong>{myName}</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}

function LobbyChat() {
  const chat = useNetworkStore((s) => s.chat)
  const sendChat = useNetworkStore((s) => s.sendChat)
  const [text, setText] = useState('')
  return (
    <div>
      <div style={{
        height: 200,
        overflowY: 'auto',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--rule)',
        borderRadius: 4,
        padding: 8,
        fontSize: 12,
      }}>
        {chat.length === 0 && <div style={{ color: 'var(--ink-muted)' }}>No messages yet.</div>}
        {chat.map((m, i) => (
          <div key={i}>
            <strong>{m.name}:</strong> {m.text}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); sendChat(text); setText('') }}
        style={{ display: 'flex', gap: 4, marginTop: 4 }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          style={{ flex: 1, padding: 6, background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--rule)' }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
