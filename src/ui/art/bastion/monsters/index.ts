// Which illustration a Horde card gets: by keyword in its name (first match
// wins), else a deterministic pick from its id.
import type { GhostCard } from '@/game/types'
import { hashStr } from '../../brush'
import { gargoyle, hound, serpent, spider, thornBeast, wyvern } from './beasts'
import { abomination, behemoth, brute, goblin, golem, orc, tormentor, troll } from './brutes'
import type { Design } from './common'
import { cannon, catapult, priestess, queen } from './engines'
import { assassin, darkKnight, demon, djinn, siren, vampire } from './fiends'
import { ghoul, inquisitor, lich, mummy, sorcerer, wraith, zombie } from './undead'

export const MONSTER_DESIGNS = {
  hound,
  gargoyle,
  wyvern,
  thornBeast,
  serpent,
  spider,
  brute,
  tormentor,
  behemoth,
  golem,
  orc,
  goblin,
  troll,
  abomination,
  demon,
  vampire,
  darkKnight,
  assassin,
  djinn,
  siren,
  wraith,
  lich,
  sorcerer,
  inquisitor,
  zombie,
  ghoul,
  mummy,
  catapult,
  cannon,
  queen,
  priestess,
} satisfies Record<string, Design>

export type MonsterDesignId = keyof typeof MONSTER_DESIGNS

/**
 * Name keywords → design (and its alternate look), first match wins. Chosen so
 * no colour shows the same picture twice: "Dread Necromancer" is a lich, not a
 * demon; "Lich Acolyte" a sorcerer; "Blood Fiend" a ghoul.
 */
export const KEYWORDS: Array<[RegExp, MonsterDesignId, boolean?]> = [
  [/priestess/i, 'priestess'],
  [/avatar|queen/i, 'queen'],
  [/hound/i, 'hound'],
  [/vampire/i, 'vampire'],
  [/blood fiend|ghoul|tide stalker/i, 'ghoul'],
  [/gargoyle/i, 'gargoyle'],
  [/golem|colossus|goliath/i, 'golem'],
  [/flayer|tormentor/i, 'tormentor'],
  [/butcher|ogre|skullcrusher/i, 'brute'],
  [/goblin/i, 'goblin'],
  [/warchief/i, 'orc', true],
  [/raider|berserker/i, 'orc'],
  [/troll|blightlord/i, 'troll'],
  [/wyvern/i, 'wyvern'],
  [/briar/i, 'thornBeast'],
  [/basilisk|leviathan/i, 'serpent'],
  [/siren/i, 'siren'],
  [/banshee/i, 'wraith', true],
  [/wraith|despair/i, 'wraith'],
  [/inquisitor/i, 'inquisitor'],
  [/summoner|acolyte|shaman/i, 'sorcerer'],
  [/lich|necromancer|magister|sorcerer/i, 'lich'],
  [/djinn|tempest/i, 'djinn'],
  [/plague/i, 'zombie', true],
  [/thrall/i, 'zombie'],
  [/crypt stalker/i, 'spider'],
  [/mummy/i, 'mummy'],
  [/catapult/i, 'catapult'],
  [/cannon/i, 'cannon'],
  [/behemoth/i, 'behemoth'],
  [/abomination/i, 'abomination'],
  [/assassin/i, 'assassin'],
  [/herald|knight|revenant|crimson warlord/i, 'darkKnight'],
  [/incubus|demon|daemon|gorgoroth/i, 'demon'],
]

const FALLBACK = Object.keys(MONSTER_DESIGNS) as MonsterDesignId[]

export function designIdFor(card: GhostCard): { id: MonsterDesignId; alt: boolean } {
  for (const [re, id, alt] of KEYWORDS) if (re.test(card.name)) return { id, alt: alt ?? false }
  return { id: FALLBACK[hashStr(card.id) % FALLBACK.length]!, alt: false }
}

export function designFor(card: GhostCard): { design: Design; alt: boolean } {
  const { id, alt } = designIdFor(card)
  return { design: MONSTER_DESIGNS[id], alt }
}
