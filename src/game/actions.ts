// Every way the game state can change. Actions carry intents and choices
// only — dice are rolled by the engine from the seeded RNG on the state.
//
// Two families:
//   - Yang-phase moves by the active Taoist (`by` = their colour).
//   - `respond`: the answer to the current prompt, sent by the prompt's owner.

import type { ArtifactId, Color, Corner, DemonId, GhostRef, PowerId, Seat, TaoColor, TileIdx } from './types'

/** Parameters of a village tile's action ("request help from a villager"). */
export type HelpParams =
  | { kind: 'circleOfPrayer'; color: TaoColor }
  | { kind: 'buddhistTemple' }
  /** Bring a dead Taoist back, or (White Moon) a killed villager by graveyard index. */
  | { kind: 'cemetery'; revive: Color }
  | { kind: 'cemetery'; villager: number }
  | { kind: 'taoistAltar'; tile: TileIdx }
  | { kind: 'herbalistShop' }
  | { kind: 'sorcerersHut'; ghost: GhostRef }
  | { kind: 'nightWatchman'; board: Color }
  /**
   * Move a ghost to any free space, then make a normal move with another
   * Taoist (solo: your own). `taoist` is null only when nobody can be moved.
   */
  | {
      kind: 'pavilion'
      ghost: GhostRef
      to: GhostRef
      taoist: Color | null
      taoistTo: TileIdx | null
      /** White Moon: the moved Taoist brings the top villager of their tile along. */
      carry?: boolean
      /** Black Secret: after the move, the moved Taoist changes levels by the ladder there. */
      climb?: boolean
    }
  | { kind: 'teaHouse'; color: TaoColor }
  /** White Moon: a solitary exorcism of every ghost of your board's colour, or every black ghost. */
  | { kind: 'kungFuSchool'; scope: 'ownColor' | 'black' | { neutralBoard: Color } }
  /** Black Secret: swap a Bloody Mantra and/or put a Qi from the reserve on one. */
  | { kind: 'calligrapher'; swap: { mantra: number; replacement: string } | null; placeQi: number | null }

/** Powers used "before your move". */
export type PowerUse =
  | { power: 'danceOfTheTwinWinds'; taoist: Color; to: TileIdx; carry?: boolean; climb?: boolean }
  | { power: 'bottomlessPockets'; color: TaoColor }
  /** On a ghost, or (Black Secret) on a demon's space on Wu-Feng's board. */
  | { power: 'enfeeblementMantra'; ghost?: GhostRef; demon?: DemonId }

export type YinYangUse = { kind: 'flip'; tile: TileIdx } | { kind: 'help'; tile: TileIdx; params: HelpParams }

/** A Tao token spent in an exorcism, taken from a Taoist on the same tile. */
export interface TaoSpend {
  from: Color
  color: TaoColor
}

/** White Moon: a moon crystal spent as a Tao token of the chosen colour. */
export interface CrystalSpend {
  /** A Taoist on the same tile, or the Mystic Barrier's pool. */
  from: Color | 'barrier'
  as: TaoColor
}

/** Black Secret: what Wu-Feng does with a drawn ghost card. */
export type WuFengGhostChoice =
  | { kind: 'place'; ref: GhostRef }
  | { kind: 'summon'; demon: DemonId; entrance: TileIdx }
  | { kind: 'curse'; token: string; slot: number }

export type ShadowChoice =
  | { kind: 'move'; where: 'village' | 'catacombs'; tile: TileIdx }
  | { kind: 'attackTaoists' }
  | { kind: 'attackTile' }
  | { kind: 'pass' }

export type Response =
  | { kind: 'placeGhost'; ref: GhostRef }
  | { kind: 'curseReroll'; reroll: boolean }
  | { kind: 'qiPayer'; taoist: Color }
  | { kind: 'discardTao'; colors: TaoColor[] }
  | { kind: 'gainTao'; colors: TaoColor[] }
  | { kind: 'qiOrYinYang'; choice: 'qi' | 'yinYang' }
  | { kind: 'incarnationReward'; qi: Color | null; yinYang: Color | null }
  | { kind: 'bonecrackerPayer'; taoist: Color }
  /** Gods' Favorite: reroll these dice (indices into the roll). */
  | { kind: 'reroll'; dice: number[] }
  /** Finish an exorcism: spend tokens / crystals, and say which targets are exorcised. */
  | { kind: 'commit'; spend: TaoSpend[]; crystals: CrystalSpend[]; exorcise: GhostRef[]; demons: DemonId[] }
  /** Herbalist's Shop: the colours chosen for white faces. */
  | { kind: 'herbalistTake'; white: TaoColor[] }
  // White Moon
  | { kind: 'devour'; tile: TileIdx }
  | { kind: 'suLing'; ref: GhostRef | null }
  | { kind: 'suLingCrystal'; take: boolean }
  | { kind: 'inherit'; taoist: Color }
  /** `tile`: which visible villager is saved when none waits on the Portal tile. */
  | { kind: 'barrier'; choice: 'save' | 'roll' | 'pass'; tile?: TileIdx }
  | { kind: 'restoreTile'; tile: TileIdx }
  // Black Secret
  | { kind: 'wuFengGhost'; choice: WuFengGhostChoice }
  | { kind: 'wuFengIncarnation'; card: string; ref: GhostRef }
  | { kind: 'wuFengDemon'; choice: { kind: 'move'; to: TileIdx } | { kind: 'search' } | { kind: 'pass' } }
  | { kind: 'wuFengShadow'; choice: ShadowChoice }
  | { kind: 'wuFengSkeleton'; ref: GhostRef }
  | { kind: 'wuFengFreeCurse'; token: string | null; slot: number }
  | { kind: 'wuFengCurseTarget'; tile: TileIdx }
  | { kind: 'shadowAttack'; taoists: Color[] }
  | { kind: 'mantraQi'; mantra: number }
  | { kind: 'mantraTarget'; target: number }

export type Action =
  /** Yang step 1: move to an adjacent tile (anywhere with Dance of the Spires). */
  | { type: 'move'; by: Color; to: TileIdx; carry?: { from: TileIdx } }
  /** Black Secret: climb up or down the ladder on this space. */
  | { type: 'climb'; by: Color }
  /** A power used before the move: Twin Winds, Bottomless Pockets, Enfeeblement Mantra. */
  | { type: 'power'; by: Color; use: PowerUse }
  /** Spend a power token to use a neutral board's power this turn. */
  | { type: 'powerToken'; by: Color; board: Color }
  /** Yang step 2: request help from the villager on this tile. */
  | { type: 'help'; by: Color; params: HelpParams }
  /** Yang step 2: attempt an exorcism (rolls the dice, then waits for `commit`). */
  | { type: 'exorcise'; by: Color; targets: GhostRef[]; demons?: DemonId[] }
  /** White Moon, step 2 on the Portal tile: save the top villager. */
  | { type: 'saveVillager'; by: Color }
  /** Yang step 3: place Buddha figures obtained on an earlier turn. */
  | { type: 'placeBuddha'; by: Color; spaces: GhostRef[] }
  /** White Moon, step 3 on a corner tile: put a moon crystal in the receptacle. */
  | { type: 'placeCrystal'; by: Color; corner: Corner }
  /** The Yin-Yang power, before or after any Yang step. */
  | { type: 'yinYang'; by: Color; use: YinYangUse }
  /** White Moon: use an artifact (a one-member family's reward), between Yang steps. */
  | { type: 'artifact'; by: Color; artifact: ArtifactId; tile?: TileIdx; ghost?: GhostRef }
  /** End the Yang phase. `reclaim`: power tokens to pick up from the central tile. */
  | { type: 'endTurn'; by: Color; reclaim?: number }
  /** Answer the current prompt. */
  | { type: 'respond'; by: Seat; r: Response }

export type ActionType = Action['type']

export type { PowerId }
