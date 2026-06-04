// Black Secret canonical data: catacomb tokens and curse effect kinds.

export type CatacombTokenKind =
  | 'dirt' // no effect, token removed
  | 'buddha' // searching demon returns to Wu-Feng board; no curse
  | 'bloodOfTheJust' // active Taoist places 1 Qi on a Bloody Mantra
  | 'cursedTablet' // Wu-Feng throws a curse of his choice
  | 'bones' // Wu-Feng places a skeleton on a free ghost space
  | 'bloodOfSuLing' // active Taoist immediately resolves a Bloody Mantra
  | 'urn' // adds to Wu-Feng's urn-find count; on 3rd the Shadow enters play

export type CatacombToken = {
  id: string
  kind: CatacombTokenKind
}

/** Per-Taoist token layout: each board layer has 9 tokens. */
export const TOKEN_COUNTS_PER_LAYER: Record<CatacombTokenKind, number> = {
  dirt: 3,
  buddha: 1,
  bloodOfTheJust: 1,
  cursedTablet: 1,
  bones: 1,
  bloodOfSuLing: 1,
  urn: 1,
}

/**
 * Build a layered token deck for the given number of Taoists (1-4). Each
 * layer is shuffled separately so layer N tokens are drawn before layer N+1
 * is exposed.
 *
 * In this simplified implementation we collapse layers into a single FIFO
 * stack: layer 1 → layer 2 → … to drive demon search reveals.
 */
export function buildCatacombDeck(taoistCount: number): CatacombToken[] {
  const out: CatacombToken[] = []
  let nextId = 0
  for (let layer = 1; layer <= taoistCount; layer++) {
    for (const kind of Object.keys(TOKEN_COUNTS_PER_LAYER) as CatacombTokenKind[]) {
      for (let i = 0; i < TOKEN_COUNTS_PER_LAYER[kind]; i++) {
        out.push({ id: `cat-${layer}-${nextId++}`, kind })
      }
    }
  }
  return out
}

/**
 * Per-curse effects (simplified). Each level has a representative effect; the
 * actual rulebook has 14 distinct curses with unique effects. This is a
 * curated subset that touches the key levers (Qi loss, Tao discard, haunting,
 * power lock, ladder removal — last one is omitted since we don't model
 * ladders).
 */
export type CurseEffect =
  | 'activePlayerLosesQi' // 1 Qi
  | 'activePlayerLosesTao' // discard 1 Tao
  | 'allPlayersLoseTao' // each player discards 1 Tao
  | 'hauntFirstActiveTile' // first active tile haunted
  | 'allPlayersLoseQi' // each living player loses 1 Qi (level 4!)

import type { CurseLevel } from './types'

export const DEFAULT_CURSE_EFFECT_BY_LEVEL: Record<CurseLevel, CurseEffect> = {
  1: 'activePlayerLosesQi',
  2: 'activePlayerLosesTao',
  3: 'hauntFirstActiveTile',
  4: 'allPlayersLoseQi',
}

// ----- Bloody Mantra resolution effects ----------------------------------

/**
 * When a Bloody Mantra fills with Qi (placement from Qi losses) it resolves.
 * Level 2 has a simple effect; levels 3/4 are progressively more powerful.
 * The rulebook has different Mantra cards within each level; we use one
 * representative effect per level.
 */
export type MantraResolution =
  | 'gainQiAllAlive' // every living Taoist gains 1 Qi
  | 'returnAllInactiveTao' // remove the Inactive Tao marker globally
  | 'discardThreeGhosts' // discard the highest-resistance non-incarnation ghost on each board

export const MANTRA_RESOLUTION_BY_LEVEL: Record<2 | 3 | 4, MantraResolution> = {
  2: 'gainQiAllAlive',
  3: 'returnAllInactiveTao',
  4: 'discardThreeGhosts',
}
