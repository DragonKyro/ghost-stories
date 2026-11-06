// The game log (all events) and the "just now" strip (the latest few).

import { useEffect, useRef } from 'react'
import { useLogStore, type LogEntry } from '@/store/logStore'
import { COLOR_HEX, CurseDie, TaoDie } from '@/ui/art'

const BAD = new Set(['haunt', 'death', 'qi', 'loss', 'overrun', 'possessed', 'villagerDeath', 'fail'])
const GOOD = new Set(['exorcised', 'win', 'revive', 'save', 'family', 'unhaunt'])

function Entry({ e }: { e: LogEntry }) {
  const tone = e.kind === 'turn' ? 'turn' : e.kind === 'qi' && e.text.includes('gains') ? 'good' : BAD.has(e.kind) ? 'bad' : GOOD.has(e.kind) ? 'good' : ''
  const stripe = e.color && e.color !== 'wufeng' ? COLOR_HEX[e.color] : e.color === 'wufeng' ? '#7a2a6a' : 'transparent'
  return (
    <div className={`gs-entry ${tone}`} style={{ borderLeftColor: e.kind === 'turn' ? undefined : stripe }}>
      {e.curse && <CurseDie face={e.curse} size={18} />}
      {e.dice?.map((d, i) => <TaoDie key={i} face={d} size={18} />)}
      <span>{e.text}</span>
    </div>
  )
}

export function LogPanel() {
  const entries = useLogStore((l) => l.entries)
  const box = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  useEffect(() => {
    const el = box.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [entries.length])
  return (
    <div
      className="gs-log"
      ref={box}
      onScroll={(ev) => {
        const el = ev.currentTarget
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30
      }}
    >
      {entries.map((e) => (
        <Entry key={e.id} e={e} />
      ))}
    </div>
  )
}

export function RecentEvents() {
  const entries = useLogStore((l) => l.entries)
  // Everything since the start of the current turn, capped.
  let start = entries.length - 1
  while (start > 0 && entries[start]!.kind !== 'turn') start--
  const recent = entries.slice(Math.max(start, entries.length - 10))
  return (
    <div className="gs-recent">
      {recent.map((e) => (
        <Entry key={e.id} e={e} />
      ))}
    </div>
  )
}
