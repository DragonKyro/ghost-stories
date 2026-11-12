// Small helpers shared by the AI: a deterministic PRNG, a rough ghost-threat
// ranking (prompts, Wu-Feng), the Tao a Taoist can pool, and colour needs.
// The position score lives in value.ts, exact exorcism odds in prob.ts.

import { ghostsInPlay, taoBlocked, type PlacedGhost } from '@/game/rules'
import { lineOf } from '@/game/geometry'
import type { Color, GameState, TaoColor } from '@/game/types'
import { TAO_COLORS } from '@/game/types'

/** Small deterministic PRNG so AI decisions are reproducible in tests. */
export function aiRandom(seed: number): () => number {
  let t = seed >>> 0 || 1
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = Math.imul(t ^ (t >>> 15), t | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** How much a ghost hurts if it stays. */
export function threat(s: GameState, g: PlacedGhost): number {
  let v = 1
  const c = g.card
  if (c.incarnation) v += 6
  for (const a of c.center) {
    if (a.kind === 'haunter') {
      const front = lineOf(g.ref).find((t) => !s.village[t]!.haunted)
      const haunted = s.village.filter((t) => t.haunted).length
      v += g.ghost.figure === 'stone' ? [4.5, 7, 14][Math.min(2, haunted)]! : 2
      if (front === undefined) v -= 1
    }
    if (a.kind === 'tormentor') v += 2.5
    if (a.kind === 'devourer') v += 2.5
    if (a.kind === 'powerBlocker') v += 1.5
    if (a.kind === 'taoBlocker') v += 2.5
    if (a.kind === 'dieCaptor') v += 2.5
    if (a.kind === 'diceImmune') v += 0.5
  }
  // A full board loses Qi every turn.
  if (s.boards[g.ref.board].spaces.every(Boolean)) v += 2
  const owner = s.taoists[g.ref.board]
  if (owner.alive && owner.qi <= 1) v += 1.5
  return v
}

export function allThreats(s: GameState): Array<PlacedGhost & { threat: number }> {
  return ghostsInPlay(s)
    .map((g) => ({ ...g, threat: threat(s, g) }))
    .sort((a, b) => b.threat - a.threat)
}

/** Tao tokens (and crystals) the Taoists on `tile` (village level) could pool, plus the actor. */
export function poolAt(s: GameState, actor: Color, tile: number): { tokens: Record<TaoColor, number>; crystals: number } {
  const tokens: Record<TaoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
  let crystals = 0
  for (const c of ['red', 'blue', 'green', 'yellow'] as Color[]) {
    const t = s.taoists[c]
    if (!t.alive) continue
    if (c !== actor && !(t.tile === tile && !t.underground)) continue
    for (const col of TAO_COLORS) tokens[col] += t.tao[col]
    crystals += t.crystals
  }
  if (taoBlocked(s)) for (const col of TAO_COLORS) tokens[col] = 0
  return { tokens, crystals }
}

/**
 * Colours of Tao most useful right now: what the ghosts in play need
 * (weighted by how dangerous they are), less what the Taoists already hold.
 */
export function neededColors(s: GameState): TaoColor[] {
  const score: Record<TaoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
  const have: Record<TaoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
  for (const g of allThreats(s)) for (const c of TAO_COLORS) score[c] += (g.card.resistance[c] ?? 0) * g.threat
  for (const t of Object.values(s.taoists)) if (t.alive) for (const c of TAO_COLORS) have[c] += t.tao[c]
  // Every colour keeps arriving: a little base value, black (needed by black ghosts only) a little less.
  for (const c of TAO_COLORS) score[c] = (score[c] + (c === 'black' ? 2 : 3)) / (1 + 0.6 * have[c])
  return [...TAO_COLORS].sort((a, b) => score[b] - score[a])
}
