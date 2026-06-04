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
 * Per-curse effects. The rulebook ships 14 distinct curses across 4 levels;
 * we implement each as a discrete `CurseEffect` so Wu-Feng can pick which one
 * to throw within a level. The pool sizes (5/4/3/2) match the rulebook
 * pyramid.
 */
export type CurseEffect =
  // Level 1 (5 curses)
  | 'activePlayerLosesQi' // active player loses 1 Qi
  | 'activePlayerLosesTao' // active player discards 1 Tao token
  | 'activePlayerLosesYinYang' // active player loses their Yin-Yang token
  | 'hauntActivePlayersBoardLine' // active player's board: advance every haunting figure 1 step
  | 'returnAllCircleTokens' // any Tao token on the Circle of Prayer goes back to supply
  // Level 2 (4 curses)
  | 'allPlayersLoseTao' // every player discards 1 Tao
  | 'allPlayersLoseQi1' // every alive Taoist loses 1 Qi (lvl 2 variant)
  | 'lockOnePlayerPower' // active player's board power inactivates this turn
  | 'inactiveTaoMarkerOn' // sets the Inactive Tao marker
  // Level 3 (3 curses)
  | 'hauntFirstActiveTile' // first active tile gets haunted
  | 'returnAllInactiveTaoists' // (placeholder — not modeled here, falls back to lvl 3 Qi tax)
  | 'allPlayersLoseQi2' // every alive Taoist loses 1 Qi (lvl 3 variant)
  // Level 4 (2 curses)
  | 'allPlayersLoseQi' // every alive Taoist loses 1 Qi (lvl 4)
  | 'hauntTwoTiles' // two tiles haunted at once

import type { CurseLevel } from './types'

export const CURSE_POOL_BY_LEVEL: Record<CurseLevel, CurseEffect[]> = {
  1: [
    'activePlayerLosesQi',
    'activePlayerLosesTao',
    'activePlayerLosesYinYang',
    'hauntActivePlayersBoardLine',
    'returnAllCircleTokens',
  ],
  2: [
    'allPlayersLoseTao',
    'allPlayersLoseQi1',
    'lockOnePlayerPower',
    'inactiveTaoMarkerOn',
  ],
  3: [
    'hauntFirstActiveTile',
    'returnAllInactiveTaoists',
    'allPlayersLoseQi2',
  ],
  4: [
    'allPlayersLoseQi',
    'hauntTwoTiles',
  ],
}

// Engine fallback when Wu-Feng doesn't specify a particular curse.
export const DEFAULT_CURSE_EFFECT_BY_LEVEL: Record<CurseLevel, CurseEffect> = {
  1: 'activePlayerLosesQi',
  2: 'allPlayersLoseTao',
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
