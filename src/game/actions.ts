// Action union. Every state transition flows through this discriminated type.
//
// Randomness contract: any non-deterministic outcome (dice, curse die, ghost
// draws) is decided by the acting peer and carried in the payload as data.
// The engine never reads entropy on its own except through the seeded RNG on
// `GameState.rngState` (which is used only for setup-time decisions).

import type {
  CurseFace,
  GhostRef,
  TaoColor,
  TaoDieFace,
  TaoistColor,
  TaoistId,
  TaoistPowerId,
  VillageTileId,
  WuFengIncarnationId,
} from './types'

// ---------- High-level engine actions ----------------------------------

// `startTurn` is what kicks off a Yin phase. Caller passes the curse-die
// results for every Tormentor on the active board (left-to-right), the
// ghost-spawn card (if Yin step 3 fires), and the placement decision the
// active player makes on overrun-of-targeted-board.
export type StartTurnPayload = {
  // For each Tormentor on the active board in left-to-right order: roll result.
  tormentorCurseRolls: CurseFace[]
  // For each "spawn ghost" curse-die outcome above, the resulting ghost draw:
  curseSpawnedGhosts: ArrivingGhost[]
  // Yin step 3: did we draw a ghost? If the board was overrun this is omitted.
  arrival?: ArrivingGhost
}

// A ghost coming into play. `cardId` identifies the catalogue card; the engine
// applies its on-arrival ability immediately. If the ghost's natural color
// board is full, `targetBoard` carries the player's override choice.
export type ArrivingGhost = {
  cardId: string
  // Where the ghost should be placed. Null means "deck draw revealed an
  // incarnation that's already in play / dead" — only used in the
  // deckExhausted path.
  targetBoard: TaoistColor
  targetSpace: 0 | 1 | 2
  // For arriveAddGhost on-arrival ability: the chained ghost it triggers.
  // Recursion is bounded by the deck size.
  chainedArrival?: ArrivingGhost
}

// Yang-phase player actions.
export type YangAction =
  | { type: 'moveTaoist'; taoistId: TaoistId; toTile: VillageTileId; carryVillager?: boolean }
  | {
      type: 'requestHelp'
      taoistId: TaoistId
      // Tile-specific parameters (e.g., Pavilion target / move target).
      params: HelpParams
      // Sub-results: dice for Herbalist, curse for Cemetery, arriving ghost
      // for Tea House / Taoist Altar.
      diceRoll?: TaoDieFace[]
      curseRoll?: CurseFace
      arrival?: ArrivingGhost
    }
  | {
      type: 'exorcise'
      taoistId: TaoistId
      ghosts: GhostRef[] // 1 normally; 2 if corner-tile dual exorcism
      diceRoll: TaoDieFace[]
      // Re-rolls (green Taoist's Gods' Favorite); a flat list applied positionally
      // up to length(diceRoll). Last value wins per index.
      diceReroll?: TaoDieFace[]
      // Tao tokens spent to cover shortfall. Pooled from any Taoist on the
      // same village tile — engine validates.
      spentTao: Array<{ from: TaoistId; color: TaoColor }>
      /**
       * White Moon: moon crystals spent. Each entry covers 1 face of the
       * specified color (acts like a wild — color is chosen at spend time).
       * Crystals deplete the actor's per-Taoist pool.
       */
      spentMoonCrystals?: Array<{ from: TaoistId; asColor: TaoColor }>
      // For exorcism's right-stone abilities that need a curse die roll:
      onExorcismCurseRolls?: CurseFace[]
    }
  | {
      type: 'placeBuddha'
      taoistId: TaoistId
      spaces: GhostRef[] // 1 normally; 2 if corner-tile placement
    }
  | {
      type: 'useYinYang'
      taoistId: TaoistId
      effect: YinYangEffect
    }
  | {
      type: 'usePower'
      taoistId: TaoistId
      powerId: TaoistPowerId
      params: PowerParams
    }
  | { type: 'spendPowerToken'; taoistId: TaoistId; neutralBoard: TaoistColor; powerId: TaoistPowerId; params: PowerParams }
  // White Moon: save the top villager on the portal tile (Shelter).
  | { type: 'saveVillager'; taoistId: TaoistId }
  // White Moon: place a moon crystal you hold into an unfilled receptacle.
  // Placement is legal only when standing on a corner tile adjacent to the
  // receptacle (per rulebook: corner tiles of the 3x3 village).
  | { type: 'placeMoonCrystal'; taoistId: TaoistId; receptacle: 'ne' | 'nw' | 'se' | 'sw' }
  // White Moon: move Su-Ling to a different empty haunting icon (one-shot per
  // event). Only the active player may execute this. Empty haunting icons are
  // ghost-space slots WITHOUT a ghost in them.
  | { type: 'moveSuLing'; taoistId: TaoistId; toBoard: TaoistColor; toGhostSpaceIdx: 0 | 1 | 2 }
  /**
   * White Moon Mystic Barrier per-board choice. While `phase === 'mysticBarrier'`,
   * the active "current board" picks one of:
   *   - 'saveVillager' — return 1 crystal to the reserve, save the top villager
   *     from the Portal tile (or any visible villager if Portal is empty).
   *   - 'exorcise' — roll 4 Tao dice + spend up to 4 crystals (no Tao tokens
   *     allowed). Discard a chosen ghost on this board if successful.
   *   - 'skip' — pass on this board.
   * The engine then advances `mysticBarrierBoard` to the next board (clockwise).
   * When all 4 boards have chosen, the phase ends and the turn advances.
   */
  | {
      type: 'mysticBarrierChoice'
      taoistId: TaoistId
      choice:
        | { kind: 'saveVillager' }
        | { kind: 'exorcise'; targetGhost: GhostRef; diceRoll: TaoDieFace[]; crystalsAsColor: Array<TaoColor> }
        | { kind: 'skip' }
    }
  | { type: 'endYangPhase'; taoistId: TaoistId }

export type HelpParams =
  | { kind: 'circleOfPrayer'; placeColor: TaoColor }
  | { kind: 'buddhistTemple' }
  | { kind: 'cemetery'; reviveTaoist: TaoistColor }
  | { kind: 'taoistAltar'; flipTile: VillageTileId }
  | { kind: 'herbalistShop' }
  | { kind: 'sorcerersHut'; targetGhost: GhostRef }
  | { kind: 'nightWatchmanBeat'; targetBoard: TaoistColor }
  | { kind: 'pavilionOfHeavenlyWind'; moveGhost: GhostRef; toGhostSpace: GhostRef; alsoMoveTaoist?: { taoistId: TaoistId; toTile: VillageTileId } }
  | { kind: 'teaHouse' }
  /**
   * White Moon: Kung-Fu School. Attempt a solitary exorcism on all ghosts of
   * a chosen scope. `scope: 'ownBoard'` exorcises every ghost on the actor's
   * board; `scope: 'blackGhosts'` exorcises every black ghost in play.
   *
   * Engine treats it as a single multi-target exorcism without right-stone
   * rewards (per rulebook). Implemented as a simplified pass — rolls 4 Tao
   * dice; if the combined resistance is met (with crystals + own Tao only),
   * all targets are discarded silently. Otherwise nothing happens.
   */
  | { kind: 'kungFuSchool'; scope: 'ownBoard' | 'blackGhosts'; diceRoll: TaoDieFace[]; spentTao: Array<{ from: TaoistId; color: TaoColor }>; spentMoonCrystals?: Array<{ from: TaoistId; asColor: TaoColor }> }
  /**
   * Black Secret: Calligrapher tile. Pick one or both:
   *   - swapMantra: discard a chosen Bloody Mantra and replace with a fresh
   *     one of the SAME level (or a chosen level if more than one available).
   *   - placeQi: place 1 Qi from the reserve on a Bloody Mantra of choice
   *     (no Qi loss to a Taoist).
   */
  | {
      kind: 'calligrapher'
      swapMantra?: { mantraIdx: number }
      placeQi?: { mantraIdx: number }
    }

export type YinYangEffect =
  | { kind: 'requestHelpAnywhere'; tile: VillageTileId; params: HelpParams }
  | { kind: 'flipHauntedTile'; tile: VillageTileId }

export type PowerParams =
  | { kind: 'danceOfTheSpires'; toTile: VillageTileId }
  | { kind: 'danceOfTheTwinWinds'; otherTaoist: TaoistId; toTile: VillageTileId }
  | { kind: 'heavenlyGust' } // marker only — affects sequencing in Yang phase
  | { kind: 'secondWind' } // marker only — affects sequencing in Yang phase
  | { kind: 'godsFavorite' } // marker; reroll decisions surface via the exorcise action
  | { kind: 'strengthOfMountain' } // marker; engine grants 4th die in exorcism
  | { kind: 'bottomlessPockets'; color: TaoColor }
  | { kind: 'enfeeblementMantra'; targetGhost: GhostRef }

// ---------- Setup / lifecycle actions ----------------------------------

export type Action =
  | { type: 'startTurn'; payload: StartTurnPayload }
  | YangAction
  // Internal: used to expose deterministic sub-step resolution to UI / log.
  // Not strictly required (`startTurn` carries all data) but useful for tests.
  | {
      type: 'spawnIncarnation'
      incarnationId: WuFengIncarnationId
      targetBoard: TaoistColor
      targetSpace: 0 | 1 | 2
    }
  /**
   * Black Secret: Wu-Feng player's decision at Yin step 3. Choose to:
   *   - 'place' — place the drawn ghost on a board normally
   *   - 'summon' — discard the ghost (must have resistance ≥ cost), summon a
   *     demon of that cost into the catacombs at an entrance square
   *   - 'curse' — discard the ghost, throw a curse of matching color + chosen
   *     level (1..4). Black ghosts are wild-color jokers.
   *   - 'skeleton' — discard the ghost and place a skeleton on a free ghost
   *     space (any board). Skeleton acts as a resistance-1 ghost of the
   *     hosting board's color.
   */
  | {
      type: 'wuFengIntervene'
      choice:
        | { kind: 'place'; targetBoard: TaoistColor; targetSpace: 0 | 1 | 2 }
        | { kind: 'summon'; demonId: 'cost2' | 'cost3' | 'cost4'; entranceSquare: 0 | 8 } // 0=NW, 8=SE corners
        | { kind: 'curse'; level: 1 | 2 | 3 | 4; color: TaoColor; effect?: import('./blackSecretData').CurseEffect }
        | { kind: 'skeleton'; targetBoard: TaoistColor; targetSpace: 0 | 1 | 2 }
    }
  /**
   * Black Secret: Wu-Feng's Yin-step-0 demon actions. Before each player
   * board's Yin phase, Wu-Feng has every catacombs demon take 1 action: move
   * to an adjacent catacombs square OR search the current square. We process
   * all demons at once with a single dispatched payload (move/search per
   * demon, in resistance-ascending order). Search reveals + resolves the top
   * catacomb token.
   */
  | {
      type: 'wuFengDemonActions'
      moves: Array<
        | { demonIdx: number; kind: 'move'; toSquare: number }
        | { demonIdx: number; kind: 'search' }
      >
    }
  /**
   * Black Secret: Shadow of Wu-Feng action. Runs after demon actions and
   * before Yin step 1. The Shadow can:
   *   - move to any village tile or any ghost-space slot (no adjacency limit)
   *   - attack the Taoist(s) on its current tile: roll 3 Tao dice; each
   *     black face removes 1 Qi from a chosen Taoist on that tile.
   *   - attack a village tile if alone there: roll the curse die / spawn a
   *     ghost / haunt the tile.
   * The Shadow is invincible — players cannot exorcise it.
   */
  | {
      type: 'wuFengShadowAction'
      action:
        | { kind: 'move'; toBoard?: TaoistColor; toGhostSpaceIdx?: 0 | 1 | 2; toTile?: VillageTileId }
        | { kind: 'attackTaoists'; diceRoll: TaoDieFace[]; targetTaoists: TaoistColor[] }
        | { kind: 'attackTile'; curseRoll: CurseFace; arrival?: ArrivingGhost }
        | { kind: 'pass' }
    }

export type ActionType = Action['type']
