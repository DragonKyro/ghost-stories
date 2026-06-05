// Self-contained rulebook.
//
// Renders TSX topics with inline SVG diagrams. Topics are grouped by category
// and filtered live by a search box.
//
// Two render modes:
//   <Rulebook />       — full-page (main menu entry)
//   <RulebookOverlay /> — modal overlay (in-game ? button)

import { useMemo, useState } from 'react'
import { TOPICS, CATEGORIES, type Topic } from './topics'
import { useGameStore } from '@/store/gameStore'

type Props = {
  /** When provided, called instead of `setUiMode('mainMenu')` on close. */
  onClose?: () => void
  /** Optional initial selected topic id. */
  initialTopicId?: string
}

export function Rulebook({ onClose, initialTopicId }: Props) {
  const setUiMode = useGameStore((s) => s.setUiMode)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>(initialTopicId ?? TOPICS[0].id)

  const lower = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!lower) return TOPICS
    return TOPICS.filter((t) =>
      t.title.toLowerCase().includes(lower) ||
      t.searchBlob.toLowerCase().includes(lower),
    )
  }, [lower])

  const selected = TOPICS.find((t) => t.id === selectedId) ?? filtered[0] ?? TOPICS[0]

  const handleClose = () => {
    if (onClose) onClose()
    else setUiMode('mainMenu')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--rule)',
      }}>
        <h2 style={{ margin: 0 }}>Rulebook</h2>
        <button onClick={handleClose}>← Close</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          borderRight: '1px solid var(--rule)',
          padding: 12,
          overflowY: 'auto',
        }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rules…"
            style={{
              width: '100%',
              padding: 6,
              background: 'var(--bg)',
              color: 'var(--ink)',
              border: '1px solid var(--rule)',
              borderRadius: 4,
              marginBottom: 12,
            }}
          />
          {CATEGORIES.map((cat) => {
            const topics = filtered.filter((t) => t.category === cat.id)
            if (topics.length === 0) return null
            return (
              <div key={cat.id} style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: 'var(--ink-muted)',
                  marginBottom: 4,
                }}>
                  {cat.label}
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {topics.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelectedId(t.id)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '4px 8px',
                          background: selected.id === t.id ? 'var(--bg-elevated)' : 'transparent',
                          border: '1px solid transparent',
                          borderLeft: selected.id === t.id ? '3px solid var(--accent)' : '3px solid transparent',
                          color: 'var(--ink)',
                          fontSize: 13,
                          marginBottom: 1,
                          cursor: 'pointer',
                        }}
                      >
                        {t.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
              No topics match "{query}".
            </p>
          )}
        </aside>

        {/* Content */}
        <article style={{ padding: 24, overflowY: 'auto', maxWidth: 800 }}>
          <h2 style={{ marginTop: 0 }}>{selected.title}</h2>
          <TopicBody topic={selected} />
        </article>
      </div>
    </div>
  )
}

function TopicBody({ topic }: { topic: Topic }) {
  return <>{topic.body()}</>
}

/** Modal-overlay flavour for the in-game ? button. */
export function RulebookOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          width: 'min(1100px, 95vw)',
          height: 'min(800px, 92vh)',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          alignSelf: 'center',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div style={{ width: '100%' }}>
          <Rulebook onClose={onClose} />
        </div>
      </div>
    </div>
  )
}
