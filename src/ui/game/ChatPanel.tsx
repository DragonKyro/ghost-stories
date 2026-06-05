// In-game chat panel. Reads `networkStore.chat`, sends via `sendChat`.
//
// Auto-scrolls to bottom on new messages when the user is already at the
// bottom (so scrolling back to read history isn't yanked away).
//
// Hidden in solo mode (no chat partner).

import { useEffect, useRef, useState } from 'react'
import { useNetworkStore } from '@/store/networkStore'

export function ChatPanel() {
  const role = useNetworkStore((s) => s.role)
  const chat = useNetworkStore((s) => s.chat)
  const sendChat = useNetworkStore((s) => s.sendChat)
  const myUuid = useNetworkStore((s) => s.myUuid)

  const scrollRef = useRef<HTMLDivElement>(null)
  const wasAtBottom = useRef(true)
  const [text, setText] = useState('')

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (wasAtBottom.current) el.scrollTop = el.scrollHeight
  }, [chat])

  if (role === 'solo') return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    sendChat(text)
    setText('')
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      padding: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 13 }}>Chat</h3>
        <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>{chat.length} msg{chat.length === 1 ? '' : 's'}</span>
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          wasAtBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 8
        }}
        style={{
          height: 180,
          overflowY: 'auto',
          padding: 4,
          background: 'var(--bg)',
          border: '1px solid var(--rule)',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      >
        {chat.length === 0 && (
          <div style={{ color: 'var(--ink-muted)' }}>No messages yet. Say hello.</div>
        )}
        {chat.map((m, i) => (
          <div key={i} style={{ padding: '1px 2px', color: m.uuid === myUuid ? 'var(--accent)' : 'var(--ink)' }}>
            <strong>{m.name}:</strong> {m.text}
          </div>
        ))}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', gap: 4 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Message…"
          style={{
            flex: 1,
            padding: 4,
            background: 'var(--bg)',
            color: 'var(--ink)',
            border: '1px solid var(--rule)',
            fontSize: 12,
          }}
        />
        <button type="submit" style={{ padding: '0 12px', fontSize: 12 }}>Send</button>
      </form>
    </div>
  )
}
