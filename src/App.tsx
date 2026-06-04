import { Taoist } from './ui/svg/Taoist'
import { VillageTile } from './ui/svg/VillageTile'
import { GhostCard } from './ui/svg/GhostCard'
import { TaoDie } from './ui/svg/TaoDie'
import { CurseDie } from './ui/svg/CurseDie'
import { YinYangToken } from './ui/svg/YinYangToken'

export function App() {
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Ghost Stories</h1>
      <p style={{ color: 'var(--ink-muted)' }}>
        Phase 0 — scaffold. The engine, board, and AI are not built yet. See <code>CLAUDE.md</code> for the build plan.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ borderBottom: '1px solid var(--rule)', paddingBottom: 8 }}>Art primitives</h2>
        <p style={{ color: 'var(--ink-muted)' }}>
          Placeholder SVG components seeded for Phase 2. Real rendering happens once the engine lands.
        </p>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
          <Demo label="Taoists (4 colors)">
            <Taoist color="red" /><Taoist color="blue" /><Taoist color="green" /><Taoist color="yellow" />
          </Demo>

          <Demo label="Village tile">
            <VillageTile kind="circleOfPrayer" />
          </Demo>

          <Demo label="Ghost card">
            <GhostCard color="red" resistance={{ red: 2, green: 0, blue: 0, yellow: 0, black: 0 }} />
          </Demo>

          <Demo label="Tao dice">
            <TaoDie face="red" /><TaoDie face="green" /><TaoDie face="wild" />
          </Demo>

          <Demo label="Curse die">
            <CurseDie face="haunt" />
          </Demo>

          <Demo label="Yin-Yang">
            <YinYangToken />
          </Demo>
        </div>
      </section>
    </div>
  )
}

function Demo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>{children}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{label}</div>
    </div>
  )
}
