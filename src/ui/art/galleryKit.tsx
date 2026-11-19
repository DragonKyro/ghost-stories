// Layout helpers shared by the gallery pages (Gallery.tsx, bastion/Gallery.tsx).
import type { CSSProperties, ReactNode } from 'react'

export const page: CSSProperties = {
  background: '#1a1410',
  color: '#f4e9d6',
  fontFamily: 'Inter, system-ui, sans-serif',
  padding: '20px 28px 60px',
  minHeight: '100vh',
}
export const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', marginBottom: 14 }

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={`gallery-${id}`} className="gs-gallery-section" style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#d4a857', borderBottom: '1px solid #3a2e25', paddingBottom: 6, margin: '0 0 14px' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function Cell({ label, children, light }: { label?: string; children: ReactNode; light?: boolean }) {
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', padding: light ? 6 : 0, background: light ? '#efe4cc' : undefined, borderRadius: 4 }}>
        {children}
      </div>
      {label && <figcaption style={{ fontSize: 10, color: '#8a7e6b', maxWidth: 220, textAlign: 'center' }}>{label}</figcaption>}
    </figure>
  )
}
