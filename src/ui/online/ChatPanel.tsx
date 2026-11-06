// Room chat, for the lobby and the game. Reads `networkStore.chat`, sends
// with `sendChat`. Auto-scrolls on new messages only when the reader is
// already at the bottom, so scrolling back through history isn't yanked away.
// Renders nothing when this device isn't in a room.

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useNetworkStore } from '@/store/networkStore'
import { personColor } from './seatColors'
import './online.css'

export interface ChatPanelProps {
  /** Heading above the messages; null hides it. */
  title?: string | null
  /** Height of the message list (CSS length). */
  height?: CSSProperties['height']
  className?: string
}

export function ChatPanel({ title = 'Chat', height = 200, className }: ChatPanelProps) {
  const connection = useNetworkStore((s) => s.connection)
  const chat = useNetworkStore((s) => s.chat)
  const lobby = useNetworkStore((s) => s.lobby)
  const myUuid = useNetworkStore((s) => s.myUuid)
  const sendChat = useNetworkStore((s) => s.sendChat)
  const [text, setText] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)

  useEffect(() => {
    const el = logRef.current
    if (el && atBottom.current) el.scrollTop = el.scrollHeight
  }, [chat.length])

  if (connection !== 'lobby' && connection !== 'in-game') return null

  const onScroll = () => {
    const el = logRef.current
    if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    sendChat(text)
    setText('')
    atBottom.current = true
  }

  const users = chat.filter((m) => m.kind === 'user').length

  return (
    <section className={`ol-chat ${className ?? ''}`}>
      {title !== null && (
        <div className="ol-chat-head">
          <span>{title}</span>
          <span className="ol-muted">
            {users} message{users === 1 ? '' : 's'}
          </span>
        </div>
      )}
      <div className="ol-chat-log" ref={logRef} onScroll={onScroll} style={{ height }} aria-live="polite">
        {chat.length === 0 && <div className="ol-chat-system">No messages yet. Say hello.</div>}
        {chat.map((m) =>
          m.kind === 'system' ? (
            <div key={m.id} className="ol-chat-msg ol-chat-system">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="ol-chat-msg">
              <span
                className="ol-chat-name"
                style={{ color: personColor(lobby, m.senderUuid) ?? (m.senderUuid === myUuid ? 'var(--accent)' : 'var(--ink-muted)') }}
              >
                {m.senderName}
              </span>
              <span>{m.text}</span>
            </div>
          ),
        )}
      </div>
      <form className="ol-chat-form" onSubmit={submit}>
        <input
          className="ol-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          maxLength={300}
          aria-label="Chat message"
        />
        <button type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </section>
  )
}
