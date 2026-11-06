// End-of-game statistics, computed from the game log and the per-turn
// timeline (src/store/logStore.ts). Pure: no React.

import type { Color, CurseFace, DieFace, GameState, TileKind } from '@/game/types'
import { COLORS, CURSE_DIE, DIE_FACES } from '@/game/types'
import type { LogEntry, TimelinePoint } from '@/store/logStore'

export interface TaoistStats {
  color: Color
  attempts: number
  failures: number
  exorcised: number
  qiLost: number
  qiGained: number
  helps: number
  yinYang: number
  diceRolled: number
}

export interface FaceCount<F extends string> {
  face: F
  count: number
  /** Expected count for a fair die over the same number of rolls. */
  expected: number
}

export interface GameStats {
  players: Color[]
  turns: number
  durationMs: number
  exorcised: number
  arrivals: number
  maxHaunted: number
  qiLost: number
  perTaoist: TaoistStats[]
  taoDice: FaceCount<DieFace>[]
  taoDiceTotal: number
  curse: FaceCount<CurseFace>[]
  curseTotal: number
  tiles: Array<{ kind: TileKind; uses: number }>
  timeline: TimelinePoint[]
}

export function computeStats(game: GameState, entries: LogEntry[], timeline: TimelinePoint[], startedAt: number): GameStats {
  const players = COLORS.filter((c) => !game.boards[c].neutral)
  const per = new Map<Color, TaoistStats>(
    players.map((c) => [c, { color: c, attempts: 0, failures: 0, exorcised: 0, qiLost: 0, qiGained: 0, helps: 0, yinYang: 0, diceRolled: 0 }]),
  )
  const dice = new Map<DieFace, number>(DIE_FACES.map((f) => [f, 0]))
  const curse = new Map<CurseFace, number>()
  for (const f of CURSE_DIE) curse.set(f, 0)
  const tiles = new Map<TileKind, number>()
  let exorcised = 0
  let arrivals = 0
  let qiLost = 0
  for (const e of entries) {
    const t = e.color && e.color !== 'wufeng' ? per.get(e.color) : undefined
    switch (e.kind) {
      case 'exorcise':
        if (t) t.attempts++
        break
      case 'fail':
        if (t) t.failures++
        break
      case 'exorcised':
        exorcised++
        if (t) t.exorcised++
        break
      case 'arrive':
        arrivals++
        break
      case 'qi':
        if (e.n != null && e.n < 0) {
          qiLost += -e.n
          if (t) t.qiLost += -e.n
        } else if (e.n != null && t) t.qiGained += e.n
        break
      case 'help':
        if (t) t.helps++
        if (e.tile != null) {
          const kind = game.village[e.tile]?.kind
          if (kind) tiles.set(kind, (tiles.get(kind) ?? 0) + 1)
        }
        break
      case 'yinYang':
        if (t && e.text.includes('spends')) t.yinYang++
        break
      case 'roll':
        // Count each die once: a Gods' Favorite reroll event repeats the whole set.
        if (e.dice && !e.text.includes('reroll')) {
          for (const d of e.dice) dice.set(d, (dice.get(d) ?? 0) + 1)
          if (t) t.diceRolled += e.dice.length
        }
        break
      case 'curse':
        if (e.curse) curse.set(e.curse, (curse.get(e.curse) ?? 0) + 1)
        break
    }
  }
  const taoDiceTotal = [...dice.values()].reduce((a, b) => a + b, 0)
  const curseTotal = [...curse.values()].reduce((a, b) => a + b, 0)
  const curseShare = (f: CurseFace) => CURSE_DIE.filter((x) => x === f).length / CURSE_DIE.length
  const lastAt = entries.length ? entries[entries.length - 1]!.at : startedAt
  return {
    players,
    turns: game.turn,
    durationMs: Math.max(0, lastAt - startedAt),
    exorcised,
    arrivals,
    maxHaunted: timeline.reduce((m, p) => Math.max(m, p.haunted), 0),
    qiLost,
    perTaoist: players.map((c) => per.get(c)!),
    taoDice: DIE_FACES.map((face) => ({ face, count: dice.get(face) ?? 0, expected: taoDiceTotal / DIE_FACES.length })),
    taoDiceTotal,
    curse: [...new Set(CURSE_DIE)].map((face) => ({ face, count: curse.get(face) ?? 0, expected: curseTotal * curseShare(face) })),
    curseTotal,
    tiles: [...tiles.entries()].map(([kind, uses]) => ({ kind, uses })).sort((a, b) => b.uses - a.uses),
    timeline,
  }
}

/** "12:34" or "1:02:03". */
export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
