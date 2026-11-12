// Every tunable number of the Taoist AI in one place (tuned by self-play with
// scripts/aibench). Units are "points" of the position score; one Qi in the
// middle of the range is worth about 10.

/** Position score weights (see value.ts). */
export const W = {
  /** Score of a won / lost game at the end of a rollout. */
  winValue: 100000,
  lossValue: 100000,
  /** Total penalty for 1 and 2 haunted tiles. */
  h1: 18,
  h2: 51,
  /** Cost of one more haunting when two tiles are already haunted (the loss itself is `lossValue`). */
  thirdHaunt: 260,
  /** Extra penalty when a tile with a key action is haunted. */
  tileHaunted: { taoistAltar: 10, buddhistTemple: 6, herbalistShop: 6, circleOfPrayer: 4, cemetery: 4, teaHouse: 3, sorcerersHut: 3, nightWatchman: 3, pavilion: 2, kungFuSchool: 3, calligrapher: 2 } as Record<string, number>,
  /** Value of a living Taoist's Qi: the step from 1 to 2 Qi, 2 to 3, 3 to 4, and each one above. */
  qi2: 22,
  qi3: 14,
  qi4: 10,
  qiMore: 6,
  /** A dead Taoist (on top of their lost Qi). */
  dead: 85,
  tao: 2.16,
  taoCap: 7,
  taoExtra: 0.8,
  /** Extra per token matching a colour the ghosts in play need. */
  taoMatch: 0.96,
  yinYang: 12,
  buddhaHeld: 11.2,
  buddhaOnBoard: 14.4,
  powerToken: 2.5,
  crystal: 3,
  neutralQi: 7,
  possessed: 25,
  ghostBase: 8,
  ghostRes: 2.56,
  skeleton: 4,
  incarnation: 45,
  /** Times the best chance of exorcising an incarnation in play next turn. */
  incReady: 40,
  /** Haunter cost as a share of the next haunting's cost: figure on the card / on the stone. */
  haunterCard: 0.18,
  haunterStone: 1.2,
  tormentor: 7,
  devourer: 6,
  powerBlocker: 3,
  taoBlocker: 6,
  dieCaptor: 6,
  diceImmune: 1.08,
  /** A board with 3 ghosts loses Qi every turn; with 2 it is one arrival away. */
  full: 25.6,
  two: 4.8,
  circle: 3,
  progress: 0.4,
  /** Per card left in the deck while the last incarnation is in play. */
  clock: 1.5,
  /** Quick policy: standing in front of ghosts for later turns, the central tile, cost of a spent token. */
  pos: 0.12,
  center: 0.6,
  spend: 0.8,
  /** Rollout leaf: share of the best option the next Taoist to act has. */
  leaf: 0.5,
  /** Expected cost of a ghost brought into play (Tea House, Altar). */
  arrival: 19.2,
  villagerSaved: 4,
  villagerDead: 9,
}

/** Search settings (see taoist.ts / sim.ts). */
export const SEARCH = {
  on: true,
  /** Rollouts per candidate plan in the first round of successive halving. */
  samples: 12,
  /** Halving rounds after the first (each keeps `keep` of the plans and doubles their rollouts). */
  rounds: 2,
  keep: 0.4,
  /** Candidate plans kept after the quick pre-score. */
  maxPlans: 16,
  /** Other Taoists' Yang phases simulated after the AI's own turn (0: stop when the next one begins). */
  horizon: 0,
  /** Hard cap on actions applied in one rollout. */
  maxSteps: 120,
}
