import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useNetworkStore } from '@/store/networkStore'
import { generateRoomCode } from '@/net/identity'

export function OnlineSetup() {
  const setUiMode = useGameStore((s) => s.setUiMode)
  const myName = useNetworkStore((s) => s.myName)
  const setMyName = useNetworkStore((s) => s.setMyName)
  const host = useNetworkStore((s) => s.host)
  const join = useNetworkStore((s) => s.join)
  const status = useNetworkStore((s) => s.status)

  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const handleHost = async () => {
    setBusy(true)
    try {
      const c = generateRoomCode()
      await host(c)
      setUiMode('onlineLobby')
    } catch (err) {
      console.error(err)
      alert('Host failed: ' + (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    const c = code.trim().toUpperCase()
    if (c.length < 3) {
      alert('Enter a room code first.')
      return
    }
    setBusy(true)
    try {
      await join(c)
      setUiMode('onlineLobby')
    } catch (err) {
      console.error(err)
      alert('Join failed: ' + (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 32 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Online Multiplayer</h2>
        <button onClick={() => setUiMode('mainMenu')}>← Back</button>
      </header>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Your name</h3>
        <input
          type="text"
          value={myName}
          onChange={(e) => setMyName(e.target.value)}
          placeholder="Player"
          style={inputStyle}
        />
        <p style={muted}>Shown in the lobby and chat. Stored locally.</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Host a new room</h3>
        <button
          disabled={busy}
          onClick={handleHost}
          style={{ padding: '10px 18px', background: 'var(--accent)', color: '#1a1410' }}
        >
          {busy ? '…' : 'Host'}
        </button>
        <p style={muted}>You'll get a 4-character code to share with friends.</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Join an existing room</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="e.g. AX7K"
            style={{ ...inputStyle, flex: 1, letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'monospace' }}
          />
          <button disabled={busy} onClick={handleJoin}>
            {busy ? '…' : 'Join'}
          </button>
        </div>
      </section>

      {status && (
        <p style={{ marginTop: 24, padding: 8, background: 'var(--bg-elevated)', border: '1px solid var(--rule)', borderRadius: 4, fontSize: 12 }}>
          {status}
        </p>
      )}

      <p style={muted}>
        Uses Trystero WebRTC peer-to-peer over BitTorrent trackers. No backend, no accounts.
        The room code doubles as the encryption password. Append <code>?fresh</code> to the URL
        to use sessionStorage instead of localStorage (handy for testing two tabs locally).
      </p>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--rule)',
  color: 'var(--ink)',
  borderRadius: 4,
  fontSize: 14,
}

const muted: React.CSSProperties = { color: 'var(--ink-muted)', fontSize: 12, marginTop: 8 }
