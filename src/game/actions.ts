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
  | { type: 'moveTaoist'; taoistId: TaoistId; toTile: VillageTileId }
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

export type ActionType = Action['type']
