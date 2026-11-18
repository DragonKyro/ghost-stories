// Rules text shown in the UI (from the rules summary's reference sheet and Last Bastion's Power Description booklet).

import { isBastion } from '@/game/rules'
import type { AbilityKind, CurseFace, TileKind } from '@/game/types'

export const TILE_HELP: Record<TileKind, string> = {
  circleOfPrayer: 'Place a Tao token from the supply here (or change it): all ghosts of its colour have 1 less resistance, for everyone.',
  buddhistTemple: 'Take a Buddha figure; place it from a later turn, at the end of your Yang phase.',
  cemetery: 'Bring a dead Taoist back with 2 Qi, then roll the curse die (a haunt face haunts the Cemetery).',
  taoistAltar: 'Restore a haunted tile, then a ghost comes into play.',
  herbalistShop: 'Roll 2 Tao dice and take Tao tokens of those colours; a white face is a colour of your choice.',
  sorcerersHut: 'Discard any ghost (not an incarnation) without its curse or reward. You lose 1 Qi.',
  nightWatchman: 'Move every haunting figure on one board back onto the cards.',
  pavilion: 'Move a ghost to any free space (onto a Buddha: destroyed), then move another Taoist one space.',
  teaHouse: 'Take a Tao token of your choice and gain 1 Qi. Then a ghost comes into play.',
  kungFuSchool: 'A solitary exorcism of every ghost of your board’s colour, or every black ghost (no curses, no rewards).',
  calligrapher: 'Swap a Bloody Mantra for one of the same level, and/or put a Qi from the reserve on a Mantra.',
}

export const BASTION_TILE_HELP: Record<TileKind, string> = {
  circleOfPrayer: 'Place or change a Standard token: all Monsters and Warlords of its colour have 1 less resistance.',
  buddhistTemple: 'Place the Trap figure on a free space of your Horde board: the next Monster placed there is discarded without effects.',
  cemetery: 'Either give 1 available Equipment token from the reserve to any Hero, OR heal a taken-out Hero (returns wounded with 3 Life and a Call to Arms).',
  taoistAltar: 'Place the Net figure on a Monster card (not a Warlord) to cancel its abilities.',
  herbalistShop: 'Roll 2 Combat dice and take matching Equipment tokens from the reserve; a white face is any colour of your choice.',
  sorcerersHut: 'Lose 1 Life token and eliminate 1 Monster card in play (not a Warlord; no exit effect).',
  nightWatchman: 'Remove up to 2 Grasp of Evil figures from Bastion tiles or Horde cards.',
  pavilion: 'Move a Horde card to any free space, or swap the positions of 2 Horde cards in play.',
  teaHouse: 'Grant a Hero of your choice 1 Life token and 1 optional movement.',
  kungFuSchool: TILE_HELP.kungFuSchool,
  calligrapher: TILE_HELP.calligrapher,
}

export function tileHelp(s: Parameters<typeof isBastion>[0], kind: TileKind): string {
  return isBastion(s) ? BASTION_TILE_HELP[kind] : TILE_HELP[kind]
}

export const ABILITY_TEXT: Record<AbilityKind, string> = {
  addGhost: 'On arrival: another ghost comes into play.',
  hauntTile: 'On arrival: the first active tile in front of it is haunted.',
  loseQi: 'On arrival: its board’s player (or neutral board) loses 1 Qi.',
  haunterDirect: 'On arrival: its haunting figure starts on the board, not the card.',
  haunter: 'Haunter: each Yin phase its figure advances; from the board it haunts the first active tile in front of it.',
  tormentor: 'Tormentor: each Yin phase, roll the curse die.',
  devourer: 'Devourer: each Yin phase it kills the top villager in front of it.',
  powerBlocker: 'While it stays, its board’s power is inactive.',
  taoBlocker: 'While it stays, no one can spend Tao tokens (the Circle of Prayer still works).',
  dieCaptor: 'While it stays, it holds a Tao die: exorcisms roll one die fewer.',
  diceImmune: 'Tao dice have no effect on it (Tao tokens, the Circle, Buddhas and the Sorcerer still work).',
  curse: 'When exorcised: the exorcist rolls the curse die.',
  loseTao: 'When exorcised: the exorcist loses 1 Tao token.',
  rewardQiOrYinYang: 'When exorcised: gain 1 Qi or regain your Yin-Yang.',
  rewardTao1: 'When exorcised: take 1 Tao token of your choice.',
  rewardTao2: 'When exorcised: take 2 Tao tokens of your choice.',
  rewardCrystal: 'When exorcised: take a moon crystal.',
  incarnationReward: 'When exorcised: 1 Qi and 1 Yin-Yang for the group.',
}

export const GROUP_TEXT = ' (The group: it applies to every player and board.)'

export const CURSE_FACE_TEXT: Record<CurseFace, string> = {
  blank: 'No effect',
  haunt: 'Haunt the first active tile in front of the ghost',
  ghost: 'A ghost comes into play',
  loseTao: 'Discard all your Tao tokens',
  loseQi: 'Lose 1 Qi',
}
