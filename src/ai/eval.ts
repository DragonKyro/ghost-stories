// Board evaluation for the heuristic AI: how dangerous each ghost is, and how
// likely an exorcism is to succeed.

import { covers, requirementsFor, type Requirement } from '@/game/exorcism'
import { cardAt, ghostsInPlay, taoBlocked, whiteIsWild, type PlacedGhost } from '@/game/rules'
import { lineOf } from '@/game/geometry'
import type { Color, DieFace, ExorcismRoll, GameState, GhostRef, TaoColor } from '@/game/types'
import { DIE_FACES, TAO_COLORS } from '@/game/types'

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

/** Estimated chance that `n` dice (+ the pool) exorcise these targets. */
export function successChance(
  s: GameState,
  actor: Color,
  tile: number,
  targets: GhostRef[],
  n: number,
  reroll: boolean,
  rand: () => number,
  samples = 160,
): number {
  if (targets.some((r) => !cardAt(s, r))) return 0
  const fake: ExorcismRoll = { mode: 'exorcism', actor, targets, demons: [], dice: [], canReroll: false }
  const reqs: Requirement[] = requirementsFor(s, fake, targets, [])
  const { tokens, crystals } = poolAt(s, actor, tile)
  const wild = whiteIsWild(s)
  let ok = 0
  for (let i = 0; i < samples; i++) {
    let dice: DieFace[] = Array.from({ length: n }, () => DIE_FACES[Math.floor(rand() * 6)]!)
    if (covers(reqs, dice, wild, tokens, crystals)) {
      ok++
      continue
    }
    if (reroll) {
      dice = dice.map((d) => (useful(d, reqs) ? d : DIE_FACES[Math.floor(rand() * 6)]!))
      if (covers(reqs, dice, wild, tokens, crystals)) ok++
    }
  }
  return ok / samples
}

function useful(d: DieFace, reqs: Requirement[]): boolean {
  if (d === 'white') return true
  return reqs.some((r) => !r.immune && (r.base[d] ?? 0) > 0)
}

/** Colours of Tao most useful right now (by threat of ghosts needing them). */
export function neededColors(s: GameState): TaoColor[] {
  const score: Record<TaoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
  for (const g of allThreats(s)) for (const c of TAO_COLORS) score[c] += (g.card.resistance[c] ?? 0) * g.threat
  for (const c of TAO_COLORS) score[c] += 0.1 // tie-break so every colour has some value
  return [...TAO_COLORS].sort((a, b) => score[b] - score[a])
}
