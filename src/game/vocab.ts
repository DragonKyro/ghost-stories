// Last Bastion words for the engine's vocabulary. The engine (and some UI
// text) is written once in Ghost Stories terms — Qi, Tao, ghosts, haunting,
// the Yin and Yang phases — and in a Last Bastion game its texts are put into
// that game's words on the way out (ops.ts#ev for the log, `say` for the UI).
//
// Names go first (tiles and powers have their own Bastion names), then
// phrases, then single words, so "Tao dice" becomes "Combat dice" before
// "Tao" alone becomes "Equipment".
import { BASTION_POWER_NAME, BASTION_TILE_NAME, isBastion, POWER_NAME, TILE_NAME } from './rules'
import type { PowerId, TileKind } from './types'

type Rule = readonly [RegExp, string]

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const NAMES: Rule[] = [
  ...(Object.keys(TILE_NAME) as TileKind[])
    .filter((k) => TILE_NAME[k] !== BASTION_TILE_NAME[k])
    .map((k): Rule => [new RegExp(escape(TILE_NAME[k]), 'g'), BASTION_TILE_NAME[k]]),
  ...(Object.keys(POWER_NAME) as PowerId[]).map((k): Rule => [new RegExp(escape(POWER_NAME[k]), 'g'), BASTION_POWER_NAME[k]]),
  [/\bthe Temple\b/g, 'the Dwarven Quarry'],
]

const WORDS: Rule[] = [
  // Phases, dice, tokens.
  [/\bYang phase/g, 'Hero phase'],
  [/\bYin phase/g, 'Horde phase'],
  [/\bTao dice\b/g, 'Combat dice'],
  [/\bTao die\b/g, 'Combat die'],
  [/\b[Cc]urse die\b/g, 'Corruption die'],
  [/\bTao supply\b/g, 'Equipment reserve'],
  [/\bTao\b/g, 'Equipment'],
  [/\bQi\b/g, 'Life'],
  [/\bYin-Yang\b/g, 'Call to Arms'],
  [/\bBuddhas\b/g, 'Traps'],
  [/\bBuddha\b/g, 'Trap'],
  // The Horde.
  [/\b([Aa])n? (?:ghost|incarnation) comes into play/g, '$1 Horde card comes into play'],
  [/\bghost deck\b/g, 'Horde deck'],
  [/\bghost (spaces?|cards?)\b/g, 'Horde $1'],
  [/\b([Aa])n incarnation(?: of Wu-Feng)?\b/g, '$1 Warlord'],
  [/\bincarnations of Wu-Feng\b/g, 'Warlords'],
  [/\bincarnation of Wu-Feng\b/g, 'Warlord'],
  [/\bincarnation(s?)\b/g, 'Warlord$1'],
  [/\bIncarnation(s?)\b/g, 'Warlord$1'],
  [/\bghosts\b/g, 'Monsters'],
  [/\bGhosts\b/g, 'Monsters'],
  [/\bghost\b/g, 'Monster'],
  [/\bGhost\b/g, 'Monster'],
  // Combat.
  [/\ban exorcism\b/g, 'a combat'],
  [/\bexorcisms\b/g, 'combats'],
  [/\bExorcisms\b/g, 'Combats'],
  [/\bexorcism\b/g, 'combat'],
  [/\bExorcism\b/g, 'Combat'],
  [/\bexorcised\b/g, 'vanquished'],
  [/\bexorcising\b/g, 'fighting'],
  [/\bexorcises\b/g, 'fights'],
  [/\bexorcise\b/g, 'fight'],
  [/\bexorcists?\b/g, 'Hero'],
  [/\bthe Circle\b/g, 'the Standard'],
  [/\bthe Sorcerer\b/g, 'the Tomb'],
  // The Grasp of Evil.
  [/\bhaunt a tile\b/g, 'a Bastion tile falls into the Grasp of Evil'],
  [/'s haunting\b/g, "'s Grasp of Evil"],
  [/\bis restored\b/g, 'is freed from the Grasp of Evil'],
  [/\b[Hh]aunting figures\b/g, 'Grasp of Evil figures'],
  [/\b[Hh]aunting figure\b/g, 'Grasp of Evil figure'],
  [/\bhaunted (tiles?)\b/g, '$1 in the Grasp of Evil'],
  [/\bhaunted\b/g, 'in the Grasp of Evil'],
  [/\bhaunts\b/g, 'strikes'],
  [/\bhaunt\b/g, 'strike'],
  [/\bHaunt\b/g, 'Grasp'],
  // People and places.
  [/\bis blown to\b/g, 'is moved to'],
  [/\bThe heavenly wind carries\b/g, "The Strategist's Tower sends"],
  [/\bTaoists\b/g, 'Heroes'],
  [/\bTaoist\b/g, 'Hero'],
  [/\bvillage\b/g, 'Bastion'],
  [/\bVillage\b/g, 'Bastion'],
  [/\bpossessed\b/g, 'neutral'],
]

const RULES: Rule[] = [...NAMES, ...WORDS]

/** `text` (written in Ghost Stories terms) in Last Bastion's words. */
export function bastionText(text: string): string {
  let out = text
  for (const [re, to] of RULES) out = out.replace(re, to)
  return out
}

/** `text` in the words of the game being played. */
export function say(s: Parameters<typeof isBastion>[0], text: string): string {
  return isBastion(s) ? bastionText(text) : text
}
