import { useEffect, useRef } from 'react'
import { useLogStore } from '@/store/logStore'
import { TAOIST_COLOR_HEX } from '@/ui/shared/playerColors'

export function LogPanel() {
  const entries = useLogStore((s) => s.entries)
  const ref = useRef<HTMLDivElement>(null)
  const wasAtBottom = useRef(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (wasAtBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [entries])

  return (
    <div
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget
        wasAtBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 8
      }}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--rule)',
        borderRadius: 6,
        padding: 8,
        height: 240,
        overflowY: 'auto',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
      }}
    >
      {entries.length === 0 && (
        <div style={{ color: 'var(--ink-muted)' }}>Log will appear here…</div>
      )}
      {entries.map((e, i) => (
        <div
          key={i}
          style={{
            padding: '2px 4px',
            borderLeft: e.color ? `3px solid ${TAOIST_COLOR_HEX[e.color]}` : '3px solid transparent',
            paddingLeft: 6,
            color: e.kind === 'loss' ? '#c1392b' : e.kind === 'win' ? '#d4a857' : 'var(--ink)',
          }}
        >
          {e.text}
        </div>
      ))}
    </div>
  )
}
