// A small pill for the game screen while online: the room code (click to
// copy the invite link), a dot per seat played by a person (lit while they're
// connected), "Spectating" for spectators, and "Reconnecting…" when this
// device's own link has been down for a couple of seconds. Renders nothing
// offline.

import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { Seat } from '@/game/types'
import { roomLink } from '@/net/roomLink'
import { useNetworkStore } from '@/store/networkStore'
import { lobbySeat } from '@/store/lobby'
import { SEAT_LABEL, seatStyle } from './seatColors'
import { RECONNECT_GRACE_MS, useAfter } from './useAfter'
import './online.css'

const SEATS: readonly Seat[] = ['red', 'blue', 'green', 'yellow', 'wufeng']

export function ConnectionBadge({ className }: { className?: string }) {
  const { connection, roomCode, role, serverConnected, lobby, seatUuids } = useNetworkStore(
    useShallow((s) => ({
      connection: s.connection,
      roomCode: s.roomCode,
      role: s.role,
      serverConnected: s.serverConnected,
      lobby: s.lobby,
      seatUuids: s.seatUuids,
    })),
  )
  const onlineUuids = useNetworkStore((s) => s.onlineUuids)
  const reconnecting = useAfter(!serverConnected, RECONNECT_GRACE_MS)
  const [copied, setCopied] = useState(false)

  if (connection !== 'lobby' && connection !== 'in-game') return null

  const people = SEATS.flatMap((seat) => {
    const uuid = seatUuids[seat] ?? (connection === 'lobby' ? lobbySeat(lobby, seat).uuid : null)
    if (!uuid) return []
    const name = lobbySeat(lobby, seat).name || SEAT_LABEL[seat]
    return [{ seat, name, online: onlineUuids.has(uuid) }]
  })

  const copy = async () => {
    if (!roomCode) return
    try {
      await navigator.clipboard.writeText(roomLink(roomCode))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* no clipboard: ignore */
    }
  }

  return (
    <div className={`ol-badge ${className ?? ''}`} role="status">
      <button type="button" className="ol-badge-code" onClick={copy} title="Copy the invite link">
        {copied ? 'Link copied' : `Room ${roomCode ?? ''}`}
      </button>
      {people.length > 0 && (
        <span className="ol-badge-seats">
          {people.map((p) => (
            <span
              key={p.seat}
              className={`ol-badge-seat ${p.online ? 'ol-badge-seat-online' : ''}`}
              style={seatStyle(p.seat)}
              title={`${SEAT_LABEL[p.seat]}: ${p.name} (${p.online ? 'online' : 'offline'})`}
            />
          ))}
        </span>
      )}
      {role === 'spectator' && <span className="ol-muted">Spectating</span>}
      {reconnecting && <span className="ol-badge-warn">Reconnecting…</span>}
    </div>
  )
}
