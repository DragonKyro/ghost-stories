// White Moon family data: per-family death curse + save reward.
//
// The rulebook gives each of the 12 families a distinct effect when one of
// their members dies, and a distinct reward when their *entire* family is
// saved. This is the canonical reference and is consumed by the engine in
// `applyVillagerDeath` and the family-saved check.

import type { VillagerFamilyId } from './types'

export type FamilyEffectKind =
  // Death-curse kinds.
  | 'loseQi' // active player loses 1 Qi
  | 'discardTao' // active player discards 1 Tao token of their choice
  | 'hauntTile' // first active tile in the village gets haunted
  | 'returnTaoToSupply' // active player returns 1 Tao to the supply
  | 'noEffect' // small / 1-person family with no extra death penalty
  // Save-reward kinds.
  | 'gainQi' // active player gains 1 Qi
  | 'gainTao' // active player takes 1 Tao token of their choice
  | 'restoreYinYang' // active player gets their Yin-Yang back
  | 'moonCrystal' // active player gets 1 moon crystal (the Chang family — moon dust artifact, simplified)
  | 'gainPowerToken' // active player gets a power token
  | 'unhauntTile' // unhaunt one village tile

export type FamilyEffect = {
  kind: FamilyEffectKind
  description: string
}

export type FamilyDef = {
  id: VillagerFamilyId
  /** Size of the family (1, 2 or 3 members). */
  size: 1 | 2 | 3
  /** Effect when any single member dies. */
  death: FamilyEffect
  /** Effect when the entire family is saved. */
  save: FamilyEffect
  /** Display label for the rulebook / UI. */
  label: string
}

// Family designs roughly follow the rulebook spirit. The 4 single-person
// families (Chang / Teng / Long / Weng) carry the most-coveted save rewards
// because saving them is hardest (1 token = full family); the 3-person
// families have the most-punishing death curses to balance.
export const FAMILY_DEFS: Record<VillagerFamilyId, FamilyDef> = {
  // ─── 3-person families ───────────────────────────────────
  hua: {
    id: 'hua', size: 3, label: 'Hua',
    death: { kind: 'loseQi', description: 'Active player loses 1 Qi.' },
    save: { kind: 'gainTao', description: 'Active player takes 1 Tao token of choice.' },
  },
  zhou: {
    id: 'zhou', size: 3, label: 'Zhou',
    death: { kind: 'discardTao', description: 'Active player discards 1 Tao token of choice.' },
    save: { kind: 'gainQi', description: 'Active player gains 1 Qi.' },
  },
  li: {
    id: 'li', size: 3, label: 'Li',
    death: { kind: 'returnTaoToSupply', description: 'Active player returns 1 Tao to the supply.' },
    save: { kind: 'gainTao', description: 'Active player takes 1 Tao token of choice.' },
  },
  sun: {
    id: 'sun', size: 3, label: 'Sun',
    death: { kind: 'loseQi', description: 'Active player loses 1 Qi.' },
    save: { kind: 'restoreYinYang', description: 'Active player restores their Yin-Yang.' },
  },

  // ─── 2-person families ───────────────────────────────────
  miao: {
    id: 'miao', size: 2, label: 'Miao',
    death: { kind: 'discardTao', description: 'Active player discards 1 Tao token of choice.' },
    save: { kind: 'gainTao', description: 'Active player takes 1 Tao token of choice.' },
  },
  xiang: {
    id: 'xiang', size: 2, label: 'Xiang',
    death: { kind: 'loseQi', description: 'Active player loses 1 Qi (the Xiang family death curse).' },
    save: { kind: 'restoreYinYang', description: 'Active player restores their Yin-Yang.' },
  },
  sheng: {
    id: 'sheng', size: 2, label: 'Sheng',
    death: { kind: 'hauntTile', description: 'Haunt the first active village tile.' },
    save: { kind: 'unhauntTile', description: 'Unhaunt one village tile.' },
  },
  wu: {
    id: 'wu', size: 2, label: 'Wu',
    death: { kind: 'loseQi', description: 'Active player loses 1 Qi.' },
    save: { kind: 'gainPowerToken', description: 'Active player gains 1 power token.' },
  },

  // ─── 1-person families (highest-value saves) ─────────────
  chang: {
    id: 'chang', size: 1, label: 'Chang',
    death: { kind: 'noEffect', description: 'No effect.' },
    save: { kind: 'moonCrystal', description: 'Active player gets 1 moon crystal (Moon Dust artifact).' },
  },
  teng: {
    id: 'teng', size: 1, label: 'Teng',
    death: { kind: 'noEffect', description: 'No effect.' },
    save: { kind: 'gainPowerToken', description: 'Active player gains 1 power token.' },
  },
  long: {
    id: 'long', size: 1, label: 'Long',
    death: { kind: 'noEffect', description: 'No effect.' },
    save: { kind: 'restoreYinYang', description: 'Active player restores their Yin-Yang.' },
  },
  weng: {
    id: 'weng', size: 1, label: 'Weng',
    death: { kind: 'noEffect', description: 'No effect.' },
    save: { kind: 'gainQi', description: 'Active player gains 1 Qi.' },
  },
}
